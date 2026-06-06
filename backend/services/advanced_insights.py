"""Advanced ML-driven disaster insights and analytics."""

import numpy as np
from datetime import datetime, timedelta
from models.damage_model import AnalysisResult, db


def get_damage_trend(location_name: str = None, lat: float = None, lng: float = None, days: int = 30) -> dict:
    """
    Analyze damage trend over time for a specific location.
    Returns progression stats and risk trajectory.
    """
    query = AnalysisResult.query
    
    if location_name:
        query = query.filter(AnalysisResult.location_name == location_name)
    elif lat is not None and lng is not None:
        # Find nearby records (within ~5km radius)
        query = query.filter(
            AnalysisResult.latitude.between(lat - 0.05, lat + 0.05),
            AnalysisResult.longitude.between(lng - 0.05, lng + 0.05)
        )
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    records = query.filter(AnalysisResult.created_at >= cutoff).order_by(AnalysisResult.created_at.asc()).all()
    
    if not records:
        return {
            "trend": "insufficient_data",
            "records_count": 0,
            "message": "Not enough historical data for trend analysis"
        }
    
    damage_percentages = [r.damage_percentage for r in records]
    building_counts = [r.total_buildings for r in records]
    
    # Calculate trend direction
    if len(damage_percentages) >= 2:
        trend_slope = (damage_percentages[-1] - damage_percentages[0]) / len(damage_percentages)
        if trend_slope > 2:
            trend = "deteriorating"
        elif trend_slope < -2:
            trend = "improving"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    return {
        "trend": trend,
        "records_count": len(records),
        "avg_damage_percent": float(np.mean(damage_percentages)),
        "max_damage_percent": float(np.max(damage_percentages)),
        "min_damage_percent": float(np.min(damage_percentages)),
        "avg_buildings": int(np.mean(building_counts)),
        "timeline": [
            {
                "timestamp": r.created_at.isoformat() if r.created_at else None,
                "damage_percent": round(r.damage_percentage, 2),
                "total_buildings": r.total_buildings,
                "risk_level": r.risk_level
            }
            for r in records[-10:]  # Last 10 records
        ]
    }


def get_building_risk_scores(boxes: list[dict], damage_class: str = None) -> dict:
    """
    Calculate individual building risk scores based on detection confidence and damage class.
    """
    if not boxes:
        return {
            "average_risk": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0,
            "buildings_analyzed": 0
        }
    
    risk_scores = []
    for box in boxes:
        confidence = float(box.get("confidence", 0.5))
        class_name = str(box.get("class", "")).lower()
        
        # Risk is higher for damaged buildings with high confidence
        if "damage" in class_name or "destroy" in class_name:
            risk = confidence * 0.9 + 0.1  # Scale: 0.1 to 1.0
        elif "minor" in class_name or "low" in class_name:
            risk = confidence * 0.5  # Scale: 0 to 0.5
        else:
            risk = confidence * 0.15  # Safe buildings still have minimal risk
        
        risk_scores.append({
            "risk_score": round(risk, 3),
            "confidence": round(confidence, 3),
            "class": class_name
        })
    
    risk_array = np.array([r["risk_score"] for r in risk_scores])
    
    return {
        "average_risk": float(np.mean(risk_array)),
        "high_risk_count": int(np.sum(risk_array > 0.7)),
        "medium_risk_count": int(np.sum((risk_array > 0.3) & (risk_array <= 0.7))),
        "low_risk_count": int(np.sum(risk_array <= 0.3)),
        "buildings_analyzed": len(risk_scores),
        "risk_distribution": risk_scores[:20]  # Top 20 for UI
    }


def get_resource_recommendations(damage_percent: float, total_buildings: int, damaged_buildings: int) -> dict:
    """
    Provide resource allocation recommendations based on damage assessment.
    """
    damage_density = damaged_buildings / max(total_buildings, 1)
    
    # Determine urgency
    if damage_percent > 70 and damage_density > 0.6:
        urgency = "critical"
        response_teams = 5
        ambulances = "8+"
        est_hours = "2-4"
    elif damage_percent > 50 and damage_density > 0.4:
        urgency = "high"
        response_teams = 3
        ambulances = "5-6"
        est_hours = "4-8"
    elif damage_percent > 30 and damage_density > 0.2:
        urgency = "medium"
        response_teams = 2
        ambulances = "2-3"
        est_hours = "8-24"
    else:
        urgency = "low"
        response_teams = 1
        ambulances = "1"
        est_hours = "24+"
    
    return {
        "urgency_level": urgency,
        "recommended_teams": response_teams,
        "estimated_ambulances": ambulances,
        "estimated_response_time": est_hours,
        "priority_zones": int(damaged_buildings),
        "additional_notes": f"Focus on {min(int(damaged_buildings), 10)}-building clusters for maximum efficiency"
    }


def get_location_statistics(location_name: str = None, radius_km: float = 5) -> dict:
    """
    Aggregate statistics for a location from all historical analyses.
    """
    query = AnalysisResult.query
    
    if location_name:
        query = query.filter(AnalysisResult.location_name.ilike(f"%{location_name}%"))
    
    records = query.all()
    
    if not records:
        return {
            "location": location_name or "Unknown",
            "analysis_count": 0,
            "message": "No analysis data available for this location"
        }
    
    damage_scores = [r.damage_percentage for r in records if r.damage_percentage]
    building_counts = [r.total_buildings for r in records if r.total_buildings]
    
    return {
        "location": location_name or "Unknown",
        "analysis_count": len(records),
        "avg_damage_percent": round(float(np.mean(damage_scores)), 2) if damage_scores else 0,
        "median_damage_percent": round(float(np.median(damage_scores)), 2) if damage_scores else 0,
        "peak_damage_percent": round(float(np.max(damage_scores)), 2) if damage_scores else 0,
        "avg_buildings_per_analysis": int(np.mean(building_counts)) if building_counts else 0,
        "total_unique_analyses": len(records),
        "last_analysis": max(r.created_at for r in records).isoformat() if records else None
    }
