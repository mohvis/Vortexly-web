import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/drive/status
// Returns { connected: boolean } — whether the user has Drive tokens stored
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ connected: false, authenticated: false });

    const { data } = await supabase
      .from("drive_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ connected: !!data, authenticated: true });
  } catch {
    return NextResponse.json({ connected: false, authenticated: false });
  }
}
