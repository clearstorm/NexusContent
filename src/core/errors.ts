export interface NexusContentErrorDetails {
  provider?: string;
  operation?: string;
  content?: string;
  reason?: string;
}

export class NexusContentError extends Error {
  readonly provider?: string;
  readonly operation?: string;
  readonly content?: string;
  readonly reason?: string;

  constructor(message: string, details: NexusContentErrorDetails = {}) {
    super(message);
    this.name = "NexusContentError";
    this.provider = details.provider;
    this.operation = details.operation;
    this.content = details.content;
    this.reason = details.reason;
  }

  format(): string {
    const lines = [this.name];
    if (this.provider !== undefined) lines.push(`Provider: ${this.provider}`);
    if (this.operation !== undefined) lines.push(`Operation: ${this.operation}`);
    if (this.content !== undefined) lines.push(`Content: ${this.content}`);
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
