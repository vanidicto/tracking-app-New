import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MapPin, Bell, Shield, Battery, Radio, Watch } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import useIsMobile from '../../hooks/useIsMobile';
import MobileSplashScreen from '../../components/MobileSplashScreen';
import './Landing.css';

import logo from '../../assets/logo.png';

export default function Landing() {
  const isDev = import.meta.env.DEV;
  const isMobile = useIsMobile();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isMobile) {
    return <MobileSplashScreen />;
  }

  return (
    <div className="landing">
      {/* DEV-ONLY: Admin Login Quick Link */}
      {isDev && (
        <Link to="/admin-login" className="landing-admin-dev" title="Dev-only: Admin Login">
          Admin Login
        </Link>
      )}

      <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="pm-container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="PingMe home">
            <img src={logo} alt="PingMe" className="landing-logo" />
          </Link>

          <nav className="landing-nav">
            <a href="#features" className="landing-navlink">Features</a>
            <a href="#how" className="landing-navlink">How it works</a>
            <div className="landing-actions">
              <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link to="/signup"><Button variant="primary" size="sm">Sign up</Button></Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="pm-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-chip">Real-time • SOS • Geofences</div>
              <h1>
                A safer way to track loved ones —
                <span className="landing-accent"> instantly</span>.
              </h1>
              <p className="landing-sub">
                PingMe connects to smart safety bracelets to provide live location tracking, SOS alerts,
                and safe-zone monitoring — built for fast response and peace of mind.
              </p>

              <div className="landing-cta">
                <Link to="/signup"><Button variant="primary" size="lg">Create an account</Button></Link>
                <Link to="/login"><Button variant="secondary" size="lg">I already have one</Button></Link>
              </div>

              <p className="landing-foot pm-muted">
                Capstone project demo • Your data is handled securely via Firebase.
              </p>
            </div>

            <div className="landing-hero-visual" aria-hidden="true">
              {/* CSS Radar Visualization */}
              <div className="radar-container">
                <div className="radar-circles">
                  <div className="radar-circle circle-1"></div>
                  <div className="radar-circle circle-2"></div>
                  <div className="radar-circle circle-3"></div>
                </div>
                <div className="radar-scanner"></div>
                <div className="radar-center">
                  <div className="radar-dot"></div>
                  <div className="radar-ping"></div>
                </div>

                {/* Floating Stats positioned securely around the radar */}
                <div className="radar-stats">
                  <div className="landing-stat stat-top-right">
                    <span className="dot dot--success" /> Safe
                  </div>
                  <div className="landing-stat stat-bottom-left">
                    <span className="dot dot--danger" /> SOS Alert
                  </div>
                  <div className="landing-stat stat-bottom-right">
                    <span className="dot dot--primary" /> Live Tracking
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="landing-section" id="features">
          <div className="pm-container">
            <h2 className="landing-h2">Focused features that matter</h2>
            <p className="landing-p pm-muted">Everything is designed to drive a fast, clear response.</p>

            <div className="landing-cards">
              <Card className="landing-card">
                <div className="landing-card-icon"><MapPin size={24} /></div>
                <h3>Live Location</h3>
                <p className="pm-muted">See bracelet users on the map with last seen and status indicators.</p>
              </Card>

              <Card className="landing-card">
                <div className="landing-card-icon icon-danger"><Bell size={24} /></div>
                <h3>SOS Alerts</h3>
                <p className="pm-muted">Instantly surface emergencies with clear red alert states.</p>
              </Card>

              <Card className="landing-card">
                <div className="landing-card-icon"><Shield size={24} /></div>
                <h3>Safe Zones</h3>
                <p className="pm-muted">Create geofences and get notified when users enter or leave areas.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Meet PingMe Device Section */}
        <section className="landing-section landing-section-device">
          <div className="pm-container">
            <div className="landing-device-grid">
              <div className="landing-device-content">
                <h2 className="landing-h2">Meet the PingMe Bracelet</h2>
                <p className="landing-p pm-muted">
                  A dedicated safety device that works without a phone. Simple, rugged, and always on.
                </p>

                <ul className="landing-specs">
                  <li>
                    <Battery className="spec-icon" />
                    <div>
                      <strong>7-Day Battery</strong>
                      <span className="pm-muted">Long-lasting protection.</span>
                    </div>
                  </li>
                  <li>
                    <Radio className="spec-icon" />
                    <div>
                      <strong>Independent Connectivity</strong>
                      <span className="pm-muted">Built-in cellular GPS.</span>
                    </div>
                  </li>
                  <li>
                    <Watch className="spec-icon" />
                    <div>
                      <strong>One-Touch SOS</strong>
                      <span className="pm-muted">Tactile button for emergencies.</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="landing-device-visual">
                {/* CSS Visualization of the device since image gen is down */}
                <div className="device-placeholder">
                  <div className="device-screen">
                    <span className="device-time">12:30</span>
                    <span className="device-status">Active</span>
                  </div>
                  <div className="device-strap"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section landing-section-alt" id="how">
          <div className="pm-container">
            <h2 className="landing-h2">How it works</h2>
            <div className="landing-cards">
              <Card className="landing-card">
                <div className="landing-card-icon"><span className="landing-step-icon-text">1</span></div>
                <h3>Create an account</h3>
                <p className="pm-muted">Sign up and log in to access the tracking dashboard.</p>
              </Card>

              <Card className="landing-card">
                <div className="landing-card-icon"><span className="landing-step-icon-text">2</span></div>
                <h3>Link bracelet users</h3>
                <p className="pm-muted">Add bracelet IDs and store emergency contacts for each person.</p>
              </Card>

              <Card className="landing-card">
                <div className="landing-card-icon"><span className="landing-step-icon-text">3</span></div>
                <h3>Monitor and respond</h3>
                <p className="pm-muted">View locations, alerts, and reports in one place.</p>
              </Card>
            </div>

          </div>
        </section>

        <footer className="landing-footer">
          <div className="pm-container landing-footer-inner">
            <span className="pm-muted">© {new Date().getFullYear()} PingMe SafetyApp</span>
            <span className="pm-muted">Capstone Project</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
