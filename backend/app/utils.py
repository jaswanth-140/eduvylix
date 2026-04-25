from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Tuple

from bson import ObjectId


DISCIPLINE_JUSTIFICATION_CATEGORIES = [
    "Behavior Issue",
    "Good Performance",
    "Contribution",
    "Other",
]


def calculate_discipline_score(attendance: float, behavior: float, participation: float) -> float:
    # Attendance and participation are deprecated; behavior drives score now.
    score = behavior
    return round(score, 2)


def normalize_discipline_metrics(payload: dict, fallback: Optional[dict] = None) -> dict:
    fallback = fallback or {}

    def _safe_float(value, default=0.0):
        try:
            if value is None or value == "":
                return float(default)
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    attendance = 0.0
    behavior = _safe_float(payload.get("behavior"), fallback.get("behavior", 0))
    participation = 0.0
    # Allow penalty-style negative values while keeping metrics bounded.
    behavior = max(-100.0, min(100.0, behavior))
    score = calculate_discipline_score(attendance, behavior, participation)
    return {
        "attendance": attendance,
        "behavior": behavior,
        "participation": participation,
        "discipline_score": score,
    }


def validate_justification(data: dict) -> Tuple[Optional[dict], Optional[str]]:
    justification = (data or {}).get("justification") or {}
    reason = (justification.get("reason") or "").strip()
    category = (justification.get("category") or "").strip()
    details = (justification.get("details") or "").strip()

    if not reason:
        return None, "Justification reason is required"
    if category not in DISCIPLINE_JUSTIFICATION_CATEGORIES:
        return None, "Invalid justification category"
    return {
        "reason": reason,
        "category": category,
        "details": details or None,
    }, None


def compute_discipline_delta(previous: dict, new: dict) -> dict:
    return {
        "attendance": round(float(new.get("attendance", 0)) - float(previous.get("attendance", 0)), 2),
        "behavior": round(float(new.get("behavior", 0)) - float(previous.get("behavior", 0)), 2),
        "participation": round(float(new.get("participation", 0)) - float(previous.get("participation", 0)), 2),
        "discipline_score": round(
            float(new.get("discipline_score", 0)) - float(previous.get("discipline_score", 0)),
            2,
        ),
    }


def classify_discipline_update(delta: dict, config) -> tuple[bool, bool, list[str]]:
    """Returns (requires_approval, suspicious, flags)."""
    def _cfg(key: str, default: float) -> float:
        if hasattr(config, "get"):
            try:
                value = config.get(key, default)
                return float(value)
            except (TypeError, ValueError):
                return float(default)
        try:
            return float(getattr(config, key, default))
        except (TypeError, ValueError):
            return float(default)

    flags: list[str] = []
    score_delta = abs(float(delta.get("discipline_score", 0)))
    metric_delta = max(
        abs(float(delta.get("attendance", 0))),
        abs(float(delta.get("behavior", 0))),
        abs(float(delta.get("participation", 0))),
    )

    requires_approval = score_delta >= _cfg("MAJOR_SCORE_DELTA_THRESHOLD", 15) or metric_delta >= _cfg(
        "MAJOR_METRIC_DELTA_THRESHOLD", 30
    )

    suspicious = score_delta >= _cfg("SUSPICIOUS_SCORE_DELTA_THRESHOLD", 25) or metric_delta >= _cfg(
        "SUSPICIOUS_METRIC_DELTA_THRESHOLD", 45
    )
    if suspicious:
        if score_delta >= _cfg("SUSPICIOUS_SCORE_DELTA_THRESHOLD", 25):
            flags.append("large_score_change")
        if metric_delta >= _cfg("SUSPICIOUS_METRIC_DELTA_THRESHOLD", 45):
            flags.append("large_metric_change")
    return requires_approval, suspicious, flags


def _make_json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: _make_json_safe(val) for key, val in value.items()}
    return value


def serialize_doc(doc):
    if not doc:
        return None
    return _make_json_safe(doc)


def append_score_history(student: dict, updated_by: ObjectId, reason: str = "manual_update") -> dict:
    history_entry = {
        "timestamp": datetime.now(timezone.utc),
        "updated_by": updated_by,
        "reason": reason,
        "previous": {
            "attendance": student.get("attendance", 0),
            "behavior": student.get("behavior", 0),
            "participation": student.get("participation", 0),
            "discipline_score": student.get("discipline_score", 0),
        },
    }
    history = student.get("history", [])
    history.append(history_entry)
    return history


def create_notification(db, student: dict, message: str, event_type: str = "score_update"):
    db.notifications.insert_one(
        {
            "student_id": student.get("_id"),
            "college_id": student.get("college_id"),
            "message": message,
            "event_type": event_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
    )


def recalculate_ranks(db):
    students_collection = db.students
    students = list(
        students_collection.find(
            {},
            {
                "_id": 1,
                "college_id": 1,
                "department": 1,
                "discipline_score": 1,
                "name": 1,
            },
        )
    )

    sorted_global = sorted(
        students,
        key=lambda s: (-s.get("discipline_score", 0), s.get("name", "")),
    )

    for rank, student in enumerate(sorted_global, start=1):
        students_collection.update_one(
            {"_id": student["_id"]},
            {"$set": {"rank_global": rank}},
        )

    college_groups = defaultdict(list)
    department_groups = defaultdict(list)
    for student in students:
        college_groups[str(student.get("college_id"))].append(student)
        department_groups[
            f"{student.get('college_id')}::{student.get('department', '').strip().lower()}"
        ].append(student)

    for group_students in college_groups.values():
        ranked = sorted(
            group_students,
            key=lambda s: (-s.get("discipline_score", 0), s.get("name", "")),
        )
        for rank, student in enumerate(ranked, start=1):
            students_collection.update_one(
                {"_id": student["_id"]},
                {"$set": {"rank_college": rank}},
            )

    for group_students in department_groups.values():
        ranked = sorted(
            group_students,
            key=lambda s: (-s.get("discipline_score", 0), s.get("name", "")),
        )
        for rank, student in enumerate(ranked, start=1):
            students_collection.update_one(
                {"_id": student["_id"]},
                {"$set": {"rank_department": rank}},
            )
