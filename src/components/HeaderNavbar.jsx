import { Link, useLocation } from "react-router-dom";
import "./HeaderNavbar.css";
import logo from "../assets/logo.png";

export default function HeaderNavbar() {
  const { pathname } = useLocation();

  const onLogin = pathname === "/login";
  const onSignup = pathname === "/signup";

  return (
    <header className="pm-header">
      <div className="pm-header-inner">
        <Link to="/" className="pm-brand" aria-label="PingMe home">
          <img src={logo} alt="PingMe" className="pm-brand-logo" />
        </Link>

        <nav className="pm-header-right">
          {/* Only show these on the landing page */}
          {pathname === "/" && (
            <>
              <a href="#features" className="pm-navlink">Features</a>
              <a href="#how" className="pm-navlink">How it works</a>
            </>
          )}

          {!onLogin && (
            <Link to="/login" className="pm-btn pm-btn-ghost">
              Log in
            </Link>
          )}

          {!onSignup && (
            <Link to="/signup" className="pm-btn pm-btn-primary">
              Sign up
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
