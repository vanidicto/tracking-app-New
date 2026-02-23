import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './MobileSplashScreen.css';

export default function MobileSplashScreen() {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/login');
        }, 2000); // 2 second display

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <img src={logo} alt="PingMe Logo" className="splash-logo" />
                <div className="splash-loader"></div>
            </div>
        </div>
    );
}
