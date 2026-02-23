import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

import HeaderNavbar from "../components/HeaderNavbar";
import Button from "../ui/Button";
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
    <>
      <HeaderNavbar />

      <div className="authPage">
        <main className="authMain">
          <div className="authCard">
            <div className="authHeader">
              <h1>Welcome back</h1>
              <p>Log in to continue monitoring and responding to alerts.</p>
            </div>

            <form className="authForm" onSubmit={onSubmit}>
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
                {submitting ? "Logging in..." : "Log in"}
              </Button>

              <div className="authRow">
                <span className="authFooterTextInline">
                  Don’t have an account?{" "}
                  <Link to="/signup" className="authLink">Sign up</Link>
                </span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
