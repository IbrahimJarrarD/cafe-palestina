// Database types for Supabase
// Matches the flexible schema with lookup tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name_de: string;
          name_en: string;
          name_ar: string;
          icon: string | null;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      image_types: {
        Row: {
          id: string;
          slug: string;
          name_de: string;
          name_en: string;
          name_ar: string;
          preview_color_1: string | null;
          preview_color_2: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['image_types']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['image_types']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          slug: string;
          category_id: string | null;
          date: string;
          time: string;
          location: string;
          address: string;
          image_type_id: string | null;
          image_url: string | null;
          video_url: string | null;
          title_de: string;
          title_en: string;
          title_ar: string;
          description_de: string;
          description_en: string;
          description_ar: string;
          max_attendees: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      rsvps: {
        Row: {
          id: string;
          event_id: string;
          email: string;
          name: string;
          guests: number;
          message: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rsvps']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rsvps']['Insert']>;
      };
      page_content: {
        Row: {
          id: string;
          key: string;
          content_de: string;
          content_en: string;
          content_ar: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['page_content']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['page_content']['Insert']>;
      };
      announcements: {
        Row: {
          id: string;
          text_de: string;
          text_en: string;
          text_ar: string;
          icon: string | null;
          link_url: string | null;
          link_type: 'internal' | 'external' | 'event';
          linked_event_id: string | null;
          is_active: boolean;
          priority: number;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>;
      };
      site_settings: {
        Row: {
          id: string;
          key: string;
          value_de: string | null;
          value_en: string | null;
          value_ar: string | null;
          value: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['site_settings']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>;
      };
    };
  };
}

// Helper types
export type Category = Database['public']['Tables']['categories']['Row'];
export type ImageType = Database['public']['Tables']['image_types']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type NewEvent = Database['public']['Tables']['events']['Insert'];
export type RSVP = Database['public']['Tables']['rsvps']['Row'];
export type NewRSVP = Database['public']['Tables']['rsvps']['Insert'];
export type PageContent = Database['public']['Tables']['page_content']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type SiteSetting = Database['public']['Tables']['site_settings']['Row'];

// Event with joined category and image type
export interface EventWithRelations extends Event {
  category: Category | null;
  image_type: ImageType | null;
}

// Parsed site settings as key-value map
export interface SiteSettings {
  [key: string]: {
    value?: string | null;
    de?: string | null;
    en?: string | null;
    ar?: string | null;
  };
}

// Parsed page content as key-value map
export interface PageContentMap {
  [key: string]: {
    de: string;
    en: string;
    ar: string;
  };
}
