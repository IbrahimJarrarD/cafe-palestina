<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { setPassword } from '../../lib/auth';

  let checking = true;        // verifying the email-link session
  let ready = false;          // valid session, show the form
  let userEmail = '';
  let password = '';
  let confirm = '';
  let submitting = false;
  let success = false;
  let error = '';

  onMount(() => {
    let settled = false;

    // Surface explicit errors that Supabase puts in the URL hash
    // (e.g. an expired or already-used invite link).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error')) {
      error = (hash.get('error_description') || 'This link is invalid or has expired.').replace(/\+/g, ' ');
      checking = false;
      return;
    }

    function activate(session: any) {
      if (settled || !session) return;
      settled = true;
      userEmail = session.user?.email || '';
      ready = true;
      checking = false;
    }

    // The shared client auto-detects the session from the URL on load. It may
    // already be set, or arrive a tick later via the auth event.
    supabase.auth.getSession().then(({ data }) => activate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => activate(session));

    // If no session establishes, the link was bad or expired.
    const timer = setTimeout(() => {
      if (!settled) {
        checking = false;
        error = 'This link is invalid or has expired. Ask an admin to send a new invite.';
      }
      sub.subscription.unsubscribe();
    }, 5000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  });

  async function handleSubmit() {
    error = '';
    if (password.length < 8) {
      error = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirm) {
      error = 'Passwords do not match.';
      return;
    }

    submitting = true;
    const result = await setPassword(password);

    if (!result.success) {
      error = result.error || 'Could not set password. Try again.';
      submitting = false;
      return;
    }

    success = true;
    setTimeout(() => { window.location.href = '/admin'; }, 1500);
  }
</script>

<div class="card">
  <div class="header">
    <img src="/logo.jpg" alt="Cafe Palestine" class="logo" />
    <h1>Set Your Password</h1>
    <p>Choose a password to finish setting up your account</p>
  </div>

  {#if checking}
    <div class="status">
      <div class="spinner"></div>
      <p>Verifying your link...</p>
    </div>
  {:else if success}
    <div class="status">
      <div class="check">✓</div>
      <p>Password set! Redirecting to the dashboard...</p>
    </div>
  {:else if ready}
    <form on:submit|preventDefault={handleSubmit} class="form">
      {#if userEmail}
        <p class="email-note">Setting password for <strong>{userEmail}</strong></p>
      {/if}

      <div class="form-group">
        <label for="password">New password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          required
          minlength="8"
          placeholder="At least 8 characters"
          autocomplete="new-password"
        />
      </div>

      <div class="form-group">
        <label for="confirm">Confirm password</label>
        <input
          type="password"
          id="confirm"
          bind:value={confirm}
          required
          placeholder="Re-enter your password"
          autocomplete="new-password"
        />
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <button type="submit" class="submit-btn" disabled={submitting}>
        {submitting ? 'Saving...' : 'Set Password'}
      </button>
    </form>
  {:else}
    <div class="status">
      <div class="error-icon">⚠️</div>
      <p class="error-text">{error}</p>
      <a href="/admin/login" class="back-link">Go to login</a>
    </div>
  {/if}
</div>

<style>
  .card {
    background: #ffffff;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 420px;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a3d2e;
    margin-bottom: 0.5rem;
  }

  .header p {
    font-size: 0.9rem;
    color: #6b7280;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .email-note {
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
  }

  .email-note strong {
    color: #1a3d2e;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #1c1c1c;
  }

  .form-group input {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border: 2px solid #e8dcc4;
    border-radius: 10px;
    transition: all 0.2s;
    background: #faf8f4;
  }

  .form-group input:focus {
    outline: none;
    border-color: #6b8c42;
    background: #ffffff;
  }

  .error-message {
    padding: 0.875rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.875rem;
    text-align: center;
  }

  .submit-btn {
    padding: 1rem;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 100%);
    color: #ffffff;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(26, 61, 46, 0.3);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 0;
    text-align: center;
    color: #6b7280;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e8dcc4;
    border-top-color: #1a3d2e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .check {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0fdf4;
    border: 2px solid #bbf7d0;
    border-radius: 50%;
    color: #16a34a;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .error-icon {
    font-size: 2.5rem;
  }

  .error-text {
    color: #dc2626;
    font-size: 0.9rem;
  }

  .back-link {
    color: #1a3d2e;
    font-weight: 500;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>
