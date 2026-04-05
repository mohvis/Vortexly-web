import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/drive/status
// Returns { connected: boolean, authenticated: boolean }
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Only treat as unauthenticated if getUser itself failed
    if (userError || !user) {
      return NextResponse.json({ connected: false, authenticated: false });
    }

    // Table query is best-effort — a missing table must not hide auth status
    try {
      const { data } = await supabase
        .from("drive_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      return NextResponse.json({ connected: !!data, authenticated: true });
    } catch {
      // drive_tokens table may not exist yet — user is still authenticated
      return NextResponse.json({ connected: false, authenticated: true });
    }
  } catch {
    return NextResponse.json({ connected: false, authenticated: false });
  }
}
