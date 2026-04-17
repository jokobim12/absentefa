import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, nim, jabatan, avatar_url } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nim !== undefined) updateData.nim = nim;
    if (jabatan !== undefined) updateData.jabatan = jabatan;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Profil diperbarui' });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
