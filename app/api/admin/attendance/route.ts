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

    const { id, action, customPoints } = await request.json(); 
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

    // 2. Logika Poin Otomatis
    let finalPointsChange = 0;
    const finalStatus = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'reject') {
      // Cek apakah hari ini sudah ada rekaman 'masuk' atau 'pulang' yang sudah approved
      // Jika ada, maka penolakan izin/sakit (iseng-iseng) tidak perlu denda
      const { count: presenceCount } = await adminClient
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', attendance.user_id)
        .eq('tanggal', attendance.tanggal)
        .in('jenis', ['masuk', 'pulang'])
        .in('approval_status', ['approved', 'dispute_approved']);

      finalPointsChange = (presenceCount || 0) > 0 ? 0 : -5; 
    } else {
      // SETUJU
      if (customPoints !== undefined) {
        finalPointsChange = parseInt(customPoints);
      } else {
        const type = attendance.jenis.toLowerCase();
        
        if (type === 'lupa_absen') {
          finalPointsChange = 0;
        } else if (type === 'izin' || type === 'sakit') {
          // HITUNG DATA MINGGUAN (Senin - Minggu)
          // Tentukan hari Senin terdekat (WITA)
          const now = new Date();
          const day = now.getDay(); // 0 is Sunday, 1 is Monday
          const diffToMonday = day === 0 ? 6 : day - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - diffToMonday);
          monday.setHours(0, 0, 0, 0);
          
          const mondayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(monday);

          // Cek berapa kali sudah izin/sakit di minggu ini yang sudah disetujui
          const { count } = await adminClient
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', attendance.user_id)
            .in('jenis', ['izin', 'sakit'])
            .in('approval_status', ['approved', 'dispute_approved'])
            .gte('tanggal', mondayDate);

          // Aturan: Izin pertama gratis (0), kedua dst (-1)
          finalPointsChange = (count || 0) === 0 ? 0 : -1;
        }
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
      message: `Presensi berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
      points_applied: finalPointsChange
    });

  } catch (err: any) {
    console.error('[admin_attendance] PATCH error:', err.message || err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
