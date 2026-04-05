"use client";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  email: string;
  driveConnected: boolean;
}

export function UserMenu({ email, driveConnected }: UserMenuProps) {
  const [open, setOpen]           = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      {/* ── Avatar button ── */}
      <div className="um-wrap" ref={menuRef}>
        <button
          className="um-trigger"
          onClick={() => setOpen(o => !o)}
          aria-label="User menu"
          aria-expanded={open}
        >
          <span className="um-avatar" aria-hidden="true">
            {email.charAt(0).toUpperCase()}
          </span>
          <svg className="um-chevron" viewBox="0 0 10 6" width="10" height="6" fill="none" aria-hidden="true">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* ── Dropdown ── */}
        {open && (
          <div className="um-dropdown" role="menu">
            {/* Email */}
            <div className="um-email">{email}</div>

            {/* Drive status */}
            <div className={`um-drive ${driveConnected ? "um-drive--on" : "um-drive--off"}`}>
              {driveConnected ? (
                <>
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                    <path d="M2 8.5L5.5 5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Drive connected
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Drive not connected
                </>
              )}
            </div>

            <div className="um-divider" role="separator" />

            {/* Sign out */}
            <button
              className="um-signout"
              role="menuitem"
              onClick={() => { setOpen(false); setConfirming(true); }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Confirmation modal ── */}
      {confirming && (
        <div className="um-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="um-modal-title">
          <div className="um-modal">
            <div className="um-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4" stroke="#f0ebe3" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M16 17l5-5-5-5M21 12H9" stroke="#f0ebe3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 id="um-modal-title" className="um-modal-title">Sign out of Vortexly?</h2>
            <p className="um-modal-body">Your work is auto&#8209;saved locally. You can continue as a guest after signing out.</p>
            <div className="um-modal-actions">
              <button className="um-modal-cancel" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <a className="um-modal-confirm" href="/logout">
                Sign Out
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
