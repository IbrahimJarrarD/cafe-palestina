<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Language } from '../i18n/translations';
  import { t } from '../i18n/translations';
  
  export let lang: Language;
  
  // Simplified event data from card
  interface ModalEvent {
    id: string;
    slug: string;
    date: string;
    time: string;
    location: string;
    address: string;
    title_de: string;
    title_en: string;
    title_ar: string;
    description_de: string;
    description_en: string;
    description_ar: string;
    category_name_de: string;
    category_name_en: string;
    category_name_ar: string;
    category_icon: string;
    image_slug: string;
  }
  
  let isOpen = false;
  let event: ModalEvent | null = null;
  
  $: tr = t(lang);
  
  const localeMap = { de: 'de-DE', en: 'en-US', ar: 'ar-EG' };
  
  $: formattedDate = event ? new Date(event.date).toLocaleDateString(
    localeMap[lang],
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  ) : '';
  
  $: title = event ? (event[`title_${lang}` as keyof ModalEvent] as string) || event.title_en : '';
  $: description = event ? (event[`description_${lang}` as keyof ModalEvent] as string) || event.description_en : '';
  $: categoryName = event ? (event[`category_name_${lang}` as keyof ModalEvent] as string) || event.category_name_en : '';
  
  function openModal(e: CustomEvent<ModalEvent>) {
    event = e.detail;
    isOpen = true;
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    isOpen = false;
    document.body.style.overflow = '';
    event = null;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      closeModal();
    }
  }
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }
  
  function addToCalendar() {
    if (!event) return;
    
    const startDate = new Date(event.date + 'T' + event.time.split(' - ')[0]);
    const endDate = new Date(event.date + 'T' + (event.time.split(' - ')[1] || event.time.split(' - ')[0]));
    
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&location=${encodeURIComponent(event.address)}&details=${encodeURIComponent(description)}`;
    
    window.open(url, '_blank');
  }
  
  function openInMaps() {
    if (!event) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`;
    window.open(url, '_blank');
  }
  
  function shareEvent() {
    if (!event) return;
    
    const text = `${title} - ${formattedDate}\n${description}`;
    
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text + '\n\n' + window.location.href);
      const msg = { de: 'Link kopiert!', en: 'Link copied!', ar: 'تم نسخ الرابط!' };
      alert(msg[lang]);
    }
  }
  
  onMount(() => {
    window.addEventListener('open-event-modal', openModal as EventListener);
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('open-event-modal', openModal as EventListener);
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if isOpen && event}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content">
      <button class="modal-close" on:click={closeModal} aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-header">
        <span class="modal-badge">
          <span class="badge-icon">{event.category_icon}</span>
          {categoryName}
        </span>
        <h2 class="modal-title">{title}</h2>
      </div>
      
      <div class="modal-meta">
        <div class="meta-item">
          <div class="meta-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="meta-content">
            <span class="meta-label">{tr.events.date}</span>
            <span class="meta-value">{formattedDate}</span>
          </div>
        </div>
        
        <div class="meta-item">
          <div class="meta-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="meta-content">
            <span class="meta-label">{tr.events.time}</span>
            <span class="meta-value">{event.time}</span>
          </div>
        </div>
        
        <div class="meta-item">
          <div class="meta-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="meta-content">
            <span class="meta-label">{tr.events.location}</span>
            <span class="meta-value">{event.location}</span>
            <span class="meta-address">{event.address}</span>
          </div>
        </div>
      </div>
      
      <p class="modal-description">{description}</p>
      
      <div class="modal-actions">
        <button class="action-btn action-primary" on:click={addToCalendar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="18"/>
            <line x1="10" y1="16" x2="14" y2="16"/>
          </svg>
          {tr.events.addToCalendar}
        </button>
        
        <button class="action-btn action-secondary" on:click={openInMaps}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
          {tr.events.openMaps}
        </button>
        
        <button class="action-btn action-tertiary" on:click={shareEvent}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {tr.events.share}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: var(--white);
    border-radius: 24px;
    max-width: 550px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: var(--space-2xl);
    position: relative;
    animation: slideUp 0.3s var(--ease-spring);
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .modal-close {
    position: absolute;
    top: var(--space-lg);
    right: var(--space-lg);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sand);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--ink-light);
    transition: all 0.2s ease;
  }
  
  :global([dir="rtl"]) .modal-close {
    right: auto;
    left: var(--space-lg);
  }
  
  .modal-close:hover {
    background: var(--pine);
    color: var(--white);
  }
  
  .modal-header {
    margin-bottom: var(--space-xl);
  }
  
  .modal-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs) var(--space-md);
    background: var(--sand);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--olive);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-md);
  }
  
  .badge-icon {
    font-size: 0.9rem;
  }
  
  .modal-title {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--pine);
    line-height: 1.3;
  }
  
  .modal-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--sand-light);
    border-radius: 16px;
    margin-bottom: var(--space-xl);
  }
  
  .meta-item {
    display: flex;
    gap: var(--space-md);
  }
  
  .meta-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--white);
    border-radius: 10px;
    color: var(--olive);
    flex-shrink: 0;
  }
  
  .meta-content {
    display: flex;
    flex-direction: column;
  }
  
  .meta-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ink-light);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .meta-value {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--ink);
  }
  
  .meta-address {
    font-size: 0.85rem;
    color: var(--ink-light);
  }
  
  .modal-description {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--ink-light);
    margin-bottom: var(--space-xl);
  }
  
  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    min-width: fit-content;
    justify-content: center;
  }
  
  .action-primary {
    background: linear-gradient(135deg, var(--pine) 0%, var(--pine-light) 100%);
    color: var(--white);
  }
  
  .action-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(26, 61, 46, 0.3);
  }
  
  .action-secondary {
    background: var(--sand);
    color: var(--pine);
  }
  
  .action-secondary:hover {
    background: var(--olive);
    color: var(--white);
  }
  
  .action-tertiary {
    background: var(--gold);
    color: var(--ink);
  }
  
  .action-tertiary:hover {
    background: var(--gold-light);
  }
  
  @media (max-width: 480px) {
    .modal-content {
      padding: var(--space-xl);
    }
    
    .modal-actions {
      flex-direction: column;
    }
    
    .action-btn {
      width: 100%;
    }
  }
</style>
