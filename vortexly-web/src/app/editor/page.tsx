import { createClient } from "@/lib/supabase/server";
import { EditorShell } from "@/components/vortexly/editor-shell";

// Editor is public — user object is passed down for the auth pill only
export default async function EditorPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return <EditorShell user={data.user ?? null} />;
}

