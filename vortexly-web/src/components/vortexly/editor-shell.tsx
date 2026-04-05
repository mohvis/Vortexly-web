import type { User } from "@supabase/supabase-js";
import { PinEditor } from "@/components/editor/PinEditor";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/vortexly/UserMenu";

type EditorShellProps = {
  user: User | null;
};

export async function EditorShell({ user }: EditorShellProps) {
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
      {/* ── Top header bar ── */}
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo">
            <Image src="/logo.png" alt="" width={22} height={22} priority />
          </div>
          <span className="app-header-name">Vortexly</span>
          <span className="app-header-sep" aria-hidden="true" />
          <span className="app-header-product">PinEditor</span>
        </div>

        <div className="app-header-right">
          {user ? (
            <UserMenu email={user.email ?? ""} driveConnected={driveConnected} />
          ) : (
            <Link href="/login" className="app-header-signin">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M7 11l3-3-3-3M10 8H2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign in
            </Link>
          )}
        </div>
      </header>

      <PinEditor />
    </>
  );
}

