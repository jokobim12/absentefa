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

    const { attendanceId } = await request.json();
    if (!attendanceId) return NextResponse.json({ error: 'Missing attendanceId' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Get the attendance record
    const { data: attendance, error: getError } = await adminClient
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (getError || !attendance) return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    
    // Check if it's already processed or not a late record
    if (attendance.status !== 'terlambat') {
      return NextResponse.json({ error: 'Record is not a late record' }, { status: 400 });
    }

    // 2. IMPORTANT: Revert the point deduction
    // If it was late (-1), we add +1 back to restore to 0 change
    const pointsToRestore = Math.abs(attendance.points_change || 0);
    
    // 3. Update the record status
    const { error: updateError } = await adminClient
      .from('attendance')
      .update({
        status: 'hadir', // Change from 'terlambat' to 'hadir'
        approval_status: 'dispute_approved',
        points_change: 0, // Reset points change to 0
        approved_by: adminUser.id
      })
      .eq('id', attendanceId);

    if (updateError) throw updateError;

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
