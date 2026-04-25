from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request

from ..auth import hash_password, roles_required
from ..db import get_db
from ..utils import serialize_doc

admins_bp = Blueprint("admins", __name__)


@admins_bp.get("")
@roles_required("super_admin")
def list_admins():
    db = get_db()
    admins = [serialize_doc(a) for a in db.admins.find({}, {"password_hash": 0})]
    return {"items": admins}, 200


@admins_bp.post("")
@roles_required("super_admin")
def create_admin():
    db = get_db()
    data = request.get_json(silent=True) or {}

    required = ["name", "email", "password", "role"]
    if any(not data.get(field) for field in required):
        return {"message": "Missing required fields"}, 400

    if data["role"] != "college_admin":
        return {"message": "Only college_admin can be created"}, 400

    email = data["email"].strip().lower()
    if db.admins.find_one({"email": email}):
        return {"message": "Email already exists"}, 409

    college_id = data.get("college_id")
    if data["role"] == "college_admin" and not college_id:
        return {"message": "college_id is required for college_admin"}, 400

    payload = {
        "name": data["name"].strip(),
        "email": email,
        "password_hash": hash_password(data["password"]),
        "role": data["role"],
        "college_id": ObjectId(college_id) if college_id else None,
        "created_at": datetime.now(timezone.utc),
    }

    result = db.admins.insert_one(payload)
    payload["_id"] = result.inserted_id
    admin = serialize_doc(payload)
    admin.pop("password_hash", None)
    return {"item": admin}, 201


@admins_bp.delete("/<admin_id>")
@roles_required("super_admin")
def delete_admin(admin_id):
    db = get_db()
    result = db.admins.delete_one({"_id": ObjectId(admin_id)})
    if result.deleted_count == 0:
        return {"message": "Admin not found"}, 404
    return {"message": "Admin deleted"}, 200
