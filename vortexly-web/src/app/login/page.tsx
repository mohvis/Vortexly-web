import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="auth-split">
      {/* ── LEFT: login panel ── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">
            <Image src="/logo.png" alt="Vortexly" width={28} height={28} className="auth-brand-logo" style={{ width: 28, height: 28 }} priority />
            <span className="auth-brand-name">Vortexly</span>
          </div>

          <div className="auth-heading-block">
            <p className="eyebrow">Pin Editor</p>
            <h1>Create stunning comparison pins for anything.</h1>
            <p className="auth-sub">
              Sign in to save your projects, export in hi&#8209;res, and sync to Google Drive.
            </p>
          </div>

          <LoginForm />

          <a href="/editor" className="auth-guest-link">
            Continue without signing in →
          </a>
        </div>
      </div>

      {/* ── RIGHT: demo showcase ── */}
      <div className="auth-right">
        <div className="auth-demo-frame">
          <Image
            src="/demo-pin.png"
            alt="Sample comparison pin made with Vortexly"
            fill
            className="auth-demo-image"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        <p className="auth-demo-caption">
          Built with <strong>Vortexly PinEditor</strong> · Export as PNG or JPEG
        </p>
      </div>
    </div>
  );
}
