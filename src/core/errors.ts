export interface NexusContentErrorDetails {
  provider?: string;
  operation?: string;
  content?: string;
  reason?: string;
  code?: string;
  locale?: string;
  supportedLocales?: string[];
  chain?: string[];
}

export class NexusContentError extends Error {
  readonly provider?: string;
  readonly operation?: string;
  readonly content?: string;
  readonly reason?: string;
  readonly code?: string;
  readonly locale?: string;
  readonly supportedLocales?: string[];
  readonly chain?: string[];

  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message);
    this.name = "NexusContentError";
    this.provider = details.provider;
    this.operation = details.operation;
    this.content = details.content;
    this.reason = details.reason;
    this.code = details.code;
    this.locale = details.locale;
    this.supportedLocales = details.supportedLocales;
    this.chain = details.chain;
  }

  format(): string {
    const lines = [this.name];
    if (this.provider !== undefined) lines.push(`Provider: ${this.provider}`);
    if (this.operation !== undefined) lines.push(`Operation: ${this.operation}`);
    if (this.content !== undefined) lines.push(`Content: ${this.content}`);
    if (this.code !== undefined) lines.push(`Code: ${this.code}`);
    if (this.locale !== undefined) lines.push(`Locale: ${this.locale}`);
    if (this.supportedLocales !== undefined) {
      lines.push(`Supported Locales: ${this.supportedLocales.join(", ")}`);
    }
    if (this.chain !== undefined && this.chain.length > 0) {
      lines.push(`Fallback Chain: ${this.chain.join(" -> ")}`);
    }
    if (this.reason !== undefined) lines.push(`Reason: ${this.reason}`);
    lines.push(`Message: ${this.message}`);
    return lines.join("\n");
  }
}

export class ConfigError extends NexusContentError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "ConfigError";
  }
}

export class RegistryError extends NexusContentError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "RegistryError";
  }
}

export class ProviderError extends NexusContentError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "ProviderError";
  }
}

export class ValidationError extends NexusContentError {
  readonly issues: { path: string; message: string }[];

  constructor(
    message: string,
    details: NexusContentErrorDetails = {},
    issues: { path: string; message: string }[] = []
  ) {
    super(message, details);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class NotFoundError extends NexusContentError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "NotFoundError";
  }
}

export class LocaleError extends NexusContentError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "LocaleError";
  }
}

export class UnsupportedLocaleError extends LocaleError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "UnsupportedLocaleError";
  }
}

export class MissingLocaleVariantError extends LocaleError {
  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message, details);
    this.name = "MissingLocaleVariantError";
  }
}
