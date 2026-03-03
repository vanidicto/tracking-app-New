import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, HelpCircle, Shield, Phone, Watch, Lock } from "lucide-react";
import "./HelpArticles.css";

const categories = [
  { icon: Watch, title: "Getting Started", desc: "Setting up your smart bracelet and app." },
  { icon: Shield, title: "Emergency SOS", desc: "How to trigger and manage SOS alerts." },
  { icon: Phone, title: "Emergency Contacts", desc: "Managing who gets notified during alerts." },
  { icon: Lock, title: "Privacy & Security", desc: "How we keep your tracking data safe." },
];

export default function HelpArticles() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/app', { state: { openProfile: true } });
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={handleBack}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Help Articles</h1>
        <div className="br-nav-spacer"></div>
      </header>

      <main className="br-main">
        <div className="help-search-container">
          <div className="br-input-group">
            <Search size={18} className="br-icon" />
            <input
              type="text"
              className="br-input"
              placeholder="Search for articles..."
            />
          </div>
        </div>

        <div className="br-form-container">
          <div className="br-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                BROWSE BY CATEGORY
              </h2>
            </div>

            <div className="help-categories">
              {categories.map((cat, idx) => (
                <div key={idx} className="help-category-card">
                  <div className="help-category-icon">
                    <cat.icon size={24} />
                  </div>
                  <div className="help-category-info">
                    <h3>{cat.title}</h3>
                    <p>{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="br-footer">
        <button className="br-btn-secondary" onClick={handleBack}>
          Go Back
        </button>
        <button className="br-btn-primary" onClick={() => window.open('mailto:support@pingme.com')}>
          Contact Support
        </button>
      </footer>
    </div>
  );
}
