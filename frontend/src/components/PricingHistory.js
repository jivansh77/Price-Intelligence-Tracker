/**
 * PricingHistory Component
 * 
 * Display historical pricing data with filtering and trends
 */

import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Filter, TrendingUp, Calendar } from "lucide-react";
import "./PricingHistory.css";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function PricingHistory() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, searchTerm, selectedProduct, dateRange]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/price/history`);
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = [...history];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.productId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Product filter
    if (selectedProduct) {
      filtered = filtered.filter(item => item.productId === selectedProduct);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const days = parseInt(dateRange);
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
    }

    setFilteredHistory(filtered);
  };

  const uniqueProducts = [...new Set(history.map(item => item.productId))];

  const chartData = selectedProduct 
    ? history
        .filter(item => item.productId === selectedProduct)
        .slice(0, 20)
        .reverse()
        .map(item => ({
          date: new Date(item.timestamp).toLocaleDateString(),
          optimal: item.optimalPriceBand,
          own: item.ownPrice,
          competitor: item.competitorPrice
        }))
    : [];

  if (loading) {
    return (
      <div className="history-loading">
        <div className="loading-spinner"></div>
        <p>Loading pricing history...</p>
      </div>
    );
  }

  return (
    <div className="pricing-history">
      <div className="history-header">
        <h1>Pricing History</h1>
        <p>Track your pricing decisions and market trends over time</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="product-filter"
        >
          <option value="">All Products</option>
          {uniqueProducts.map(product => (
            <option key={product} value={product}>{product}</option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="date-filter"
        >
          <option value="all">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      {/* Chart Section */}
      {selectedProduct && chartData.length > 0 && (
        <div className="chart-section">
          <h3>Price Trends for {selectedProduct}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="optimal" stroke="#2563eb" strokeWidth={2} name="Optimal Price" />
              <Line type="monotone" dataKey="own" stroke="#22c55e" strokeWidth={2} name="Your Price" />
              <Line type="monotone" dataKey="competitor" stroke="#f59e0b" strokeWidth={2} name="Competitor Price" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      <div className="history-table">
        <div className="table-header">
          <h3>Pricing Analysis History</h3>
          <span className="record-count">{filteredHistory.length} records</span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="no-data">
            <Filter size={48} />
            <h4>No Data Found</h4>
            <p>Try adjusting your filters or add some pricing analyses</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Date</th>
                  <th>Your Price</th>
                  <th>Competitor Price</th>
                  <th>Optimal Price</th>
                  <th>Action</th>
                  <th>Elasticity</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, index) => (
                  <tr key={index}>
                    <td className="product-id">{item.productId}</td>
                    <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                    <td>${item.ownPrice.toFixed(2)}</td>
                    <td>${item.competitorPrice.toFixed(2)}</td>
                    <td className="optimal-price">${item.optimalPriceBand.toFixed(2)}</td>
                    <td>
                      <span className={`timing-badge ${item.markdownTiming.toLowerCase()}`}>
                        {item.markdownTiming}
                      </span>
                    </td>
                    <td>{item.elasticity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PricingHistory;