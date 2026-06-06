from datetime import datetime

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class NGOList(db.Model):
    __tablename__ = "ngo_list"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(32), nullable=True)
    specialization = db.Column(db.String(255), nullable=True)
    service_radius_km = db.Column(db.Float, default=50.0)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "specialization": self.specialization,
            "service_radius_km": self.service_radius_km,
            "active": self.active,
        }


class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"

    id = db.Column(db.Integer, primary_key=True)
    image_name = db.Column(db.String(255), nullable=False)
    original_image_path = db.Column(db.String(512), nullable=False)
    detection_image_path = db.Column(db.String(512), nullable=True)
    heatmap_image_path = db.Column(db.String(512), nullable=True)
    shap_image_path = db.Column(db.String(512), nullable=True)

    total_buildings = db.Column(db.Integer, nullable=False, default=0)
    damaged_buildings = db.Column(db.Integer, nullable=False, default=0)

    damage_percentage = db.Column(db.Float, nullable=False, default=0.0)
    damage_class = db.Column(db.String(100), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    risk_level = db.Column(db.String(50), nullable=False, default="low")

    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    location_name = db.Column(db.String(255), nullable=True)

    assigned_ngo_id = db.Column(db.Integer, db.ForeignKey("ngo_list.id"), nullable=True)
    assigned_ngo = db.relationship("NGOList", backref="disaster_logs")
    alert_sent = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def damage_percent(self) -> float:
        return float(self.damage_percentage or 0.0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "image_name": self.image_name,
            "original_image_path": self.original_image_path,
            "detection_image_path": self.detection_image_path,
            "heatmap_image_path": self.heatmap_image_path,
            "shap_image_path": self.shap_image_path,
            "total_buildings": self.total_buildings,
            "damaged_buildings": self.damaged_buildings,
            "damage_percentage": self.damage_percentage,
            "damage_percent": self.damage_percent,
            "damage_class": self.damage_class,
            "confidence_score": self.confidence_score,
            "risk_level": self.risk_level,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "location_name": self.location_name,
            "assigned_ngo": self.assigned_ngo.to_dict() if self.assigned_ngo else None,
            "assigned_ngo_id": self.assigned_ngo_id,
            "alert_sent": self.alert_sent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
