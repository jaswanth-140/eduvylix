from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    return check_password_hash(password_hash, password)


def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"message": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
