import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code       = requestUrl.searchParams.get("code");
  const tokenHash  = requestUrl.searchParams.get("token_hash");
  const type       = requestUrl.searchParams.get("type") as "signup" | "recovery" | "email" | null;
  const next       = requestUrl.searchParams.get("next") ?? "/editor";

  const supabase = await createClient();

  // ── Email confirmation / magic-link (token_hash flow) ────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  // ── OAuth / PKCE code exchange (Google, etc.) ────────────────
  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Persist Google Drive tokens if present (requires drive.file scope)
    const accessToken  = data.session?.provider_token;
    const refreshToken = data.session?.provider_refresh_token;
    const userId       = data.session?.user?.id;

    if (userId && accessToken) {
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();
      await supabase.from("drive_tokens").upsert(
        {
          user_id:       userId,
          access_token:  accessToken,
          refresh_token: refreshToken ?? null,
          expires_at:    expiresAt,
          scope:         "https://www.googleapis.com/auth/drive.file",
        },
        { onConflict: "user_id" },
      );
    }
  }

  // Build redirect and forward all Supabase session cookies onto it
  const redirectResponse = NextResponse.redirect(new URL(next, request.url));
  const cookieStore = await cookies();
  cookieStore.getAll().forEach(({ name, value }) => {
    if (name.startsWith("sb-")) {
      redirectResponse.cookies.set(name, value, {
        path:     "/",
        sameSite: "lax",
        httpOnly: true,
        secure:   true,
      });
    }
  });

  return redirectResponse;
}
