const siteUrl = "https://nexuscontent.dev";

// The canonical base URL is deployment-owned: Core never infers deployment
// URLs, so this tiny per-project helper is the only consumer-owned SEO code.
export function canonicalUrl(pathname: string): string {
  return new URL(pathname, siteUrl).href;
}