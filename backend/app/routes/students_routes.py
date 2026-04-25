import csv
import io
from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..auth import roles_required
from ..db import get_db
from ..utils import (
    calculate_discipline_score,
    create_notification,
    normalize_discipline_metrics,
    recalculate_ranks,
    serialize_doc,
    validate_justification,
)

students_bp = Blueprint("students", __name__)


def _college_scope_filter(claims):
    if claims.get("role") == "college_admin":
        return {"college_id": ObjectId(claims["college_id"])}, None
    return {}, None


@students_bp.get("")
@roles_required("college_admin", "super_admin")
def list_students():
    db = get_db()
    claims = get_jwt()
    filters, _ = _college_scope_filter(claims)

    college_id = request.args.get("college_id")
    department = request.args.get("department")
    year = request.args.get("year")
    search = request.args.get("search")

    if college_id and claims.get("role") == "super_admin":
        filters["college_id"] = ObjectId(college_id)
    if department:
        filters["department"] = department.strip()
    if year:
        try:
            filters["year"] = int(year)
        except ValueError:
            return {"message": "year must be a number"}, 400
    if search:
        filters["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"roll_number": {"$regex": search, "$options": "i"}},
        ]
    if request.args.get("approved") in ["true", "false"]:
        filters["approved"] = request.args.get("approved") == "true"

    items = list(db.students.find(filters))
    college_ids = list({item.get("college_id") for item in items if item.get("college_id")})
    colleges = {
        c.get("_id"): c.get("name")
        for c in db.colleges.find({"_id": {"$in": college_ids}}, {"name": 1})
    }
    for item in items:
        item["college_name"] = colleges.get(item.get("college_id"))

    items = [serialize_doc(item) for item in items]
    return {"items": items}, 200


@students_bp.post("")
@roles_required("college_admin", "super_admin")
def create_student():
    db = get_db()
    data = request.get_json(silent=True) or {}
    claims = get_jwt()

    required = ["name", "roll_number", "department", "year", "behavior"]
    if any(data.get(field) is None or data.get(field) == "" for field in required):
        return {"message": "Missing required fields"}, 400

    college_id = data.get("college_id") or claims.get("college_id")
    if not college_id:
        return {"message": "college_id is required"}, 400

    if claims.get("role") == "college_admin" and college_id != claims.get("college_id"):
        return {"message": "You can only create students in your college"}, 403

    metrics = normalize_discipline_metrics(data)
    attendance = metrics["attendance"]
    behavior = metrics["behavior"]
    participation = metrics["participation"]
    score = metrics["discipline_score"]

    payload = {
        "name": data["name"].strip(),
        "roll_number": data["roll_number"].strip(),
        "college_id": ObjectId(college_id),
        "department": data["department"].strip(),
        "year": int(data["year"]),
        "bio": (data.get("bio") or "").strip(),
        "contact_email": (data.get("contact_email") or "").strip() or None,
        "contact_phone": (data.get("contact_phone") or "").strip() or None,
        "attendance": attendance,
        "behavior": behavior,
        "participation": participation,
        "achievements": data.get("achievements", []),
        "discipline_score": score,
        "rank_global": None,
        "rank_college": None,
        "rank_department": None,
        "approved": False,
        "approved_by": None,
        "approved_at": None,
        "history": [
            {
                "timestamp": datetime.now(timezone.utc),
                "updated_by": ObjectId(get_jwt_identity()),
                "reason": "created",
                "category": "Other",
                "previous": {},
                "new": {
                    "attendance": attendance,
                    "behavior": behavior,
                    "participation": participation,
                    "discipline_score": score,
                },
            }
        ],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    if db.students.find_one({"roll_number": payload["roll_number"], "college_id": payload["college_id"]}):
        return {"message": "Roll number already exists in this college"}, 409

    result = db.students.insert_one(payload)
    payload["_id"] = result.inserted_id

    # Immutable discipline audit record (for full accountability)
    db.discipline_updates.insert_one(
        {
            "student_id": payload["_id"],
            "college_id": payload["college_id"],
            "created_at": datetime.now(timezone.utc),
            "created_by": {
                "id": ObjectId(get_jwt_identity()),
                "name": claims.get("name"),
                "role": claims.get("role"),
            },
            "category": "Other",
            "reason": "created",
            "details": None,
            "previous": {},
            "new": {
                "attendance": attendance,
                "behavior": behavior,
                "participation": participation,
                "discipline_score": score,
            },
            "delta": {
                "attendance": attendance,
                "behavior": behavior,
                "participation": participation,
                "discipline_score": score,
            },
            "requires_approval": False,
            "status": "applied",
            "reviewed_by": None,
            "reviewed_at": None,
            "applied_at": datetime.now(timezone.utc),
            "suspicious": False,
            "suspicious_flags": [],
        }
    )
    create_notification(
        db,
        payload,
        f"New student record created for {payload['name']} ({payload['roll_number']}).",
        event_type="student_created",
    )
    recalculate_ranks(db)
    return {"item": serialize_doc(payload)}, 201


@students_bp.get("/<student_id>")
@jwt_required(optional=True)
def get_student(student_id):
    db = get_db()
    claims = get_jwt() if request.headers.get("Authorization") else {}
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404

    college = None
    if student.get("college_id"):
        college = db.colleges.find_one({"_id": student.get("college_id")}, {"name": 1})
    student["college_name"] = (college or {}).get("name")

    if claims.get("role") == "college_admin" and str(student["college_id"]) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    if not claims:
        public_fields = {
            "_id": student["_id"],
            "name": student.get("name"),
            "department": student.get("department"),
            "year": student.get("year"),
            "college_id": student.get("college_id"),
            "college_name": student.get("college_name"),
            "bio": student.get("bio"),
            "contact_email": student.get("contact_email"),
            "contact_phone": student.get("contact_phone"),
            "discipline_score": student.get("discipline_score"),
            "rank_global": student.get("rank_global"),
            "rank_college": student.get("rank_college"),
            "rank_department": student.get("rank_department"),
            "behavior": student.get("behavior"),
        }
        return {"item": serialize_doc(public_fields)}, 200

    return {"item": serialize_doc(student)}, 200


@students_bp.put("/<student_id>")
@roles_required("college_admin", "super_admin")
def update_student(student_id):
    db = get_db()
    claims = get_jwt()
    admin_id = ObjectId(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404

    if claims.get("role") == "college_admin" and str(student["college_id"]) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    updates = {}
    for field in ["name", "department", "year", "achievements", "bio", "contact_email", "contact_phone", "photo_url"]:
        if field in data:
            updates[field] = data[field]

    metrics_changed = any(k in data for k in ["behavior"])
    if metrics_changed:
        return {
            "message": "Discipline metrics must be updated via /students/<id>/discipline-updates with justification",
        }, 400

    if claims.get("role") == "super_admin" and "college_id" in data:
        updates["college_id"] = ObjectId(data["college_id"])

    updates["updated_at"] = datetime.now(timezone.utc)
    db.students.update_one({"_id": ObjectId(student_id)}, {"$set": updates})
    recalculate_ranks(db)

    updated = db.students.find_one({"_id": ObjectId(student_id)})
    return {"item": serialize_doc(updated)}, 200

@students_bp.put("/me")
def student_self_update():
    db = get_db()
    data = request.get_json(silent=True) or {}
    student_id = data.get("student_id")
    if not student_id:
        return {"message": "student_id is required"}, 400

    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404

    updates = {}
    for field in ["contact_email", "photo_url", "bio"]:
        if field in data:
            updates[field] = data[field]

    if not updates:
        return {"message": "No fields to update"}, 400

    updates["updated_at"] = datetime.now(timezone.utc)
    db.students.update_one({"_id": ObjectId(student_id)}, {"$set": updates})

    return {"message": "Profile updated successfully"}, 200


@students_bp.delete("/<student_id>")
@roles_required("college_admin", "super_admin")
def delete_student(student_id):
    db = get_db()
    claims = get_jwt()
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404
    if claims.get("role") == "college_admin" and str(student["college_id"]) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    db.students.delete_one({"_id": ObjectId(student_id)})
    create_notification(
        db,
        student,
        f"Student record deleted for {student.get('name')}.",
        event_type="student_deleted",
    )
    recalculate_ranks(db)
    return {"message": "Student deleted"}, 200


@students_bp.post("/bulk-upload")
@roles_required("college_admin", "super_admin")
def bulk_upload_students():
    db = get_db()
    claims = get_jwt()
    admin_id = ObjectId(get_jwt_identity())

    if "file" not in request.files:
        return {"message": "CSV file is required"}, 400

    file = request.files["file"]
    content = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    inserted_count = 0
    for row in reader:
        college_id = row.get("college_id") or claims.get("college_id")
        if claims.get("role") == "college_admin" and college_id != claims.get("college_id"):
            continue

        metrics = normalize_discipline_metrics(row)
        attendance = metrics["attendance"]
        behavior = metrics["behavior"]
        participation = metrics["participation"]
        score = metrics["discipline_score"]

        payload = {
            "name": row.get("name", "").strip(),
            "roll_number": row.get("roll_number", "").strip(),
            "college_id": ObjectId(college_id),
            "department": row.get("department", "General").strip(),
            "year": int(row.get("year", 1)),
            "attendance": attendance,
            "behavior": behavior,
            "participation": participation,
            "discipline_score": score,
            "rank_global": None,
            "rank_college": None,
            "rank_department": None,
            "achievements": [],
            "history": [
                {
                    "timestamp": datetime.now(timezone.utc),
                    "updated_by": admin_id,
                    "reason": "bulk_upload",
                    "category": "Other",
                    "previous": {},
                    "new": {
                        "attendance": attendance,
                        "behavior": behavior,
                        "participation": participation,
                        "discipline_score": score,
                    },
                }
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        if payload["name"] and payload["roll_number"]:
            if not db.students.find_one(
                {"roll_number": payload["roll_number"], "college_id": payload["college_id"]}
            ):
                insert_result = db.students.insert_one(payload)
                payload["_id"] = insert_result.inserted_id

                db.discipline_updates.insert_one(
                    {
                        "student_id": payload["_id"],
                        "college_id": payload["college_id"],
                        "created_at": datetime.now(timezone.utc),
                        "created_by": {
                            "id": admin_id,
                            "name": claims.get("name"),
                            "role": claims.get("role"),
                        },
                        "category": "Other",
                        "reason": "bulk_upload",
                        "details": None,
                        "previous": {},
                        "new": {
                            "attendance": attendance,
                            "behavior": behavior,
                            "participation": participation,
                            "discipline_score": score,
                        },
                        "delta": {
                            "attendance": attendance,
                            "behavior": behavior,
                            "participation": participation,
                            "discipline_score": score,
                        },
                        "requires_approval": False,
                        "status": "applied",
                        "reviewed_by": None,
                        "reviewed_at": None,
                        "applied_at": datetime.now(timezone.utc),
                        "suspicious": False,
                        "suspicious_flags": [],
                    }
                )
                create_notification(
                    db,
                    payload,
                    f"Student {payload['name']} was added via CSV bulk upload.",
                    event_type="bulk_upload",
                )
                inserted_count += 1

    recalculate_ranks(db)
    return {"message": "Bulk upload completed", "inserted_count": inserted_count}, 200


@students_bp.post("/reset-scores")
@roles_required("college_admin", "super_admin")
def reset_scores():
    db = get_db()
    claims = get_jwt()
    data = request.get_json(silent=True) or {}
    justification, err = validate_justification(data)
    if err:
        return {"message": err}, 400

    filters = {}
    college_id = (data.get("college_id") or "").strip()
    roll_number = (data.get("roll_number") or "").strip()

    if not college_id or not roll_number:
        return {"message": "college_id and roll_number are required"}, 400

    if claims.get("role") == "college_admin" and college_id != claims.get("college_id"):
        return {"message": "You can only reset scores in your college"}, 403

    try:
        filters["college_id"] = ObjectId(college_id)
    except Exception:
        return {"message": "Invalid college_id"}, 400

    filters["roll_number"] = roll_number

    students = list(db.students.find(filters))
    if not students:
        return {"message": "No student found for provided college and roll number"}, 404

    for student in students:
        applied_at = datetime.now(timezone.utc)
        previous = normalize_discipline_metrics({}, fallback=student)
        admin_id = ObjectId(get_jwt_identity())

        db.students.update_one(
            {"_id": student["_id"]},
            {
                "$set": {
                    "attendance": 0,
                    "behavior": 0,
                    "participation": 0,
                    "discipline_score": 0,
                    "updated_at": applied_at,
                },
                "$push": {
                    "history": {
                        "timestamp": applied_at,
                        "updated_by": admin_id,
                        "reason": justification["reason"],
                        "category": justification["category"],
                        "details": justification.get("details"),
                        "previous": {
                            "attendance": student.get("attendance", 0),
                            "behavior": student.get("behavior", 0),
                            "participation": student.get("participation", 0),
                            "discipline_score": student.get("discipline_score", 0),
                        },
                        "new": {
                            "attendance": 0,
                            "behavior": 0,
                            "participation": 0,
                            "discipline_score": 0,
                        },
                    }
                },
            },
        )

        db.discipline_updates.insert_one(
            {
                "student_id": student.get("_id"),
                "college_id": student.get("college_id"),
                "created_at": applied_at,
                "created_by": {
                    "id": admin_id,
                    "name": claims.get("name"),
                    "role": claims.get("role"),
                },
                "category": justification["category"],
                "reason": justification["reason"],
                "details": justification.get("details"),
                "previous": previous,
                "new": {
                    "attendance": 0,
                    "behavior": 0,
                    "participation": 0,
                    "discipline_score": 0,
                },
                "delta": {
                    "attendance": -previous.get("attendance", 0),
                    "behavior": -previous.get("behavior", 0),
                    "participation": -previous.get("participation", 0),
                    "discipline_score": -previous.get("discipline_score", 0),
                },
                "requires_approval": False,
                "status": "applied",
                "reviewed_by": None,
                "reviewed_at": None,
                "applied_at": applied_at,
                "suspicious": False,
                "suspicious_flags": [],
            }
        )

        create_notification(
            db,
            student,
            f"Scores reset for {student.get('name')}.",
            event_type="score_reset",
        )

    recalculate_ranks(db)
    return {
        "message": "Score reset successfully",
        "count": len(students),
    }, 200


@students_bp.post("/<student_id>/approve")
@roles_required("college_admin", "super_admin")
def approve_student(student_id):
    db = get_db()
    claims = get_jwt()
    approver_id = ObjectId(get_jwt_identity())

    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404
    if claims.get("role") == "college_admin" and str(student["college_id"]) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    db.students.update_one(
        {"_id": ObjectId(student_id)},
        {
            "$set": {
                "approved": True,
                "approved_by": approver_id,
                "approved_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            "$push": {
                "history": {
                    "timestamp": datetime.now(timezone.utc),
                    "updated_by": approver_id,
                    "reason": "approved",
                    "new": {"approved": True},
                }
            },
        },
    )

    create_notification(
        db,
        student,
        f"Student profile approved for {student.get('name')}.",
        event_type="student_approved",
    )
    updated = db.students.find_one({"_id": ObjectId(student_id)})
    return {"item": serialize_doc(updated)}, 200
