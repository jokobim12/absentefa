import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get requester profile
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  try {
    const { descriptor, targetUserId } = await req.json();

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: 'Invalid descriptor' }, { status: 400 });
    }

    // Determine whose face we're registering
    const finalUserId = (isAdmin && targetUserId) ? targetUserId : user.id;

    const { error } = await supabase
      .from('user_faces')
      .upsert({
        user_id: finalUserId,
        descriptor: descriptor,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Face registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId');

  // Check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const isAdmin = profile?.role === 'admin';
  const finalUserId = (isAdmin && targetUserId) ? targetUserId : user.id;

  const { data, error } = await supabase
    .from('user_faces')
    .select('created_at')
    .eq('user_id', finalUserId)
    .single();

  return NextResponse.json({ isRegistered: !!data, registeredAt: data?.created_at });
}
