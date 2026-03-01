import React from "react";
import { Info, Target, Cpu, Users } from "lucide-react";
import logo from "../../assets/logo.png";
import "./About.css";

export default function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <img src={logo} alt="PingMe Logo" className="about-logo" />
        <h1 className="about-title">PingMe SafetyApp</h1>
        <p className="about-subtitle">IoT-Integrated Safety Application</p>
      </div>

      <div className="about-content">
        <div className="about-section">
          <h3>
            <Info size={24} className="section-icon" />
            Project Overview
          </h3>
          <p>
            Many safety applications fail during emergencies because users cannot unlock their phones or rely on constant internet access. PingMe solves that problem by using a <strong>smart bracelet with a physical SOS button</strong> paired with a cloud-based safety application.
          </p>
          <p>
            The system supports offline emergency alerts via SMS, online real-time tracking using maps, and family-based monitoring with geofencing. Emergency alerts continue to send until the user confirms they are safe.
          </p>
        </div>

        <div className="about-section">
          <h3>
            <Target size={24} className="section-icon" />
            Key Objectives
          </h3>
          <ul className="objectives-list">
            <li>Provide a quick and discreet emergency alert system.</li>
            <li>Enable real-time GPS location tracking.</li>
            <li>Allow private family-based monitoring.</li>
            <li>Support geofencing and safe-zone alerts.</li>
            <li>Store incident logs securely in the cloud.</li>
          </ul>
        </div>
      </div>

      <div className="about-section tech-stack-container">
        <h3>
          <Cpu size={24} className="section-icon" />
          Technology Stack
        </h3>
        <p className="tech-subtitle">This project leverages modern web technologies paired with IoT hardware:</p>
        <div className="tech-stack-grid">
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

      <div className="about-section researchers-container">
        <h3>
          <Users size={24} className="section-icon" />
          The Researchers
        </h3>
        <p className="researcher-subtitle">This project is developed as part of a Bachelor of Science in Information Technology thesis.</p>
        <div className="researcher-list">
          <div className="researcher-card">John Cyrus A. Avila</div>
          <div className="researcher-card">Mark Louie O. Balaba</div>
          <div className="researcher-card">Mary Grace Maca</div>
          <div className="researcher-card">Emanuel R. Miranda</div>
          <div className="researcher-card">Eliza Jane C. Reyes</div>
        </div>
        <div className="university-text">
          Technological University of the Philippines – Manila
        </div>
      </div>
    </div>
  );
}
