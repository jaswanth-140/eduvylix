from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from ..auth import hash_password, verify_password
from ..db import get_db
from ..utils import serialize_doc

auth_bp = Blueprint("auth", __name__)


def ensure_bootstrap_super_admin(db):
    email = current_app.config["SUPER_ADMIN_EMAIL"]
    existing = db.admins.find_one({"email": email})
    payload = {
        "name": "Platform Super Admin",
        "password_hash": hash_password(current_app.config["SUPER_ADMIN_PASSWORD"]),
        "role": "super_admin",
        "college_id": None,
    }
    if existing:
        db.admins.update_one({"_id": existing["_id"]}, {"$set": payload})
        return
    db.admins.insert_one(
        {
            "name": payload["name"],
            "email": email,
            "password_hash": payload["password_hash"],
            "role": payload["role"],
            "college_id": payload["college_id"],
            "created_at": datetime.now(timezone.utc),
        }
    )


@auth_bp.post("/login")
def login():
    db = get_db()
    ensure_bootstrap_super_admin(db)
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    admin = db.admins.find_one({"email": email})
    if not admin or not verify_password(admin.get("password_hash", ""), password):
        return {"message": "Invalid credentials"}, 401

    token = create_access_token(
        identity=str(admin["_id"]),
        additional_claims={
            "role": admin.get("role"),
            "college_id": str(admin.get("college_id")) if admin.get("college_id") else None,
            "name": admin.get("name"),
        },
    )

    return {
        "access_token": token,
        "admin": {
            "id": str(admin["_id"]),
            "name": admin.get("name"),
            "email": admin.get("email"),
            "role": admin.get("role"),
            "college_id": str(admin.get("college_id")) if admin.get("college_id") else None,
        },
    }, 200


@auth_bp.get("/me")
@jwt_required()
def me():
    db = get_db()
    admin_id = get_jwt_identity()
    admin = db.admins.find_one({"_id": ObjectId(admin_id)})
    if not admin:
        return {"message": "Admin not found"}, 404
    admin = serialize_doc(admin)
    admin.pop("password_hash", None)
    return {"admin": admin}, 200
