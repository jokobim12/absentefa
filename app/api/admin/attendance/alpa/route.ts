import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST: Deduct points for Alpha (Absent without notice)
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

    // 1. Check if ALPA record already exists for this day to prevent double penalty
    const { data: existing } = await adminClient
      .from('attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('tanggal', date)
      .eq('status', 'alpa')
      .single();

    if (existing) return NextResponse.json({ error: 'Denda Alpa sudah pernah diberikan untuk hari ini.' }, { status: 400 });

    // 2. Create an ALPA record in attendance table
    const { error: insertError } = await adminClient
      .from('attendance')
      .insert({
        user_id: userId,
        tanggal: date,
        waktu_absen: new Date().toISOString(),
        jenis: 'alpa',
        status: 'alpa',
        points_change: -5, // Alpha penalty is -5
        approval_status: 'approved',
        approved_by: adminUser.id,
        keterangan: 'Diberikan secara manual oleh Admin (Tidak Hadir)'
      });

    if (insertError) throw insertError;

    // 3. Update User Total Points
    const { error: pointError } = await adminClient.rpc('increment_points', {
      user_id_param: userId,
      increment_by: -5
    });

    if (pointError) throw pointError;

    return NextResponse.json({ 
      success: true, 
      message: 'Penalti Alpa (-5 poin) berhasil diberikan.' 
    });

  } catch (err: any) {
    console.error('[admin_attendance_alpa] error:', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
