/**
 * Dashboard Component
 * 
 * Main dashboard with analytics and charts
 */

import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, Package, Clock, AlertTriangle } from "lucide-react";
import AiInsight from "./AiInsight";
import "./Dashboard.css";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const COLORS = ['#ef4444', '#f59e0b', '#22c55e'];

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchAiSummary = async (stats) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch(`${API_URL}/api/ai/dashboard-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await resp.json();
      if (data.summary) {
        setAiSummary(data.summary);
      } else {
        setAiError(data.error || "AI summary unavailable");
      }
    } catch {
      setAiError("Could not reach AI service");
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/analytics/dashboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
      if (data.totalAnalyses > 0) {
        fetchAiSummary(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={48} />
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  const pieData = [
    { name: 'Immediate', value: dashboardData.markdownStats.immediate },
    { name: 'Monitor', value: dashboardData.markdownStats.monitor },
    { name: 'Hold', value: dashboardData.markdownStats.hold }
  ];

  const barData = dashboardData.recentProducts.map(productId => ({
    product: productId.length > 10 ? productId.substring(0, 10) + '...' : productId,
    analyses: Math.floor(Math.random() * 10) + 1 // Mock data for demo
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Price Intelligence Dashboard</h1>
        <p>Monitor your pricing strategy performance</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.totalAnalyses}</h3>
            <p>Total Analyses</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.uniqueProducts}</h3>
            <p>Products Analyzed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.last30Days}</h3>
            <p>Last 30 Days</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <h3>${dashboardData.avgOptimalPrice}</h3>
            <p>Avg Optimal Price</p>
          </div>
        </div>
      </div>

      {/* AI Portfolio Insights */}
      {(aiSummary || aiLoading || aiError) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <AiInsight
            title="AI Portfolio Insights"
            text={aiSummary}
            loading={aiLoading}
            error={aiError}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Markdown Timing Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#2563eb"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Recent Product Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="analyses" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Products */}
      <div className="recent-products">
        <h3>Recently Analyzed Products</h3>
        <div className="products-list">
          {dashboardData.recentProducts.map((productId, index) => (
            <div key={index} className="product-item">
              <Package size={16} />
              <span>{productId}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;