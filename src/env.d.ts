/// <reference types="astro/client" />

import type { Session } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      session?: Session | null;
    }
  }
}

export {};

