export interface Event {
  id: string;
  slug: string;
  category: 'workshop' | 'reading' | 'film' | 'meeting' | 'exhibition' | 'concert';
  date: string; // ISO date
  time: string;
  location: string;
  address: string;
  image: 'cooking' | 'reading' | 'film' | 'embroidery' | 'music';
  title: {
    de: string;
    ar: string;
    en: string;
  };
  description: {
    de: string;
    ar: string;
    en: string;
  };
}

export const events: Event[] = [
  {
    id: '1',
    slug: 'palaestinensische-kueche-workshop',
    category: 'workshop',
    date: '2024-12-15',
    time: '18:00 - 20:00',
    location: 'Cafe Palestine Colonia',
    address: 'Geisselstraße 3–5, 50823 Köln',
    image: 'cooking',
    title: {
      de: 'Workshop: Palästinensische Küche',
      ar: 'ورشة عمل: الطهي الفلسطيني',
      en: 'Workshop: Palestinian Cuisine',
    },
    description: {
      de: 'Lerne die authentische Zubereitung palästinensischer Gerichte. Von Hummus bis Tabbouleh – entdecke die Vielfalt der levantinischen Küche in einem interaktiven Workshop mit traditionellen Rezepten.',
      ar: 'تعلم تحضير الأطباق الفلسطينية الأصيلة. من الحمص إلى التبولة – اكتشف تنوع المطبخ الشامي في ورشة عمل تفاعلية مع وصفات تقليدية.',
      en: 'Learn authentic Palestinian cooking. From hummus to tabbouleh – discover the diversity of Levantine cuisine in an interactive workshop with traditional recipes.',
    },
  },
  {
    id: '2',
    slug: 'maerchen-leseabend',
    category: 'reading',
    date: '2024-12-22',
    time: '19:30 - 21:30',
    location: 'Stadtbibliothek Köln',
    address: 'Josef-Haubrich-Hof 1, 50676 Köln',
    image: 'reading',
    title: {
      de: 'Leseabend: Märchen aus Palästina',
      ar: 'أمسية قراءة: حكايات من فلسطين',
      en: 'Reading Night: Tales from Palestine',
    },
    description: {
      de: 'Ein wundervoller Abend mit traditionellen und modernen palästinensischen Märchen. Lese- und Erzählkünstler teilen ihre Geschichten in einer intimen Atmosphäre.',
      ar: 'مساء رائع مع حكايات فلسطينية تقليدية وحديثة. يشارك فنانو السرد قصصهم في أجواء حميمية.',
      en: 'A wonderful evening with traditional and modern Palestinian tales. Storytellers share their narratives in an intimate atmosphere.',
    },
  },
  {
    id: '3',
    slug: 'filmabend-gaza-mon-amour',
    category: 'film',
    date: '2024-12-29',
    time: '20:00 - 22:30',
    location: 'Filmforum NRW',
    address: 'Maybachstraße 111, 50670 Köln',
    image: 'film',
    title: {
      de: 'Filmabend: Gaza Mon Amour',
      ar: 'ليلة فيلم: غزة حبيبتي',
      en: 'Film Night: Gaza Mon Amour',
    },
    description: {
      de: 'Preisgekrönter palästinensischer Film mit anschließender Diskussion. Ein tiefgehendes Filmerlebnis, das Perspektiven eröffnet und zum Nachdenken einlädt.',
      ar: 'فيلم فلسطيني حائز على جوائز مع نقاش لاحق. تجربة سينمائية متعمقة تفتح آفاقاً جديدة.',
      en: 'Award-winning Palestinian film with discussion afterwards. A deep cinematic experience that opens perspectives and invites reflection.',
    },
  },
  {
    id: '4',
    slug: 'tatreez-stickerei-workshop',
    category: 'workshop',
    date: '2025-01-12',
    time: '15:00 - 18:00',
    location: 'Cafe Palestine Colonia',
    address: 'Geisselstraße 3–5, 50823 Köln',
    image: 'embroidery',
    title: {
      de: 'Tatreez: Palästinensische Stickerei',
      ar: 'تطريز: الفن الفلسطيني التقليدي',
      en: 'Tatreez: Palestinian Embroidery',
    },
    description: {
      de: 'Erlerne traditionelle palästinensische Stickerei-Techniken. Die Tatreez-Kunst erzählt Geschichten von Heimat und Identität – ein Meisterwerk zum Mitnehmen.',
      ar: 'تعلم تقنيات التطريز الفلسطينية التقليدية. فن التطريز يحكي قصص الوطن والهوية.',
      en: 'Learn traditional Palestinian embroidery techniques. Tatreez art tells stories of homeland and identity – create a masterpiece to take home.',
    },
  },
];

export function getEvent(slug: string): Event | undefined {
  return events.find(e => e.slug === slug);
}

export function getUpcomingEvents(): Event[] {
  const now = new Date();
  return events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
