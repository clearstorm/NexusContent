import { makeCanonicalUrl } from "@nexuscontent/core";

// The canonical base URL is deployment-owned and loaded from the environment.
// Only this value and the one-line alias are per-project; the join lives in Core.
const siteUrl = import.meta.env.PUBLIC_SITE_URL as string | undefined ?? "https://nexuscontent.dev";

export const canonicalUrl = (pathname: string) => makeCanonicalUrl(siteUrl, pathname);