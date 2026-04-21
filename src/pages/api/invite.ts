import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the caller's auth token from the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.slice(7);

    // Verify the caller is authenticated and is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    // Check caller's role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
    }

    // Parse request body
    const { email, role } = await request.json();
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
    }

    const inviteRole = role === 'admin' ? 'admin' : 'user';

    // Use the service role client to invite the user
    const serverClient = createServerClient();
    const { data: inviteData, error: inviteError } = await serverClient.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 400 });
    }

    // Set the role for the invited user (the trigger creates 'user' by default,
    // but if we want admin, we need to update it)
    if (inviteRole === 'admin' && inviteData.user) {
      await serverClient
        .from('user_roles')
        .upsert({ user_id: inviteData.user.id, role: 'admin' }, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Invitation sent to ${email}`,
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
};
