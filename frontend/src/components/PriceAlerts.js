/**
 * PriceAlerts Component
 * 
 * Set up price monitoring alerts and notifications
 */

import React, { useState } from "react";
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import "./PriceAlerts.css";

function PriceAlerts() {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      productId: "SERUM-001",
      alertType: "competitor_price_drop",
      threshold: 5,
      currentValue: 79.99,
      status: "active",
      lastTriggered: null,
      createdAt: "2024-03-15T10:30:00Z"
    },
    {
      id: 2,
      productId: "CREAM-002",
      alertType: "price_gap_increase",
      threshold: 15,
      currentValue: 12.5,
      status: "triggered",
      lastTriggered: "2024-03-16T08:15:00Z",
      createdAt: "2024-03-10T14:20:00Z"
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    productId: "",
    alertType: "competitor_price_drop",
    threshold: "",
    email: ""
  });

  const alertTypes = [
    { value: "competitor_price_drop", label: "Competitor Price Drop", description: "Alert when competitor drops price by %" },
    { value: "competitor_price_increase", label: "Competitor Price Increase", description: "Alert when competitor increases price by %" },
    { value: "price_gap_increase", label: "Price Gap Increase", description: "Alert when price gap exceeds %" },
    { value: "optimal_price_change", label: "Optimal Price Change", description: "Alert when optimal price changes by %" }
  ];

  const handleCreateAlert = (e) => {
    e.preventDefault();
    
    const alert = {
      id: Date.now(),
      ...newAlert,
      threshold: parseFloat(newAlert.threshold),
      currentValue: Math.random() * 100, // Mock current value
      status: "active",
      lastTriggered: null,
      createdAt: new Date().toISOString()
    };

    setAlerts([...alerts, alert]);
    setNewAlert({ productId: "", alertType: "competitor_price_drop", threshold: "", email: "" });
    setShowForm(false);
  };

  const deleteAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const toggleAlertStatus = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id 
        ? { ...alert, status: alert.status === 'active' ? 'paused' : 'active' }
        : alert
    ));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="status-icon active" size={16} />;
      case 'triggered':
        return <AlertTriangle className="status-icon triggered" size={16} />;
      case 'paused':
        return <Clock className="status-icon paused" size={16} />;
      default:
        return null;
    }
  };

  const getAlertTypeLabel = (type) => {
    const alertType = alertTypes.find(at => at.value === type);
    return alertType ? alertType.label : type;
  };

  return (
    <div className="price-alerts">
      <div className="alerts-header">
        <div>
          <h1>Price Alerts</h1>
          <p>Monitor competitor pricing and get notified of important changes</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="create-alert-btn"
        >
          <Plus size={16} />
          Create Alert
        </button>
      </div>

      {/* Alert Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Alert</h3>
              <button 
                onClick={() => setShowForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="alert-form">
              <div className="form-group">
                <label>Product ID</label>
                <input
                  type="text"
                  placeholder="e.g. SERUM-001"
                  value={newAlert.productId}
                  onChange={(e) => setNewAlert({...newAlert, productId: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Alert Type</label>
                <select
                  value={newAlert.alertType}
                  onChange={(e) => setNewAlert({...newAlert, alertType: e.target.value})}
                >
                  {alertTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <small>{alertTypes.find(t => t.value === newAlert.alertType)?.description}</small>
              </div>

              <div className="form-group">
                <label>Threshold (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 5.0"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({...newAlert, threshold: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Notification</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={newAlert.email}
                  onChange={(e) => setNewAlert({...newAlert, email: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <Bell size={48} />
            <h3>No Alerts Set Up</h3>
            <p>Create your first price alert to monitor competitor pricing changes</p>
            <button onClick={() => setShowForm(true)} className="create-first-alert-btn">
              <Plus size={16} />
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="alerts-grid">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-card ${alert.status}`}>
                <div className="alert-header">
                  <div className="alert-title">
                    {getStatusIcon(alert.status)}
                    <span>{alert.productId}</span>
                  </div>
                  <div className="alert-actions">
                    <button
                      onClick={() => toggleAlertStatus(alert.id)}
                      className={`toggle-btn ${alert.status}`}
                    >
                      {alert.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="delete-btn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="alert-details">
                  <div className="alert-type">
                    <strong>{getAlertTypeLabel(alert.alertType)}</strong>
                  </div>
                  <div className="alert-threshold">
                    Threshold: {alert.threshold}%
                  </div>
                  <div className="alert-current">
                    Current: {alert.currentValue.toFixed(2)}
                  </div>
                </div>

                <div className="alert-footer">
                  <div className="alert-created">
                    Created: {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                  {alert.lastTriggered && (
                    <div className="alert-triggered">
                      Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Statistics */}
      <div className="alert-stats">
        <div className="stat-item">
          <div className="stat-number">{alerts.filter(a => a.status === 'active').length}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{alerts.filter(a => a.status === 'triggered').length}</div>
          <div className="stat-label">Triggered Today</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{alerts.filter(a => a.status === 'paused').length}</div>
          <div className="stat-label">Paused</div>
        </div>
      </div>
    </div>
  );
}

export default PriceAlerts;