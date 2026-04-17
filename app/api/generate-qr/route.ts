import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Validasi bahwa requester adalah admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // Generate token unik
    const token = uuidv4();
    const expiredAt = new Date(Date.now() + 10 * 1000).toISOString(); // 10 detik

    // Simpan ke database menggunakan admin client (bypass RLS)
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('qr_tokens').insert({
      token,
      expired_at: expiredAt,
      used: false,
    });

    if (error) {
      console.error('[generate-qr] DB error:', error);
      return NextResponse.json({ error: 'Failed to generate QR' }, { status: 500 });
    }

    return NextResponse.json({ token, expiredAt });
  } catch (err) {
    console.error('[generate-qr] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
