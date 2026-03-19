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

  return <MobileSplashScreen />;

}
