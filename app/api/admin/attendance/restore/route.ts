import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST: Restore points for a late attendance record (Dispute Approval)
 * Body: { attendanceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check ROLE admin
    const { data: profile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { attendanceId, masukTime, pulangTime } = await request.json();
    if (!attendanceId) return NextResponse.json({ error: 'Missing attendanceId' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Get the attendance record
    const { data: attendance, error: getError } = await adminClient
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (getError || !attendance) return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    
    // Check if it's already processed or not a late record or lupa record
    const isLupa = attendance.jenis === 'lupa_absen';
    const isLate = attendance.status === 'terlambat';

    if (!isLupa && !isLate) {
      return NextResponse.json({ error: 'Record cannot be restored (not late or forgot scan)' }, { status: 400 });
    }

    // 2. Prepare Point Restoration
    const pointsToRestore = Math.abs(attendance.points_change || 0);
    
    // 3. Update the record status
    if (isLupa) {
      // Logic for Forgotten Scan: Split into Masuk & Pulang
      const date = attendance.tanggal;
      const finalMasuk = masukTime ? `${date}T${masukTime}:00` : `${date}T08:00:00`;
      const finalPulang = pulangTime ? `${date}T${pulangTime}:00` : `${date}T16:00:00`;

      // Transform current record to 'masuk'
      const { error: updateError } = await adminClient
        .from('attendance')
        .update({
          jenis: 'masuk',
          status: 'hadir',
          waktu_absen: new Date(finalMasuk).toISOString(),
          approval_status: 'dispute_approved',
          points_change: 0,
          approved_by: adminUser.id,
          keterangan: (attendance.keterangan || '') + ' (Lupa Absen Dipulihkan: Masuk)'
        })
        .eq('id', attendanceId);

      if (updateError) throw updateError;

      // Insert new 'pulang' record
      const { error: insertError } = await adminClient
        .from('attendance')
        .insert({
          user_id: attendance.user_id,
          tanggal: date,
          jenis: 'pulang',
          status: 'hadir',
          waktu_absen: new Date(finalPulang).toISOString(),
          approval_status: 'dispute_approved',
          points_change: 0,
          approved_by: adminUser.id,
          keterangan: 'Lupa Absen Dipulihkan: Pulang'
        });

      if (insertError) throw insertError;

    } else {
      // Logic for Late Record: Just Revert Status
      const { error: updateError } = await adminClient
        .from('attendance')
        .update({
          status: 'hadir',
          approval_status: 'dispute_approved',
          points_change: 0,
          approved_by: adminUser.id
        })
        .eq('id', attendanceId);

      if (updateError) throw updateError;
    }

    // 4. Update the User's total points
    if (pointsToRestore !== 0) {
      await adminClient.rpc('increment_points', {
        user_id_param: attendance.user_id,
        increment_by: pointsToRestore
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Poin berhasil dipulihkan dan status diperbarui.' 
    });

  } catch (err: any) {
    console.error('[admin_attendance_restore] error:', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
