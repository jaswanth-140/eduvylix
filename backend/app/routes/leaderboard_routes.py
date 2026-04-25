from bson import ObjectId
from flask import Blueprint, request

from ..db import get_db
from ..utils import serialize_doc

leaderboard_bp = Blueprint("leaderboard", __name__)


def _build_filters(base_filters=None):
    filters = base_filters or {}
    college_id = request.args.get("college_id")
    department = request.args.get("department")
    year = request.args.get("year")
    search = request.args.get("search")

    if college_id:
        filters["college_id"] = ObjectId(college_id)
    if department:
        filters["department"] = department.strip()
    if year:
        try:
            filters["year"] = int(year)
        except ValueError:
            pass
    if search:
        filters["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"roll_number": {"$regex": search, "$options": "i"}},
        ]
    return filters


@leaderboard_bp.get("/global")
def global_leaderboard():
    db = get_db()
    filters = _build_filters()
    students = list(
        db.students.find(filters).sort(
            [(request.args.get("sort_by", "discipline_score"), -1), ("name", 1)]
        )
    )
    college_ids = list({s.get("college_id") for s in students if s.get("college_id")})
    colleges = {
        c.get("_id"): c.get("name")
        for c in db.colleges.find({"_id": {"$in": college_ids}}, {"name": 1})
    }
    for s in students:
        s["college_name"] = colleges.get(s.get("college_id"))
    return {"items": [serialize_doc(s) for s in students]}, 200


@leaderboard_bp.get("/college/<college_id>")
def college_leaderboard(college_id):
    db = get_db()
    filters = _build_filters({"college_id": ObjectId(college_id)})
    students = list(db.students.find(filters).sort([("discipline_score", -1), ("name", 1)]))
    college = db.colleges.find_one({"_id": ObjectId(college_id)}, {"name": 1})
    for s in students:
        s["college_name"] = (college or {}).get("name")
    return {"items": [serialize_doc(s) for s in students]}, 200


@leaderboard_bp.get("/department")
def department_leaderboard():
    db = get_db()
    college_id = request.args.get("college_id")
    department = request.args.get("department")
    if not college_id or not department:
        return {"message": "college_id and department are required"}, 400

    filters = {
        "college_id": ObjectId(college_id),
        "department": department,
    }
    students = list(db.students.find(filters).sort([("discipline_score", -1), ("name", 1)]))
    college = db.colleges.find_one({"_id": ObjectId(college_id)}, {"name": 1})
    for s in students:
        s["college_name"] = (college or {}).get("name")
    return {"items": [serialize_doc(s) for s in students]}, 200
