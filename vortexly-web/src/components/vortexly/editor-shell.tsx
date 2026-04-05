import type { User } from "@supabase/supabase-js";
import { PinEditor } from "@/components/editor/PinEditor";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type EditorShellProps = {
  user: User | null;
};

export async function EditorShell({ user }: EditorShellProps) {
  // Check Drive connection status server-side to avoid a client-side waterfall
  let driveConnected = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("drive_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .single();
    driveConnected = !!data;
  }

  return (
    <>
      <div className="shell-topbar">
        <div className="user-pill">
          {user ? (
            <>
              {driveConnected ? (
                <span className="drive-status drive-status--on" title="Google Drive sync active">
                  <svg viewBox="0 0 20 14" fill="none" width="16" height="12" aria-hidden="true">
                    <path d="M1 7L4.5 1h11L19 7l-4.5 7h-9L1 7z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    <path d="M7 7l2.5 2.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              ) : (
                <Link href="/login" className="drive-status drive-status--off" title="Connect Google Drive">
                  <svg viewBox="0 0 20 14" fill="none" width="16" height="12" aria-hidden="true">
                    <path d="M1 7L4.5 1h11L19 7l-4.5 7h-9L1 7z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    <path d="M10 4v3M10 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </Link>
              )}
              <span>{user.email}</span>
              <Link href="/logout" className="icon-link" aria-label="Sign out">↩</Link>
            </>
          ) : (
            <Link href="/login" className="ghost-btn sign-in-pill">
              Sign in to sync
            </Link>
          )}
        </div>
      </div>
      <PinEditor />
    </>
  );
}

