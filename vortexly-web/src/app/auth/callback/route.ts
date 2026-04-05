import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/editor";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Persist Google Drive tokens if present (requires drive.file scope)
    const accessToken  = data.session?.provider_token;
    const refreshToken = data.session?.provider_refresh_token;
    const userId       = data.session?.user?.id;

    if (userId && accessToken) {
      // expires_in is not directly on session; use 55 min as conservative default
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

  return NextResponse.redirect(new URL(next, request.url));
}
