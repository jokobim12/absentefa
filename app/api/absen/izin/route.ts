import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jenis, keterangan, foto, tanggal } = await request.json();

    if (!jenis || !keterangan) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const serverNow = new Date();
    const targetTanggal = tanggal || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
    }).format(serverNow);

    // Upload bukti jika ada
    let fotoUrl: string | null = null;
    if (foto && foto.startsWith('data:')) {
       try {
        const commaIndex = foto.indexOf(',');
        if (commaIndex !== -1) {
          const base64Data = foto.substring(commaIndex + 1);
          const mimeTypeMatch = foto.match(/^data:(image\/\w+);base64,/);
          const contentType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          
          const fileName = `izin/${user.id}/${targetTanggal}_${Date.now()}.jpg`;
          const { data: uploadData } = await adminClient.storage
            .from('attendance-photos')
            .upload(fileName, buffer, { contentType, upsert: true });

          if (uploadData) {
            const { data: publicUrlData } = adminClient.storage
              .from('attendance-photos')
              .getPublicUrl(uploadData.path);
            fotoUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.error('[izin] Upload error:', err);
      }
    }

    const { data: attendance, error: insertError } = await adminClient
      .from('attendance')
      .insert({
        user_id: user.id,
        waktu_absen: serverNow.toISOString(),
        tanggal: targetTanggal,
        jenis: jenis, // 'izin' or 'sakit'
        keterangan: keterangan,
        foto_url: fotoUrl,
        status: 'pending',
        approval_status: 'pending',
        points_change: 0 // Belum dikurangi sampai disetujui/ditolak
      })
      .select()
      .single();

    if (insertError) {
      console.error('[izin] Insert error:', insertError);
      return NextResponse.json({ error: 'Gagal mengirim pengajuan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengajuan izin berhasil dikirim. Menunggu verifikasi admin.',
      data: attendance
    });
  } catch (err) {
    console.error('[izin] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
