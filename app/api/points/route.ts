import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Get paginated history
    const { data: history, error, count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .neq('points_change', 0)
      .order('waktu_absen', { ascending: false })
      .range(start, end);

    if (error) throw error;

    // Get current user points
    const { data: profile } = await supabase
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: history,
      total: count,
      points: profile?.points || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err: any) {
    console.error('[points_api] error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Use Admin Client to bypass RLS policies that might block DELETE
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('attendance')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Security: ensure user owns the record

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[points_delete] error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
