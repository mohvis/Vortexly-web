import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/drive/save-token
// Called client-side after OAuth redirect to persist the provider_token,
// which is not available in the server-side exchangeCodeForSession PKCE flow.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await supabase.auth.getUser(token || undefined);
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { access_token, refresh_token } = await req.json() as {
      access_token: string;
      refresh_token: string | null;
    };
    if (!access_token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();
    await supabase.from("drive_tokens").upsert(
      {
        user_id:       user.id,
        access_token,
        refresh_token: refresh_token ?? null,
        expires_at:    expiresAt,
        scope:         "https://www.googleapis.com/auth/drive.file",
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
