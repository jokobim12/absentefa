import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getDistanceMeters } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Autentikasi user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body request
    const body = await request.json();
    const { token, lat, long, foto, jenis: requestedJenis } = body as {
      token?: string;
      lat?: number;
      long?: number;
      foto?: string; // base64 string
      jenis?: 'masuk' | 'pulang';
    };

    if (!token) {
      return NextResponse.json({ error: 'Token QR wajib diisi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Ambil token dari database
    const { data: qrToken, error: tokenError } = await adminClient
      .from('qr_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !qrToken) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    // 4. Cek token belum digunakan
    if (qrToken.used) {
      return NextResponse.json({ error: 'Token sudah digunakan' }, { status: 400 });
    }

    // 5. Cek token belum expired (gunakan waktu server!)
    const serverNow = new Date();
    const expiredAt = new Date(qrToken.expired_at);
    if (serverNow > expiredAt) {
      return NextResponse.json({ error: 'Token sudah expired, scan ulang QR' }, { status: 400 });
    }

    // 6. Cek status absensi hari ini (Gunakan WITA / Asia/Makassar)
    const todayWITA = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
    }).format(serverNow); // format: YYYY-MM-DD

    // 6a. Tentukan jenis absensi (jika tidak dikirim, auto-detect)
    let finalJenis = requestedJenis;
    const { data: attendanceToday } = await adminClient
      .from('attendance')
      .select('jenis')
      .eq('user_id', user.id)
      .eq('tanggal', todayWITA);

    const hasMasuk = attendanceToday?.some((a: any) => a.jenis === 'masuk');
    const hasPulang = attendanceToday?.some((a: any) => a.jenis === 'pulang');

    if (!finalJenis) {
      finalJenis = hasMasuk ? 'pulang' : 'masuk';
    }

    // 6b. Validasi alur absensi
    if (finalJenis === 'masuk' && hasMasuk) {
      return NextResponse.json({ error: 'Anda sudah absen masuk hari ini' }, { status: 400 });
    }
    if (finalJenis === 'pulang') {
      if (!hasMasuk) {
        return NextResponse.json({ error: 'Anda harus absen masuk terlebih dahulu' }, { status: 400 });
      }
      if (hasPulang) {
        return NextResponse.json({ error: 'Anda sudah absen pulang hari ini' }, { status: 400 });
      }
    }

    // 6c. Logika Poin & Status
    const hourFormatter = new Intl.DateTimeFormat('id-ID', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Makassar',
    });
    const minuteFormatter = new Intl.DateTimeFormat('id-ID', {
      minute: 'numeric',
      timeZone: 'Asia/Makassar',
    });
    const currentHourWITA = parseInt(hourFormatter.format(serverNow));
    const currentMinuteWITA = parseInt(minuteFormatter.format(serverNow));
    
    let attendanceStatus = 'hadir';
    let pointsChange = 0;

    if (finalJenis === 'masuk') {
      // Terlambat jika lewat jam 08:00
      if (currentHourWITA > 8 || (currentHourWITA === 8 && currentMinuteWITA > 0)) {
        attendanceStatus = 'terlambat';
        pointsChange = -1;
      }
    } else if (finalJenis === 'pulang') {
      if (currentHourWITA < 16) {
        attendanceStatus = 'pulang_cepat';
        pointsChange = 0; 
      } else if (currentHourWITA >= 17) {
        // Lembur: +5 poin per jam setelah jam 16:00
        const overtimeHours = currentHourWITA - 16;
        pointsChange = overtimeHours * 5;
      }
    }

    // 7. Validasi radius geolokasi (Strict)
    // ... existing code ...
    const tefaLat = process.env.TEFA_LAT ? parseFloat(process.env.TEFA_LAT) : null;
    const tefaLong = process.env.TEFA_LONG ? parseFloat(process.env.TEFA_LONG) : null;
    const maxRadius = process.env.TEFA_RADIUS_METER
      ? parseFloat(process.env.TEFA_RADIUS_METER)
      : 100;

    if (tefaLat && tefaLong) {
      if (lat === undefined || long === undefined || lat === null || long === null) {
        return NextResponse.json(
          { error: 'Lokasi GPS tidak ditemukan. Pastikan GPS aktif dan berikan izin lokasi.' },
          { status: 400 }
        );
      }
      
      const distance = getDistanceMeters(lat, long, tefaLat, tefaLong);
      if (distance > maxRadius) {
        return NextResponse.json(
          { error: `Anda berada di luar area TEFA (Jarak: ${Math.round(distance)}m dari lokasi)` },
          { status: 400 }
        );
      }
    }

    // 8. Upload foto selfie ke Supabase Storage (jika ada)
    let fotoUrl: string | null = null;
    if (foto && foto.startsWith('data:')) {
      try {
        // Ekstrak base64 data & mime type secara lebih aman
        const commaIndex = foto.indexOf(',');
        if (commaIndex !== -1) {
          const base64Data = foto.substring(commaIndex + 1);
          const mimeTypeMatch = foto.match(/^data:(image\/\w+);base64,/);
          const contentType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 0) {
            const fileName = `${user.id}/${todayWITA}_${Date.now()}.jpg`;

            const { data: uploadData, error: uploadError } = await adminClient.storage
              .from('attendance-photos')
              .upload(fileName, buffer, {
                contentType: contentType,
                upsert: true,
              });

            if (uploadError) {
              console.error('[absen] Storage upload error:', uploadError.message);
            } else if (uploadData) {
              const { data: publicUrlData } = adminClient.storage
                .from('attendance-photos')
                .getPublicUrl(uploadData.path);
                
              if (publicUrlData?.publicUrl) {
                fotoUrl = publicUrlData.publicUrl;
              }
            }
          }
        }
      } catch (uploadErr) {
        console.error('[absen] Unexpected photo process error:', uploadErr);
      }
    }

    // 9. Simpan absensi & Update Poin User
    const { data: attendance, error: absenError } = await adminClient
      .from('attendance')
      .insert({
        user_id: user.id,
        waktu_absen: serverNow.toISOString(),
        tanggal: todayWITA,
        jenis: finalJenis,
        lat: lat ?? null,
        long: long ?? null,
        foto_url: fotoUrl,
        status: attendanceStatus,
        points_change: pointsChange
      })
      .select()
      .single();

    if (absenError) {
      console.error('[absen] DB insert error:', absenError);
      return NextResponse.json({ error: 'Gagal menyimpan absensi' }, { status: 500 });
    }

    // 9b. Update total poin di tabel users
    if (pointsChange !== 0) {
      const { error: pointUpdateError } = await adminClient.rpc('increment_points', {
        user_id_param: user.id,
        increment_by: pointsChange
      });
      
      if (pointUpdateError) {
        console.error('[absen] Point update error:', pointUpdateError);
        // Tetap lanjut karena absensi sudah berhasil tersimpan
      }
    }

    // 10. Tandai token sebagai used
    await adminClient
      .from('qr_tokens')
      .update({ used: true })
      .eq('id', qrToken.id);

    return NextResponse.json({
      success: true,
      message: 'Absensi berhasil!',
      status: attendance.status,
      waktu_absen: attendance.waktu_absen,
      tanggal: attendance.tanggal,
      id: attendance.id,
    });
  } catch (err) {
    console.error('[absen] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
