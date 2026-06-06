/**
 * Enhanced UploadAnalyzer Component
 * Main analysis interface - Upload image, get predictions, SHAP explanations, NGO assignments
 */

import React, { useState, useRef } from 'react';
import DamageGauge from './DamageGauge';
import SHAPExplainer from './SHAPExplainer';
import styles from './UploadAnalyzer.module.css';

const UploadAnalyzer = ({ onSuccess }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Location inputs
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  
  const [useGPS, setUseGPS] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setLoading(false);
      },
      (err) => {
        setError('Failed to get GPS location: ' + err.message);
        setLoading(false);
      }
    );
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', image);
      
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      if (locationName) formData.append('location_name', locationName);

      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        onSuccess?.(data);
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!result) return;

    try {
      const response = await fetch(`http://localhost:5000/api/report/${result.disaster_log_id}`);
      const data = await response.json();

      if (data.success) {
        // Download as text file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data.report));
        element.setAttribute('download', `disaster_report_${result.disaster_log_id}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    } catch (err) {
      alert('Failed to download report: ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>🛰️ Disaster Image Analyzer</h1>
        <p>Upload satellite/aerial images for damage assessment using AI</p>
      </div>

      {/* Two Column Layout */}
      <div className={styles.mainContent}>
        {/* Left: Upload Section */}
        <div className={styles.uploadSection}>
          <div className={styles.uploadBox}>
            {!preview ? (
              <div
                className={styles.uploadArea}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}>📸</div>
                <h3>Click to upload image</h3>
                <p>or drag and drop</p>
                <small>Supported: JPG, PNG, GIF (max 25MB)</small>
              </div>
            ) : (
              <div className={styles.previewBox}>
                <img src={preview} alt="Preview" className={styles.previewImage} />
                <button
                  className={styles.changeBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={styles.hiddenInput}
            />
          </div>

          {/* Location Input */}
          <div className={styles.locationSection}>
            <h3>📍 Location (Optional)</h3>
            
            <div className={styles.locationInput}>
              <input
                type="number"
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                step="0.0001"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                step="0.0001"
              />
            </div>

            <input
              type="text"
              placeholder="Location Name (e.g., Delhi, Mumbai)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={styles.locationNameInput}
            />

            <button
              onClick={getGPSLocation}
              disabled={loading}
              className={styles.gpsBtn}
            >
              {useGPS ? '🛰️ Using GPS' : '🗺️ Auto-detect Location'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={analyzeImage}
            disabled={!image || loading}
            className={styles.analyzeBtn}
          >
            {loading ? '🔄 Analyzing...' : '⚡ Analyze Disaster Image'}
          </button>
        </div>

        {/* Right: Results Section */}
        <div className={styles.resultsSection}>
          {!result ? (
            <div className={styles.emptyState}>
              <p>📊 Results will appear here</p>
              <small>Upload and analyze an image to see predictions</small>
            </div>
          ) : (
            <div className={styles.resultsContainer}>
              {/* Prediction Summary */}
              <div className={styles.predictionBox}>
                <h2>📋 Prediction Results</h2>
                
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <label>Damage Classification</label>
                    <div className={styles.damageClass}>{result.prediction.damage_class}</div>
                  </div>
                  
                  <div className={styles.resultItem}>
                    <label>Model Confidence</label>
                    <div className={styles.confidence}>
                      {(result.prediction.confidence_score * 100).toFixed(2)}%
                    </div>
                  </div>

                  <div className={styles.resultItem}>
                    <label>Risk Level</label>
                    <div className={`${styles.riskBadge} ${styles['risk-' + result.prediction.risk_level]}`}>
                      {result.prediction.risk_level.toUpperCase()}
                    </div>
                  </div>

                  <div className={styles.resultItem}>
                    <label>Log ID</label>
                    <div>#{result.disaster_log_id}</div>
                  </div>
                </div>

                {/* Damage Gauge */}
                <DamageGauge damage={result.prediction.damage_percent} />
              </div>

              {/* NGO Assignment */}
              {result.ngo_assignment.assigned_ngo && (
                <div className={styles.ngoBox}>
                  <h3>🤝 Assigned NGO</h3>
                  <div className={styles.ngoCard}>
                    <div className={styles.ngoName}>{result.ngo_assignment.assigned_ngo.name}</div>
                    <div className={styles.ngoDetail}>
                      📧 {result.ngo_assignment.assigned_ngo.contact_email}
                    </div>
                    {result.ngo_assignment.alert_sent && (
                      <div className={styles.alertBadge}>🚨 ALERT SENT TO NGO</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.actions}>
                <button onClick={downloadReport} className={styles.downloadBtn}>
                  📥 Download Report
                </button>
                <button
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    setResult(null);
                    setLatitude('');
                    setLongitude('');
                    setLocationName('');
                  }}
                  className={styles.resetBtn}
                >
                  🔄 Analyze Another Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Width Results */}
      {result && (
        <>
          {/* SHAP Explanation */}
          <div className={styles.fullWidthSection}>
            <SHAPExplainer
              shapImage={result.images.shap}
              featureImportance={result.shap_explanation.feature_importance}
              interpretation={result.shap_explanation.interpretation}
            />
          </div>

          {/* Heatmap */}
          {result.images.heatmap && (
            <div className={styles.fullWidthSection}>
              <div className={styles.heatmapBox}>
                <h2>🔥 Damage Heatmap</h2>
                <img
                  src={`http://localhost:5000/${result.images.heatmap}`}
                  alt="Damage Heatmap"
                  className={styles.heatmapImage}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UploadAnalyzer;
