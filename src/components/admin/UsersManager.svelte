<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { updateUserRole, type UserRole } from '../../lib/auth';
  
  interface UserWithRole {
    id: string;
    user_id: string;
    role: UserRole;
    created_at: string;
    email?: string;
  }
  
  let users: UserWithRole[] = [];
  let loading = true;
  let updating: string | null = null;
  let error = '';
  let success = '';

  // Invite form state
  let showInviteForm = false;
  let inviteEmail = '';
  let inviteRole: UserRole = 'admin';
  let inviting = false;
  
  onMount(async () => {
    await loadUsers();
  });
  
  async function loadUsers() {
    loading = true;
    error = '';
    
    // Fetch users with emails using our custom function
    const { data, error: fetchError } = await supabase
      .rpc('get_users_with_roles');
    
    if (fetchError) {
      error = 'Failed to load users: ' + fetchError.message;
      loading = false;
      return;
    }
    
    users = ((data as any[]) || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
      email: r.email
    }));
    
    loading = false;
  }
  
  async function changeRole(user: UserWithRole, newRole: UserRole) {
    if (updating) return;
    
    updating = user.user_id;
    error = '';
    success = '';
    
    const result = await updateUserRole(user.user_id, newRole);
    
    if (result.success) {
      user.role = newRole;
      users = [...users];
      success = `Role updated successfully!`;
      setTimeout(() => success = '', 3000);
    } else {
      error = result.error || 'Failed to update role';
    }
    
    updating = null;
  }
  
  async function inviteUser() {
    if (!inviteEmail || inviting) return;
    inviting = true;
    error = '';
    success = '';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      error = 'You must be logged in';
      inviting = false;
      return;
    }

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Failed to invite user';
      } else {
        success = `Invitation sent to ${inviteEmail}!`;
        inviteEmail = '';
        showInviteForm = false;
        setTimeout(() => success = '', 5000);
        await loadUsers();
      }
    } catch (err: any) {
      error = err.message || 'Failed to invite user';
    }

    inviting = false;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="users-manager">
  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}
  
  {#if success}
    <div class="alert alert-success">{success}</div>
  {/if}
  
  <!-- Invite Button & Form -->
  <div class="invite-section">
    {#if showInviteForm}
      <form class="invite-form" on:submit|preventDefault={inviteUser}>
        <div class="invite-fields">
          <input
            type="email"
            bind:value={inviteEmail}
            placeholder="email@example.com"
            required
            class="invite-input"
          />
          <select bind:value={inviteRole} class="invite-role-select">
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <button type="submit" class="btn btn-invite" disabled={inviting || !inviteEmail}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
          <button type="button" class="btn btn-cancel" on:click={() => { showInviteForm = false; inviteEmail = ''; }}>
            Cancel
          </button>
        </div>
        <p class="invite-hint">An invitation email will be sent. The user must click the link to set their password.</p>
      </form>
    {:else}
      <button class="btn btn-add" on:click={() => showInviteForm = true}>
        + Invite User
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>
  {:else if users.length === 0}
    <div class="empty-state">
      <p>No users found</p>
    </div>
  {:else}
    <div class="users-list">
      {#each users as user}
        <div class="user-card" class:is-admin={user.role === 'admin'}>
          <div class="user-info">
            <div class="user-avatar">
              {user.role === 'admin' ? '👑' : '👤'}
            </div>
            <div class="user-details">
              <span class="user-email">{user.email || 'Unknown'}</span>
              <span class="user-joined">Joined {formatDate(user.created_at)}</span>
            </div>
          </div>
          
          <div class="user-actions">
            <select 
              class="role-select"
              value={user.role}
              on:change={(e) => changeRole(user, (e.target as HTMLSelectElement).value as UserRole)}
              disabled={updating === user.user_id}
            >
              <option value="user">👤 User</option>
              <option value="admin">👑 Admin</option>
            </select>
            
            {#if updating === user.user_id}
              <span class="updating">Saving...</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
    
    <div class="info-box">
      <h4>💡 Role Permissions</h4>
      <ul>
        <li><strong>Admin</strong> - Full access to dashboard, can manage users</li>
        <li><strong>User</strong> - Account only, sees "Work in Progress" page</li>
      </ul>
    </div>
  {/if}
</div>

<style>
  .users-manager {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .alert {
    padding: 0.875rem;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  
  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }
  
  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem;
    background: white;
    border-radius: 12px;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e8dcc4;
    border-top-color: #1a3d2e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading p {
    margin-top: 1rem;
    color: #6b7280;
  }
  
  .users-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .user-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border-left: 4px solid #e8dcc4;
    transition: all 0.2s;
  }
  
  .user-card.is-admin {
    border-left-color: #d4a853;
    background: #fffdf7;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .user-avatar {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f0e6;
    border-radius: 12px;
    font-size: 1.5rem;
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
  }
  
  .user-email {
    font-size: 0.95rem;
    font-weight: 500;
    color: #1a3d2e;
  }
  
  .user-joined {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .user-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .role-select {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border: 2px solid #e8dcc4;
    border-radius: 8px;
    background: white;
    cursor: pointer;
  }
  
  .role-select:focus {
    outline: none;
    border-color: #6b8c42;
  }
  
  .role-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .updating {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .info-box {
    padding: 1.25rem;
    background: #f5f0e6;
    border-radius: 12px;
    border-left: 4px solid #6b8c42;
  }
  
  .info-box h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a3d2e;
    margin-bottom: 0.75rem;
  }
  
  .info-box ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.85rem;
    color: #4b5563;
  }
  
  .info-box li {
    margin-bottom: 0.25rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 12px;
    color: #6b7280;
  }

  /* Invite Section */
  .invite-section {
    margin-bottom: 0.5rem;
  }

  .invite-form {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border-left: 4px solid #6b8c42;
  }

  .invite-fields {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .invite-input {
    flex: 1;
    min-width: 200px;
    padding: 0.625rem 1rem;
    font-size: 0.9rem;
    border: 2px solid #e8dcc4;
    border-radius: 8px;
    background: #faf8f4;
  }

  .invite-input:focus {
    outline: none;
    border-color: #6b8c42;
    background: white;
  }

  .invite-role-select {
    padding: 0.625rem 1rem;
    font-size: 0.9rem;
    border: 2px solid #e8dcc4;
    border-radius: 8px;
    background: white;
  }

  .invite-hint {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-add {
    background: #1a3d2e;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
  }

  .btn-add:hover {
    background: #2d5a47;
  }

  .btn-invite {
    background: #6b8c42;
    color: white;
  }

  .btn-invite:hover:not(:disabled) {
    background: #5a7a35;
  }

  .btn-invite:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: transparent;
    color: #6b7280;
    border: 2px solid #e8dcc4;
  }

  .btn-cancel:hover {
    border-color: #dc2626;
    color: #dc2626;
  }
</style>

