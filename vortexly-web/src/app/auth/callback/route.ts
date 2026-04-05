import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code       = requestUrl.searchParams.get("code");
  const tokenHash  = requestUrl.searchParams.get("token_hash");
  const type       = requestUrl.searchParams.get("type") as "signup" | "recovery" | "email" | null;
  const next       = requestUrl.searchParams.get("next") ?? "/editor";

  // Capture cookies as Supabase sets them so we can apply them to the redirect
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options }),
          );
        },
      },
    },
  );

  // ── Email confirmation / magic-link (token_hash flow) ────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
    }
    const res = NextResponse.redirect(new URL(next, request.url));
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]));
    return res;
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

  // Build redirect and apply all captured session cookies onto it
  const redirectResponse = NextResponse.redirect(new URL(next, request.url));
  pendingCookies.forEach(({ name, value, options }) =>
    redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]),
  );

  return redirectResponse;
}
