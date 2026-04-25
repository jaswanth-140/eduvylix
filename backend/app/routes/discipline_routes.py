from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt, get_jwt_identity

from ..auth import roles_required
from ..db import get_db
from ..utils import (
    classify_discipline_update,
    compute_discipline_delta,
    create_notification,
    normalize_discipline_metrics,
    recalculate_ranks,
    serialize_doc,
    validate_justification,
)


discipline_bp = Blueprint("discipline", __name__)


def _scope_student_or_404(db, student_id: str, claims: dict):
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return None, ({"message": "Student not found"}, 404)

    if claims.get("role") == "college_admin" and str(student.get("college_id")) != claims.get("college_id"):
        return None, ({"message": "Forbidden"}, 403)

    return student, None


def _admin_actor():
    claims = get_jwt()
    return {
        "id": ObjectId(get_jwt_identity()),
        "name": claims.get("name"),
        "role": claims.get("role"),
        "college_id": ObjectId(claims["college_id"]) if claims.get("college_id") else None,
    }


@discipline_bp.post("/students/<student_id>/discipline-updates")
@roles_required("college_admin", "super_admin")
def create_discipline_update(student_id):
    db = get_db()
    claims = get_jwt()
    actor = _admin_actor()
    data = request.get_json(silent=True) or {}

    student, error = _scope_student_or_404(db, student_id, claims)
    if error:
        return error

    justification, err = validate_justification(data)
    if err:
        return {"message": err}, 400

    previous = normalize_discipline_metrics({}, fallback=student)
    new = normalize_discipline_metrics(data, fallback=student)
    delta = compute_discipline_delta(previous, new)

    if delta.get("behavior") == 0:
        return {"message": "No discipline metric changes detected"}, 400

    requires_approval, suspicious, flags = classify_discipline_update(delta, current_app.config)

    update_doc = {
        "student_id": student.get("_id"),
        "college_id": student.get("college_id"),
        "created_at": datetime.now(timezone.utc),
        "created_by": {
            "id": actor["id"],
            "name": actor.get("name"),
            "role": actor.get("role"),
        },
        "category": justification["category"],
        "reason": justification["reason"],
        "details": justification.get("details"),
        "previous": previous,
        "new": new,
        "delta": delta,
        "requires_approval": requires_approval,
        "status": "pending" if requires_approval else "applied",
        "reviewed_by": None,
        "reviewed_at": None,
        "applied_at": None,
        "suspicious": suspicious,
        "suspicious_flags": flags,
    }

    insert_result = db.discipline_updates.insert_one(update_doc)
    update_doc["_id"] = insert_result.inserted_id

    if requires_approval:
        create_notification(
            db,
            student,
            f"Discipline change pending approval for {student.get('name')} (Δ {delta.get('discipline_score')}).",
            event_type="discipline_update_pending",
        )
        return {"update": serialize_doc(update_doc)}, 202

    # Apply immediately
    applied_at = datetime.now(timezone.utc)
    db.students.update_one(
        {"_id": student.get("_id")},
        {
            "$set": {
                "attendance": new["attendance"],
                "behavior": new["behavior"],
                "participation": new["participation"],
                "discipline_score": new["discipline_score"],
                "updated_at": applied_at,
            }
        },
    )

    db.discipline_updates.update_one(
        {"_id": insert_result.inserted_id},
        {"$set": {"applied_at": applied_at}},
    )

    create_notification(
        db,
        student,
        f"Discipline score updated for {student.get('name')} to {new['discipline_score']}.",
        event_type="score_update",
    )
    recalculate_ranks(db)

    updated_student = db.students.find_one({"_id": student.get("_id")})
    return {"item": serialize_doc(updated_student), "update": serialize_doc({**update_doc, "applied_at": applied_at})}, 200


@discipline_bp.get("/students/<student_id>/discipline-updates")
@roles_required("college_admin", "super_admin")
def list_discipline_updates(student_id):
    db = get_db()
    claims = get_jwt()

    student, error = _scope_student_or_404(db, student_id, claims)
    if error:
        return error

    query = {"student_id": student.get("_id")}

    category = request.args.get("category")
    if category:
        query["category"] = category

    status = request.args.get("status")
    if status:
        query["status"] = status

    start = request.args.get("start")
    end = request.args.get("end")
    if start or end:
        query["created_at"] = {}
        try:
            if start:
                query["created_at"]["$gte"] = datetime.fromisoformat(start)
            if end:
                query["created_at"]["$lte"] = datetime.fromisoformat(end)
        except ValueError:
            return {"message": "Invalid date filter; use ISO format"}, 400

    direction = request.args.get("direction")
    if direction == "positive":
        query["delta.discipline_score"] = {"$gt": 0}
    elif direction == "negative":
        query["delta.discipline_score"] = {"$lt": 0}

    items = list(db.discipline_updates.find(query).sort([("created_at", -1)]))
    return {"items": [serialize_doc(x) for x in items]}, 200


@discipline_bp.get("/students/<student_id>/discipline-history")
def public_discipline_history(student_id):
    db = get_db()
    student = db.students.find_one({"_id": ObjectId(student_id)}, {"_id": 1})
    if not student:
        return {"message": "Student not found"}, 404

    query = {
        "student_id": student.get("_id"),
        "status": {"$in": ["applied", "approved"]},
    }

    category = request.args.get("category")
    if category:
        query["category"] = category

    start = request.args.get("start")
    end = request.args.get("end")
    if start or end:
        query["created_at"] = {}
        try:
            if start:
                query["created_at"]["$gte"] = datetime.fromisoformat(start)
            if end:
                query["created_at"]["$lte"] = datetime.fromisoformat(end)
        except ValueError:
            return {"message": "Invalid date filter; use ISO format"}, 400

    direction = request.args.get("direction")
    if direction == "positive":
        query["delta.discipline_score"] = {"$gt": 0}
    elif direction == "negative":
        query["delta.discipline_score"] = {"$lt": 0}

    items = list(
        db.discipline_updates.find(
            query,
            {
                "student_id": 0,
                "college_id": 0,
            },
        ).sort([("created_at", -1)])
    )

    # Make actor readable for students
    for item in items:
        created_by = item.get("created_by") or {}
        item["actor"] = {
            "name": created_by.get("name") or "Admin",
            "role": created_by.get("role") or "admin",
        }
        item.pop("created_by", None)

        reviewed_by = item.get("reviewed_by") or {}
        if reviewed_by:
            item["reviewer"] = {
                "name": reviewed_by.get("name") or "Admin",
                "role": reviewed_by.get("role") or "admin",
            }
        item.pop("reviewed_by", None)

    return {"items": [serialize_doc(x) for x in items]}, 200


@discipline_bp.get("/discipline-updates/pending")
@roles_required("college_admin", "super_admin")
def pending_discipline_updates():
    db = get_db()
    claims = get_jwt()

    query = {"status": "pending"}
    if claims.get("role") == "college_admin":
        query["college_id"] = ObjectId(claims["college_id"])

    items = list(db.discipline_updates.find(query).sort([("created_at", -1)]).limit(100))

    # Attach student summary
    student_ids = [item.get("student_id") for item in items if item.get("student_id")]
    students = {
        s.get("_id"): s
        for s in db.students.find({"_id": {"$in": student_ids}}, {"name": 1, "roll_number": 1, "department": 1})
    }
    for item in items:
        s = students.get(item.get("student_id"))
        item["student"] = {
            "id": item.get("student_id"),
            "name": (s or {}).get("name"),
            "roll_number": (s or {}).get("roll_number"),
            "department": (s or {}).get("department"),
        }

    return {"items": [serialize_doc(x) for x in items]}, 200


@discipline_bp.post("/discipline-updates/<update_id>/approve")
@roles_required("college_admin", "super_admin")
def approve_discipline_update(update_id):
    db = get_db()
    claims = get_jwt()
    reviewer = _admin_actor()

    update_doc = db.discipline_updates.find_one({"_id": ObjectId(update_id)})
    if not update_doc:
        return {"message": "Update not found"}, 404
    if update_doc.get("status") != "pending":
        return {"message": "Update is not pending"}, 400

    student = db.students.find_one({"_id": update_doc.get("student_id")})
    if not student:
        return {"message": "Student not found"}, 404

    if claims.get("role") == "college_admin" and str(student.get("college_id")) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    # Prevent self-approval when possible
    if str(update_doc.get("created_by", {}).get("id")) == str(reviewer.get("id")):
        return {"message": "You cannot approve your own discipline changes"}, 403

    applied_at = datetime.now(timezone.utc)
    new = update_doc.get("new") or {}

    db.students.update_one(
        {"_id": student.get("_id")},
        {
            "$set": {
                "attendance": new.get("attendance", student.get("attendance", 0)),
                "behavior": new.get("behavior", student.get("behavior", 0)),
                "participation": new.get("participation", student.get("participation", 0)),
                "discipline_score": new.get("discipline_score", student.get("discipline_score", 0)),
                "updated_at": applied_at,
            }
        },
    )

    db.discipline_updates.update_one(
        {"_id": update_doc.get("_id")},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": {
                    "id": reviewer["id"],
                    "name": reviewer.get("name"),
                    "role": reviewer.get("role"),
                },
                "reviewed_at": applied_at,
                "applied_at": applied_at,
            }
        },
    )

    create_notification(
        db,
        student,
        f"Discipline change approved for {student.get('name')} (Score: {new.get('discipline_score')}).",
        event_type="discipline_update_approved",
    )
    recalculate_ranks(db)

    updated_student = db.students.find_one({"_id": student.get("_id")})
    updated_update = db.discipline_updates.find_one({"_id": update_doc.get("_id")})
    return {"item": serialize_doc(updated_student), "update": serialize_doc(updated_update)}, 200


@discipline_bp.post("/discipline-updates/<update_id>/reject")
@roles_required("college_admin", "super_admin")
def reject_discipline_update(update_id):
    db = get_db()
    claims = get_jwt()
    reviewer = _admin_actor()

    update_doc = db.discipline_updates.find_one({"_id": ObjectId(update_id)})
    if not update_doc:
        return {"message": "Update not found"}, 404
    if update_doc.get("status") != "pending":
        return {"message": "Update is not pending"}, 400

    student = db.students.find_one({"_id": update_doc.get("student_id")})
    if not student:
        return {"message": "Student not found"}, 404

    if claims.get("role") == "college_admin" and str(student.get("college_id")) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    if str(update_doc.get("created_by", {}).get("id")) == str(reviewer.get("id")):
        return {"message": "You cannot reject your own discipline changes"}, 403

    rejected_at = datetime.now(timezone.utc)
    db.discipline_updates.update_one(
        {"_id": update_doc.get("_id")},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": {
                    "id": reviewer["id"],
                    "name": reviewer.get("name"),
                    "role": reviewer.get("role"),
                },
                "reviewed_at": rejected_at,
            }
        },
    )

    create_notification(
        db,
        student,
        f"Discipline change rejected for {student.get('name')}.",
        event_type="discipline_update_rejected",
    )
    updated_update = db.discipline_updates.find_one({"_id": update_doc.get("_id")})
    return {"update": serialize_doc(updated_update)}, 200
