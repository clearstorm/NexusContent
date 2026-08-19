import { ProviderError } from "../../core/errors.ts";

export interface WordPressClientResponse {
  data: unknown;
  headers: Headers;
}

export interface WordPressRequestContext {
  operation: string;
  content: string;
}

type QueryValue = string | number;

export class WordPressClient {
  private readonly baseUrl: URL;
  private readonly headers: Record<string, string>;
  private readonly providerName: string;
  private readonly timeoutMs: number;

  constructor(options: {
    baseUrl: URL;
    headers: Record<string, string>;
    providerName: string;
    timeoutMs: number;
  }) {
    this.baseUrl = new URL(options.baseUrl.toString());
    this.headers = { ...options.headers };
    this.providerName = options.providerName;
    this.timeoutMs = options.timeoutMs;
  }

  async request(
    endpoint: string,
    query: Record<string, QueryValue>,
    context: WordPressRequestContext,
    options?: { skipStatus?: boolean }
  ): Promise<WordPressClientResponse> {
    const url = this.buildUrl(endpoint, query, options?.skipStatus);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      const headers = new Headers(this.headers);
      headers.set("Accept", "application/json");

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw this.error(
          `WordPress request failed with HTTP ${response.status}.`,
          context,
          `HTTP ${response.status} from endpoint "${endpoint}".`
        );
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch (error: unknown) {
        if (timedOut) {
          throw error;
        }
        throw this.error(
          "WordPress returned invalid JSON.",
          context,
          `Invalid JSON from endpoint "${endpoint}".`
        );
      }

      return { data, headers: response.headers };
    } catch (error: unknown) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (timedOut) {
        throw this.error(
          "WordPress request timed out.",
          context,
          `Request to endpoint "${endpoint}" exceeded ${this.timeoutMs}ms.`
        );
      }

      throw this.error(
        "WordPress request failed.",
        context,
        `Network error while requesting endpoint "${endpoint}".`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(
    endpoint: string,
    query: Record<string, QueryValue>,
    skipStatus?: boolean
  ): URL {
    const baseUrl = new URL(this.baseUrl.toString());
    if (!baseUrl.pathname.endsWith("/")) {
      baseUrl.pathname += "/";
    }

    const encodedEndpoint = endpoint
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = new URL(encodedEndpoint, baseUrl);

    for (const [name, value] of Object.entries(query)) {
      url.searchParams.set(name, String(value));
    }
    if (!skipStatus) {
      url.searchParams.set("status", "publish");
    }

    return url;
  }

  private error(
    message: string,
    context: WordPressRequestContext,
    reason: string
  ): ProviderError {
    return new ProviderError(message, {
      provider: this.providerName,
      operation: context.operation,
      content: context.content,
      reason
    });
  }
}
