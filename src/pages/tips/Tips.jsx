import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    User,
    Watch,
    Home,
    Users,
    MapPin,
    FileText,
    Zap,
    Circle,
    Pencil,
    Trash2,
    Smartphone,
    Check,
    Wifi
} from "lucide-react";
import "./Tips.css";

const sections = [
    {
        id: "account-bracelet",
        title: "Account & My Bracelet",
        icon: Watch,
        content: (
            <div className="tips-content-section">
                <section>
                    <h3><User size={20} /> Account Management</h3>
                    <p>Your account is the heart of your safety network. Here's how to manage it:</p>
                    <ul>
                        <li><strong>Profile Updates:</strong> Go to the Account page to update your name, email, and profile picture.</li>
                        <li><strong>Security:</strong> Change your password regularly and ensure your recovery email is up to date.</li>
                    </ul>

                    <div className="account-tutorial-animation">
                        <div className="acc-bg-dots"></div>
                        <div className="acc-device acc-phone">
                            <Smartphone size={32} color="#1e293b" strokeWidth={1.5} />
                            <div className="acc-phone-screen"></div>
                        </div>
                        <div className="acc-signal-waves">
                            <Wifi size={24} color="#A4262C" />
                        </div>
                        <div className="acc-device acc-bracelet">
                            <Watch size={28} color="#1e293b" strokeWidth={1.5} />
                            <div className="acc-bracelet-pulse"></div>
                        </div>
                        <div className="acc-sync-badge">
                            <Check size={14} color="white" strokeWidth={3} />
                        </div>
                    </div>
                </section>
                <section>
                    <h3><Watch size={20} /> My Bracelet</h3>
                    <p>The PingMe Smart Bracelet is your physical lifeline. Follow these tips for the best experience:</p>
                    <div className="tips-info-card">
                        <h4>Pairing your Device</h4>
                        <p>In the "My Bracelet" section, click "Add New Bracelet" and follow the on-screen prompts.</p>
                    </div>
                    <ul>
                        <li><strong>Battery Status:</strong> Check the "My Bracelet" page to see real-time battery levels. Charge it when it drops below 20%.</li>
                        <li><strong>Status Indicators:</strong> A solid green light means connected, while a blinking red light indicates a disconnected state or low battery.</li>
                    </ul>
                </section>
            </div>
        )
    },
    {
        id: "home-people",
        title: "Home & People",
        icon: Users,
        content: (
            <div className="tips-content-section">
                <section>
                    <h3><Home size={20} /> Home Dashboard</h3>
                    <p>The Home page provides a real-time overview of your safety status and the locations of your loved ones.</p>
                    <ul>
                        <li><strong>Live Map:</strong> View the real-time GPS location of your bracelet and any shared contacts.</li>
                        <li><strong>SOS Trigger:</strong> The SOS alert is triggered directly from your bracelet. Once pressed, it automatically sends a signal distress to your primary emergency contacts via app notifications.</li>
                    </ul>

                    <div className="home-tutorial-animation">
                        <div className="net-hub">
                            <div className="net-node net-center">
                                <Watch size={20} color="white" />
                                <div className="net-center-pulse"></div>
                            </div>

                            {/* Caregiver 1 - Top Right */}
                            <div className="net-connection conn-1">
                                <div className="net-line"></div>
                                <div className="net-ping"></div>
                            </div>
                            <div className="net-node net-cg cg-1"><Smartphone size={16} color="#475569" /></div>

                            {/* Caregiver 2 - Bottom Left */}
                            <div className="net-connection conn-2">
                                <div className="net-line"></div>
                                <div className="net-ping"></div>
                            </div>
                            <div className="net-node net-cg cg-2"><Smartphone size={16} color="#475569" /></div>

                            {/* Caregiver 3 - Bottom Right */}
                            <div className="net-connection conn-3">
                                <div className="net-line"></div>
                                <div className="net-ping"></div>
                            </div>
                            <div className="net-node net-cg cg-3"><Smartphone size={16} color="#475569" /></div>
                        </div>
                    </div>
                </section>
                <section>
                    <h3><Users size={20} /> People & Contacts</h3>
                    <p>Manage who can see your location and who gets notified in case of an emergency.</p>
                    <ul>
                        <li><strong>Adding People:</strong> Use the plus icon in the People tab to invite contacts via their phone number or email.</li>
                        <li><strong>Permissions:</strong> You can toggle location sharing on or off for individual people at any time.</li>
                    </ul>
                </section>
            </div>
        )
    },
    {
        id: "places-report",
        title: "Places & Report",
        icon: MapPin,
        content: (
            <div className="tips-content-section">
                <section>
                    <h3><MapPin size={20} /> Places & Geofencing</h3>
                    <p>Geofencing allows you to set up 'Safe Zones'. You'll be notified whenever the bracelet enters or leaves these areas.</p>

                    <div className="geofence-tutorial-animation">
                        <div className="gf-map-bg"></div>
                        <div className="gf-ui-toolbar">
                            <div className="gf-draw-btn">
                                <Circle size={14} color="#A4262C" />
                            </div>
                        </div>
                        <div className="gf-cursor">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4L11.381 21.9056C11.6669 22.5992 12.6394 22.6105 12.9392 21.9238L15.4222 16.2427C15.5398 15.9734 15.7483 15.7533 16.01 15.6267L21.7513 12.8483C22.4468 12.5117 22.4277 11.5161 21.7196 11.2057L4 4Z" fill="#333333" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="gf-drawn-zone"></div>
                        <div className="gf-center-pin">
                            <MapPin size={18} color="#A4262C" fill="white" />
                        </div>
                        <div className="gf-notification">
                            Safey Zone Created
                        </div>
                    </div>

                    <div className="geofence-guide">
                        <h4><Zap size={18} /> How to use Geofence Monitoring:</h4>
                        <div className="tool-grid">
                            <div className="tool-item">
                                <div className="tool-icon"><Circle size={24} /></div>
                                <div className="tool-text">
                                    <strong>Draw:</strong> Click this icon to start drawing a circle on the map to define a new safe zone.
                                </div>
                            </div>
                            <div className="tool-item">
                                <div className="tool-icon"><Pencil size={24} /></div>
                                <div className="tool-text">
                                    <strong>Edit:</strong> Select an existing zone to resize it or change its center point.
                                </div>
                            </div>
                            <div className="tool-item">
                                <div className="tool-icon"><Trash2 size={24} color="#A4262C" /></div>
                                <div className="tool-text">
                                    <strong>Delete:</strong> Remove safe zones you no longer need by selecting them and clicking the delete icon.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section>
                    <h3><FileText size={20} /> Activity Reports</h3>
                    <p>The Report page provides a detailed history of your safety data.</p>
                    <ul>
                        <li><strong>Location History:</strong> Review where the bracelet has been over the last 24 hours, 7 days, or 30 days.</li>
                        <li><strong>Alert Logs:</strong> A chronological list of every SOS trigger and geofence breach.</li>
                    </ul>
                </section>
            </div>
        )
    }
];

export default function Tips() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(sections[0].id);

    const handleBack = () => {
        navigate('/app', { state: { openProfile: true } });
    };

    return (
        <div className="br-page tips-page">
            <header className="br-navbar">
                <button className="br-nav-back" onClick={handleBack}>
                    <ChevronLeft size={24} color="#444" />
                </button>
                <h1 className="br-nav-title">Tips & Guide</h1>
                <div className="br-nav-spacer"></div>
            </header>

            <div className="tips-horizontal-nav-container">
                <div className="tips-horizontal-nav">
                    {sections.map((sec) => (
                        <button
                            key={sec.id}
                            className={`tips-tab-btn ${activeSection === sec.id ? "active" : ""}`}
                            onClick={() => setActiveSection(sec.id)}
                        >
                            {sec.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="tips-layout">
                <main className="br-main tips-main-content">
                    <div className="tips-content-wrapper">
                        <div className="tips-dynamic-content">
                            {sections.find(s => s.id === activeSection).content}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
