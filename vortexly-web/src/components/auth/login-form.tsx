"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getClient = () => createClient();

  async function handleEmailAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await getClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/editor";
        return;
      }

      const { error } = await getClient().auth.signUp({ email, password });
      if (error) throw error;
      setMessage("Signup successful. Check your email if confirmation is enabled.");
    } catch (error) {
      const err = error as Error;
      setMessage(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setMessage("");
    setLoading(true);

    const origin = window.location.origin;
    const { error } = await getClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/editor`,
        scopes: "https://www.googleapis.com/auth/drive.file",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-mode-row">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => setMode("signin")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleEmailAuth} className="auth-form">
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          {mode === "signin" ? (
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          ) : (
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          )}
        </label>

        <button disabled={loading} type="submit" className="btn-primary auth-submit">
          {loading ? "Please wait…" : mode === "signin" ? "Continue" : "Create Account"}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button disabled={loading} type="button" className="btn-secondary auth-google-btn" onClick={handleGoogleLogin}>
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.4 3.1 29.5 1 24 1 14.6 1 6.7 6.7 3.2 14.7l7 5.4C11.9 13.9 17.5 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
          <path fill="#FBBC05" d="M10.2 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l7.7-6.2z"/>
          <path fill="#34A853" d="M24 47c5.4 0 10-1.8 13.3-4.8l-7.5-5.8c-1.9 1.3-4.3 2-5.8 2-6.5 0-12-4.4-14-10.4l-7.7 6.2C6.7 41.3 14.6 47 24 47z"/>
        </svg>
        Continue with Google
      </button>

      {message ? <p className="auth-message">{message}</p> : null}
    </div>
  );
}
