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

    // Use the service-role client for DB lookups and the invite. The caller's
    // identity is already verified above via getUser(token). We cannot use the
    // anon client for the role lookup: getUser(token) validates the JWT but does
    // not attach it to .from() queries, so RLS sees auth.uid() as null and the
    // "view own role" policy returns no row, failing every caller (even admins).
    const serverClient = createServerClient();

    // Check caller's role
    const { data: roleData } = await serverClient
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

    // Send the invite with an explicit redirect to our set-password page, so the
    // email link lands on the live site instead of the Supabase "Site URL"
    // fallback. PUBLIC_SITE_URL must also be in the Supabase redirect allow-list.
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;
    const { data: inviteData, error: inviteError } = await serverClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/admin/set-password`,
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 400 });
    }

    // Set the role for the invited user (the trigger creates 'user' by default,
    // but if we want admin, we need to update it)
    if (inviteRole === 'admin' && inviteData.user) {
      const { error: roleError } = await serverClient
        .from('user_roles')
        .upsert({ user_id: inviteData.user.id, role: 'admin' }, { onConflict: 'user_id' });
      if (roleError) {
        console.error('[api/invite] invite sent but failed to set admin role:', roleError.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Invitation sent to ${email}`,
    }), { status: 200 });

  } catch (err: any) {
    console.error('[api/invite] error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
