import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, role, status } = await request.json();
    const params = await context.params;
    const targetUserId = params.id;

    if (!targetUserId) return NextResponse.json({ error: 'Missing User ID' }, { status: 400 });

    const adminClient = createAdminClient();
    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (status) {
      updateData.status = status;
      if (status === 'approved') updateData.approved_at = new Date().toISOString();
    }

    const { error } = await adminClient.from('users').update(updateData).eq('id', targetUserId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const targetUserId = params.id;
    if (!targetUserId) return NextResponse.json({ error: 'Missing User ID' }, { status: 400 });

    // Cek apakah menghapus diri sendiri
    if (user.id === targetUserId) {
        return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    
    // Hapus dari sistem Auth Supabase.
    // Karena tabel public.users dan public.attendance memiliki ON DELETE CASCADE ke auth.users,
    // menghapus data di Auth secara otomatis membersihkan semua data terkait di database publik.
    const { error } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'User deleted permanently' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
