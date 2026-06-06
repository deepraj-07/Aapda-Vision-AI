/**
 * DamageGauge Component - Visual damage severity meter
 * Shows damage percentage with color coding:
 * Green (0-30): Low | Yellow (30-60): Moderate | Red (60-100): High
 */

import React, { useEffect, useState } from 'react';
import styles from './DamageGauge.module.css';

const DamageGauge = ({ damage = 0, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Animate the gauge needle
  useEffect(() => {
    let animationFrameId;
    let currentValue = displayValue;
    
    const animate = () => {
      if (currentValue < damage) {
        currentValue += (damage - currentValue) * 0.1;
        setDisplayValue(Math.round(currentValue));
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(damage);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [damage, displayValue]);

  // Determine severity level
  const getSeverity = (value) => {
    if (value < 30) return 'low';
    if (value < 60) return 'moderate';
    return 'high';
  };

  // Get color based on damage percentage
  const getColor = (value) => {
    if (value < 30) return '#10b981'; // Green
    if (value < 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const severity = getSeverity(displayValue);
  const color = getColor(displayValue);
  const rotation = (displayValue / 100) * 180 - 90;

  return (
    <div className={`${styles.gauge} ${className}`}>
      <div className={styles.container}>
        <svg className={styles.svg} viewBox="0 0 200 120">
          {/* Background arc */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
              <stop offset="50%" style={{ stopColor: '#f59e0b', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 0.3 }} />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Active arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(displayValue / 100) * 251.2} 251.2`}
            style={{
              transition: 'stroke-dasharray 0.1s ease-out',
            }}
          />

          {/* Needle */}
          <g transform={`rotate(${rotation} 100 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="4" fill={color} />
          </g>

          {/* Labels */}
          <text x="30" y="110" fontSize="10" fill="#666" textAnchor="middle">0%</text>
          <text x="100" y="22" fontSize="10" fill="#666" textAnchor="middle">50%</text>
          <text x="170" y="110" fontSize="10" fill="#666" textAnchor="middle">100%</text>
        </svg>

        {/* Center display */}
        <div className={styles.display}>
          <div className={styles.percentage}>{displayValue}%</div>
          <div className={`${styles.severity} ${styles[severity]}`}>
            {severity === 'low' && '🟢 Low'}
            {severity === 'moderate' && '🟡 Moderate'}
            {severity === 'high' && '🔴 High'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.green}`}></span>
          <span>0-30%: Low</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.yellow}`}></span>
          <span>30-60%: Moderate</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.red}`}></span>
          <span>60-100%: High</span>
        </div>
      </div>
    </div>
  );
};

export default DamageGauge;
