<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import RichTextEditor from './RichTextEditor.svelte';

  export let mode: 'create' | 'edit' = 'create';
  // In edit mode we fetch the post client-side by id, with the admin session,
  // so drafts load (anon SSR cannot read draft rows via RLS).
  export let postId: string | null = null;

  // Form state
  let slug = '';
  let titleDe = '';
  let titleEn = '';
  let titleAr = '';
  let excerptDe = '';
  let excerptEn = '';
  let excerptAr = '';
  let bodyDe = '';
  let bodyEn = '';
  let bodyAr = '';
  let coverImageUrl = '';
  let status: 'draft' | 'published' = 'draft';
  let publishedAt: string | null = null;
  // Remember the loaded English title so slug auto-fill only overrides an
  // untouched, auto-generated slug.
  let loadedTitleEn = '';

  // UI state
  let loading = mode === 'edit';
  let loadError = '';
  let saving = false;
  let error = '';
  let success = '';
  let uploadingImage = false;
  let imageFile: File | null = null;
  let imagePreview = '';

  onMount(async () => {
    if (mode === 'edit' && postId) {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (fetchError || !data) {
        loadError = 'Could not load this post. It may have been deleted.';
        loading = false;
        return;
      }

      const post = data as any;
      slug = post.slug || '';
      titleDe = post.title_de || '';
      titleEn = post.title_en || '';
      titleAr = post.title_ar || '';
      excerptDe = post.excerpt_de || '';
      excerptEn = post.excerpt_en || '';
      excerptAr = post.excerpt_ar || '';
      bodyDe = post.body_de || '';
      bodyEn = post.body_en || '';
      bodyAr = post.body_ar || '';
      coverImageUrl = post.cover_image_url || '';
      imagePreview = coverImageUrl;
      status = post.status || 'draft';
      publishedAt = post.published_at || null;
      loadedTitleEn = titleEn;
      loading = false;
    }
  });

  function generateSlugFrom(text: string) {
    return text
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Auto-generate slug from the English title, but never clobber a slug the
  // admin typed themselves.
  function maybeGenerateSlug() {
    if (!slug || slug === generateSlugFrom(loadedTitleEn)) {
      slug = generateSlugFrom(titleEn);
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  function handleImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert('Only JPEG, PNG, GIF, and WebP images are allowed.');
        input.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('Image must be smaller than 5MB.');
        input.value = '';
        return;
      }
      imageFile = file;
      imagePreview = URL.createObjectURL(imageFile);
    }
  }

  // Cover images reuse the existing public 'event-images' bucket.
  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return coverImageUrl || null;

    uploadingImage = true;

    const fileExt = imageFile.name.split('.').pop();
    const safeSlug = (slug || 'post')
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] || c)
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const fileName = `blog-${safeSlug}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true,
      });

    uploadingImage = false;

    if (uploadError) {
      throw new Error('Failed to upload image: ' + uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  function removeImage() {
    imageFile = null;
    imagePreview = '';
    coverImageUrl = '';
  }

  async function handleSubmit() {
    error = '';
    success = '';

    if (!slug || !titleDe || !titleEn || !titleAr) {
      error = 'Please fill in the slug and all three titles.';
      return;
    }

    saving = true;

    try {
      let finalImageUrl = coverImageUrl;
      if (imageFile) {
        finalImageUrl = (await uploadImage()) || '';
      }

      // When publishing for the first time, stamp published_at.
      let finalPublishedAt = publishedAt;
      if (status === 'published' && !finalPublishedAt) {
        finalPublishedAt = new Date().toISOString();
      }

      const postData = {
        slug,
        title_de: titleDe,
        title_en: titleEn,
        title_ar: titleAr,
        excerpt_de: excerptDe || null,
        excerpt_en: excerptEn || null,
        excerpt_ar: excerptAr || null,
        body_de: bodyDe || '',
        body_en: bodyEn || '',
        body_ar: bodyAr || '',
        cover_image_url: finalImageUrl || null,
        status,
        published_at: finalPublishedAt,
      };

      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('posts')
          .insert(postData as never);

        if (insertError) throw insertError;

        success = 'Post created!';
        setTimeout(() => {
          window.location.href = '/admin/blog';
        }, 800);
      } else {
        const { error: updateError } = await supabase
          .from('posts')
          .update(postData as never)
          .eq('id', postId);

        if (updateError) throw updateError;

        coverImageUrl = finalImageUrl || '';
        publishedAt = finalPublishedAt;
        imageFile = null;
        success = 'Saved!';
        setTimeout(() => {
          success = '';
        }, 3000);
      }
    } catch (err: any) {
      // Unique violation = slug already taken.
      if (err?.code === '23505') {
        error = 'That slug is already in use. Choose a different one.';
      } else {
        error = err?.message || 'Failed to save post.';
      }
    } finally {
      saving = false;
    }
  }
</script>

{#if loading}
  <p class="loading">Loading post…</p>
{:else if loadError}
  <div class="load-error">
    <p>{loadError}</p>
    <a href="/admin/blog" class="btn btn-secondary">Back to Blog</a>
  </div>
{:else}
  <form on:submit|preventDefault={handleSubmit} class="blog-form">
    <!-- Cover Image -->
    <div class="form-section">
      <h3>Cover Image</h3>
      <div class="image-upload">
        {#if imagePreview}
          <div class="image-preview">
            <img src={imagePreview} alt="Preview" />
            <button type="button" class="remove-image" on:click={removeImage}>×</button>
          </div>
        {:else}
          <label class="upload-area">
            <input
              type="file"
              accept="image/*"
              on:change={handleImageSelect}
              style="display: none;"
            />
            <span class="upload-icon">🖼️</span>
            <span class="upload-text">Click to upload a cover image</span>
            <span class="upload-hint">PNG, JPG up to 5MB</span>
          </label>
        {/if}
      </div>
    </div>

    <!-- Basic Info -->
    <div class="form-section">
      <h3>Basic Information</h3>

      <div class="form-row">
        <div class="form-group">
          <label for="slug">URL Slug *</label>
          <input type="text" id="slug" bind:value={slug} placeholder="post-name" required />
          <p class="form-hint">The post will live at /blog/your-slug</p>
        </div>

        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" bind:value={status} class="form-select">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <p class="form-hint">Drafts are hidden from the public blog.</p>
        </div>
      </div>
    </div>

    <!-- German -->
    <div class="form-section">
      <h3>Content (German) 🇩🇪</h3>

      <div class="form-group">
        <label for="titleDe">Title *</label>
        <input type="text" id="titleDe" bind:value={titleDe} placeholder="Titel auf Deutsch" required />
      </div>

      <div class="form-group">
        <label for="excerptDe">Excerpt</label>
        <textarea id="excerptDe" bind:value={excerptDe} rows="2" placeholder="Kurze Zusammenfassung…"></textarea>
        <p class="form-hint">Shown on the blog listing. Optional.</p>
      </div>

      <div class="form-group">
        <span class="form-label">Body</span>
        <RichTextEditor bind:value={bodyDe} placeholder="Beitrag auf Deutsch…" />
      </div>
    </div>

    <!-- English -->
    <div class="form-section">
      <h3>Content (English) 🇬🇧</h3>

      <div class="form-group">
        <label for="titleEn">Title *</label>
        <input
          type="text"
          id="titleEn"
          bind:value={titleEn}
          on:blur={maybeGenerateSlug}
          placeholder="Title in English"
          required
        />
      </div>

      <div class="form-group">
        <label for="excerptEn">Excerpt</label>
        <textarea id="excerptEn" bind:value={excerptEn} rows="2" placeholder="Short summary…"></textarea>
      </div>

      <div class="form-group">
        <span class="form-label">Body</span>
        <RichTextEditor bind:value={bodyEn} placeholder="Post in English…" />
      </div>
    </div>

    <!-- Arabic -->
    <div class="form-section">
      <h3>Content (Arabic) 🇵🇸</h3>

      <div class="form-group" dir="rtl">
        <label for="titleAr">Title *</label>
        <input type="text" id="titleAr" bind:value={titleAr} placeholder="العنوان بالعربية" required />
      </div>

      <div class="form-group" dir="rtl">
        <label for="excerptAr">Excerpt</label>
        <textarea id="excerptAr" bind:value={excerptAr} rows="2" placeholder="ملخص قصير…"></textarea>
      </div>

      <div class="form-group" dir="rtl">
        <span class="form-label">Body</span>
        <RichTextEditor bind:value={bodyAr} placeholder="المقال بالعربية…" dir="rtl" />
      </div>
    </div>

    <!-- Actions -->
    <div class="form-actions">
      {#if error}
        <span class="inline-error">{error}</span>
      {/if}
      {#if success}
        <span class="inline-success">{success}</span>
      {/if}
      <a href="/admin/blog" class="btn btn-secondary">Cancel</a>
      <button type="submit" class="btn btn-primary" disabled={saving || uploadingImage}>
        {#if saving || uploadingImage}
          {uploadingImage ? 'Uploading image…' : 'Saving…'}
        {:else}
          {mode === 'create' ? 'Create Post' : 'Save Changes'}
        {/if}
      </button>
    </div>
  </form>
{/if}

<style>
  .blog-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .loading {
    color: var(--ink-light);
    padding: 2rem;
  }

  .load-error {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .load-error p {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .inline-success {
    font-size: 0.85rem;
    font-weight: 500;
    color: #16a34a;
    margin-right: auto;
    animation: fadeInOut 3s ease forwards;
  }

  .inline-error {
    font-size: 0.85rem;
    font-weight: 500;
    color: #dc2626;
    margin-right: auto;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(4px); }
    15% { opacity: 1; transform: translateY(0); }
    75% { opacity: 1; }
    100% { opacity: 0; }
  }

  .form-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .form-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--pine);
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--sand);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label,
  .form-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: var(--cream);
    transition: all 0.2s;
    font-family: inherit;
  }

  .form-group textarea {
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--olive);
    background: white;
  }

  .form-group[dir='rtl'] input,
  .form-group[dir='rtl'] textarea {
    text-align: right;
  }

  .form-hint {
    font-size: 0.8rem;
    color: var(--ink-light);
    margin-top: 0.25rem;
  }

  .image-upload {
    margin-bottom: 0;
  }

  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border: 2px dashed var(--sand);
    border-radius: 12px;
    background: var(--sand-light);
    cursor: pointer;
    transition: all 0.2s;
  }

  .upload-area:hover {
    border-color: var(--olive);
    background: var(--cream);
  }

  .upload-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .upload-text {
    font-weight: 500;
    color: var(--ink);
  }

  .upload-hint {
    font-size: 0.8rem;
    color: var(--ink-light);
    margin-top: 0.25rem;
  }

  .image-preview {
    position: relative;
    display: inline-block;
  }

  .image-preview img {
    max-width: 320px;
    max-height: 200px;
    border-radius: 12px;
    object-fit: cover;
  }

  .remove-image {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: #dc2626;
    color: white;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-select {
    width: 100%;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--sand);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
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

  .btn-primary:hover:not(:disabled) {
    background: var(--pine-light);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--sand);
    color: var(--ink);
  }

  .btn-secondary:hover {
    background: var(--sand-light);
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
