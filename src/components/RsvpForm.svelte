<script lang="ts">
  import { t, type Language } from '../i18n/translations';
  import { submitRSVP } from '../lib/events';

  export let eventId: string;
  export let lang: Language;

  $: tr = t(lang).rsvp;

  let name = '';
  let email = '';
  let guests = 1;
  let message = '';
  let honeypot = '';
  let submitting = false;
  let done = false;
  let status: '' | 'success' | 'already' | 'error' = '';

  async function handleSubmit() {
    if (submitting || !name.trim() || !email.trim()) return;
    // Honeypot: this field is invisible to people; bots tend to fill it. If it
    // has a value, pretend success and skip the insert.
    if (honeypot.trim()) { status = 'success'; done = true; return; }
    submitting = true;
    status = '';
    const res = await submitRSVP({ eventId, email, name, guests, message });
    submitting = false;
    if (res.success) {
      status = 'success';
      done = true;
    } else if (res.error === 'already_registered') {
      status = 'already';
      done = true;
    } else {
      status = 'error';
    }
  }
</script>

<div class="rsvp">
  <h3 class="rsvp-title">{tr.title}</h3>

  {#if done}
    <p class="rsvp-result">{status === 'already' ? tr.already : tr.success}</p>
  {:else}
    <form class="rsvp-form" on:submit|preventDefault={handleSubmit}>
      <div class="rsvp-row">
        <input class="rsvp-input" type="text" bind:value={name} placeholder={tr.name} required />
        <input class="rsvp-input" type="email" bind:value={email} placeholder={tr.email} required />
      </div>
      <div class="rsvp-row">
        <label class="rsvp-guests">
          <span>{tr.guests}</span>
          <input type="number" bind:value={guests} min="1" max="20" />
        </label>
        <button class="rsvp-btn" type="submit" disabled={submitting}>
          {submitting ? '…' : tr.submit}
        </button>
      </div>
      <textarea class="rsvp-input" bind:value={message} placeholder={tr.message} rows="2"></textarea>
      <input class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" bind:value={honeypot} />
      {#if status === 'error'}
        <p class="rsvp-error">{tr.error}</p>
      {/if}
      <p class="rsvp-privacy">{tr.privacy}</p>
    </form>
  {/if}
</div>

<style>
  .rsvp {
    margin: 1.5rem 0 0.5rem;
    padding: 1.25rem;
    background: var(--sand-light, #f5f0e6);
    border-radius: 12px;
    border: 1px solid var(--sand, #e8dcc4);
  }

  .rsvp-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--pine, #1a3d2e);
    margin: 0 0 0.875rem;
  }

  .rsvp-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .rsvp-row {
    display: flex;
    gap: 0.625rem;
    align-items: flex-end;
  }

  .rsvp-input {
    flex: 1;
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand, #e8dcc4);
    border-radius: 8px;
    background: #fff;
    font-family: inherit;
  }

  .rsvp-input:focus {
    outline: none;
    border-color: var(--olive, #6b8c42);
  }

  .rsvp-guests {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--ink-light, #4a4a4a);
  }

  .rsvp-guests input {
    width: 84px;
    padding: 0.625rem 0.75rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand, #e8dcc4);
    border-radius: 8px;
    background: #fff;
  }

  .rsvp-btn {
    flex: 1;
    padding: 0.7rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
    background: var(--pine, #1a3d2e);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .rsvp-btn:hover:not(:disabled) {
    background: var(--pine-light, #2d5a47);
  }

  .rsvp-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .rsvp-result {
    padding: 0.75rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    color: #166534;
    font-size: 0.95rem;
    margin: 0;
  }

  .rsvp-error {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0;
  }

  .rsvp-privacy {
    font-size: 0.75rem;
    color: var(--ink-light, #6b7280);
    margin: 0;
  }

  .hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  @media (max-width: 480px) {
    .rsvp-row {
      flex-direction: column;
      align-items: stretch;
    }
    .rsvp-guests input {
      width: 100%;
    }
  }
</style>
