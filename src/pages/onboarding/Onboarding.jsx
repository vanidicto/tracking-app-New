import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

// Import the new UI screenshots
import introImg from '../../assets/onboarding/Intro.png';
import homeImg from '../../assets/onboarding/Home Page.png';
import peopleImg from '../../assets/onboarding/UserProfilePeople Page.png';
import profileImg from '../../assets/onboarding/ProfileMenus.png';
import reportImg from '../../assets/onboarding/Report Page.png';
import geofenceImg from '../../assets/onboarding/Geofence Feature Page.png';
import authImg from '../../assets/onboarding/LoginSignup Page.png';

const SLIDES = [
  {
    id: 1,
    title: "Your Gateway to Personal Safety",
    description: "Experience a new standard of protection, designed for you and your loved ones from the ground up.",
    image: introImg
  },
  {
    id: 2,
    title: "Intuitive Safety Dashboard",
    description: "Stay informed at a glance with real-time updates and essential safety metrics on your home screen.",
    image: homeImg
  },
  {
    id: 3,
    title: "Connecting Your Inner Circle",
    description: "Easily manage your community and keep track of everyone's safety status in one centralized location.",
    image: peopleImg
  },
  {
    id: 4,
    title: "Customize Your Protection",
    description: "Fine-tune your experience and manage your safety preferences and profile with complete ease.",
    image: profileImg
  },
  {
    id: 5,
    title: "Rapid Emergency Insights",
    description: "Access detailed safety reports and history to stay ahead of potential risks and stay protected.",
    image: reportImg
  },
  {
    id: 6,
    title: "Smart Boundary Control",
    description: "Define safe zones and receive instant alerts when your loved ones enter or leave designated areas.",
    image: geofenceImg
  },
  {
    id: 7,
    title: "Secure Your Future Today",
    description: "Join PingMe and take the first step towards a safer, more connected, and truly protected life.",
    image: authImg
  }
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    navigate('/login', { replace: true });
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-wrapper">
        <div 
          className="onboarding-slider" 
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => (
            <div key={slide.id} className="onboarding-slide">
              <div className="onboarding-visual">
                <div className="tech-decor-container">
                  <div className="tech-ring ring-main"></div>
                  <div className="tech-ring ring-inner"></div>
                  <div className="tech-glow"></div>
                  <div className="tech-particle p-1"></div>
                  <div className="tech-particle p-2"></div>
                  <div className="tech-particle p-3"></div>
                </div>
                <img src={slide.image} alt={slide.title} className="ui-screenshot" />
              </div>
              
              <div className="onboarding-content">
                <h1 className="onboarding-title">{slide.title}</h1>
                <p className="onboarding-description">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-pagination">
            {SLIDES.map((_, index) => (
              <div 
                key={index} 
                className={`pagination-dot ${currentSlide === index ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              ></div>
            ))}
          </div>

          <button className="onboarding-btn-next" onClick={handleNext}>
            {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </button>

          <button className="onboarding-btn-skip" onClick={handleSkip}>
            Skip Introduction
          </button>
        </div>
      </div>
    </div>
  );
}
