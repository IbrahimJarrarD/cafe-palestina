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

  function extractSpeaker(html: string): string | null {
    const strongMatch = html.match(/<strong>([^<]*(?:Dr\.|Prof\.)[^<]*)<\/strong>/);
    if (strongMatch) return strongMatch[1].trim();
    const h2Match = html.match(/<h2>([^<]*(?:Dr\.|Prof\.)[^<]*)<\/h2>/);
    if (h2Match) return h2Match[1].trim();
    return null;
  }

  function extractPartnerLogos(html: string): string[] {
    const urls: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }

  function stripImagesAndPartnerSection(html: string): string {
    let cleaned = html.replace(/<img[^>]*>/g, '');
    cleaned = cleaned.replace(/<p>\s*<strong>\s*(?:In Kooperation mit|In cooperation with|بالتعاون مع)[^<]*<\/strong>\s*<\/p>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*partner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    return cleaned;
  }

  $: descriptionHtml = event ? (event[`description_${lang}` as keyof ExportEvent] as string) || event.description_en : '';
  $: partnerLogos = descriptionHtml ? extractPartnerLogos(descriptionHtml) : [];
  $: cleanedHtml = descriptionHtml ? stripImagesAndPartnerSection(descriptionHtml) : '';
  $: descriptionPlain = cleanedHtml ? stripHtml(cleanedHtml) : '';
  $: descriptionTrimmed = descriptionPlain.length > 800 ? descriptionPlain.slice(0, 797) + '...' : descriptionPlain;
  $: speaker = descriptionHtml ? extractSpeaker(descriptionHtml) : null;

  const entryLabels: Record<string, string> = {
    de: 'Eintritt frei · Spenden erbeten',
    en: 'Free entry · Donations welcome',
    ar: 'الدخول مجاني · التبرعات مرحب بها',
  };

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
      <!-- Header with photo -->
      <div class="pdf-header">
        {#if event.image_url}
          <img src={event.image_url} alt="" class="pdf-hero-img" crossorigin="anonymous" />
          <div class="pdf-hero-overlay"></div>
        {:else}
          <div class="pdf-hero-gradient">
            <span class="pdf-hero-icon">{event.category_icon}</span>
          </div>
        {/if}
      </div>

      <!-- Body -->
      <div class="pdf-body">
        <h1 class="pdf-title">{title}</h1>

        {#if speaker}
          <p class="pdf-speaker">{speaker}</p>
        {/if}

        <div class="pdf-meta">
          <div class="pdf-meta-row">
            <span class="pdf-meta-label">Datum</span>
            <span class="pdf-meta-text">{formattedDate}</span>
          </div>
          <div class="pdf-meta-row">
            <span class="pdf-meta-label">Uhrzeit</span>
            <span class="pdf-meta-text">{event.time}</span>
          </div>
          <div class="pdf-meta-row">
            <span class="pdf-meta-label">Ort</span>
            <span class="pdf-meta-text">{event.location}, {event.address}</span>
          </div>
        </div>

        <p class="pdf-description">{descriptionTrimmed}</p>

        <p class="pdf-entry">{entryLabels[lang]}</p>
      </div>

      <!-- Partner logos (dynamic from description) -->
      {#if partnerLogos.length > 0}
        <div class="pdf-partners">
          {#each partnerLogos as logoUrl}
            <img src={logoUrl} alt="" class="pdf-partner-logo" crossorigin="anonymous" />
          {/each}
        </div>
      {/if}

      <!-- Footer -->
      <div class="pdf-footer">
        <span class="pdf-url">Café Palestine Colonia · www.cafepalestinecolonia.de</span>
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

      <!-- Center content -->
      <div class="insta-center">
        <h1 class="insta-title">{title}</h1>

        {#if speaker}
          <p class="insta-speaker">{speaker}</p>
        {/if}

        <div class="insta-divider"></div>

        <div class="insta-details">
          <span class="insta-detail">{formattedDate}</span>
          <span class="insta-detail-small">{event.time} Uhr</span>
          <span class="insta-detail-small">{event.location}</span>
        </div>

        <span class="insta-entry">{entryLabels[lang]}</span>
      </div>

      <!-- Bottom branding -->
      <div class="insta-bottom">
        {#if partnerLogos.length > 0}
          <div class="insta-partners">
            {#each partnerLogos as logoUrl}
              <img src={logoUrl} alt="" class="insta-partner" crossorigin="anonymous" />
            {/each}
          </div>
        {:else}
          <span class="insta-brand">Café Palestine Colonia</span>
        {/if}
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
    height: 170px;
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
    background: linear-gradient(to bottom, rgba(26,61,46,0.05) 0%, rgba(26,61,46,0.45) 100%);
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

  .pdf-body {
    flex: 1;
    padding: 24px 32px 12px;
    display: flex;
    flex-direction: column;
  }

  .pdf-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    color: #1a3d2e;
    line-height: 1.2;
    margin: 0 0 6px;
  }

  .pdf-speaker {
    font-size: 14px;
    font-weight: 600;
    color: #6b8c42;
    margin: 0 0 16px;
    font-style: italic;
  }

  .pdf-meta {
    background: #f0ece2;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pdf-meta-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 12.5px;
    color: #1c1c1c;
  }

  .pdf-meta-label {
    font-weight: 700;
    color: #1a3d2e;
    min-width: 52px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pdf-meta-text {
    font-weight: 500;
  }

  .pdf-description {
    font-size: 11px;
    line-height: 1.55;
    color: #4a4a4a;
    margin: 0;
    flex: 1;
    overflow: hidden;
  }

  .pdf-entry {
    font-size: 12px;
    font-weight: 600;
    color: #6b8c42;
    margin: 10px 0 0;
    text-align: center;
    letter-spacing: 0.02em;
  }

  .pdf-partners {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 8px 32px;
    border-top: 1px solid #e8dcc4;
    flex-shrink: 0;
  }

  .pdf-partner-logo {
    height: 30px;
    width: auto;
    max-width: 85px;
    object-fit: contain;
    opacity: 0.85;
  }

  .pdf-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 32px;
    background: #1a3d2e;
    flex-shrink: 0;
  }

  .pdf-url {
    font-size: 11px;
    color: rgba(255,255,255,0.85);
    font-weight: 500;
    letter-spacing: 0.03em;
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
      rgba(26,61,46,0.35) 0%,
      rgba(26,61,46,0.55) 35%,
      rgba(26,61,46,0.78) 100%
    );
  }

  .insta-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2;
    padding: 100px 80px 140px;
    text-align: center;
  }

  .insta-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 58px;
    font-weight: 700;
    color: white;
    line-height: 1.15;
    margin: 0 0 12px;
    text-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }

  .insta-speaker {
    font-size: 26px;
    font-weight: 500;
    color: rgba(255,255,255,0.9);
    margin: 0 0 28px;
    font-style: italic;
    text-shadow: 0 1px 8px rgba(0,0,0,0.2);
  }

  .insta-divider {
    width: 80px;
    height: 3px;
    background: #d4a853;
    border-radius: 2px;
    margin-bottom: 28px;
  }

  .insta-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    margin-bottom: 20px;
  }

  .insta-detail {
    font-size: 28px;
    font-weight: 600;
    color: rgba(255,255,255,0.95);
    text-shadow: 0 1px 6px rgba(0,0,0,0.2);
  }

  .insta-detail-small {
    font-size: 24px;
    font-weight: 400;
    color: rgba(255,255,255,0.85);
    text-shadow: 0 1px 6px rgba(0,0,0,0.2);
  }

  .insta-entry {
    font-size: 20px;
    font-weight: 500;
    color: #d4a853;
    letter-spacing: 0.04em;
  }

  .insta-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2;
    padding: 20px 44px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .insta-partners {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .insta-partner {
    height: 36px;
    width: auto;
    max-width: 90px;
    object-fit: contain;
    background: rgba(255,255,255,0.85);
    border-radius: 6px;
    padding: 4px 8px;
  }

  .insta-brand {
    font-size: 24px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.04em;
  }
</style>
