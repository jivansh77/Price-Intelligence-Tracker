/**
 * BulkAnalysis Component
 * 
 * Upload CSV or manually add multiple products for bulk pricing analysis
 */

import React, { useState } from "react";
import { Upload, Plus, Trash2, Download, AlertCircle } from "lucide-react";
import "./BulkAnalysis.css";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function BulkAnalysis() {
  const [products, setProducts] = useState([
    { productId: "", ownPrice: "", competitorPrice: "", elasticity: "" }
  ]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addProduct = () => {
    setProducts([...products, { productId: "", ownPrice: "", competitorPrice: "", elasticity: "" }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const csvProducts = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length >= 3) {
            csvProducts.push({
              productId: values[headers.indexOf('productid') || 0]?.trim() || `Product-${i}`,
              ownPrice: values[headers.indexOf('ownprice') || 1]?.trim() || "",
              competitorPrice: values[headers.indexOf('competitorprice') || 2]?.trim() || "",
              elasticity: values[headers.indexOf('elasticity') || 3]?.trim() || ""
            });
          }
        }
        
        if (csvProducts.length > 0) {
          setProducts(csvProducts);
          setError(null);
        }
      } catch (err) {
        setError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate products
    const validProducts = products.filter(p => 
      p.productId.trim() && 
      p.ownPrice && 
      p.competitorPrice &&
      !isNaN(parseFloat(p.ownPrice)) &&
      !isNaN(parseFloat(p.competitorPrice))
    );

    if (validProducts.length === 0) {
      setError("Please provide at least one valid product with Product ID, Own Price, and Competitor Price.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/price/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: validProducts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze products");
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const csvContent = [
      "Product ID,Own Price,Competitor Price,Elasticity,Optimal Price,Markdown Timing,Price Gap %,Revenue Impact %",
      ...results.products.map(p => 
        `${p.productId},${p.ownPrice},${p.competitorPrice},${p.elasticity},${p.optimalPriceBand},${p.markdownTiming},${p.priceGap},${p.potentialRevenue.revenueImpact}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-pricing-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bulk-analysis">
      <div className="bulk-header">
        <h1>Bulk Pricing Analysis</h1>
        <p>Analyze multiple products at once for comprehensive pricing insights</p>
      </div>

      {/* CSV Upload Section */}
      <div className="upload-section">
        <div className="upload-card">
          <Upload size={32} />
          <h3>Upload CSV File</h3>
          <p>Upload a CSV with columns: ProductID, OwnPrice, CompetitorPrice, Elasticity (optional)</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="file-input"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="upload-btn">
            Choose CSV File
          </label>
        </div>
      </div>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} className="bulk-form">
        <div className="form-header">
          <h3>Manual Entry</h3>
          <button type="button" onClick={addProduct} className="add-btn">
            <Plus size={16} />
            Add Product
          </button>
        </div>

        <div className="products-grid">
          {products.map((product, index) => (
            <div key={index} className="product-row">
              <input
                type="text"
                placeholder="Product ID"
                value={product.productId}
                onChange={(e) => updateProduct(index, 'productId', e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Your Price ($)"
                value={product.ownPrice}
                onChange={(e) => updateProduct(index, 'ownPrice', e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Competitor Price ($)"
                value={product.competitorPrice}
                onChange={(e) => updateProduct(index, 'competitorPrice', e.target.value)}
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Elasticity (optional)"
                value={product.elasticity}
                onChange={(e) => updateProduct(index, 'elasticity', e.target.value)}
              />
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="remove-btn"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="analyze-btn">
          {loading ? "Analyzing..." : "Analyze All Products"}
        </button>
      </form>

      {/* Results Section */}
      {results && (
        <div className="results-section">
          <div className="results-header">
            <h3>Analysis Results</h3>
            <button onClick={downloadResults} className="download-btn">
              <Download size={16} />
              Download CSV
            </button>
          </div>

          {/* Summary Stats */}
          <div className="summary-stats">
            <div className="summary-card">
              <h4>{results.summary.totalProducts}</h4>
              <p>Products Analyzed</p>
            </div>
            <div className="summary-card immediate">
              <h4>{results.summary.immediateActions}</h4>
              <p>Immediate Actions</p>
            </div>
            <div className="summary-card hold">
              <h4>{results.summary.holdRecommendations}</h4>
              <p>Hold Positions</p>
            </div>
            <div className="summary-card monitor">
              <h4>{results.summary.monitorRecommendations}</h4>
              <p>Monitor Closely</p>
            </div>
          </div>

          {/* Results Table */}
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Current Price</th>
                  <th>Competitor Price</th>
                  <th>Optimal Price</th>
                  <th>Action</th>
                  <th>Price Gap</th>
                  <th>Revenue Impact</th>
                </tr>
              </thead>
              <tbody>
                {results.products.map((product, index) => (
                  <tr key={index}>
                    <td>{product.productId}</td>
                    <td>${Number(product.ownPrice).toFixed(2)}</td>
                    <td>${Number(product.competitorPrice).toFixed(2)}</td>
                    <td>${Number(product.optimalPriceBand).toFixed(2)}</td>
                    <td>
                      <span className={`timing-badge ${product.markdownTiming.toLowerCase()}`}>
                        {product.markdownTiming}
                      </span>
                    </td>
                    <td>{product.priceGap}%</td>
                    <td>{product.potentialRevenue.revenueImpact}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkAnalysis;