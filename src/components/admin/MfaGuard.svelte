<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  type MfaState = 'loading' | 'enroll' | 'verify' | 'passed';

  let state: MfaState = 'loading';
  let qrCodeUri = '';
  let totpSecret = '';
  let factorId = '';
  let verifyCode = '';
  let error = '';
  let enrolling = false;
  let verifying = false;

  onMount(async () => {
    await checkMfaStatus();
  });

  async function checkMfaStatus() {
    state = 'loading';
    error = '';

    const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      error = aalError.message;
      state = 'enroll';
      return;
    }

    // If already at AAL2, user has verified MFA this session
    if (data.currentLevel === 'aal2') {
      state = 'passed';
      return;
    }

    // Check if user has any TOTP factors enrolled
    const totpFactors = (data.currentAuthenticationMethods || [])
      .filter((m: any) => m.method === 'totp');

    // Also check the factors list directly
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = (factorsData?.totp || []).filter((f: any) => f.status === 'verified');

    if (verifiedFactors.length > 0) {
      // Has enrolled factor — needs to verify
      factorId = verifiedFactors[0].id;
      state = 'verify';
    } else {
      // No factors — needs to enroll
      state = 'enroll';
    }
  }

  async function enrollMfa() {
    enrolling = true;
    error = '';

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Cafe Palestine Admin',
    });

    if (enrollError) {
      error = enrollError.message;
      enrolling = false;
      return;
    }

    factorId = data.id;
    qrCodeUri = data.totp.qr_code;
    totpSecret = data.totp.secret;
    enrolling = false;
  }

  async function verifyMfa() {
    if (verifyCode.length !== 6) return;
    verifying = true;
    error = '';

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      error = challengeError.message;
      verifying = false;
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      error = 'Invalid code. Please try again.';
      verifyCode = '';
      verifying = false;
      return;
    }

    verifying = false;
    state = 'passed';
  }

  function handleCodeInput(e: Event) {
    const input = e.target as HTMLInputElement;
    // Only allow digits
    verifyCode = input.value.replace(/\D/g, '').slice(0, 6);
    // Auto-submit when 6 digits entered
    if (verifyCode.length === 6) {
      verifyMfa();
    }
  }
</script>

{#if state === 'loading'}
  <div class="mfa-screen">
    <div class="mfa-card">
      <div class="spinner"></div>
      <p>Checking security...</p>
    </div>
  </div>

{:else if state === 'enroll'}
  <div class="mfa-screen">
    <div class="mfa-card">
      <div class="mfa-icon">🔐</div>
      <h1>Set Up Two-Factor Authentication</h1>
      <p>Protect your admin account with an authenticator app (Bitwarden, Google Authenticator, etc.)</p>

      {#if qrCodeUri}
        <div class="qr-section">
          <div class="qr-code">
            <img src={qrCodeUri} alt="Scan this QR code with your authenticator app" />
          </div>
          <div class="secret-section">
            <p class="secret-label">Or enter this key manually:</p>
            <code class="secret-code">{totpSecret}</code>
          </div>
          <div class="verify-section">
            <p class="verify-label">Enter the 6-digit code from your app to confirm:</p>
            <input
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              class="code-input"
              bind:value={verifyCode}
              on:input={handleCodeInput}
            />
            {#if error}
              <div class="error-msg">{error}</div>
            {/if}
            <button
              class="btn-primary"
              on:click={verifyMfa}
              disabled={verifyCode.length !== 6 || verifying}
            >
              {verifying ? 'Verifying...' : 'Confirm & Enable 2FA'}
            </button>
          </div>
        </div>
      {:else}
        <div class="setup-section">
          {#if error}
            <div class="error-msg">{error}</div>
          {/if}
          <button class="btn-primary" on:click={enrollMfa} disabled={enrolling}>
            {enrolling ? 'Generating...' : 'Generate QR Code'}
          </button>
          <p class="setup-hint">
            This will generate a QR code you can scan with Bitwarden or any TOTP authenticator.
          </p>
        </div>
      {/if}
    </div>
  </div>

{:else if state === 'verify'}
  <div class="mfa-screen">
    <div class="mfa-card mfa-card-compact">
      <div class="mfa-icon">🔑</div>
      <h1>Two-Factor Verification</h1>
      <p>Enter the 6-digit code from your authenticator app</p>
      <input
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        placeholder="000000"
        class="code-input code-input-large"
        bind:value={verifyCode}
        on:input={handleCodeInput}
      />
      {#if error}
        <div class="error-msg">{error}</div>
      {/if}
      <button
        class="btn-primary"
        on:click={verifyMfa}
        disabled={verifyCode.length !== 6 || verifying}
      >
        {verifying ? 'Verifying...' : 'Verify'}
      </button>
    </div>
  </div>

{:else if state === 'passed'}
  <slot />
{/if}

<style>
  .mfa-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 100%);
    padding: 1rem;
    z-index: 9998;
  }

  .mfa-card {
    background: white;
    border-radius: 24px;
    padding: 2.5rem;
    text-align: center;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .mfa-card-compact {
    max-width: 400px;
    padding: 2.5rem 2rem;
  }

  .mfa-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .mfa-card h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #1a3d2e;
    margin-bottom: 0.5rem;
  }

  .mfa-card > p {
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    line-height: 1.4;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e8dcc4;
    border-top-color: #1a3d2e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* QR Code Section */
  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .qr-code {
    padding: 1rem;
    background: white;
    border: 2px solid #e8dcc4;
    border-radius: 16px;
  }

  .qr-code img {
    width: 200px;
    height: 200px;
    display: block;
  }

  .secret-section {
    width: 100%;
  }

  .secret-label {
    font-size: 0.8rem;
    color: #9ca3af;
    margin-bottom: 0.5rem;
  }

  .secret-code {
    display: block;
    padding: 0.75rem;
    background: #f5f0e6;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.85rem;
    color: #1a3d2e;
    word-break: break-all;
    user-select: all;
  }

  .verify-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .verify-label {
    font-size: 0.85rem;
    color: #4b5563;
    font-weight: 500;
  }

  /* Code Input */
  .code-input {
    width: 180px;
    padding: 0.875rem;
    font-size: 1.5rem;
    font-family: monospace;
    text-align: center;
    letter-spacing: 0.5em;
    border: 2px solid #e8dcc4;
    border-radius: 12px;
    background: #faf8f4;
  }

  .code-input:focus {
    outline: none;
    border-color: #6b8c42;
    background: white;
  }

  .code-input-large {
    width: 220px;
    padding: 1rem;
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  /* Buttons */
  .btn-primary {
    width: 100%;
    max-width: 280px;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 100%);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(26, 61, 46, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-msg {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.85rem;
    width: 100%;
    max-width: 280px;
    text-align: center;
  }

  .setup-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .setup-hint {
    font-size: 0.8rem;
    color: #9ca3af;
    max-width: 300px;
  }
</style>
