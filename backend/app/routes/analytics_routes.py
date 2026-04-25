from datetime import datetime, timedelta, timezone

from bson import ObjectId
from flask import Blueprint, request

from ..auth import roles_required
from ..db import get_db


def _iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else None


def _pick_snapshot_from_update(update_doc, which: str):
    if not update_doc:
        return None
    if which == "previous":
        return update_doc.get("previous") or {}
    return update_doc.get("new") or {}


def _trend_label(delta_score: float) -> str:
    if delta_score > 0:
        return "improving"
    if delta_score < 0:
        return "declining"
    return "stable"

analytics_bp = Blueprint("analytics", __name__)


def _maybe_object_id(value: str):
    try:
        return ObjectId(value)
    except Exception:
        return None


def _safe_int(value: str):
    try:
        return int(value)
    except Exception:
        return None


def _admin_scope_filters():
    """Build base filters for admin dashboards.

    - college_admin is auto-scoped to its college_id
    - Supports optional college_id/department/year filters
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    role = claims.get("role")

    students_filters = {}
    updates_filters = {"status": {"$in": ["applied", "approved"]}}

    if role == "college_admin" and claims.get("college_id"):
        cid = _maybe_object_id(claims.get("college_id"))
        if cid:
            students_filters["college_id"] = cid
            updates_filters["college_id"] = cid

    college_id = request.args.get("college_id")
    department = request.args.get("department")
    year = request.args.get("year")

    if college_id:
        cid = _maybe_object_id(college_id)
        if cid:
            students_filters["college_id"] = cid
            updates_filters["college_id"] = cid

    if department:
        students_filters["department"] = department.strip()
        updates_filters["department"] = department.strip()

    if year:
        y = _safe_int(year)
        if y is not None:
            students_filters["year"] = y
            updates_filters["year"] = y

    return students_filters, updates_filters


@analytics_bp.get("/dashboard")
@roles_required("college_admin", "super_admin")
def analytics_dashboard():
    db = get_db()
    students_filters, updates_filters = _admin_scope_filters()

    now = datetime.now(timezone.utc)
    daily_start = now - timedelta(days=84)
    monthly_start = now - timedelta(days=365)

    # KPIs from students collection
    kpi_pipeline = [
        {"$match": students_filters},
        {
            "$group": {
                "_id": None,
                "students": {"$sum": 1},
                "avg_discipline_score": {"$avg": "$discipline_score"},
                "avg_behavior": {"$avg": "$behavior"},
                "best_rank_global": {"$min": "$rank_global"},
                "best_rank_college": {"$min": "$rank_college"},
            }
        },
    ]
    kpi = list(db.students.aggregate(kpi_pipeline))
    kpi = kpi[0] if kpi else {}

    def _r(v, nd=2):
        try:
            return round(float(v), nd)
        except Exception:
            return 0

    kpis = {
        "students": int(kpi.get("students", 0) or 0),
        "avg": {
            "discipline_score": _r(kpi.get("avg_discipline_score", 0), 2),
            "behavior": _r(kpi.get("avg_behavior", 0), 2),
        },
        "best": {
            "rank_global": int(kpi.get("best_rank_global") or 0) if kpi.get("best_rank_global") is not None else None,
            "rank_college": int(kpi.get("best_rank_college") or 0) if kpi.get("best_rank_college") is not None else None,
        },
    }

    # Daily time series from discipline_updates (avg of new snapshot)
    daily_pipeline = [
        {"$match": {**updates_filters, "created_at": {"$gte": daily_start, "$lte": now}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "updates": {"$sum": 1},
                "avg_discipline_score": {"$avg": "$new.discipline_score"},
                "avg_behavior": {"$avg": "$new.behavior"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    daily = list(db.discipline_updates.aggregate(daily_pipeline))
    daily_series = [
        {
            "date": d.get("_id"),
            "updates": int(d.get("updates", 0) or 0),
            "discipline_score": _r(d.get("avg_discipline_score", 0), 2),
            "behavior": _r(d.get("avg_behavior", 0), 2),
        }
        for d in daily
    ]

    # Monthly behavior averages
    monthly_pipeline = [
        {"$match": {**updates_filters, "created_at": {"$gte": monthly_start, "$lte": now}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
                "avg_behavior": {"$avg": "$new.behavior"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    monthly = list(db.discipline_updates.aggregate(monthly_pipeline))
    monthly_behavior = [
        {"month": m.get("_id"), "behavior": _r(m.get("avg_behavior", 0), 2)} for m in monthly
    ]

    # Trend deltas (last 7 days vs previous 7 days)
    def _avg_last_n(items, n, key):
        tail = items[-n:] if len(items) >= 1 else []
        if not tail:
            return 0
        return sum(float(x.get(key, 0) or 0) for x in tail) / len(tail)

    last7 = daily_series[-7:]
    prev7 = daily_series[-14:-7]
    def _avg(items, key):
        if not items:
            return 0
        return sum(float(x.get(key, 0) or 0) for x in items) / len(items)

    trends = {
        "weekly": {
            "discipline_score": _r(_avg(last7, "discipline_score") - _avg(prev7, "discipline_score"), 2),
            "behavior": _r(_avg(last7, "behavior") - _avg(prev7, "behavior"), 2),
        }
    }

    # Summary blocks
    total_reports = db.discipline_updates.count_documents({**updates_filters, "created_at": {"$gte": monthly_start, "$lte": now}})
    improvement_rate = 0
    if len(daily_series) >= 2:
        first = daily_series[0].get("discipline_score", 0)
        last = daily_series[-1].get("discipline_score", 0)
        if float(first) != 0:
            improvement_rate = _r(((float(last) - float(first)) / abs(float(first))) * 100.0, 2)

    performance = {
        "total_reports": int(total_reports or 0),
        "weekly_performance_score": _r(_avg(last7, "discipline_score"), 2),
        "improvement_rate": improvement_rate,
    }

    return {
        "kpis": kpis,
        "trends": trends,
        "daily": daily_series,
        "monthly_behavior": monthly_behavior,
        "performance": performance,
        "generated_at": _iso(now),
    }, 200


@analytics_bp.get("/recent-activity")
@roles_required("college_admin", "super_admin")
def recent_activity():
    db = get_db()
    _, updates_filters = _admin_scope_filters()

    query = {**updates_filters}
    items = list(db.discipline_updates.find(query).sort([("created_at", -1)]).limit(20))

    student_ids = [i.get("student_id") for i in items if i.get("student_id")]
    students = {
        s.get("_id"): s
        for s in db.students.find({"_id": {"$in": student_ids}}, {"name": 1, "roll_number": 1, "department": 1, "year": 1, "college_id": 1})
    }

    result = []
    for it in items:
        st = students.get(it.get("student_id")) or {}
        created_by = it.get("created_by") or {}
        result.append(
            {
                "id": str(it.get("_id")),
                "timestamp": _iso(it.get("applied_at") or it.get("created_at")),
                "student": {
                    "id": str(it.get("student_id")) if it.get("student_id") else None,
                    "name": st.get("name"),
                    "roll_number": st.get("roll_number"),
                    "department": st.get("department"),
                    "year": st.get("year"),
                },
                "category": it.get("category"),
                "reason": it.get("reason"),
                "delta": (it.get("delta") or {}).get("discipline_score"),
                "status": it.get("status"),
                "actor": {
                    "name": created_by.get("name") or "Admin",
                    "role": created_by.get("role") or "admin",
                },
                "suspicious": bool(it.get("suspicious")),
            }
        )

    return {"items": result}, 200


@analytics_bp.get("/trends/<student_id>")
@roles_required("college_admin", "super_admin")
def score_trends(student_id):
    db = get_db()
    student = db.students.find_one({"_id": ObjectId(student_id)}, {"name": 1})
    if not student:
        return {"message": "Student not found"}, 404

    query = {
        "student_id": student.get("_id"),
        "status": {"$in": ["applied", "approved"]},
    }
    items = list(db.discipline_updates.find(query).sort([("created_at", 1)]))
    trends = []
    for item in items:
        new_data = item.get("new") or {}
        timestamp = item.get("applied_at") or item.get("created_at")
        if new_data and timestamp:
            trends.append(
                {
                    "timestamp": timestamp,
                    "discipline_score": new_data.get("discipline_score"),
                    "behavior": new_data.get("behavior"),
                }
            )
    return {"student_id": student_id, "student_name": student.get("name"), "trends": trends}, 200


@analytics_bp.get("/weekly-report")
@roles_required("college_admin", "super_admin")
def weekly_report():
    db = get_db()
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    pipeline = [
        {"$match": {"created_at": {"$gte": one_week_ago}, "status": {"$in": ["applied", "approved"]}}},
        {
            "$group": {
                "_id": "$college_id",
                "updates_count": {"$sum": 1},
                "avg_score": {"$avg": "$new.discipline_score"},
            }
        },
    ]

    report = list(db.discipline_updates.aggregate(pipeline))
    for item in report:
        item["college_id"] = str(item.pop("_id"))
        item["avg_score"] = round(item.get("avg_score", 0), 2)

    return {"items": report}, 200


@analytics_bp.get("/badges")
@roles_required("college_admin", "super_admin")
def badges():
    db = get_db()
    best_discipline = db.students.find_one(sort=[("discipline_score", -1)])
    best_behavior = db.students.find_one(sort=[("behavior", -1)])

    result = {
        "best_discipline": {
            "title": "Best Discipline",
            "student": best_discipline.get("name") if best_discipline else None,
            "score": best_discipline.get("discipline_score") if best_discipline else None,
        },
        "best_behavior": {
            "title": "Best Behavior",
            "student": best_behavior.get("name") if best_behavior else None,
            "score": best_behavior.get("behavior") if best_behavior else None,
        },
    }
    return result, 200


@analytics_bp.get("/ai-suggestions/<student_id>")
@roles_required("college_admin", "super_admin")
def ai_suggestions(student_id):
    db = get_db()
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404

    suggestions = []
    if student.get("behavior", 0) < 70:
        suggestions.append("Join mentorship and behavior feedback sessions every fortnight.")
    if not suggestions:
        suggestions.append("Maintain current consistency and target leadership opportunities.")

    return {
        "student_id": student_id,
        "discipline_score": student.get("discipline_score", 0),
        "suggestions": suggestions,
    }, 200


@analytics_bp.get("/student-report/<student_id>")
def student_report(student_id):
    db = get_db()
    student = db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return {"message": "Student not found"}, 404

    period = (request.args.get("period") or "weekly").strip().lower()
    if period not in ["weekly", "monthly"]:
        return {"message": "period must be weekly or monthly"}, 400

    now = datetime.now(timezone.utc)
    days = 7 if period == "weekly" else 30
    start_at = now - timedelta(days=days)

    query = {
        "student_id": student.get("_id"),
        "status": {"$in": ["applied", "approved"]},
    }

    updates_in_period = list(
        db.discipline_updates.find(
            {**query, "created_at": {"$gte": start_at, "$lte": now}},
        ).sort([("created_at", 1)])
    )

    baseline = db.discipline_updates.find_one(
        {**query, "created_at": {"$lt": start_at}},
        sort=[("created_at", -1)],
    )

    if updates_in_period:
        start_snapshot = _pick_snapshot_from_update(baseline, "new") or _pick_snapshot_from_update(
            updates_in_period[0], "previous"
        )
        end_snapshot = _pick_snapshot_from_update(updates_in_period[-1], "new")
    else:
        # No changes in period; treat current as both start and end.
        start_snapshot = {
            "behavior": student.get("behavior", 0),
            "discipline_score": student.get("discipline_score", 0),
        }
        end_snapshot = dict(start_snapshot)

    delta_score = round(float(end_snapshot.get("discipline_score", 0)) - float(start_snapshot.get("discipline_score", 0)), 2)
    delta_behavior = round(float(end_snapshot.get("behavior", 0)) - float(start_snapshot.get("behavior", 0)), 2)

    categories = {}
    for u in updates_in_period:
        cat = u.get("category") or "Other"
        categories[cat] = categories.get(cat, 0) + 1

    series = []
    for u in updates_in_period:
        snapshot = u.get("new") or {}
        series.append(
            {
                "timestamp": u.get("applied_at") or u.get("created_at"),
                "discipline_score": snapshot.get("discipline_score"),
                "behavior": snapshot.get("behavior"),
            }
        )

    return {
        "student": {
            "id": str(student.get("_id")),
            "name": student.get("name"),
            "roll_number": student.get("roll_number"),
            "department": student.get("department"),
            "year": student.get("year"),
            "college_id": str(student.get("college_id")) if student.get("college_id") else None,
        },
        "period": period,
        "start_at": _iso(start_at),
        "end_at": _iso(now),
        "current": {
            "behavior": student.get("behavior", 0),
            "discipline_score": student.get("discipline_score", 0),
        },
        "summary": {
            "updates_count": len(updates_in_period),
            "categories": categories,
            "trend": _trend_label(delta_score),
        },
        "change": {
            "start": start_snapshot,
            "end": end_snapshot,
            "delta": {
                "discipline_score": delta_score,
                "behavior": delta_behavior,
            },
        },
        "series": series,
    }, 200
