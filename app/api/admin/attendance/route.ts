import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET: List pending attendance records
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Cek ROLE admin
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('attendance')
      .select('*, users(name, points)')
      .eq('approval_status', 'pending')
      .order('waktu_absen', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[admin_attendance] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Approve / Reject attendance
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, action, customPoints } = await request.json(); // action: 'approve' | 'reject', customPoints: number
    if (!id || !action) return NextResponse.json({ error: 'Missing ID or action' }, { status: 400 });

    const adminClient = createAdminClient();
    
    // 1. Ambil data attendance
    const { data: attendance, error: getError } = await adminClient
      .from('attendance')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !attendance) return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    if (attendance.approval_status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 });

    // 2. Tentukan pengurangan poin berdasarkan peraturan atau input custom
    let finalPointsChange = 0;
    const finalStatus = action === 'approve' ? 'approved' : 'rejected';

    if (customPoints !== undefined) {
       finalPointsChange = parseInt(customPoints);
    } else {
       if (attendance.jenis === 'izin' || attendance.jenis === 'sakit') {
          finalPointsChange = action === 'approve' ? -3 : -5;
       }
    }

    // 3. Update Record
    const { error: updateError } = await adminClient
      .from('attendance')
      .update({
        approval_status: finalStatus,
        points_change: finalPointsChange,
        approved_by: adminUser.id
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Update Poin User
    if (finalPointsChange !== 0) {
      await adminClient.rpc('increment_points', {
        user_id_param: attendance.user_id,
        increment_by: finalPointsChange
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Presensi berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.` 
    });

  } catch (err: any) {
    console.error('[admin_attendance] PATCH error:', err.message || err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
