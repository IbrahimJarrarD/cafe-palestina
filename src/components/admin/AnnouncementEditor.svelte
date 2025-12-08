<script lang="ts">
  import { supabase } from '../../lib/supabase';
  
  export let announcements: any[] = [];
  export let events: any[] = [];
  
  let editingId: string | null = null;
  let showForm = false;
  
  // Form state
  let textDe = '';
  let textEn = '';
  let textAr = '';
  let icon = '🌿';
  let linkUrl = '#events';
  let linkType: 'internal' | 'external' | 'event' = 'internal';
  let linkedEventId = '';
  let isActive = true;
  let priority = 10;
  
  let saving = false;
  let error = '';
  
  const commonIcons = ['🌿', '📅', '🎉', '🎵', '🍽️', '📖', '🎬', '⭐', '❤️', '🎨'];
  
  function openNew() {
    editingId = null;
    textDe = '';
    textEn = '';
    textAr = '';
    icon = '🌿';
    linkUrl = '#events';
    linkType = 'internal';
    linkedEventId = '';
    isActive = true;
    priority = 10;
    showForm = true;
  }
  
  function openEdit(ann: any) {
    editingId = ann.id;
    textDe = ann.text_de;
    textEn = ann.text_en;
    textAr = ann.text_ar;
    icon = ann.icon || '🌿';
    linkUrl = ann.link_url || '#events';
    linkType = ann.link_type || 'internal';
    linkedEventId = ann.linked_event_id || '';
    isActive = ann.is_active;
    priority = ann.priority;
    showForm = true;
  }
  
  function closeForm() {
    showForm = false;
    editingId = null;
    error = '';
  }
  
  async function handleSubmit() {
    error = '';
    
    if (!textDe || !textEn || !textAr) {
      error = 'Please fill in all language versions';
      return;
    }
    
    saving = true;
    
    const data = {
      text_de: textDe,
      text_en: textEn,
      text_ar: textAr,
      icon,
      link_url: linkType === 'event' ? null : linkUrl,
      link_type: linkType,
      linked_event_id: linkType === 'event' ? linkedEventId : null,
      is_active: isActive,
      priority,
    };
    
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(data as never)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert(data as never);
        if (insertError) throw insertError;
      }
      
      window.location.reload();
    } catch (err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }
  
  async function toggleActive(ann: any) {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !ann.is_active } as never)
      .eq('id', ann.id);
    
    if (!error) {
      ann.is_active = !ann.is_active;
      announcements = [...announcements];
    }
  }
  
  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return;
    
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    
    if (!error) {
      announcements = announcements.filter(a => a.id !== id);
    }
  }
</script>

<div class="announcements-editor">
  {#if !showForm}
    <button class="btn btn-primary" on:click={openNew}>
      + New Announcement
    </button>
    
    <div class="announcements-list">
      {#each announcements as ann}
        <div class="announcement-item" class:inactive={!ann.is_active}>
          <div class="ann-preview">
            <span class="ann-icon">{ann.icon}</span>
            <div class="ann-texts">
              <span class="ann-text-de">{ann.text_de}</span>
              <span class="ann-text-en">{ann.text_en}</span>
            </div>
          </div>
          
          <div class="ann-meta">
            <span class="ann-link">{ann.link_type}: {ann.link_url || 'Event'}</span>
            <span class="ann-priority">Priority: {ann.priority}</span>
          </div>
          
          <div class="ann-actions">
            <button 
              class="toggle-btn" 
              class:active={ann.is_active}
              on:click={() => toggleActive(ann)}
              title={ann.is_active ? 'Deactivate' : 'Activate'}
            >
              {ann.is_active ? '✓ Active' : '○ Inactive'}
            </button>
            <button class="action-btn" on:click={() => openEdit(ann)}>✏️</button>
            <button class="action-btn delete" on:click={() => deleteAnnouncement(ann.id)}>🗑️</button>
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <p>No announcements yet</p>
        </div>
      {/each}
    </div>
  {:else}
    <div class="form-card">
      <h3>{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
      
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-picker">
            {#each commonIcons as ico}
              <button 
                type="button"
                class="icon-btn" 
                class:selected={icon === ico}
                on:click={() => icon = ico}
              >
                {ico}
              </button>
            {/each}
            <input 
              type="text" 
              bind:value={icon} 
              class="icon-input"
              maxlength="2"
              placeholder="Custom"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="textDe">German Text *</label>
          <input type="text" id="textDe" bind:value={textDe} placeholder="Jeden 4. Sonntag im Monat" required />
        </div>
        
        <div class="form-group">
          <label for="textEn">English Text *</label>
          <input type="text" id="textEn" bind:value={textEn} placeholder="Every 4th Sunday of the month" required />
        </div>
        
        <div class="form-group" dir="rtl">
          <label for="textAr">Arabic Text *</label>
          <input type="text" id="textAr" bind:value={textAr} placeholder="كل الأحد الرابع من الشهر" required />
        </div>
        
        <div class="form-group">
          <label for="linkType">Link Type</label>
          <select id="linkType" bind:value={linkType}>
            <option value="internal">Internal (same site)</option>
            <option value="external">External (new tab)</option>
            <option value="event">Link to Event</option>
          </select>
        </div>
        
        {#if linkType === 'event'}
          <div class="form-group">
            <label for="linkedEvent">Select Event</label>
            <select id="linkedEvent" bind:value={linkedEventId}>
              <option value="">Select an event...</option>
              {#each events as event}
                <option value={event.id}>{event.title_en}</option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="form-group">
            <label for="linkUrl">Link URL</label>
            <input 
              type="text" 
              id="linkUrl" 
              bind:value={linkUrl}
              placeholder={linkType === 'external' ? 'https://...' : '#events'}
            />
          </div>
        {/if}
        
        <div class="form-row">
          <div class="form-group">
            <label for="priority">Priority (higher = shows first)</label>
            <input type="number" id="priority" bind:value={priority} min="0" />
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" bind:checked={isActive} />
              <span>Active</span>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" on:click={closeForm}>Cancel</button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create')}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .announcements-editor {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 8px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: var(--pine);
    color: white;
  }
  
  .btn-secondary {
    background: var(--sand);
    color: var(--ink);
  }
  
  .announcements-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .announcement-item {
    background: white;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .announcement-item.inactive {
    opacity: 0.6;
  }
  
  .ann-preview {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .ann-icon {
    font-size: 1.5rem;
    background: var(--sand-light);
    padding: 0.5rem;
    border-radius: 8px;
  }
  
  .ann-texts {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .ann-text-de {
    font-weight: 500;
    color: var(--ink);
  }
  
  .ann-text-en {
    font-size: 0.85rem;
    color: var(--ink-light);
  }
  
  .ann-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--ink-light);
  }
  
  .ann-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .toggle-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    background: var(--sand);
    color: var(--ink-light);
  }
  
  .toggle-btn.active {
    background: #dcfce7;
    color: #166534;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: var(--sand-light);
    font-size: 1rem;
  }
  
  .action-btn.delete:hover {
    background: #fecaca;
  }
  
  /* Form */
  .form-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  
  .form-card h3 {
    margin-bottom: 1.5rem;
    color: var(--pine);
  }
  
  .alert-error {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: var(--cream);
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--olive);
    background: white;
  }
  
  .form-group[dir="rtl"] input {
    text-align: right;
  }
  
  .icon-picker {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .icon-btn {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: var(--cream);
    cursor: pointer;
  }
  
  .icon-btn.selected {
    border-color: var(--olive);
    background: var(--sand-light);
  }
  
  .icon-input {
    width: 60px !important;
    text-align: center;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--sand);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--ink-light);
    background: white;
    border-radius: 12px;
  }
</style>

