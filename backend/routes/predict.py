"""
Prediction routes for ML inference, explainability, logging, and insights.
"""

import os
from datetime import datetime, timedelta

import cv2
import numpy as np
from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from models.damage_model import AnalysisResult, db
from services.ml_pipeline import get_ml_pipeline
from services.ngo_service import get_ngo_service
from utils.image_utils import allowed_file, read_image_rgb, timestamped_filename


predict_bp = Blueprint("predict", __name__, url_prefix="/api")

ml_pipeline = get_ml_pipeline()
ngo_service = get_ngo_service()


def _log(message: str) -> None:
    print(f"[predict] {message}")


def _risk_level(damage_percent: float) -> str:
    if damage_percent < 30:
        return "low"
    if damage_percent <= 60:
        return "medium"
    return "high"


def _generate_heatmap_overlay(image_rgb: np.ndarray, damage_percent: float) -> np.ndarray:
    h, w = image_rgb.shape[:2]
    heatmap = np.zeros((h, w, 3), dtype=np.uint8)

    if damage_percent < 30:
        heatmap[:, :] = [0, 255, 0]
    elif damage_percent < 60:
        heatmap[:, :] = [0, 255, 255]
    else:
        heatmap[:, :] = [0, 0, 255]

    blended = cv2.addWeighted(image_rgb, 0.62, heatmap, 0.38, 0)
    return cv2.cvtColor(blended, cv2.COLOR_RGB2BGR)


def save_disaster_log(
    *,
    filename: str,
    upload_path: str,
    heatmap_rel_path: str,
    shap_rel_path: str | None,
    damage_percent: float,
    damage_class: str,
    confidence: float,
    latitude: float | None,
    longitude: float | None,
    location_name: str | None,
) -> AnalysisResult:
    risk_level = _risk_level(damage_percent)
    record = AnalysisResult(
        image_name=filename,
        original_image_path=upload_path,
        heatmap_image_path=heatmap_rel_path,
        shap_image_path=shap_rel_path,
        damage_percentage=damage_percent,
        damage_class=damage_class,
        confidence_score=confidence,
        risk_level=risk_level,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        total_buildings=1,
        damaged_buildings=1 if damage_percent > 30 else 0,
    )
    db.session.add(record)
    db.session.flush()
    return record


def _prediction_payload(log: AnalysisResult, shap_data_url: str | None, heatmap_rel_path: str) -> dict:
    ngo_name = log.assigned_ngo.name if log.assigned_ngo else None

    return {
        "success": True,
        "damage_class": log.damage_class,
        "damage_percent": log.damage_percent,
        "confidence": log.confidence_score,
        "ngo": ngo_name,
        "shap_image": shap_data_url,
        "shap_image_path": log.shap_image_path,
        "disaster_log_id": log.id,
        "prediction": {
            "damage_class": log.damage_class,
            "damage_percent": log.damage_percent,
            "confidence_score": log.confidence_score,
            "risk_level": log.risk_level,
        },
        "images": {
            "original": log.original_image_path,
            "heatmap": heatmap_rel_path,
            "shap": shap_data_url,
            "shap_path": log.shap_image_path,
        },
        "ngo_assignment": {
            "assigned_ngo": log.assigned_ngo.to_dict() if log.assigned_ngo else None,
            "alert_sent": bool(log.alert_sent),
        },
        "location": {
            "latitude": log.latitude,
            "longitude": log.longitude,
            "location_name": log.location_name,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@predict_bp.route("/predict", methods=["POST"])
def predict_damage():
    try:
        _log(
            "Incoming request "
            f"method={request.method} path={request.path} content_type={request.content_type}"
        )

        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        image_file = request.files["image"]
        if image_file.filename == "":
            return jsonify({"error": "No image selected"}), 400

        if not allowed_file(image_file.filename):
            return jsonify({"error": "Invalid file format. Allowed: png, jpg, jpeg, tif, tiff, webp"}), 400

        latitude = request.form.get("latitude", type=float)
        longitude = request.form.get("longitude", type=float)
        location_name = request.form.get("location_name", type=str)

        filename = secure_filename(
            timestamped_filename("upload", image_file.filename, image_file.filename.rsplit(".", 1)[-1])
        )
        upload_abs_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        upload_rel_path = f"data/uploads/{filename}"
        image_file.save(upload_abs_path)

        image_rgb = read_image_rgb(upload_abs_path)
        if image_rgb is None:
            return jsonify({"error": "Failed to read image"}), 400

        prediction = ml_pipeline.predict(image_rgb)
        if "error" in prediction:
            _log(f"Model prediction failed: {prediction['error']}")
            return jsonify({"error": prediction["error"]}), 500

        damage_percent = float(prediction["damage_percent"])
        damage_class = str(prediction["damage_class"])
        confidence = float(prediction["confidence_score"])
        _log(
            "Model prediction "
            f"class={damage_class} damage_percent={damage_percent:.2f} confidence={confidence:.4f}"
        )

        shap_name = secure_filename(timestamped_filename("shap", image_file.filename, "png"))
        shap_abs_path = os.path.join(current_app.config["OUTPUT_FOLDER"], shap_name)
        shap_rel_path = f"data/outputs/{shap_name}"

        shap_result = ml_pipeline.generate_shap_explanation(image_rgb, output_path=shap_abs_path)
        shap_data_url = shap_result.get("explanation_image")
        if not os.path.exists(shap_abs_path):
            shap_rel_path = None

        heatmap_bgr = _generate_heatmap_overlay(image_rgb, damage_percent)
        heatmap_name = secure_filename(timestamped_filename("heatmap", image_file.filename, "png"))
        heatmap_abs_path = os.path.join(current_app.config["OUTPUT_FOLDER"], heatmap_name)
        cv2.imwrite(heatmap_abs_path, heatmap_bgr)
        heatmap_rel_path = f"data/outputs/{heatmap_name}"

        analysis_result = save_disaster_log(
            filename=filename,
            upload_path=upload_rel_path,
            heatmap_rel_path=heatmap_rel_path,
            shap_rel_path=shap_rel_path,
            damage_percent=damage_percent,
            damage_class=damage_class,
            confidence=confidence,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
        )

        if latitude is not None and longitude is not None:
            ngo_result = ngo_service.assign_ngo_to_disaster(analysis_result)
            if ngo_result.get("success"):
                analysis_result.alert_sent = damage_percent > 60
                db.session.flush()

        db.session.commit()
        return jsonify(_prediction_payload(analysis_result, shap_data_url, heatmap_rel_path)), 200

    except Exception as exc:
        db.session.rollback()
        _log(f"ERROR: {exc}")
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/logs", methods=["GET"])
def get_disaster_logs():
    try:
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)
        risk_level = request.args.get("risk_level", type=str)

        query = AnalysisResult.query
        if risk_level:
            query = query.filter_by(risk_level=risk_level)

        query = query.order_by(AnalysisResult.created_at.desc())
        total = query.count()
        logs = query.limit(limit).offset(offset).all()

        return jsonify(
            {
                "success": True,
                "total": total,
                "limit": limit,
                "offset": offset,
                "logs": [item.to_dict() for item in logs],
            }
        ), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/logs/<int:log_id>", methods=["GET"])
def get_log_detail(log_id):
    try:
        log = AnalysisResult.query.get(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        return jsonify({"success": True, "log": log.to_dict()}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/logs/<int:log_id>", methods=["DELETE"])
def delete_log(log_id):
    try:
        log = AnalysisResult.query.get(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        db.session.delete(log)
        db.session.commit()
        return jsonify({"success": True, "message": "Log deleted"}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/heatmap-data", methods=["GET"])
def get_heatmap_data():
    try:
        logs = AnalysisResult.query.filter(
            AnalysisResult.latitude.isnot(None), AnalysisResult.longitude.isnot(None)
        ).all()

        points = [
            {
                "lat": log.latitude,
                "lng": log.longitude,
                "intensity": (log.damage_percentage or 0.0) / 100.0,
                "damage_class": log.damage_class,
                "damage_percent": log.damage_percent,
                "location_name": log.location_name,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
        return jsonify({"success": True, "points": points, "count": len(points)}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


def _generate_disaster_report(log: AnalysisResult) -> str:
    coord_text = (
        f"({log.latitude}, {log.longitude})"
        if log.latitude is not None and log.longitude is not None
        else "Not specified"
    )
    ngo_name = log.assigned_ngo.name if log.assigned_ngo else "None"

    return f"""
AAPDA DISASTER INTELLIGENCE REPORT
=================================

Report ID: {log.id}
Generated: {log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}
Location: {log.location_name or 'Not specified'}
Coordinates: {coord_text}

Damage Class: {log.damage_class or 'Unknown'}
Damage Percentage: {log.damage_percent:.2f}%
Risk Level: {log.risk_level.upper()}
Model Confidence: {(log.confidence_score or 0.0) * 100:.2f}%

Assigned NGO: {ngo_name}
Alert Sent: {'Yes' if log.alert_sent else 'No'}

Next Review: {(datetime.utcnow() + timedelta(hours=6)).strftime('%Y-%m-%d %H:%M:%S')}
""".strip()


@predict_bp.route("/report/<int:log_id>", methods=["GET"])
def generate_report(log_id):
    try:
        log = AnalysisResult.query.get(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404

        return jsonify(
            {
                "success": True,
                "report": _generate_disaster_report(log),
                "log_id": log_id,
                "generated_at": datetime.utcnow().isoformat(),
            }
        ), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/ml-insights", methods=["GET"])
def get_ml_insights():
    try:
        logs = AnalysisResult.query.all()
        if not logs:
            return jsonify({"success": True, "insights": {}, "message": "No prediction data available yet"}), 200

        avg_damage = float(np.mean([l.damage_percentage for l in logs]))
        avg_conf = float(np.mean([l.confidence_score or 0.0 for l in logs]))

        damage_distribution = {
            "No Damage": len([l for l in logs if l.damage_percentage < 30]),
            "Minor": len([l for l in logs if 30 <= l.damage_percentage < 60]),
            "Major": len([l for l in logs if 60 <= l.damage_percentage < 90]),
            "Destroyed": len([l for l in logs if l.damage_percentage >= 90]),
        }
        risk_distribution = {
            "low": len([l for l in logs if l.risk_level == "low"]),
            "medium": len([l for l in logs if l.risk_level == "medium"]),
            "high": len([l for l in logs if l.risk_level == "high"]),
        }

        feature_importance = ml_pipeline.generate_feature_importance()

        return jsonify(
            {
                "success": True,
                "total_predictions": len(logs),
                "statistics": {
                    "avg_damage_percent": round(avg_damage, 2),
                    "avg_confidence_score": round(avg_conf, 4),
                    "damage_distribution": damage_distribution,
                    "risk_distribution": risk_distribution,
                },
                "feature_importance": feature_importance.get("top_features", []),
                "insights": {
                    "total_high_risk_events": risk_distribution["high"],
                    "average_damage_category": "Minor" if avg_damage < 30 else "Moderate" if avg_damage < 60 else "Severe",
                },
            }
        ), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@predict_bp.route("/campaigns", methods=["GET"])
def get_dynamic_campaigns():
    try:
        recent_logs = AnalysisResult.query.order_by(AnalysisResult.created_at.desc()).limit(100).all()
        campaigns = []

        high_damage_count = len([l for l in recent_logs if l.damage_percentage > 60])
        if high_damage_count >= 3:
            campaigns.append(
                {
                    "id": "urgent_relief_" + datetime.now().strftime("%Y%m%d"),
                    "title": "URGENT: Disaster Relief Campaign",
                    "description": f"{high_damage_count} severe damage incidents detected. Immediate relief needed.",
                    "severity": "critical",
                    "status": "active",
                    "target_amount": 100000,
                    "beneficiaries": high_damage_count * 50,
                    "priority": 1,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )

        medium_count = len([l for l in recent_logs if l.risk_level == "medium"])
        if medium_count >= 5:
            campaigns.append(
                {
                    "id": "awareness_" + datetime.now().strftime("%Y%m%d"),
                    "title": "Disaster Awareness Program",
                    "description": f"{medium_count} moderate-risk incidents in the region. Community sensitization needed.",
                    "severity": "high",
                    "status": "active",
                    "target_amount": 50000,
                    "beneficiaries": medium_count * 30,
                    "priority": 2,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )

        if recent_logs:
            campaigns.append(
                {
                    "id": "recovery_" + datetime.now().strftime("%Y%m%d"),
                    "title": "Community Recovery Support",
                    "description": "Supporting affected communities with rehabilitation and support services.",
                    "severity": "medium",
                    "status": "active",
                    "target_amount": 75000,
                    "beneficiaries": len(recent_logs) * 20,
                    "priority": 3,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )

        return jsonify(
            {
                "success": True,
                "campaigns": campaigns,
                "total_active": len(campaigns),
                "generated_at": datetime.utcnow().isoformat(),
            }
        ), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
