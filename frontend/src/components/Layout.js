/**
 * Layout Component
 * 
 * Main dashboard layout with sidebar navigation
 */

import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { 
  BarChart3, 
  Calculator, 
  History, 
  Upload, 
  Bell,
  TrendingUp 
} from "lucide-react";
import "./Layout.css";

function Layout() {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <TrendingUp className="sidebar-icon" />
            Price Intelligence
          </h2>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item" end>
            <BarChart3 size={20} />
            Dashboard
          </NavLink>
          
          <NavLink to="/pricing" className="nav-item">
            <Calculator size={20} />
            Price Calculator
          </NavLink>
          
          <NavLink to="/bulk-analysis" className="nav-item">
            <Upload size={20} />
            Bulk Analysis
          </NavLink>
          
          <NavLink to="/history" className="nav-item">
            <History size={20} />
            Pricing History
          </NavLink>
          
          <NavLink to="/alerts" className="nav-item">
            <Bell size={20} />
            Price Alerts
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;