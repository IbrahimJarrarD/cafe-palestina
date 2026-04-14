<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { supabase } from '../../lib/supabase';

  export let value: string = '';
  export let placeholder: string = 'Start typing...';
  export let dir: 'ltr' | 'rtl' = 'ltr';

  const dispatch = createEventDispatcher();

  let editorEl: HTMLDivElement;
  let fileInput: HTMLInputElement;
  let activeFormats: Set<string> = new Set();
  let uploading = false;

  onMount(() => {
    editorEl.innerHTML = value || '';
    editorEl.addEventListener('input', handleInput);
    editorEl.addEventListener('mouseup', updateToolbar);
    editorEl.addEventListener('keyup', updateToolbar);
    editorEl.addEventListener('paste', handlePaste);
    return () => {
      editorEl.removeEventListener('input', handleInput);
      editorEl.removeEventListener('mouseup', updateToolbar);
      editorEl.removeEventListener('keyup', updateToolbar);
      editorEl.removeEventListener('paste', handlePaste);
    };
  });

  function handleInput() {
    value = editorEl.innerHTML;
    dispatch('change', value);
  }

  function updateToolbar() {
    const newFormats = new Set<string>();
    if (document.queryCommandState('bold')) newFormats.add('bold');
    if (document.queryCommandState('italic')) newFormats.add('italic');
    if (document.queryCommandState('underline')) newFormats.add('underline');
    if (document.queryCommandState('insertUnorderedList')) newFormats.add('ul');
    if (document.queryCommandState('insertOrderedList')) newFormats.add('ol');

    const block = document.queryCommandValue('formatBlock');
    if (block === 'h2' || block === 'H2') newFormats.add('h2');
    if (block === 'h3' || block === 'H3') newFormats.add('h3');

    activeFormats = newFormats;
  }

  function exec(command: string, val?: string) {
    editorEl.focus();
    document.execCommand(command, false, val);
    handleInput();
    updateToolbar();
  }

  function toggleBlock(tag: string) {
    const current = document.queryCommandValue('formatBlock');
    if (current.toLowerCase() === tag.toLowerCase()) {
      exec('formatBlock', 'p');
    } else {
      exec('formatBlock', tag);
    }
  }

  function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  }

  function clearFormatting() {
    exec('removeFormat');
    exec('formatBlock', 'p');
  }

  async function uploadToStorage(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  function insertImageAtCursor(url: string) {
    editorEl.focus();
    const img = `<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:0.5rem 0">`;
    document.execCommand('insertHTML', false, img);
    handleInput();
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith('image/')) return;
    uploading = true;
    try {
      const url = await uploadToStorage(file);
      if (url) {
        insertImageAtCursor(url);
      } else {
        alert('Failed to upload image. Please try again.');
      }
    } finally {
      uploading = false;
    }
  }

  function handleImageButtonClick() {
    fileInput.click();
  }

  function handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      handleImageUpload(input.files[0]);
      input.value = '';
    }
  }

  async function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
        return;
      }
    }
  }

  $: if (editorEl && value !== editorEl.innerHTML) {
    editorEl.innerHTML = value || '';
  }
</script>

<div class="rich-editor" class:rtl={dir === 'rtl'}>
  <div class="toolbar">
    <button type="button" class="tb-btn" class:active={activeFormats.has('bold')}
      on:click={() => exec('bold')} title="Bold"><strong>B</strong></button>

    <button type="button" class="tb-btn" class:active={activeFormats.has('italic')}
      on:click={() => exec('italic')} title="Italic"><em>I</em></button>

    <button type="button" class="tb-btn" class:active={activeFormats.has('underline')}
      on:click={() => exec('underline')} title="Underline"><u>U</u></button>

    <span class="tb-divider"></span>

    <button type="button" class="tb-btn" class:active={activeFormats.has('h2')}
      on:click={() => toggleBlock('h2')} title="Heading">H2</button>

    <button type="button" class="tb-btn" class:active={activeFormats.has('h3')}
      on:click={() => toggleBlock('h3')} title="Subheading">H3</button>

    <span class="tb-divider"></span>

    <button type="button" class="tb-btn" class:active={activeFormats.has('ul')}
      on:click={() => exec('insertUnorderedList')} title="Bullet list">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
      </svg>
    </button>

    <button type="button" class="tb-btn" class:active={activeFormats.has('ol')}
      on:click={() => exec('insertOrderedList')} title="Numbered list">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
        <text x="2" y="8" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">1</text>
        <text x="2" y="14" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">2</text>
        <text x="2" y="20" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">3</text>
      </svg>
    </button>

    <span class="tb-divider"></span>

    <button type="button" class="tb-btn" on:click={insertLink} title="Insert link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </button>

    <button type="button" class="tb-btn" class:uploading on:click={handleImageButtonClick} title="Insert image" disabled={uploading}>
      {#if uploading}
        <span class="spinner"></span>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      {/if}
    </button>

    <button type="button" class="tb-btn" on:click={clearFormatting} title="Clear formatting">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

  {#if uploading}
    <div class="upload-bar">Uploading image...</div>
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    on:change={handleFileSelected}
    style="display:none"
  />

  <div
    bind:this={editorEl}
    class="editor-content"
    contenteditable="true"
    dir={dir}
    data-placeholder={placeholder}
    role="textbox"
    aria-multiline="true"
  ></div>
</div>

<style>
  .rich-editor {
    border: 2px solid var(--sand);
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .rich-editor:focus-within {
    border-color: var(--olive);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    background: var(--sand-light, #f8f6f0);
    border-bottom: 1px solid var(--sand);
    flex-wrap: wrap;
  }

  .tb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--ink, #333);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tb-btn:hover {
    background: var(--sand, #e8e0d0);
  }

  .tb-btn.active {
    background: var(--olive, #6b8c42);
    color: white;
  }

  .tb-btn:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .tb-divider {
    width: 1px;
    height: 20px;
    background: var(--sand, #ddd);
    margin: 0 4px;
  }

  .upload-bar {
    padding: 4px 12px;
    font-size: 0.75rem;
    color: var(--olive, #6b8c42);
    background: #f0f7e8;
    border-bottom: 1px solid var(--sand);
    animation: pulse 1.5s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--sand, #ddd);
    border-top-color: var(--olive, #6b8c42);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .editor-content {
    min-height: 150px;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    line-height: 1.6;
    font-family: inherit;
    background: var(--cream, #faf8f3);
    outline: none;
  }

  .editor-content:focus {
    background: white;
  }

  .editor-content:empty::before {
    content: attr(data-placeholder);
    color: var(--ink-light, #999);
    pointer-events: none;
  }

  .editor-content :global(h2) {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0.75rem 0 0.5rem;
    color: var(--pine, #1a3d2e);
  }

  .editor-content :global(h3) {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0.5rem 0 0.25rem;
    color: var(--pine, #1a3d2e);
  }

  .editor-content :global(p) {
    margin: 0.4rem 0;
  }

  .editor-content :global(ul),
  .editor-content :global(ol) {
    margin: 0.4rem 0;
    padding-left: 1.5rem;
  }

  .editor-content :global(a) {
    color: var(--olive, #6b8c42);
    text-decoration: underline;
  }

  .editor-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 0.5rem 0;
    display: block;
  }

  .rtl .toolbar {
    direction: rtl;
  }
</style>
