import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: the browser Supabase client manages all cookie writes.
          // Allowing server-side writes causes Supabase to clear cookies
          // when token refresh network calls fail in serverless environments.
        },
      },
    },
  );
}
