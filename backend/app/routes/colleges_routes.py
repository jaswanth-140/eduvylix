from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required

from ..auth import roles_required
from ..db import get_db
from ..utils import serialize_doc

colleges_bp = Blueprint("colleges", __name__)


@colleges_bp.get("")
@jwt_required(optional=True)
def list_colleges():
    db = get_db()
    claims = get_jwt() if request.headers.get("Authorization") else {}
    role = claims.get("role")

    if role == "college_admin":
        college_id = claims.get("college_id")
        colleges = list(db.colleges.find({"_id": ObjectId(college_id)}))
    else:
        colleges = list(db.colleges.find())

    return {"items": [serialize_doc(c) for c in colleges]}, 200


@colleges_bp.post("")
@roles_required("super_admin")
def create_college():
    db = get_db()
    data = request.get_json(silent=True) or {}
    required = ["name", "location"]
    if any(not data.get(field) for field in required):
        return {"message": "Missing required fields"}, 400

    payload = {
        "name": data["name"].strip(),
        "location": data["location"].strip(),
        "admin_ids": [ObjectId(aid) for aid in data.get("admin_ids", [])],
        "created_at": datetime.now(timezone.utc),
    }

    result = db.colleges.insert_one(payload)
    payload["_id"] = result.inserted_id
    payload = serialize_doc(payload)
    return {"item": payload}, 201


@colleges_bp.put("/<college_id>")
@roles_required("super_admin")
def update_college(college_id):
    db = get_db()
    data = request.get_json(silent=True) or {}

    updates = {}
    if "name" in data:
        updates["name"] = data["name"].strip()
    if "location" in data:
        updates["location"] = data["location"].strip()
    if "admin_ids" in data:
        updates["admin_ids"] = [ObjectId(aid) for aid in data["admin_ids"]]

    if not updates:
        return {"message": "No fields to update"}, 400

    result = db.colleges.update_one({"_id": ObjectId(college_id)}, {"$set": updates})
    if result.matched_count == 0:
        return {"message": "College not found"}, 404

    college = serialize_doc(db.colleges.find_one({"_id": ObjectId(college_id)}))
    return {"item": college}, 200


@colleges_bp.delete("/<college_id>")
@roles_required("super_admin")
def delete_college(college_id):
    db = get_db()
    result = db.colleges.delete_one({"_id": ObjectId(college_id)})
    if result.deleted_count == 0:
        return {"message": "College not found"}, 404
    return {"message": "College deleted"}, 200
