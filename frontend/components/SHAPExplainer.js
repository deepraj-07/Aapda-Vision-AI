/**
 * SHAPExplainer Component - Display ML model explainability using SHAP
 * Shows which features most influenced the damage prediction
 * Helps understand model decisions for disaster assessment
 */

import React, { useState } from 'react';
import styles from './SHAPExplainer.module.css';

const SHAPExplainer = ({ shapImage, featureImportance, interpretation }) => {
  const [expandedFeature, setExpandedFeature] = useState(null);

  if (!shapImage && (!featureImportance || featureImportance.length === 0)) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No SHAP explanation available yet</p>
          <small>Upload an image to generate ML explanations</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🧠 ML Model Explainability (SHAP)</h2>
        <p>Understanding what the AI model "sees" and how it made the prediction</p>
      </div>

      {/* Interpretation Text */}
      {interpretation && (
        <div className={styles.interpretation}>
          <div className={styles.interpretationIcon}>💡</div>
          <div className={styles.interpretationText}>{interpretation}</div>
        </div>
      )}

      {/* SHAP Image */}
      {shapImage && (
        <div className={styles.imageBox}>
          <h3>Feature Impact Analysis</h3>
          <img src={shapImage} alt="SHAP Explanation" className={styles.shapImage} />
          <p className={styles.imageCaption}>
            Bar plot showing the top features that influenced the damage prediction. Red = increases damage severity.
          </p>
        </div>
      )}

      {/* Feature Importance Details */}
      {featureImportance && featureImportance.length > 0 && (
        <div className={styles.featuresBox}>
          <h3>🔍 Top Contributing Features</h3>
          <p className={styles.featureInfo}>These features had the most impact on the prediction:</p>

          <div className={styles.featuresList}>
            {featureImportance.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <button
                  className={styles.featureHeader}
                  onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                >
                  <div className={styles.featureTitle}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <span className={styles.name}>Feature {feature.feature_index}</span>
                  </div>

                  <div className={styles.featureMeta}>
                    <div
                      className={styles.impactBadge}
                      style={{
                        color: feature.impact === 'positive' ? '#dc2626' : '#059669',
                        backgroundColor: feature.impact === 'positive' ? '#fee2e2' : '#d1fae5',
                      }}
                    >
                      {feature.impact === 'positive' ? '⬆️ Increase' : '⬇️ Decrease'} Risk
                    </div>
                    <div className={styles.importance}>{feature.importance.toFixed(4)}</div>
                  </div>

                  <span className={styles.expandIcon}>{expandedFeature === index ? '▼' : '▶'}</span>
                </button>

                {expandedFeature === index && (
                  <div className={styles.featureDetails}>
                    <div className={styles.detailRow}>
                      <label>Impact Magnitude:</label>
                      <div className={styles.impactBar}>
                        <div
                          className={styles.impactFill}
                          style={{
                            width: `${Math.min(feature.importance * 100, 100)}%`,
                            backgroundColor: feature.impact === 'positive' ? '#dc2626' : '#059669',
                          }}
                        ></div>
                      </div>
                      <span>{(feature.importance * 100).toFixed(2)}%</span>
                    </div>

                    <div className={styles.detailRow}>
                      <label>Feature Value:</label>
                      <span className={styles.value}>{feature.value.toFixed(4)}</span>
                    </div>

                    <div className={styles.explanation}>
                      <p>
                        <strong>What this means:</strong> This feature {feature.impact === 'positive' ? 'increased' : 'decreased'} the predicted damage severity by
                        {' ' + (feature.importance * 100).toFixed(2)}%. It's one of the most important indicators the AI model uses for damage assessment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.disclaimer}>
            <span>ℹ️</span>
            <p>
              SHAP (SHapley Additive exPlanations) values show how much each feature contributes to the prediction. They help
              ensure the AI's decisions are transparent and trustworthy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SHAPExplainer;
