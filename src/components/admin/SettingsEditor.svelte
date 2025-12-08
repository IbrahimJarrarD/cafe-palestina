<script lang="ts">
  import { supabase } from '../../lib/supabase';
  
  export let settings: any[] = [];
  
  let saving = false;
  let success = '';
  let error = '';
  
  // Group settings
  const groups = [
    {
      label: 'Contact Information',
      icon: '📍',
      keys: ['site_name', 'email', 'phone', 'address_street', 'address_city', 'address_country']
    },
    {
      label: 'Social Media',
      icon: '🔗',
      keys: ['instagram_url', 'facebook_url', 'youtube_url']
    },
    {
      label: 'Statistics',
      icon: '📊',
      keys: ['stats_events_count', 'stats_visitors_count']
    },
    {
      label: 'Schedule Info',
      icon: '📅',
      keys: ['schedule_info', 'schedule_time'],
      translatable: true
    }
  ];
  
  function getSetting(key: string) {
    return settings.find(s => s.key === key);
  }
  
  function formatLabel(key: string) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace('Url', 'URL');
  }
  
  function getPlaceholder(key: string): string {
    const placeholders: Record<string, string> = {
      site_name: 'Cafe Palestine Colonia',
      email: 'info@cafepalestine.de',
      phone: '+49 123 456789',
      address_street: 'Geisselstraße 3–5',
      address_city: '50823 Köln',
      address_country: 'Deutschland',
      instagram_url: 'https://instagram.com/...',
      facebook_url: 'https://facebook.com/...',
      youtube_url: 'https://youtube.com/...',
      stats_events_count: '100+',
      stats_visitors_count: '5k+',
    };
    return placeholders[key] || '';
  }
  
  async function saveSetting(setting: any, value: string, lang?: string) {
    saving = true;
    success = '';
    error = '';
    
    const updateData = lang 
      ? { [`value_${lang}`]: value }
      : { value };
    
    const { error: updateError } = await supabase
      .from('site_settings')
      .update(updateData as never)
      .eq('id', setting.id);
    
    saving = false;
    
    if (updateError) {
      error = 'Failed to save: ' + updateError.message;
    } else {
      // Update local state
      const idx = settings.findIndex(s => s.id === setting.id);
      if (idx !== -1) {
        if (lang) {
          settings[idx][`value_${lang}`] = value;
        } else {
          settings[idx].value = value;
        }
        settings = [...settings];
      }
      success = setting.key;
      setTimeout(() => success = '', 2000);
    }
  }
  
  function handleInput(event: Event, setting: any, lang?: string) {
    const input = event.target as HTMLInputElement;
    // Debounce save
    clearTimeout((input as any)._saveTimeout);
    (input as any)._saveTimeout = setTimeout(() => {
      saveSetting(setting, input.value, lang);
    }, 1000);
  }
</script>

<div class="settings-editor">
  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}
  
  {#each groups as group}
    <div class="settings-group">
      <h3>
        <span class="group-icon">{group.icon}</span>
        {group.label}
      </h3>
      
      <div class="settings-list">
        {#each group.keys as key}
          {@const setting = getSetting(key)}
          {#if setting}
            <div class="setting-item" class:saved={success === key}>
              <label for={key}>{formatLabel(key)}</label>
              
              {#if group.translatable}
                <div class="translatable-inputs">
                  <div class="lang-input">
                    <span class="lang-flag">🇩🇪</span>
                    <input 
                      type="text"
                      value={setting.value_de || ''}
                      on:input={(e) => handleInput(e, setting, 'de')}
                      placeholder="German"
                    />
                  </div>
                  <div class="lang-input">
                    <span class="lang-flag">🇬🇧</span>
                    <input 
                      type="text"
                      value={setting.value_en || ''}
                      on:input={(e) => handleInput(e, setting, 'en')}
                      placeholder="English"
                    />
                  </div>
                  <div class="lang-input">
                    <span class="lang-flag">🇵🇸</span>
                    <input 
                      type="text"
                      value={setting.value_ar || ''}
                      on:input={(e) => handleInput(e, setting, 'ar')}
                      placeholder="Arabic"
                      dir="rtl"
                    />
                  </div>
                </div>
              {:else}
                <input 
                  type="text"
                  id={key}
                  value={setting.value || ''}
                  on:input={(e) => handleInput(e, setting)}
                  placeholder={getPlaceholder(key)}
                />
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/each}
  
  <p class="save-hint">💡 Changes are saved automatically</p>
</div>

<style>
  .settings-editor {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .alert-error {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.85rem;
  }
  
  .settings-group {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  
  .settings-group h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--pine);
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--sand);
  }
  
  .group-icon {
    font-size: 1.1rem;
  }
  
  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    transition: background 0.3s;
  }
  
  .setting-item.saved {
    animation: savedFlash 0.5s ease;
  }
  
  @keyframes savedFlash {
    0%, 100% { background: transparent; }
    50% { background: #dcfce7; }
  }
  
  .setting-item label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
  }
  
  .setting-item input {
    padding: 0.75rem;
    font-size: 0.95rem;
    border: 2px solid var(--sand);
    border-radius: 8px;
    background: var(--cream);
    transition: all 0.2s;
  }
  
  .setting-item input:focus {
    outline: none;
    border-color: var(--olive);
    background: white;
  }
  
  .translatable-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .lang-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .lang-flag {
    flex-shrink: 0;
    width: 24px;
  }
  
  .lang-input input {
    flex: 1;
  }
  
  .save-hint {
    text-align: center;
    font-size: 0.85rem;
    color: var(--ink-light);
  }
</style>

