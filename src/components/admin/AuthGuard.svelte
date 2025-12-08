<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { getUserRole, type UserRole } from '../../lib/auth';
  
  export let requireAdmin: boolean = true;
  
  let loading = true;
  let authenticated = false;
  let userRole: UserRole | null = null;
  let userEmail: string = '';
  
  onMount(async () => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Not logged in, redirect to login
      window.location.href = '/admin/login';
      return;
    }
    
    userEmail = session.user.email || '';
    authenticated = true;
    
    // Check role
    userRole = await getUserRole(session.user.id);
    loading = false;
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = '/admin/login';
      }
    });
  });
  
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{:else if authenticated && requireAdmin && userRole !== 'admin'}
  <!-- Non-admin user sees this -->
  <div class="wip-screen">
    <div class="wip-card">
      <div class="wip-icon">🚧</div>
      <h1>Work in Progress</h1>
      <p>Your account doesn't have admin access yet.</p>
      <p class="email">Signed in as: <strong>{userEmail}</strong></p>
      <p class="hint">Contact an administrator to request access.</p>
      <div class="wip-actions">
        <a href="/" class="btn btn-secondary">← Back to Website</a>
        <button class="btn btn-outline" on:click={handleSignOut}>Sign Out</button>
      </div>
    </div>
  </div>
{:else if authenticated}
  <slot />
{/if}

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #faf8f4;
    z-index: 9999;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e8dcc4;
    border-top-color: #1a3d2e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading-screen p {
    margin-top: 1rem;
    color: #6b7280;
    font-size: 0.9rem;
  }
  
  /* Work in Progress Screen */
  .wip-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 100%);
    padding: 1rem;
    z-index: 9999;
  }
  
  .wip-card {
    background: white;
    border-radius: 24px;
    padding: 3rem;
    text-align: center;
    max-width: 450px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  
  .wip-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
  }
  
  .wip-card h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1a3d2e;
    margin-bottom: 0.75rem;
  }
  
  .wip-card p {
    color: #6b7280;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .wip-card .email {
    margin-top: 1.5rem;
    padding: 0.75rem;
    background: #f5f0e6;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  
  .wip-card .email strong {
    color: #1a3d2e;
  }
  
  .wip-card .hint {
    font-size: 0.85rem;
    color: #9ca3af;
    margin-top: 0.5rem;
  }
  
  .wip-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 10px;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .btn-secondary {
    background: #1a3d2e;
    color: white;
    border: none;
  }
  
  .btn-secondary:hover {
    background: #2d5a47;
  }
  
  .btn-outline {
    background: transparent;
    color: #6b7280;
    border: 2px solid #e8dcc4;
  }
  
  .btn-outline:hover {
    border-color: #dc2626;
    color: #dc2626;
  }
</style>
