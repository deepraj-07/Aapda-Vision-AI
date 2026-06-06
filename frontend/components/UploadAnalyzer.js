import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { jsPDF } from "jspdf";

import { analyzeImage, getAdvancedInsights, getNgos, reverseGeocode, toBackendImageUrl, uploadImage } from "../pages/api";

const MapWithNoSSR = dynamic(() => import("./MapComponent"), {
  ssr: false,
});

function formatRiskLevel(riskLevel) {
  return riskLevel ? String(riskLevel).toUpperCase() : "N/A";
}

function getDamagePercent(result) {
  if (result?.damage_percentage != null) {
    return Number(result.damage_percentage);
  }
  if (result?.damage_percent != null) {
    return Number(result.damage_percent);
  }
  return 0;
}

function getBuildingsCount(result) {
  if (result?.total_buildings != null) {
    return Number(result.total_buildings);
  }
  if (result?.buildings_detected != null) {
    return Number(result.buildings_detected);
  }
  return 0;
}

function getDamagedBuildingsCount(result) {
  if (result?.damaged_buildings != null) {
    return Number(result.damaged_buildings);
  }
  return 0;
}

function getMinorDamageCount(result) {
  if (result?.minor_damage != null) {
    return Number(result.minor_damage);
  }
  return 0;
}

function classifyRiskByDamagedRatio(damagedBuildings, totalBuildings) {
  const ratio = totalBuildings > 0 ? (damagedBuildings / totalBuildings) * 100 : 0;
  if (ratio > 60) {
    return { label: "HIGH", color: "text-red-300 border-red-300/45 bg-red-400/10" };
  }
  if (ratio >= 30) {
    return { label: "MEDIUM", color: "text-orange-300 border-orange-300/45 bg-orange-400/10" };
  }
  return { label: "LOW", color: "text-emerald-200 border-emerald-300/45 bg-emerald-400/10" };
}

function getRecommendations(damagePercent) {
  const score = Number(damagePercent) || 0;

  if (score > 75) {
    return {
      ambulances: "5+",
      rescueTeams: 3,
      summary: "Immediate evacuation required",
      safetyMeasures: [
        "Activate emergency shelters and evacuation corridors immediately.",
        "Deploy advanced trauma teams near high-density zones.",
        "Restrict civilian entry to unstable structures.",
      ],
    };
  }

  if (score >= 40) {
    return {
      ambulances: 2,
      rescueTeams: 2,
      summary: "Standby teams with prioritized rescue operations",
      safetyMeasures: [
        "Keep rapid response teams on standby in nearby sectors.",
        "Start phased evacuation for severely impacted blocks.",
        "Increase patrols and structural safety checks.",
      ],
    };
  }

  return {
    ambulances: 0,
    rescueTeams: 1,
    summary: "Monitoring only",
    safetyMeasures: [
      "Continue periodic monitoring of vulnerable areas.",
      "Share advisories with local residents and officials.",
      "Keep first-response units on alert status.",
    ],
  };
}

function NgoTag({ type }) {
  const normalized = String(type || "NGO").toLowerCase();
  const className =
    normalized === "medical"
      ? "border-rose-300/40 bg-rose-400/10 text-rose-200"
      : normalized === "emergency"
      ? "border-amber-300/40 bg-amber-400/10 text-amber-200"
      : "border-cyanline/40 bg-cyanline/10 text-cyanline";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${className}`}>
      {type || "NGO"}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) {
    return null;
  }

  const styles =
    toast.type === "error"
      ? "border-red-300/45 bg-red-500/15 text-red-100"
      : "border-emerald-300/45 bg-emerald-500/15 text-emerald-100";

  return (
    <div className={`fixed right-4 top-4 z-50 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${styles}`}>
      {toast.message}
    </div>
  );
}

export default function UploadAnalyzer({ onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadPath, setUploadPath] = useState("");
  const [location, setLocation] = useState(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [advancedInsights, setAdvancedInsights] = useState(null);
  const [ngoData, setNgoData] = useState([]);
  const [ngoLocation, setNgoLocation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingNgos, setIsFetchingNgos] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!analysis) {
      return;
    }

    const hasCoordinates = Boolean(location?.lat != null && location?.lng != null);
    const hasAreaInput = Boolean(city || state);
    const hasImagePath = Boolean(uploadPath);

    if (hasCoordinates || hasAreaInput || hasImagePath) {
      handleFetchNgos(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  useEffect(() => {
    if (!location?.lat || !location?.lng) {
      return;
    }

    let alive = true;
    (async () => {
      const geo = await reverseGeocode(location.lat, location.lng);
      if (!alive || !geo) {
        return;
      }

      if (geo.city) {
        setCity(geo.city);
      }
      if (geo.state) {
        setState(geo.state);
      }
    })();

    return () => {
      alive = false;
    };
  }, [location?.lat, location?.lng]);

  const canAnalyze = useMemo(() => Boolean(file), [file]);

  function showToast(type, message) {
    setToast({ type, message });
  }

  function updateLocation(nextLocation) {
    setLocation(nextLocation);
    setManualLat(String(nextLocation.lat));
    setManualLng(String(nextLocation.lng));
  }

  async function handleUpload() {
    if (!file) {
      setError("Please choose an image first.");
      showToast("error", "Please choose an image first.");
      return;
    }

    setIsUploading(true);
    setError("");
    setAnalysis(null);
    setAdvancedInsights(null);
    setNgoData([]);

    try {
      const response = await uploadImage(file);
      setUploadPath(response.image_path || file.name);
      showToast("success", "Image uploaded successfully. Run analysis next.");
    } catch (err) {
      const message = err.message || "Upload failed";
      setError(message);
      showToast("error", message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Upload/select an image before analysis.");
      showToast("error", "Upload/select an image before analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      let nextUploadPath = uploadPath;
      if (!nextUploadPath) {
        const uploadResult = await uploadImage(file);
        nextUploadPath = uploadResult.image_path || file.name;
        setUploadPath(nextUploadPath);
      }

      const result = await analyzeImage({
        file,
        imagePath: nextUploadPath,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        locationName: [city, state].filter(Boolean).join(", "),
      });

      setAnalysis(result);

      try {
        const insightsPayload = {
          analysis_id: result?.analysis_id,
          location_name: [city, state].filter(Boolean).join(", ") || null,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          boxes: Array.isArray(result?.boxes) ? result.boxes : [],
          damage_percent: Number(result?.damage_percentage ?? result?.damage_percent ?? 0),
          total_buildings: Number(result?.total_buildings ?? 0),
          damaged_buildings: Number(result?.damaged_buildings ?? 0),
        };
        const insightsResponse = await getAdvancedInsights(insightsPayload);
        setAdvancedInsights(insightsResponse?.insights || null);
      } catch (insightErr) {
        console.warn("[UploadAnalyzer] Advanced insights unavailable", insightErr);
        setAdvancedInsights(null);
      }

      if (typeof onAnalyzed === "function") {
        onAnalyzed(result);
      }
      showToast("success", "Damage analysis completed.");
    } catch (err) {
      const message = err.message || "Analysis failed";
      setError(message);
      showToast("error", message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleFetchNgos(isAuto = false) {
    if (!uploadPath && !city && !state) {
      const message = "Upload image or provide city/state to fetch nearby NGOs.";
      setError(message);
      if (!isAuto) {
        showToast("error", message);
      }
      return;
    }

    setIsFetchingNgos(true);
    setError("");

    try {
      const response = await getNgos({
        location: [city, state].filter(Boolean).join(", "),
        city,
        state,
        imagePath: uploadPath,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      });

      setNgoData(Array.isArray(response) ? response : []);
      setNgoLocation([city, state].filter(Boolean).join(", "));
      if (!isAuto) {
        showToast("success", "Nearby NGOs and relief centers loaded.");
      }
    } catch (err) {
      const message = err.message || "Could not load NGOs.";
      setError(message);
      if (!isAuto) {
        showToast("error", message);
      }
    } finally {
      setIsFetchingNgos(false);
    }
  }

  function handleSetManualLocation() {
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const message = "Enter valid latitude and longitude values.";
      setError(message);
      showToast("error", message);
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const message = "Latitude must be between -90 and 90, longitude between -180 and 180.";
      setError(message);
      showToast("error", message);
      return;
    }

    updateLocation({ lat, lng });
    setError("");
    showToast("success", "Location pinned.");
  }

  function downloadReport() {
    if (!uploadPath || !analysis || !location) {
      const message = "Upload, analyze, and set location before downloading report.";
      setError(message);
      showToast("error", message);
      return;
    }

    const damagePercent = getDamagePercent(analysis).toFixed(2);
    const riskLevel = formatRiskLevel(analysis?.risk_level);
    const totalBuildings = getBuildingsCount(analysis);
    const damagedBuildings = getDamagedBuildingsCount(analysis);
    const minorDamageCount = getMinorDamageCount(analysis);
    const recommendationSet = getRecommendations(damagePercent);
    const imageName = uploadPath.split(/[\\/]/).pop() || uploadPath;

    const doc = new jsPDF();
    const margin = 14;
    let y = 18;

    doc.setDrawColor(24, 210, 230);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 2, 196, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("AapdaVision AI Disaster Assessment Report", margin, y + 10);

    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date/Time: ${new Date().toLocaleString()}`, margin, y);
    y += 8;
    doc.text(`Location: Lat ${location.lat}, Lng ${location.lng}`, margin, y);
    y += 8;
    doc.text(`Image Name: ${imageName}`, margin, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Assessment Summary", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Damage %: ${damagePercent}`, margin, y);
    y += 7;
    doc.text(`Risk Level: ${riskLevel}`, margin, y);
    y += 7;
    doc.text(`Total Buildings: ${totalBuildings}`, margin, y);
    y += 7;
    doc.text(`Damaged Buildings: ${damagedBuildings}`, margin, y);
    y += 7;
    doc.text(`Minor Damage: ${minorDamageCount}`, margin, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Actionable Recommendations", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Ambulances Required: ${recommendationSet.ambulances}`, margin, y);
    y += 7;
    doc.text(`Rescue Teams: ${recommendationSet.rescueTeams}`, margin, y);
    y += 7;

    recommendationSet.safetyMeasures.forEach((item) => {
      doc.text(`• ${item}`, margin, y);
      y += 7;
    });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Generated by AapdaVision AI", margin, 286);
    doc.save("AapdaVision_Disaster_Report.pdf");

    showToast("success", "Report downloaded.");
  }

  const damagePercent = getDamagePercent(analysis);
  const buildingsCount = getBuildingsCount(analysis);
  const damagedBuildingsCount = getDamagedBuildingsCount(analysis);
  const minorDamageCount = getMinorDamageCount(analysis);
  const backendRiskLevel = formatRiskLevel(analysis?.risk_level);
  const recommendationSet = getRecommendations(damagePercent);
  const riskByDamaged = classifyRiskByDamagedRatio(damagedBuildingsCount, buildingsCount);
  const cacheBust = analysis?.analysis_id || Date.now();
  const modelConfidence = Number(analysis?.confidence_score || 0);
  const damageClass = String(analysis?.damage_class || "Unknown");
  const damagedRatio = buildingsCount > 0 ? (damagedBuildingsCount / buildingsCount) * 100 : 0;
  const responsePriority = Math.min(
    100,
    Math.round((damagePercent * 0.7) + (damagedRatio * 0.3))
  );
  
  // Debug logging for image URLs
  const detectionImagePathValue = analysis?.detection_image_path || analysis?.processed_image_path || analysis?.combined_image_path;
  console.log("[UploadAnalyzer] Detection image computation:", {
    detection_image_path: analysis?.detection_image_path,
    processed_image_path: analysis?.processed_image_path,
    combined_image_path: analysis?.combined_image_path,
    selected: detectionImagePathValue,
  });
  
  const detectionImageUrlBase = toBackendImageUrl(detectionImagePathValue);
  console.log("[UploadAnalyzer] Detection URL transformation:", {
    input: detectionImagePathValue,
    output: detectionImageUrlBase,
  });
  
  const detectionImageUrl = detectionImageUrlBase ? `${detectionImageUrlBase}?t=${cacheBust}` : "";
  const originalImageUrlBase =
    toBackendImageUrl(analysis?.original_image_path || uploadPath) || "";
  const originalImageUrl = originalImageUrlBase ? `${originalImageUrlBase}?t=${cacheBust}` : "";

  return (
    <section id="analyze" className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
      <Toast toast={toast} />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-display text-3xl text-white">Image Upload and Analysis</h3>

          <p className="mt-2 text-white/70">
            Upload disaster imagery, run AI building damage detection, and get risk + response recommendations.
          </p>

          <div className="mt-6 space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-white/15 bg-[#08233f] px-4 py-3 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-cyanline/20 file:px-4 file:py-2 file:text-cyanline"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUpload}
                disabled={isUploading || isAnalyzing}
                className="rounded-2xl bg-gradient-to-r from-[#2adcae] to-[#18d2e6] px-5 py-2.5 font-semibold text-[#032235] disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload Image"}
              </button>

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isUploading || isAnalyzing}
                className="rounded-2xl border border-cyanline/40 bg-cyanline/10 px-5 py-2.5 font-semibold text-cyanline disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Damage"}
              </button>

              <button
                onClick={downloadReport}
                className="rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 font-semibold text-white/85 disabled:opacity-50"
                disabled={!analysis}
              >
                Download Report
              </button>
            </div>

            {uploadPath && <p className="text-xs text-mintline">Uploaded path: {uploadPath}</p>}

            {(isAnalyzing || isUploading) && (
              <div className="relative overflow-hidden rounded-xl border border-cyanline/30 bg-cyanline/10 px-4 py-3 text-sm text-white/85">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-cyanline/20 to-transparent" />
                <div className="relative inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyanline border-t-transparent" />
                  {isAnalyzing ? "Running ML analysis..." : "Uploading image..."}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#061b33] p-4">
              <h4 className="font-display text-xl text-white">Select Location</h4>
              <p className="mt-1 text-sm text-white/70">Click the map or enter coordinates manually.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="Latitude"
                  className="rounded-xl border border-white/15 bg-[#08233f] px-3 py-2 text-sm text-white placeholder:text-white/45"
                />
                <input
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="Longitude"
                  className="rounded-xl border border-white/15 bg-[#08233f] px-3 py-2 text-sm text-white placeholder:text-white/45"
                />
                <button
                  type="button"
                  onClick={handleSetManualLocation}
                  className="rounded-xl border border-cyanline/40 bg-cyanline/10 px-4 py-2 text-sm font-semibold text-cyanline"
                >
                  Set Location
                </button>
              </div>

              <MapWithNoSSR
                location={location}
                onLocationSelect={updateLocation}
                popupText="Selected Analysis Point"
                damagePercentage={damagePercent}
                riskLevel={backendRiskLevel}
              />

              <div className="mt-3 rounded-xl border border-cyanline/20 bg-cyanline/5 px-4 py-3 text-sm text-white/85">
                {location ? (
                  <span>
                    Lat: {location.lat} | Lng: {location.lng}
                  </span>
                ) : (
                  <span>Select a point on the map to continue.</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#061b33] p-4">
              <h4 className="font-display text-xl text-white">Nearby NGOs and Relief Centers</h4>
              <p className="mt-1 text-sm text-white/70">Use city/state or image metadata location to fetch nearby support contacts.</p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="rounded-xl border border-white/15 bg-[#08233f] px-3 py-2 text-sm text-white placeholder:text-white/45"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="rounded-xl border border-white/15 bg-[#08233f] px-3 py-2 text-sm text-white placeholder:text-white/45"
                />
              </div>

              <button
                type="button"
                onClick={handleFetchNgos}
                disabled={isFetchingNgos}
                className="mt-3 rounded-2xl border border-cyanline/40 bg-cyanline/10 px-4 py-2 text-sm font-semibold text-cyanline disabled:opacity-50"
              >
                {isFetchingNgos ? "Loading NGOs..." : "Refresh Nearby NGOs"}
              </button>

              {ngoLocation && <p className="mt-2 text-xs text-cyanline/90">Results near: {ngoLocation}</p>}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {ngoData.map((item) => (
                  <article
                    key={`${item.name}-${item.location}`}
                    className="rounded-2xl border border-cyanline/20 bg-white/5 p-4 transition hover:border-cyanline/45 hover:bg-cyanline/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-semibold text-white">{item.name || "Unnamed Center"}</h5>
                      <NgoTag type={item.type} />
                    </div>
                    <p className="mt-2 text-sm text-white/75">{item.location || "Location unavailable"}</p>
                    <p className="mt-2 text-xs text-white/65">{item.contact || "Contact not listed"}</p>
                    <a
                      href={item.contact?.startsWith("http") ? item.contact : "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-xl border border-cyanline/40 px-3 py-1.5 text-xs font-semibold text-cyanline"
                    >
                      {item.contact?.startsWith("http") ? "Visit" : "Contact"}
                    </a>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#061b33] p-4">
              <h4 className="font-display text-xl text-white">AI Insights</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Total Buildings</p>
                  <p className="mt-1 text-lg font-semibold text-white">{buildingsCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Damaged %</p>
                  <p className="mt-1 text-lg font-semibold text-white">{damagePercent.toFixed(2)}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Damaged Buildings</p>
                  <p className="mt-1 text-lg font-semibold text-[#ff9f4d]">{damagedBuildingsCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Damage Class</p>
                  <p className="mt-1 text-lg font-semibold text-red-200">{damageClass}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Minor Damage</p>
                  <p className="mt-1 text-lg font-semibold text-yellow-300">{minorDamageCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyanline/40">
                  <p className="text-xs uppercase tracking-wide text-white/60">Model Confidence</p>
                  <p className="mt-1 text-lg font-semibold text-cyanline">{(modelConfidence * 100).toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-cyanline/20 bg-cyanline/5 px-4 py-3 text-sm text-white/85">
                <span className="font-semibold text-cyanline">Risk (backend): {backendRiskLevel}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${riskByDamaged.color}`}>
                  Risk (damaged ratio): {riskByDamaged.label}
                </span>
                <span>Damaged ratio: {damagedRatio.toFixed(2)}%</span>
              </div>

              <div className="mt-3 rounded-xl border border-cyanline/20 bg-cyanline/5 px-4 py-3 text-sm text-white/85">
                <p className="font-semibold text-cyanline">Actionable Recommendations</p>
                <p className="mt-1">Status: {recommendationSet.summary}</p>
                <p className="mt-1">Ambulances Required: {recommendationSet.ambulances}</p>
                <p className="mt-1">Rescue Teams: {recommendationSet.rescueTeams}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
                  {recommendationSet.safetyMeasures.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              {advancedInsights ? (
                <div className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm text-white/85">
                  <p className="font-semibold text-emerald-200">Advanced ML Insights</p>
                  <p className="mt-1">
                    Trend: <span className="font-semibold uppercase">{advancedInsights?.damage_trend?.trend || "unknown"}</span>
                  </p>
                  <p className="mt-1">
                    Urgency: <span className="font-semibold uppercase">{advancedInsights?.resource_allocation?.urgency_level || "n/a"}</span>
                  </p>
                  <p className="mt-1">
                    Recommended Teams: <span className="font-semibold">{advancedInsights?.resource_allocation?.recommended_teams ?? "n/a"}</span>
                  </p>
                  <p className="mt-1">
                    Avg Building Risk: <span className="font-semibold">{((advancedInsights?.building_risks?.average_risk || 0) * 100).toFixed(1)}%</span>
                  </p>
                </div>
              ) : null}
            </div>

            {error && <p className="text-sm text-orange-300">{error}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#061b33] p-4">
            <h4 className="font-display text-xl text-white">How It Works</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li>1. Upload disaster image from drone or satellite source</li>
                <li>2. Detect buildings and classify damage severity with bounding boxes</li>
                <li>3. Generate response insights from damaged-building counts and risk score</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#061b33] p-4">
            <h4 className="font-display text-xl text-white">Disaster Safety Insights</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-cyanline/30">
                <h5 className="text-sm font-semibold text-cyanline">Flood Precautions</h5>
                <p className="mt-1 text-xs text-white/75">Move to elevated areas and avoid waterlogged electrical zones.</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-cyanline/30">
                <h5 className="text-sm font-semibold text-cyanline">Earthquake Precautions</h5>
                <p className="mt-1 text-xs text-white/75">Follow drop-cover-hold and avoid damaged buildings until cleared.</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-cyanline/30 sm:col-span-2">
                <h5 className="text-sm font-semibold text-cyanline">Fire / Landslide Tips</h5>
                <p className="mt-1 text-xs text-white/75">Use marked evacuation routes and maintain communication checkpoints.</p>
              </article>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#061b33] p-4">
            <h4 className="font-display text-xl text-white">Operational Response Panel</h4>
            <p className="mt-2 text-sm text-white/75">Quick field actions and triage suggestions based on current AI output.</p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                  <span>Response Priority Index</span>
                  <span>{responsePriority}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                    style={{ width: `${responsePriority}%` }}
                  />
                </div>
              </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-white/55">Priority Zone</p>
                <p className="mt-1 text-base font-semibold text-red-300">
                  {damagePercent > 60 ? "Critical" : damagePercent >= 30 ? "Alert" : "Watch"}
                </p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-white/55">Nearest Action</p>
                <p className="mt-1 text-base font-semibold text-cyanline">Deploy rescue checkpoints</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-white/55">Field Checklist</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/75">
                  <li>Verify blocked roads and alternate paths.</li>
                  <li>Dispatch teams to high-risk clusters first.</li>
                  <li>Coordinate medical points near dense settlements.</li>
                </ul>
              </article>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#061b33] p-4">
            <h4 className="font-display text-xl text-white">Live Snapshot</h4>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-cyanline/20 bg-cyanline/5 p-3">
                <p className="text-xs text-white/60">Buildings</p>
                <p className="mt-1 text-lg font-semibold text-white">{buildingsCount}</p>
              </div>
              <div className="rounded-xl border border-orange-300/20 bg-orange-400/5 p-3">
                <p className="text-xs text-white/60">Damaged</p>
                <p className="mt-1 text-lg font-semibold text-orange-300">{damagedBuildingsCount}</p>
              </div>
              <div className="rounded-xl border border-yellow-300/20 bg-yellow-400/5 p-3">
                <p className="text-xs text-white/60">Minor</p>
                <p className="mt-1 text-lg font-semibold text-yellow-300">{minorDamageCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="mt-10 rounded-3xl border border-cyanline/20 bg-[#061b33]/80 p-4">
          <h4 className="mb-4 text-xl font-bold text-white">Analysis Visual Output</h4>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-cyanline">Before Analysis</p>
              <img
                src={originalImageUrl}
                alt="Before Analysis"
                className="h-full min-h-[220px] w-full rounded-xl border border-white/10 object-cover"
                onError={(event) => {
                  if (previewUrl && event.currentTarget.src !== previewUrl) {
                    event.currentTarget.src = previewUrl;
                  }
                }}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-cyanline">Building Detection Output</p>
              <div className="relative">
                <img
                  src={detectionImageUrl}
                  alt="Building Detection Output"
                  className="h-full min-h-[220px] w-full rounded-xl border border-white/10 object-cover"
                  onError={(event) => {
                    console.error("[UploadAnalyzer] Detection image failed to load:", {
                      src: event.currentTarget.src,
                      error: event.error,
                    });
                    if (previewUrl && event.currentTarget.src !== previewUrl) {
                      console.log("[UploadAnalyzer] Falling back to preview URL");
                      event.currentTarget.src = previewUrl;
                    }
                  }}
                  onLoad={() => {
                    console.log("[UploadAnalyzer] Detection image loaded successfully:", detectionImageUrl);
                  }}
                />
                {!detectionImageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/10 text-white/50 text-sm">
                    No detection image URL available
                  </div>
                )}
              </div>
              {analysis?.boxes?.length ? (
                <p className="mt-2 text-xs text-white/70">
                  Detected boxes: {analysis.boxes.length} | Damaged: {damagedBuildingsCount} | Minor: {minorDamageCount}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
