const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

export function toBackendImageUrl(path) {
  if (!path) {
    return "";
  }

  const normalized = String(path).replace(/\\/g, "/");
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("data/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  return `${API_BASE_URL}/${normalized.replace(/^\/+/, "")}`;
}

export async function uploadImage(file) {
  if (!file) {
    throw new Error("No image selected");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/upload-image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Upload failed";
    try {
      const errorPayload = await response.json();
      message = errorPayload?.error || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const data = await response.json();
  return {
    image_path: data.image_path || data.filename || file.name,
    analysis: data.analysis || null,
  };
}

export async function analyzeImage({ file, imagePath, lat, lng, locationName }) {
  if (!file && !imagePath) {
    throw new Error("No image selected");
  }

  let serverImagePath = imagePath;
  if (!serverImagePath && file) {
    const uploadResult = await uploadImage(file);
    serverImagePath = uploadResult.image_path;
  }

  if (!serverImagePath) {
    throw new Error("No image selected");
  }

  const analyzePayload = {
    image_path: serverImagePath,
    lat: lat !== null && lat !== undefined && lat !== "" ? Number(lat) : null,
    lng: lng !== null && lng !== undefined && lng !== "" ? Number(lng) : null,
  };

  if (locationName) {
    analyzePayload.location_name = locationName;
  }

  const requestAnalysis = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyzePayload),
    });

    if (!response.ok) {
      let message = "Analysis failed";
      try {
        const errorPayload = await response.json();
        message = errorPayload?.error || message;
      } catch {
        // keep fallback message
      }
      throw new Error(message);
    }

    return response.json();
  };

  try {
    const data = await requestAnalysis("/analyze-damage");
    console.log("[api.analyzeImage] Raw analyze response:", data);
    
    const normalized = {
      ...data,
      analysis_id: data.analysis_id ?? data.disaster_log_id,
      damage_percent: data.damage_percent ?? data.damage_percentage ?? 0,
      damage_percentage: data.damage_percentage ?? data.damage_percent ?? 0,
      risk_level: data.risk_level,
      confidence_score: data.confidence_score ?? 0,
      total_buildings: data.total_buildings ?? 0,
      damaged_buildings: data.damaged_buildings ?? 0,
      minor_damage: data.minor_damage ?? 0,
      original_image_path: data.original_image_path || serverImagePath,
      detection_image_path: data.detection_image_path || data.processed_image_path || data.combined_image_path,
      processed_image_path: data.detection_image_path || data.processed_image_path || data.combined_image_path,
      combined_image_path: data.combined_image_path || data.detection_image_path || data.processed_image_path,
      shap_image_path: data.shap_image_path || null,
      ngo: data.ngo ?? data?.ngo_assignment?.assigned_ngo?.name ?? null,
      boxes: data.boxes || [],
    };
    
    console.log("[api.analyzeImage] Normalized response:", {
      detection_image_path: normalized.detection_image_path,
      processed_image_path: normalized.processed_image_path,
      combined_image_path: normalized.combined_image_path,
      original_image_path: normalized.original_image_path,
    });
    
    return normalized;
  } catch (primaryError) {
    console.warn("[api.analyzeImage] analyze-damage failed, falling back to predict", primaryError);

    const formData = new FormData();
    formData.append("image", file);
    if (lat !== null && lat !== undefined && lat !== "") {
      formData.append("latitude", String(lat));
    }
    if (lng !== null && lng !== undefined && lng !== "") {
      formData.append("longitude", String(lng));
    }
    if (locationName) {
      formData.append("location_name", locationName);
    }

    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let message = "Analysis failed";
      try {
        const errorPayload = await response.json();
        message = errorPayload?.error || message;
      } catch {
        // keep fallback message
      }
      console.error("[api.analyzeImage] Analyze failed", { status: response.status, message });
      throw new Error(message);
    }

    const data = await response.json();
    console.log("[api.analyzeImage] Fallback analyze response", data);
    return {
      ...data,
      analysis_id: data.disaster_log_id,
      damage_percent: data.damage_percent ?? data?.prediction?.damage_percent ?? 0,
      damage_percentage: data.damage_percent ?? data?.prediction?.damage_percent ?? 0,
      risk_level: data?.prediction?.risk_level,
      confidence_score: data.confidence ?? data?.prediction?.confidence_score ?? 0,
      total_buildings: data.total_buildings ?? 1,
      damaged_buildings: data.damaged_buildings ?? ((data.damage_percent ?? 0) > 30 ? 1 : 0),
      minor_damage: data.minor_damage ?? 0,
      original_image_path: data?.images?.original,
      detection_image_path: data?.images?.detection || data?.images?.combined || data?.images?.original,
      processed_image_path: data?.images?.detection || data?.images?.combined || data?.images?.original,
      combined_image_path: data?.images?.detection || data?.images?.combined || data?.images?.original,
      shap_image_path: data?.images?.shap_path,
      ngo: data.ngo ?? data?.ngo_assignment?.assigned_ngo?.name ?? null,
      boxes: data.boxes || [],
    };
  }
}

export async function fetchReports() {
  const response = await fetch(`${API_BASE_URL}/report`);
  if (!response.ok) {
    throw new Error("Could not fetch report");
  }
  return response.json();
}

export async function getNgos({ location, city, state, imagePath, lat, lng }) {
  const payload = {
    location,
    city,
    state,
    image_path: imagePath,
    lat,
    lng,
  };

  const response = await fetch(`${API_BASE_URL}/get-ngos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    const error = new Error(data?.error || "Could not fetch nearby NGOs.");
    error.code = "NGO_REQUEST_FAILED";
    error.details = data;
    throw error;
  }

  return data;
}

export async function reverseGeocode(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  const response = await fetch(
    `${API_BASE_URL}/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    return null;
  }

  return {
    city: data.city || "",
    state: data.state || "",
    country: data.country || "",
    display_name: data.display_name || "",
  };
}

export async function getAdvancedInsights(payload) {
  const response = await fetch(`${API_BASE_URL}/advanced-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    let message = "Could not load advanced insights";
    try {
      const errorPayload = await response.json();
      message = errorPayload?.error || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  return response.json();
}
