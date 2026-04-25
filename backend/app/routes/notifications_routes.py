from bson import ObjectId
from flask import Blueprint
from flask_jwt_extended import get_jwt

from ..auth import roles_required
from ..db import get_db
from ..utils import serialize_doc

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("")
@roles_required("college_admin", "super_admin")
def list_notifications():
    db = get_db()
    claims = get_jwt()

    filters = {}
    if claims.get("role") == "college_admin":
        filters["college_id"] = ObjectId(claims["college_id"])

    items = [
        serialize_doc(item)
        for item in db.notifications.find(filters).sort([("created_at", -1)]).limit(50)
    ]
    unread = db.notifications.count_documents({**filters, "is_read": False})
    return {"items": items, "unread_count": unread}, 200


@notifications_bp.patch("/<notification_id>/read")
@roles_required("college_admin", "super_admin")
def mark_as_read(notification_id):
    db = get_db()
    claims = get_jwt()
    notification = db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not notification:
        return {"message": "Notification not found"}, 404

    if claims.get("role") == "college_admin" and str(notification.get("college_id")) != claims.get("college_id"):
        return {"message": "Forbidden"}, 403

    db.notifications.update_one({"_id": ObjectId(notification_id)}, {"$set": {"is_read": True}})
    return {"message": "Notification marked as read"}, 200
