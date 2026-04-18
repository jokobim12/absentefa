import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  // Check if admin
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminUser?.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Determine if it's check-in or check-out
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('jenis')
      .eq('user_id', userId)
      .eq('tanggal', today)
      .order('waktu_absen', { ascending: false });

    let jenis: 'masuk' | 'pulang' = 'masuk';
    if (existingAttendance && existingAttendance.length > 0) {
      const lastType = existingAttendance[0].jenis;
      if (lastType === 'masuk') {
        jenis = 'pulang';
      } else {
        // If already clocked out, don't do anything or just allow multiple check-ins (depending on biz logic)
        // For now, let's assume one of each
        return NextResponse.json({ message: 'Sudah melakukan absensi hari ini', status: 'completed' });
      }
    }

    // Insert attendance
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        jenis: jenis,
        status: 'hadir',
        waktu_absen: new Date().toISOString(),
        tanggal: today
      });

    if (insertError) throw insertError;

    // Fetch user name for response
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    return NextResponse.json({ 
      success: true, 
      name: userData?.name, 
      type: jenis,
      message: `${userData?.name} berhasil absen ${jenis === 'masuk' ? 'MASUK' : 'PULANG'}`
    });

  } catch (error: any) {
    console.error('Face attendance log error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
