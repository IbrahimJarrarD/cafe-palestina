<script lang="ts">
  import { supabase } from '../../lib/supabase';
  
  export let content: any[] = [];
  
  let editingKey: string | null = null;
  let editDe = '';
  let editEn = '';
  let editAr = '';
  let saving = false;
  let success = '';
  
  // Group content by section
  const sections: Record<string, { label: string; keys: string[] }> = {
    hero: {
      label: 'Hero Section',
      keys: ['hero_title', 'hero_subtitle']
    },
    about: {
      label: 'About Section',
      keys: ['about_text_1', 'about_text_2', 'about_why_title', 'about_why_text']
    },
    poem: {
      label: 'Poem',
      keys: ['poem_text', 'poem_author']
    },
    footer: {
      label: 'Footer',
      keys: ['footer_description']
    }
  };
  
  function getContentByKey(key: string) {
    return content.find(c => c.key === key);
  }
  
  function formatKey(key: string) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  function startEdit(item: any) {
    editingKey = item.key;
    editDe = item.content_de;
    editEn = item.content_en;
    editAr = item.content_ar;
    success = '';
  }
  
  function cancelEdit() {
    editingKey = null;
    editDe = '';
    editEn = '';
    editAr = '';
  }
  
  async function saveEdit(item: any) {
    saving = true;
    success = '';
    
    const { error } = await supabase
      .from('page_content')
      .update({
        content_de: editDe,
        content_en: editEn,
        content_ar: editAr
      } as never)
      .eq('id', item.id);
    
    saving = false;
    
    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      // Update local state
      const idx = content.findIndex(c => c.id === item.id);
      if (idx !== -1) {
        content[idx] = {
          ...content[idx],
          content_de: editDe,
          content_en: editEn,
          content_ar: editAr
        };
        content = [...content];
      }
      editingKey = null;
      success = item.key;
      setTimeout(() => success = '', 3000);
    }
  }
</script>

<div class="content-editor">
  {#each Object.entries(sections) as [sectionKey, section]}
    <div class="content-section">
      <h3>{section.label}</h3>
      
      {#each section.keys as key}
        {@const item = getContentByKey(key)}
        {#if item}
          <div class="content-item" class:editing={editingKey === key} class:saved={success === key}>
            <div class="item-header">
              <span class="item-key">{formatKey(key)}</span>
              {#if editingKey !== key}
                <button class="edit-btn" on:click={() => startEdit(item)}>
                  ✏️ Edit
                </button>
              {/if}
            </div>
            
            {#if editingKey === key}
              <div class="edit-form">
                <div class="form-group">
                  <label>German 🇩🇪</label>
                  {#if key.includes('text') || key.includes('description')}
                    <textarea bind:value={editDe} rows="4"></textarea>
                  {:else}
                    <input type="text" bind:value={editDe} />
                  {/if}
                </div>
                
                <div class="form-group">
                  <label>English 🇬🇧</label>
                  {#if key.includes('text') || key.includes('description')}
                    <textarea bind:value={editEn} rows="4"></textarea>
                  {:else}
                    <input type="text" bind:value={editEn} />
                  {/if}
                </div>
                
                <div class="form-group" dir="rtl">
                  <label>Arabic 🇵🇸</label>
                  {#if key.includes('text') || key.includes('description')}
                    <textarea bind:value={editAr} rows="4"></textarea>
                  {:else}
                    <input type="text" bind:value={editAr} />
                  {/if}
                </div>
                
                <div class="edit-actions">
                  <button class="btn btn-secondary" on:click={cancelEdit}>Cancel</button>
                  <button class="btn btn-primary" on:click={() => saveEdit(item)} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            {:else}
              <div class="item-preview">
                <div class="preview-lang">
                  <span class="lang-flag">🇩🇪</span>
                  <span class="preview-text">{item.content_de}</span>
                </div>
                <div class="preview-lang">
                  <span class="lang-flag">🇬🇧</span>
                  <span class="preview-text">{item.content_en}</span>
                </div>
                <div class="preview-lang">
                  <span class="lang-flag">🇵🇸</span>
                  <span class="preview-text" dir="rtl">{item.content_ar}</span>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .content-editor {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .content-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  
  .content-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--pine);
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--sand);
  }
  
  .content-item {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    background: var(--sand-light);
    transition: all 0.2s;
  }
  
  .content-item:last-child {
    margin-bottom: 0;
  }
  
  .content-item.editing {
    background: var(--cream);
    border: 2px solid var(--olive);
  }
  
  .content-item.saved {
    animation: savedFlash 0.5s ease;
  }
  
  @keyframes savedFlash {
    0%, 100% { background: var(--sand-light); }
    50% { background: #dcfce7; }
  }
  
  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .item-key {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--pine);
  }
  
  .edit-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    background: white;
    border: 1px solid var(--sand);
    border-radius: 6px;
    cursor: pointer;
  }
  
  .edit-btn:hover {
    background: var(--sand);
  }
  
  .item-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .preview-lang {
    display: flex;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  
  .lang-flag {
    flex-shrink: 0;
  }
  
  .preview-text {
    color: var(--ink-light);
    white-space: pre-wrap;
    line-height: 1.5;
  }
  
  /* Edit Form */
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--ink);
  }
  
  .form-group input,
  .form-group textarea {
    padding: 0.75rem;
    font-size: 0.9rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: white;
    font-family: inherit;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--olive);
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .form-group[dir="rtl"] input,
  .form-group[dir="rtl"] textarea {
    text-align: right;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
  }
  
  .btn-primary {
    background: var(--pine);
    color: white;
  }
  
  .btn-secondary {
    background: var(--sand);
    color: var(--ink);
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

