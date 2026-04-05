import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET  /api/editor/state  ─ load saved state for current user ──
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await supabase.auth.getUser(token || undefined);
    if (!user) return NextResponse.json({ state: null }, { status: 200 });

    const { data, error } = await supabase
      .from('editor_state')
      .select('state')
      .eq('user_id', user.id)
      .single();

    // PGRST116 = no rows found (normal for new users)
    // PGRST205 = table not in schema cache (table not created yet — treat as no state)
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;
    return NextResponse.json({ state: data?.state ?? null });
  } catch (err) {
    console.error('[/api/editor/state GET]', err);
    return NextResponse.json({ error: 'Failed to load state' }, { status: 500 });
  }
}

// ── POST /api/editor/state  ─ upsert state for current user ──────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await supabase.auth.getUser(token || undefined);
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { error } = await supabase
      .from('editor_state')
      .upsert({ user_id: user.id, state: body, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' });

    if (error && error.code !== 'PGRST205') throw error;   // 205 = table not created yet
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/editor/state POST]', err);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}
