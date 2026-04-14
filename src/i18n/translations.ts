export type Language = 'de' | 'ar' | 'en';

export const translations = {
  de: {
    // Navigation
    nav: {
      home: 'Startseite',
      events: 'Veranstaltungen',
      about: 'Über uns',
      contact: 'Kontakt',
    },
    
    // Hero (only CTA buttons - content from DB)
    hero: {
      cta: 'Veranstaltungen entdecken',
      ctaSecondary: 'Mehr erfahren',
    },
    
    // Info box labels
    info: {
      title: 'Regelmäßiger Treffpunkt',
      description: 'Ein Ort des Austauschs, der Begegnung und des gemeinsamen Genießens.',
    },
    
    // Events section
    events: {
      title: 'Kommende Veranstaltungen',
      subtitle: 'Inspirierende Momente, kulturelle Erlebnisse und Zusammenhalt',
      noEvents: 'Keine kommenden Veranstaltungen',
      learnMore: 'Mehr erfahren',
    },
    
    // Modal buttons
    modal: {
      calendar: 'Zum Kalender hinzufügen',
      maps: 'In Karten öffnen',
      share: 'Teilen',
      close: 'Schließen',
      date: 'Datum',
      time: 'Uhrzeit',
      location: 'Ort',
      downloadPdf: 'PDF Einladung',
      downloadInsta: 'Instagram Bild',
    },
    
    // Categories
    categories: {
      workshop: 'Workshop',
      reading: 'Lesung',
      film: 'Film',
      meeting: 'Treffen',
      exhibition: 'Ausstellung',
      concert: 'Konzert',
    },
    
    // About section labels (content from DB)
    about: {
      title: 'Über Cafe Palestine Colonia',
    },
    
    // Footer labels (content from DB)
    footer: {
      contact: 'Kontakt',
      follow: 'Folge uns',
      quickLinks: 'Schnelllinks',
      impressum: 'Impressum',
      privacy: 'Datenschutz',
    },
    
    // Newsletter
    newsletter: {
      title: 'Bleib verbunden',
      description: 'Abonniere unseren Newsletter für Updates zu kommenden Veranstaltungen.',
      placeholder: 'deine@email.com',
      button: 'Abonnieren',
      success: 'Danke! Willkommen in unserer Community.',
    },
  },
  
  en: {
    nav: {
      home: 'Home',
      events: 'Events',
      about: 'About',
      contact: 'Contact',
    },
    
    hero: {
      cta: 'Discover Events',
      ctaSecondary: 'Learn More',
    },
    
    info: {
      title: 'Regular Meeting Point',
      description: 'A place of exchange, encounter, and shared enjoyment.',
    },
    
    events: {
      title: 'Upcoming Events',
      subtitle: 'Inspiring moments, cultural experiences, and solidarity',
      noEvents: 'No upcoming events',
      learnMore: 'Learn More',
    },
    
    modal: {
      calendar: 'Add to Calendar',
      maps: 'Open in Maps',
      share: 'Share',
      close: 'Close',
      date: 'Date',
      time: 'Time',
      location: 'Location',
      downloadPdf: 'PDF Invitation',
      downloadInsta: 'Instagram Image',
    },
    
    categories: {
      workshop: 'Workshop',
      reading: 'Reading',
      film: 'Film',
      meeting: 'Meeting',
      exhibition: 'Exhibition',
      concert: 'Concert',
    },
    
    about: {
      title: 'About Cafe Palestine Colonia',
    },
    
    footer: {
      contact: 'Contact',
      follow: 'Follow Us',
      quickLinks: 'Quick Links',
      impressum: 'Legal Notice',
      privacy: 'Privacy Policy',
    },
    
    newsletter: {
      title: 'Stay Connected',
      description: 'Subscribe to our newsletter for updates on upcoming events.',
      placeholder: 'your@email.com',
      button: 'Subscribe',
      success: 'Thank you! Welcome to our community.',
    },
  },
  
  ar: {
    nav: {
      home: 'الرئيسية',
      events: 'الفعاليات',
      about: 'من نحن',
      contact: 'التواصل',
    },
    
    hero: {
      cta: 'اكتشف الفعاليات',
      ctaSecondary: 'معرفة المزيد',
    },
    
    info: {
      title: 'نقطة اجتماع منتظمة',
      description: 'مكان للتبادل واللقاء والاستمتاع المشترك.',
    },
    
    events: {
      title: 'الفعاليات القادمة',
      subtitle: 'لحظات ملهمة وتجارب ثقافية وتضامن',
      noEvents: 'لا توجد فعاليات قادمة',
      learnMore: 'معرفة المزيد',
    },
    
    modal: {
      calendar: 'إضافة إلى التقويم',
      maps: 'فتح في الخرائط',
      share: 'مشاركة',
      close: 'إغلاق',
      date: 'التاريخ',
      time: 'الوقت',
      location: 'الموقع',
      downloadPdf: 'دعوة PDF',
      downloadInsta: 'صورة انستغرام',
    },
    
    categories: {
      workshop: 'ورشة عمل',
      reading: 'قراءة',
      film: 'فيلم',
      meeting: 'لقاء',
      exhibition: 'معرض',
      concert: 'حفل موسيقي',
    },
    
    about: {
      title: 'عن مقهى فلسطين كولونيا',
    },
    
    footer: {
      contact: 'التواصل',
      follow: 'تابعنا',
      quickLinks: 'روابط سريعة',
      impressum: 'بيان قانوني',
      privacy: 'سياسة الخصوصية',
    },
    
    newsletter: {
      title: 'ابقَ على تواصل',
      description: 'اشترك في نشرتنا الإخبارية للحصول على تحديثات.',
      placeholder: 'بريدك@البريد.com',
      button: 'اشترك',
      success: 'شكراً! أهلاً بك في مجتمعنا.',
    },
  },
} as const;

export type Translations = typeof translations.de;

export function t(lang: Language) {
  return translations[lang];
}
