<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let rsvps: any[] = [];
  let events: any[] = [];
  let loading = true;
  let error = '';
  let success = '';

  // Manual add
  let addEventId = '';
  let addName = '';
  let addEmail = '';
  let addGuests = 1;
  let adding = false;

  // Bulk paste
  let pasteEventId = '';
  let pasteText = '';
  let importing = false;

  onMount(load);

  async function load() {
    loading = true;
    error = '';
    const [rsvpRes, eventRes] = await Promise.all([
      supabase
        .from('rsvps')
        .select('*, events(id, title_en, title_de, date)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, title_en, title_de, date')
        .order('date', { ascending: false }),
    ]);
    if (rsvpRes.error) error = 'Failed to load RSVPs: ' + rsvpRes.error.message;
    rsvps = rsvpRes.data || [];
    events = eventRes.data || [];
    loading = false;
  }

  function eventTitle(ev: any) {
    return ev?.title_en || ev?.title_de || 'Unknown event';
  }

  function flash(msg: string) {
    success = msg;
    setTimeout(() => (success = ''), 2500);
  }

  $: byEvent = (() => {
    const map: Record<string, any[]> = {};
    for (const r of rsvps) {
      const id = r.events?.id || r.event_id || 'unknown';
      (map[id] ||= []).push(r);
    }
    return Object.entries(map);
  })();

  function totalGuests(list: any[]) {
    return list.filter((r) => !r.cancelled_at).reduce((s, r) => s + (r.guests || 1), 0);
  }

  function formatDate(date: string) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  async function addOne() {
    if (!addEventId || !addName.trim()) {
      error = 'Pick an event and enter a name.';
      return;
    }
    adding = true;
    error = '';
    const { error: e } = await supabase.from('rsvps').insert({
      event_id: addEventId,
      name: addName.trim(),
      email: addEmail.trim() ? addEmail.trim().toLowerCase() : null,
      guests: addGuests || 1,
      source: 'manual',
    } as never);
    adding = false;
    if (e) {
      error = e.code === '23505' ? 'That email already has an RSVP for this event.' : 'Could not add: ' + e.message;
      return;
    }
    addName = ''; addEmail = ''; addGuests = 1;
    flash('Added.');
    await load();
  }

  // One entry per line; grab an email anywhere on the line, the rest is the name.
  function parseLines(text: string) {
    const emailRe = /[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/;
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(emailRe);
        const email = m ? m[0].toLowerCase() : null;
        let name = line;
        if (m) name = line.replace(m[0], '').replace(/[<>(),;:|\-]+/g, ' ').trim();
        if (!name) name = email ? email.split('@')[0] : line;
        return { name, email };
      });
  }

  async function importPaste() {
    if (!pasteEventId || !pasteText.trim()) {
      error = 'Pick an event and paste some lines.';
      return;
    }
    importing = true;
    error = '';
    const rows = parseLines(pasteText);
    let added = 0, skipped = 0;
    for (const row of rows) {
      const { error: e } = await supabase.from('rsvps').insert({
        event_id: pasteEventId,
        name: row.name,
        email: row.email,
        guests: 1,
        source: 'manual',
      } as never);
      if (e) {
        if (e.code === '23505') skipped++;
        else { error = 'Import stopped: ' + e.message; break; }
      } else added++;
    }
    importing = false;
    if (!error) {
      pasteText = '';
      flash(`Imported ${added}${skipped ? `, skipped ${skipped} duplicate(s)` : ''}.`);
    }
    await load();
  }

  async function toggleCancel(r: any) {
    const { error: e } = await supabase
      .from('rsvps')
      .update({ cancelled_at: r.cancelled_at ? null : new Date().toISOString() } as never)
      .eq('id', r.id);
    if (e) error = 'Update failed: ' + e.message;
    else await load();
  }

  async function remove(r: any) {
    if (!confirm(`Delete RSVP for ${r.name}?`)) return;
    const { error: e } = await supabase.from('rsvps').delete().eq('id', r.id);
    if (e) error = 'Delete failed: ' + e.message;
    else await load();
  }
</script>

<div class="rsvp-manager">
  {#if error}<div class="alert alert-error">{error}</div>{/if}
  {#if success}<div class="alert alert-success">{success}</div>{/if}

  <!-- Add tools -->
  <div class="tools">
    <div class="tool-card">
      <h3>Add one</h3>
      <div class="add-row">
        <select bind:value={addEventId}>
          <option value="" disabled>Choose event…</option>
          {#each events as ev}
            <option value={ev.id}>{eventTitle(ev)} · {formatDate(ev.date)}</option>
          {/each}
        </select>
        <input type="text" bind:value={addName} placeholder="Name" />
        <input type="email" bind:value={addEmail} placeholder="Email (optional)" />
        <input type="number" class="add-guests" bind:value={addGuests} min="1" max="20" title="Guests" placeholder="Guests" />
        <button class="btn btn-primary" on:click={addOne} disabled={adding}>{adding ? '…' : 'Add'}</button>
      </div>
    </div>

    <div class="tool-card">
      <h3>Paste a list</h3>
      <p class="hint">One person per line. An email anywhere on the line is detected; the rest is the name. Name-only lines are fine.</p>
      <select bind:value={pasteEventId}>
        <option value="" disabled>Choose event…</option>
        {#each events as ev}
          <option value={ev.id}>{eventTitle(ev)} · {formatDate(ev.date)}</option>
        {/each}
      </select>
      <textarea bind:value={pasteText} rows="4" placeholder={"Layla Ahmad layla@example.com\nKarim (phone RSVP)\nbasel@example.com"}></textarea>
      <button class="btn btn-primary" on:click={importPaste} disabled={importing}>{importing ? 'Importing…' : 'Import list'}</button>
    </div>
  </div>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>Loading RSVPs…</p></div>
  {:else if byEvent.length === 0}
    <div class="empty-state">
      <p>No RSVPs yet</p>
      <span>Public sign-ups and entries you add will appear here.</span>
    </div>
  {:else}
    {#each byEvent as [eventId, list]}
      {@const ev = list[0]?.events}
      <div class="event-rsvps">
        <div class="event-header">
          <div class="event-info">
            <h3>{eventTitle(ev)}</h3>
            <span class="event-date">{ev?.date ? formatDate(ev.date) : ''}</span>
          </div>
          <div class="event-stats">
            <span class="stat">{list.filter((r) => !r.cancelled_at).length} RSVPs</span>
            <span class="stat">{totalGuests(list)} guests</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Guests</th><th>Source</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {#each list as r}
                <tr class:cancelled={r.cancelled_at}>
                  <td>{r.name}</td>
                  <td>{#if r.email}<a href={`mailto:${r.email}`}>{r.email}</a>{:else}<span class="muted">—</span>{/if}</td>
                  <td>{r.guests || 1}</td>
                  <td><span class="muted">{r.source || 'website'}</span></td>
                  <td>{r.cancelled_at ? 'Cancelled' : 'Active'}</td>
                  <td class="actions">
                    <button class="link" on:click={() => toggleCancel(r)}>{r.cancelled_at ? 'Restore' : 'Cancel'}</button>
                    <button class="link danger" on:click={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .rsvp-manager { display: flex; flex-direction: column; gap: 1.25rem; }

  .alert { padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; }
  .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
  .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }

  .tools { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 900px) { .tools { grid-template-columns: 1fr; } }

  .tool-card { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .tool-card h3 { font-size: 0.95rem; font-weight: 600; color: var(--pine); margin: 0 0 0.75rem; }
  .hint { font-size: 0.8rem; color: var(--ink-light); margin: 0 0 0.625rem; }

  .add-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .add-row select, .add-row input { flex: 1; min-width: 110px; }
  .add-row .add-guests { flex: 0 0 90px; min-width: 90px; }

  select, input, textarea {
    padding: 0.55rem 0.7rem; font-size: 0.9rem; font-family: inherit;
    border: 2px solid var(--sand); border-radius: 8px; background: var(--cream); width: 100%;
  }
  select:focus, input:focus, textarea:focus { outline: none; border-color: var(--olive); background: #fff; }
  textarea { margin: 0.5rem 0; }

  .btn { padding: 0.55rem 1.1rem; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; }
  .btn-primary { background: var(--pine); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--pine-light); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .event-rsvps { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .event-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: var(--sand-light); border-bottom: 1px solid var(--sand); }
  .event-info h3 { font-size: 1rem; font-weight: 600; color: var(--pine); margin: 0; }
  .event-date { font-size: 0.8rem; color: var(--ink-light); }
  .event-stats { display: flex; gap: 1.25rem; }
  .stat { font-size: 0.85rem; font-weight: 600; color: var(--olive); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 0.6rem 1rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-light); background: var(--cream); border-bottom: 1px solid var(--sand); }
  td { padding: 0.7rem 1rem; border-bottom: 1px solid var(--sand-light); font-size: 0.88rem; }
  tr.cancelled td { opacity: 0.5; text-decoration: line-through; }
  td a { color: var(--olive); text-decoration: none; }
  .muted { color: var(--ink-light); }
  .actions { white-space: nowrap; text-align: right; }
  .link { background: none; border: none; color: var(--olive); cursor: pointer; font-size: 0.82rem; padding: 0 0.4rem; }
  .link.danger { color: #dc2626; }
  .link:hover { text-decoration: underline; }

  .loading { display: flex; flex-direction: column; align-items: center; padding: 3rem; background: #fff; border-radius: 12px; gap: 0.75rem; }
  .spinner { width: 28px; height: 28px; border: 3px solid var(--sand); border-top-color: var(--pine); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state { background: #fff; border-radius: 12px; padding: 3rem 2rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .empty-state p { font-size: 1.05rem; font-weight: 500; color: var(--ink); margin: 0 0 0.4rem; }
  .empty-state span { color: var(--ink-light); font-size: 0.9rem; }
</style>
