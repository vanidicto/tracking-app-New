import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import logo from "../assets/logo.png";
import Input from "../ui/Input";

import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      setFormError(err?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authPage">
      <main className="authMain">
        <div className="authCard">
          <div className="authLeft">
            <div className="authLogoContainer">
              <Link to="/">
                <img src={logo} alt="PingMe Logo" className="authLogo" />
              </Link>
            </div>

            <div className="authHeader">
              <h1>Welcome Back to PingMe!</h1>
              <p>Log in to stay connected with your community.</p>
            </div>
          </div>

          <div className="authRight">
            <form className="authForm" onSubmit={onSubmit}>
              <Input
                label="Email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                leftSlot={<Mail size={18} />}
              />

              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                leftSlot={<Lock size={18} />}
                rightSlot={
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
                  </button>
                }
              />

              <div className="forgotPwdLink">
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>

              {formError ? <div className="authError" style={{ textAlign: 'center', color: '#fff', background: 'rgba(231, 76, 60, 0.8)', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>{formError}</div> : null}

              <div className="authBtnContainer">
                <button className="authBtnMaroon" type="submit" disabled={submitting}>
                  {submitting ? "Logging in..." : "Login"}
                </button>
              </div>

              <div className="authFooter">
                Don't have an account? <Link to="/signup">Sign Up</Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
