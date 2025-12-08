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
</style>

