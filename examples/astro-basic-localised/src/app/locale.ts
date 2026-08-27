export const defaultLocale = "en";
export const supportedLocales = ["en", "fr"] as const;

export function isSupportedLocale(locale: string): boolean {
  return (supportedLocales as readonly string[]).includes(locale);
}

// Internal root-relative content hrefs (e.g. "/company", "/") are localized at
// render time because routing belongs to the application, not the content.
// External hrefs and hrefs that already carry a locale prefix are left alone.
export function localizeHref(locale: string, href: string): string {
  if (!href.startsWith("/")) {
    return href;
  }
  const prefix = `/${locale}`;
  if (href === "/") {
    return `${prefix}/`;
  }
  if (href === prefix || href.startsWith(`${prefix}/`)) {
    return href;
  }
  return `${prefix}${href}`;
}

// Rebuild a path under another locale, e.g. "/fr/company" -> "/en/company".
export function switchLocalePath(currentPath: string, toLocale: string): string {
  const rest = currentPath.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return `/${toLocale}${rest || "/"}`;
}
