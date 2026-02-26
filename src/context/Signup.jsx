import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";

import logo from "../assets/logo.png";
import Input from "../ui/Input";

import "../styles/auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setFormError(err?.message || "Signup failed. Please try again.");
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
              <h1>Join PingMe's trusted Network</h1>
              <p>Sign up to request help when it's needed the most.</p>
            </div>
          </div>

          <div className="authRight">
            <form className="authForm" onSubmit={handleSignup}>
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                leftSlot={<User size={18} />}
              />

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
                autoComplete="new-password"
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

              <Input
                label="Confirm Password"
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
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

              {formError ? <div className="authError" style={{ textAlign: 'center', color: '#fff', background: 'rgba(231, 76, 60, 0.8)', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>{formError}</div> : null}

              <div className="authBtnContainer">
                <button className="authBtnMaroon" type="submit" disabled={submitting}>
                  {submitting ? "Signing up..." : "Sign up"}
                </button>
              </div>

              <div className="authFooter">
                Already have an account? <Link to="/login">Login</Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
