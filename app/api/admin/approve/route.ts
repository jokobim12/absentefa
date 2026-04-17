import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { targetUserId, action } = await request.json();

    if (!targetUserId || !['approve', 'reject'].includes(action)) {
       return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const updateData: any = { status };
    if (status === 'approved') {
       updateData.approved_at = new Date().toISOString();
    }

    const { error } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `User ${status}` });
  } catch (error: any) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
