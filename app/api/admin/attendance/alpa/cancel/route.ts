import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST: Cancel/Undo Alpha penalty
 * Body: { userId: string, date: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, date } = await request.json();
    if (!userId || !date) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Find the ALPA record for this user and date
    const { data: alpaRecord, error: fetchError } = await adminClient
      .from('attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('tanggal', date)
      .eq('status', 'alpa')
      .single();

    if (fetchError || !alpaRecord) {
      return NextResponse.json({ error: 'Data Alpa tidak ditemukan untuk hari ini.' }, { status: 404 });
    }

    // 2. Delete the ALPA record
    const { error: deleteError } = await adminClient
      .from('attendance')
      .delete()
      .eq('id', alpaRecord.id);

    if (deleteError) throw deleteError;

    // 3. Refund the 5 points
    const { error: pointError } = await adminClient.rpc('increment_points', {
      user_id_param: userId,
      increment_by: 5 // Refund the -5 penalty
    });

    if (pointError) throw pointError;

    return NextResponse.json({ 
      success: true, 
      message: 'Status Alpa berhasil dibatalkan dan poin telah dikembalikan.' 
    });

  } catch (err: any) {
    console.error('[admin_attendance_alpa_cancel] error:', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
