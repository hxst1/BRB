"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Guarda en la cuenta el idioma en que se está usando la app, si ha cambiado:
 * en el perfil (avisos push) y en los metadatos de la cuenta (emails de Supabase).
 */
export function LocaleSync({ userId, saved }: { userId: string; saved: string }) {
  const locale = useLocale();

  useEffect(() => {
    if (locale === saved) return;
    const supabase = createClient();
    void Promise.all([
      supabase.from("profiles").update({ locale }).eq("id", userId),
      supabase.auth.updateUser({ data: { locale } }),
    ]);
  }, [locale, saved, userId]);

  return null;
}
