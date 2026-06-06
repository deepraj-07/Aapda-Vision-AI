import random


def analyze_disaster_image(image_path: str) -> dict:
    # Placeholder logic until real inference models are wired.
    _ = image_path
    buildings_detected = random.randint(5, 40)
    damaged_buildings = random.randint(0, buildings_detected)
    damage_percent = round((damaged_buildings / max(buildings_detected, 1)) * 100)

    if damage_percent <= 10:
        risk_level = "LOW"
    elif damage_percent <= 30:
        risk_level = "MODERATE"
    else:
        risk_level = "SEVERE"

    return {
        "buildings_detected": buildings_detected,
        "damaged_buildings": damaged_buildings,
        "damage_percent": damage_percent,
        "risk_level": risk_level,
    }
