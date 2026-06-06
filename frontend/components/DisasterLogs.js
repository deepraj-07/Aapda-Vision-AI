/**
 * DisasterLogs Component - Display all past disaster analysis records
 * Shows location, damage assessment, assigned NGO, and timestamp
 * With filtering, sorting, and detailed view options
 */

import React, { useEffect, useState } from 'react';
import styles from './DisasterLogs.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const DisasterLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState(null);

  // Fetch disaster logs
  useEffect(() => {
    fetchLogs();
    // Refresh logs every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/logs?limit=100');
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError('Failed to fetch logs');
      }
    } catch (err) {
      setError('Error connecting to backend: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...logs];

    // Filter by risk level
    if (riskFilter !== 'all') {
      filtered = filtered.filter((log) => log.risk_level === riskFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'damage-high') {
      filtered.sort((a, b) => b.damage_percentage - a.damage_percentage);
    } else if (sortBy === 'damage-low') {
      filtered.sort((a, b) => a.damage_percentage - b.damage_percentage);
    }

    setFilteredLogs(filtered);
  }, [logs, riskFilter, sortBy]);

  const getRiskBadgeClass = (riskLevel) => {
    switch (riskLevel) {
      case 'low':
        return styles.badgeLow;
      case 'medium':
        return styles.badgeMedium;
      case 'high':
        return styles.badgeHigh;
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const deleteLog = async (logId) => {
    if (!confirm('Are you sure you want to delete this log?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/logs/${logId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLogs(logs.filter((log) => log.id !== logId));
        setSelectedLog(null);
        alert('Log deleted successfully');
      } else {
        alert('Failed to delete log');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting log');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🗂️ Disaster Logs</h1>
        <p>All past disaster analysis records with damage assessments and NGO assignments</p>
      </div>

      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <label>Risk Level Filter:</label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className={styles.select}>
            <option value="all">All Levels</option>
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="damage-high">Highest Damage</option>
            <option value="damage-low">Lowest Damage</option>
          </select>
        </div>

        <button onClick={fetchLogs} className={styles.refreshBtn} disabled={loading}>
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>📭 No disaster logs found</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Location</th>
                <th>Buildings</th>
                <th>Damaged</th>
                <th>Damage %</th>
                <th>Risk Level</th>
                <th>Assigned NGO</th>
                <th>Confidence</th>
                <th>Date/Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={styles.row}>
                  <td className={styles.idCell}>#{log.id}</td>
                  <td className={styles.location}>
                    <div className={styles.locationName}>{log.location_name || 'N/A'}</div>
                    <div className={styles.coordinates}>
                      ({log.latitude?.toFixed(2)}, {log.longitude?.toFixed(2)})
                    </div>
                  </td>
                  <td className={styles.damage}>{log.total_buildings || 0}</td>
                  <td className={styles.damage}>{log.damaged_buildings || 0}</td>
                  <td className={styles.damage}>
                    <div className={styles.damageBar}>
                      <div
                        className={styles.damageProgress}
                        style={{
                          width: `${log.damage_percentage}%`,
                          backgroundColor:
                            log.damage_percentage < 30
                              ? '#10b981'
                              : log.damage_percentage < 60
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      ></div>
                    </div>
                    <span className={styles.damageText}>{log.damage_percentage}%</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getRiskBadgeClass(log.risk_level)}`}>
                      {log.risk_level?.toUpperCase()}
                    </span>
                  </td>
                  <td className={styles.ngo}>
                    <div className={styles.ngoName}>{log.assigned_ngo?.name || '—'}</div>
                    {log.alert_sent && <span className={styles.alertBadge}>🚨 Alert Sent</span>}
                  </td>
                  <td className={styles.confidence}>{(log.confidence_score * 100).toFixed(1)}%</td>
                  <td className={styles.date}>{formatDate(log.created_at)}</td>
                  <td className={styles.actions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setSelectedLog(log)}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteLog(log.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className={styles.modal} onClick={() => setSelectedLog(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
              ✕
            </button>

            <h2>📋 Disaster Log Details</h2>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <label>Log ID</label>
                <div>#{selectedLog.id}</div>
              </div>

              <div className={styles.detailItem}>
                <label>Location</label>
                <div>
                  {selectedLog.location_name} ({selectedLog.latitude?.toFixed(4)},{' '}
                  {selectedLog.longitude?.toFixed(4)})
                </div>
              </div>

              <div className={styles.detailItem}>
                <label>Damage Classification</label>
                <div className={styles.damageClass}>{selectedLog.damage_class}</div>
              </div>

              <div className={styles.detailItem}>
                <label>Damage Percentage</label>
                <div className={styles.percent}>{selectedLog.damage_percentage}%</div>
              </div>

              <div className={styles.detailItem}>
                <label>Total Buildings</label>
                <div>{selectedLog.total_buildings || 0}</div>
              </div>

              <div className={styles.detailItem}>
                <label>Damaged Buildings</label>
                <div>{selectedLog.damaged_buildings || 0}</div>
              </div>

              <div className={styles.detailItem}>
                <label>Risk Level</label>
                <span className={`${styles.badge} ${getRiskBadgeClass(selectedLog.risk_level)}`}>
                  {selectedLog.risk_level?.toUpperCase()}
                </span>
              </div>

              <div className={styles.detailItem}>
                <label>Model Confidence</label>
                <div>{(selectedLog.confidence_score * 100).toFixed(2)}%</div>
              </div>

              <div className={styles.detailItem}>
                <label>Assigned NGO</label>
                <div>
                  {selectedLog.assigned_ngo ? (
                    <>
                      <div className={styles.ngoName}>{selectedLog.assigned_ngo.name}</div>
                      <div className={styles.ngoContact}>{selectedLog.assigned_ngo.contact_email}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div className={styles.detailItem}>
                <label>Alert Status</label>
                <div>{selectedLog.alert_sent ? '🚨 Alert Sent' : '⚪ No Alert'}</div>
              </div>

              <div className={styles.detailItem}>
                <label>Timestamp</label>
                <div>{formatDate(selectedLog.created_at)}</div>
              </div>
            </div>

            <div className={styles.imagePreview}>
              {(selectedLog.detection_image_path || selectedLog.original_image_path) && (
                <div>
                  <h3>Detection Visualization</h3>
                  <img
                    src={`${API_BASE_URL}/${selectedLog.detection_image_path || selectedLog.original_image_path}`}
                    alt="Detection"
                    style={{ maxWidth: '100%', borderRadius: '8px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisasterLogs;
