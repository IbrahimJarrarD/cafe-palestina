<script lang="ts">
  import { supabase } from '../../lib/supabase';
  
  export let event: any = null;
  export let categories: any[] = [];
  export let imageTypes: any[] = [];
  export let mode: 'create' | 'edit' = 'create';
  
  // Form state
  let slug = event?.slug || '';
  let categoryId = event?.category_id || '';
  let imageTypeId = event?.image_type_id || '';
  let date = event?.date || '';
  let time = event?.time || '';
  let location = event?.location || '';
  let address = event?.address || '';
  let titleDe = event?.title_de || '';
  let titleEn = event?.title_en || '';
  let titleAr = event?.title_ar || '';
  let descriptionDe = event?.description_de || '';
  let descriptionEn = event?.description_en || '';
  let descriptionAr = event?.description_ar || '';
  let maxAttendees: number | null = event?.max_attendees || null;
  let isPublished = event?.is_published ?? true;
  let imageUrl = event?.image_url || '';
  
  // UI state
  let saving = false;
  let error = '';
  let success = '';
  let uploadingImage = false;
  let imageFile: File | null = null;
  let imagePreview = imageUrl;
  
  // Auto-generate slug from English title
  function generateSlug() {
    if (!slug || slug === generateSlugFrom(event?.title_en || '')) {
      slug = generateSlugFrom(titleEn);
    }
  }
  
  function generateSlugFrom(text: string) {
    return text
      .toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Handle image selection
  function handleImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      imageFile = input.files[0];
      imagePreview = URL.createObjectURL(imageFile);
    }
  }
  
  // Upload image to Supabase Storage
  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return imageUrl || null;
    
    uploadingImage = true;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${slug}-${Date.now()}.${fileExt}`;
    
    const { data, error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    uploadingImage = false;
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image: ' + uploadError.message);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
  
  // Remove uploaded image
  function removeImage() {
    imageFile = null;
    imagePreview = '';
    imageUrl = '';
  }
  
  // Save event
  async function handleSubmit() {
    error = '';
    success = '';
    
    // Validation
    if (!slug || !titleDe || !titleEn || !titleAr || !date || !time || !location || !address) {
      error = 'Please fill in all required fields';
      return;
    }
    
    saving = true;
    
    try {
      // Upload image if selected
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage() || '';
      }
      
      const eventData = {
        slug,
        category_id: categoryId || null,
        image_type_id: imageTypeId || null,
        date,
        time,
        location,
        address,
        title_de: titleDe,
        title_en: titleEn,
        title_ar: titleAr,
        description_de: descriptionDe,
        description_en: descriptionEn,
        description_ar: descriptionAr,
        max_attendees: maxAttendees,
        is_published: isPublished,
        image_url: finalImageUrl || null,
      };
      
      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData as never);
        
        if (insertError) throw insertError;
        
        success = 'Event created successfully!';
        setTimeout(() => {
          window.location.href = '/admin/events';
        }, 1000);
      } else {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData as never)
          .eq('id', event.id);
        
        if (updateError) throw updateError;
        
        success = 'Event updated successfully!';
        imageUrl = finalImageUrl || '';
        imageFile = null;
      }
    } catch (err: any) {
      console.error('Save error:', err);
      error = err.message || 'Failed to save event';
    } finally {
      saving = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="event-form">
  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}
  
  {#if success}
    <div class="alert alert-success">{success}</div>
  {/if}
  
  <!-- Image Upload Section -->
  <div class="form-section">
    <h3>Event Image</h3>
    
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
          <span class="upload-icon">📷</span>
          <span class="upload-text">Click to upload event image</span>
          <span class="upload-hint">PNG, JPG up to 5MB</span>
        </label>
      {/if}
    </div>
    
    <p class="form-hint">Or select a placeholder style:</p>
    <select bind:value={imageTypeId} class="form-select">
      <option value="">No placeholder</option>
      {#each imageTypes as type}
        <option value={type.id}>{type.name_en}</option>
      {/each}
    </select>
  </div>
  
  <!-- Basic Info -->
  <div class="form-section">
    <h3>Basic Information</h3>
    
    <div class="form-row">
      <div class="form-group">
        <label for="slug">URL Slug *</label>
        <input 
          type="text" 
          id="slug" 
          bind:value={slug}
          placeholder="event-name"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" bind:value={categoryId} class="form-select">
          <option value="">Select category</option>
          {#each categories as cat}
            <option value={cat.id}>{cat.icon} {cat.name_en}</option>
          {/each}
        </select>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="date">Date *</label>
        <input type="date" id="date" bind:value={date} required />
      </div>
      
      <div class="form-group">
        <label for="time">Time *</label>
        <input 
          type="text" 
          id="time" 
          bind:value={time}
          placeholder="18:00 - 20:00"
          required
        />
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="location">Location Name *</label>
        <input 
          type="text" 
          id="location" 
          bind:value={location}
          placeholder="Cafe Palestine Colonia"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="address">Address *</label>
        <input 
          type="text" 
          id="address" 
          bind:value={address}
          placeholder="Geisselstraße 3–5, 50823 Köln"
          required
        />
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="maxAttendees">Max Attendees</label>
        <input 
          type="number" 
          id="maxAttendees" 
          bind:value={maxAttendees}
          placeholder="Leave empty for unlimited"
          min="1"
        />
      </div>
      
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={isPublished} />
          <span>Published</span>
        </label>
        <p class="form-hint">Unpublished events won't appear on the website</p>
      </div>
    </div>
  </div>
  
  <!-- Multilingual Content -->
  <div class="form-section">
    <h3>Content (German) 🇩🇪</h3>
    
    <div class="form-group">
      <label for="titleDe">Title *</label>
      <input 
        type="text" 
        id="titleDe" 
        bind:value={titleDe}
        placeholder="Workshop: Palästinensische Küche"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="descriptionDe">Description</label>
      <textarea 
        id="descriptionDe" 
        bind:value={descriptionDe}
        placeholder="Event description in German..."
        rows="4"
      ></textarea>
    </div>
  </div>
  
  <div class="form-section">
    <h3>Content (English) 🇬🇧</h3>
    
    <div class="form-group">
      <label for="titleEn">Title *</label>
      <input 
        type="text" 
        id="titleEn" 
        bind:value={titleEn}
        on:blur={generateSlug}
        placeholder="Workshop: Palestinian Cuisine"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="descriptionEn">Description</label>
      <textarea 
        id="descriptionEn" 
        bind:value={descriptionEn}
        placeholder="Event description in English..."
        rows="4"
      ></textarea>
    </div>
  </div>
  
  <div class="form-section">
    <h3>Content (Arabic) 🇵🇸</h3>
    
    <div class="form-group" dir="rtl">
      <label for="titleAr">Title *</label>
      <input 
        type="text" 
        id="titleAr" 
        bind:value={titleAr}
        placeholder="ورشة عمل: الطهي الفلسطيني"
        required
      />
    </div>
    
    <div class="form-group" dir="rtl">
      <label for="descriptionAr">Description</label>
      <textarea 
        id="descriptionAr" 
        bind:value={descriptionAr}
        placeholder="وصف الحدث بالعربية..."
        rows="4"
      ></textarea>
    </div>
  </div>
  
  <!-- Actions -->
  <div class="form-actions">
    <a href="/admin/events" class="btn btn-secondary">Cancel</a>
    <button type="submit" class="btn btn-primary" disabled={saving || uploadingImage}>
      {#if saving || uploadingImage}
        {uploadingImage ? 'Uploading image...' : 'Saving...'}
      {:else}
        {mode === 'create' ? 'Create Event' : 'Save Changes'}
      {/if}
    </button>
  </div>
</form>

<style>
  .event-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .alert {
    padding: 1rem;
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
  
  .form-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
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
  
  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: var(--cream);
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--olive);
    background: white;
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }
  
  .form-group[dir="rtl"] input,
  .form-group[dir="rtl"] textarea {
    text-align: right;
  }
  
  .form-hint {
    font-size: 0.8rem;
    color: var(--ink-light);
    margin-top: 0.25rem;
  }
  
  .checkbox-group {
    flex-direction: row;
    align-items: flex-start;
    gap: 0;
  }
  
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
  
  /* Image Upload */
  .image-upload {
    margin-bottom: 1rem;
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
    max-width: 300px;
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
  
  /* Actions */
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
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

