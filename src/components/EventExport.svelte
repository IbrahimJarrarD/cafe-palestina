<script lang="ts">
  import { tick } from 'svelte';
  import type { Language } from '../i18n/translations';

  export let lang: Language;

  interface ExportEvent {
    title_de: string;
    title_en: string;
    title_ar: string;
    description_de: string;
    description_en: string;
    description_ar: string;
    date: string;
    time: string;
    location: string;
    address: string;
    category_icon: string;
    category_name_de: string;
    category_name_en: string;
    category_name_ar: string;
    image_url?: string;
    slug: string;
  }

  export let event: ExportEvent | null = null;

  let pdfTarget: HTMLDivElement;
  let instaTarget: HTMLDivElement;
  let generating = '';

  const localeMap: Record<string, string> = { de: 'de-DE', en: 'en-US', ar: 'ar-EG' };

  $: title = event ? (event[`title_${lang}` as keyof ExportEvent] as string) || event.title_en : '';
  $: categoryName = event ? (event[`category_name_${lang}` as keyof ExportEvent] as string) || event.category_name_en : '';
  $: formattedDate = event ? new Date(event.date).toLocaleDateString(localeMap[lang], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) : '';

  function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  $: descriptionHtml = event ? (event[`description_${lang}` as keyof ExportEvent] as string) || event.description_en : '';
  $: descriptionPlain = descriptionHtml ? stripHtml(descriptionHtml) : '';
  $: descriptionTrimmed = descriptionPlain.length > 500 ? descriptionPlain.slice(0, 497) + '...' : descriptionPlain;

  async function renderToCanvas(el: HTMLElement, width: number, height: number) {
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(el, {
      width,
      height,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  export async function exportPDF() {
    if (!event || generating) return;
    generating = 'pdf';
    await tick();

    try {
      const canvas = await renderToCanvas(pdfTarget, 560, 794);
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210);
      pdf.save(`${event.slug}-einladung.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      generating = '';
    }
  }

  export async function exportInstagram() {
    if (!event || generating) return;
    generating = 'instagram';
    await tick();

    try {
      const canvas = await renderToCanvas(instaTarget, 1080, 1080);
      canvas.toBlob((blob) => {
        if (blob) download(blob, `${event!.slug}-instagram.png`);
      }, 'image/png');
    } catch (err) {
      console.error('Instagram export failed:', err);
      alert('Instagram export failed. Please try again.');
    } finally {
      generating = '';
    }
  }
</script>

{#if event}
  <!-- PDF Render Target (A5 ratio: 560x794 at 2x = 1120x1588) -->
  <div class="render-offscreen">
    <div bind:this={pdfTarget} class="pdf-canvas">
      <!-- Header band -->
      <div class="pdf-header">
        {#if event.image_url}
          <img src={event.image_url} alt="" class="pdf-hero-img" crossorigin="anonymous" />
          <div class="pdf-hero-overlay"></div>
        {:else}
          <div class="pdf-hero-gradient">
            <span class="pdf-hero-icon">{event.category_icon}</span>
          </div>
        {/if}
        <div class="pdf-hero-text">
          <span class="pdf-category">{event.category_icon} {categoryName}</span>
        </div>
      </div>

      <!-- Body -->
      <div class="pdf-body">
        <h1 class="pdf-title">{title}</h1>

        <div class="pdf-meta">
          <div class="pdf-meta-row">
            <span class="pdf-meta-icon">📅</span>
            <span class="pdf-meta-text">{formattedDate}</span>
          </div>
          <div class="pdf-meta-row">
            <span class="pdf-meta-icon">🕐</span>
            <span class="pdf-meta-text">{event.time} Uhr</span>
          </div>
          <div class="pdf-meta-row">
            <span class="pdf-meta-icon">📍</span>
            <span class="pdf-meta-text">{event.location}, {event.address}</span>
          </div>
        </div>

        <p class="pdf-description">{descriptionTrimmed}</p>
      </div>

      <!-- Footer -->
      <div class="pdf-footer">
        <img src="/logo.jpg" alt="Café Palestine Colonia" class="pdf-logo" crossorigin="anonymous" />
        <span class="pdf-url">www.cafepalestinecolonia.de</span>
      </div>
    </div>
  </div>

  <!-- Instagram Render Target (1080x1080) -->
  <div class="render-offscreen">
    <div bind:this={instaTarget} class="insta-canvas">
      {#if event.image_url}
        <img src={event.image_url} alt="" class="insta-bg" crossorigin="anonymous" />
      {/if}
      <div class="insta-overlay"></div>

      <!-- Top badge -->
      <div class="insta-top">
        <span class="insta-badge">{event.category_icon} {categoryName}</span>
      </div>

      <!-- Center content -->
      <div class="insta-center">
        <h1 class="insta-title">{title}</h1>
        <div class="insta-divider"></div>
        <div class="insta-details">
          <span class="insta-detail">📅 {formattedDate}</span>
          <span class="insta-detail">🕐 {event.time} Uhr</span>
          <span class="insta-detail">📍 {event.location}</span>
        </div>
      </div>

      <!-- Bottom branding -->
      <div class="insta-bottom">
        <img src="/logo.jpg" alt="CPC" class="insta-logo" crossorigin="anonymous" />
        <span class="insta-brand">Café Palestine Colonia</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .render-offscreen {
    position: fixed;
    left: -9999px;
    top: 0;
    pointer-events: none;
    z-index: -1;
  }

  /* ===== PDF LAYOUT (560x794) ===== */
  .pdf-canvas {
    width: 560px;
    height: 794px;
    background: #faf8f4;
    display: flex;
    flex-direction: column;
    font-family: 'Outfit', 'Inter', system-ui, sans-serif;
    overflow: hidden;
  }

  .pdf-header {
    position: relative;
    height: 200px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .pdf-hero-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .pdf-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(26,61,46,0.1) 0%, rgba(26,61,46,0.5) 100%);
  }

  .pdf-hero-gradient {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 50%, #6b8c42 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pdf-hero-icon {
    font-size: 64px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
  }

  .pdf-hero-text {
    position: absolute;
    bottom: 12px;
    left: 24px;
  }

  .pdf-category {
    background: rgba(255,255,255,0.92);
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1a3d2e;
  }

  .pdf-body {
    flex: 1;
    padding: 28px 32px 16px;
    display: flex;
    flex-direction: column;
  }

  .pdf-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: #1a3d2e;
    line-height: 1.25;
    margin: 0 0 20px;
  }

  .pdf-meta {
    background: #f0ece2;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pdf-meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #1c1c1c;
  }

  .pdf-meta-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .pdf-meta-text {
    font-weight: 500;
  }

  .pdf-description {
    font-size: 12.5px;
    line-height: 1.65;
    color: #4a4a4a;
    margin: 0;
    flex: 1;
    overflow: hidden;
  }

  .pdf-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 32px;
    border-top: 2px solid #e8dcc4;
    background: #f5f0e6;
    flex-shrink: 0;
  }

  .pdf-logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: contain;
  }

  .pdf-url {
    font-size: 12px;
    color: #6b8c42;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  /* ===== INSTAGRAM LAYOUT (1080x1080) ===== */
  .insta-canvas {
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    font-family: 'Outfit', 'Inter', system-ui, sans-serif;
    background: linear-gradient(135deg, #1a3d2e 0%, #2d5a47 40%, #6b8c42 100%);
  }

  .insta-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .insta-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(26,61,46,0.55) 0%,
      rgba(26,61,46,0.75) 40%,
      rgba(26,61,46,0.9) 100%
    );
  }

  .insta-top {
    position: absolute;
    top: 48px;
    right: 48px;
    z-index: 2;
  }

  .insta-badge {
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(8px);
    padding: 10px 22px;
    border-radius: 30px;
    font-size: 22px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid rgba(255,255,255,0.25);
  }

  .insta-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2;
    padding: 80px 72px;
    text-align: center;
  }

  .insta-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 64px;
    font-weight: 700;
    color: white;
    line-height: 1.15;
    margin: 0 0 36px;
    text-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }

  .insta-divider {
    width: 80px;
    height: 3px;
    background: #d4a853;
    border-radius: 2px;
    margin-bottom: 36px;
  }

  .insta-details {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }

  .insta-detail {
    font-size: 28px;
    font-weight: 500;
    color: rgba(255,255,255,0.92);
    text-shadow: 0 1px 6px rgba(0,0,0,0.2);
  }

  .insta-bottom {
    position: absolute;
    bottom: 48px;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 2;
  }

  .insta-logo {
    width: 52px;
    height: 52px;
    border-radius: 10px;
    object-fit: contain;
    border: 2px solid rgba(255,255,255,0.3);
  }

  .insta-brand {
    font-size: 24px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.04em;
  }
</style>
