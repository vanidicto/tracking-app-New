import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { useNavigate, Link } from "react-router-dom";

import HeaderNavbar from "../components/HeaderNavbar";
import Button from "../ui/Button";
import Input from "../ui/Input";

import "../styles/auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      setFormError(err?.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeaderNavbar />

      <div className="authPage">
        <main className="authMain">
          <div className="authCard">
            <div className="authHeader">
              <h1>Create an account</h1>
              <p>Start using PingMe SafetyApp</p>
            </div>

            <form onSubmit={handleSignup} className="authForm">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                rightSlot={
                  <button
                    type="button"
                    className="authLink"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                }
              />

              {formError ? <div className="authError">{formError}</div> : null}

              <Button variant="primary" size="lg" disabled={submitting}>
                {submitting ? "Creating account..." : "Sign up"}
              </Button>

              <div className="authRow" style={{ justifyContent: "center" }}>
                <span className="authFooterTextInline">
                  Already have an account?{" "}
                  <Link to="/login" className="authLink">Log in</Link>
                </span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
