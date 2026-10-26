import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import { brand, siteUrl } from "@repo/brand";
import { ErrorReporter } from "@/components/error-reporter";
import { InlineScript } from "@/components/inline-script";
import { SiteFooter } from "@/components/site-footer";
import { THEME_SCRIPT } from "@/lib/theme";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { ExtensionBridge } from "@/components/extension-bridge";
import { SiteHeader } from "@/components/site-header";
import { I18nProvider } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/locales";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizedPath, OG_LOCALE } from "@/lib/seo";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: m.meta.title(brand.name),
      template: `%s · ${brand.name}`,
    },
    description: m.landing.description,
    applicationName: brand.name,
    category: "games",
    openGraph: {
      type: "website",
      siteName: brand.name,
      locale: OG_LOCALE[locale],
      alternateLocale: Object.values(OG_LOCALE).filter((value) => value !== OG_LOCALE[locale]),
      title: m.meta.title(brand.name),
      description: m.landing.description,
      url: localizedPath("/", locale),
    },
    twitter: { card: "summary_large_image" },
    // Códigos de Google Search Console y Bing Webmaster Tools, cuando haya dominio.
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : undefined,
    },
    appleWebApp: {
      capable: true,
      title: brand.name,
    },
  };
}

export const viewport: Viewport = {
  // Para que la barra de pestañas respete la zona del indicador de inicio en iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.themeColor },
    { media: "(prefers-color-scheme: dark)", color: brand.themeColorDark },
  ],
};

/** Cada página se genera una vez por idioma; proxy.ts elige cuál servir sin cambiar la URL. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${bricolage.variable} h-full antialiased`}
      // El script del tema pone data-theme antes de que React hidrate.
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
        <ServiceWorker />
        {/* Lee la ruta: con cacheComponents, dentro de Suspense para no frenar el resto. */}
        <Suspense fallback={null}>
          <ExtensionBridge />
        </Suspense>
        <SiteHeader />
        {children}
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
        <InstallPrompt />
        <ErrorReporter />
        </I18nProvider>
      </body>
    </html>
  );
}
