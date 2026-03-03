import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Info, Target, Cpu, Users } from "lucide-react";
import logo from "../../assets/logo.png";
import "./About.css";

export default function About() {
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
        <h1 className="br-nav-title">About PingMe</h1>
        <div className="br-nav-spacer"></div>
      </header>

      <main className="br-main">
        <div className="br-form-container">
          {/* Project Overview Section */}
          <div className="br-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                PROJECT OVERVIEW
              </h2>
            </div>
            <div className="about-text-content">
              <p>
                Many safety applications fail during emergencies because users cannot unlock their phones or rely on constant internet access. PingMe solves that problem by using a <strong>smart bracelet with a physical SOS button</strong> paired with a cloud-based safety application.
              </p>
              <p>
                The system supports offline emergency alerts via SMS, online real-time tracking using maps, and family-based monitoring with geofencing. Emergency alerts continue to send until the user confirms they are safe.
              </p>
            </div>
          </div>

          {/* Key Objectives Section */}
          <div className="br-section">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                KEY OBJECTIVES
              </h2>
            </div>
            <ul className="about-list">
              <li>Provide a quick and discreet emergency alert system.</li>
              <li>Enable real-time GPS location tracking.</li>
              <li>Allow private family-based monitoring.</li>
              <li>Support geofencing and safe-zone alerts.</li>
              <li>Store incident logs securely in the cloud.</li>
            </ul>
          </div>

          {/* Technology Stack Section */}
          <div className="br-section about-full-width">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                TECHNOLOGY STACK
              </h2>
            </div>
            <p className="about-section-desc">This project leverages modern web technologies paired with IoT hardware:</p>
            <div className="about-tech-grid">
              <span className="tech-pill">React.js</span>
              <span className="tech-pill">Leaflet Maps</span>
              <span className="tech-pill">Firebase Auth & Firestore</span>
              <span className="tech-pill">Python</span>
              <span className="tech-pill">Raspberry Pi Zero W</span>
              <span className="tech-pill">Neo-6M GPS Module</span>
              <span className="tech-pill">SIM800L GSM</span>
              <span className="tech-pill">MAX30100 Pulse Sensor</span>
            </div>
          </div>

          {/* The Researchers Section */}
          <div className="br-section about-full-width">
            <div className="br-section-header">
              <h2 className="br-section-title">
                <span className="br-indicator"></span>
                THE RESEARCHERS
              </h2>
            </div>
            <p className="about-section-desc">Developed as part of a Bachelor of Science in Information Technology thesis.</p>
            <div className="about-researcher-list">
              <div className="researcher-card">John Cyrus A. Avila</div>
              <div className="researcher-card">Mark Louie O. Balaba</div>
              <div className="researcher-card">Mary Grace Maca</div>
              <div className="researcher-card">Emanuel R. Miranda</div>
              <div className="researcher-card">Eliza Jane C. Reyes</div>
            </div>
            <div className="about-university">
              Technological University of the Philippines – Manila
            </div>
          </div>
        </div>
      </main>

      <footer className="br-footer">
        <button className="br-btn-secondary" onClick={handleBack}>
          Go Back
        </button>
        <button className="br-btn-primary" onClick={() => navigate('/app')}>
          Return Home
        </button>
      </footer>
    </div>
  );
}
