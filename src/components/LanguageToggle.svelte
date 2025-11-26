<script lang="ts">
  import type { Language } from '../i18n/translations';
  
  export let currentLang: Language;
  
  function switchLanguage(lang: Language) {
    if (lang === currentLang) return;
    
    // Navigate to the other language version
    if (lang === 'ar') {
      window.location.href = '/ar';
    } else if (lang === 'en') {
      window.location.href = '/en';
    } else {
      window.location.href = '/';
    }
  }
</script>

<div class="lang-toggle">
  <button 
    class="lang-btn"
    class:active={currentLang === 'de'}
    on:click={() => switchLanguage('de')}
    aria-label="Deutsch"
    title="Deutsch"
  >
    DE
  </button>
  <button 
    class="lang-btn"
    class:active={currentLang === 'en'}
    on:click={() => switchLanguage('en')}
    aria-label="English"
    title="English"
  >
    EN
  </button>
  <button 
    class="lang-btn"
    class:active={currentLang === 'ar'}
    on:click={() => switchLanguage('ar')}
    aria-label="العربية"
    title="العربية"
  >
    ع
  </button>
</div>

<style>
  .lang-toggle {
    display: flex;
    background: var(--sand);
    padding: 4px;
    border-radius: 10px;
    gap: 2px;
  }
  
  .lang-btn {
    padding: 6px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ink-light);
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .lang-btn:hover {
    color: var(--pine);
    background: rgba(255, 255, 255, 0.5);
  }
  
  .lang-btn.active {
    background: var(--white);
    color: var(--pine);
    box-shadow: 0 2px 8px rgba(26, 61, 46, 0.12);
  }
</style>
