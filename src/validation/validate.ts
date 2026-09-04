import { z } from "zod";
import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent
} from "../core/types.ts";
import { ValidationError } from "../core/errors.ts";
import {
  collectionItemSchema,
  navigationSchema,
  pageSchema,
  settingsSchema
} from "./schemas.ts";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationContext {
  provider?: string;
  content?: string;
  locale?: string;
}

export function formatIssues(error: { issues: z.ZodIssue[] }): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message
  }));
}

export function validatePageContent(
  value: PageContent,
  context: ValidationContext = {}
): void {
  const result = pageSchema.safeParse(value);
  if (!result.success) {
    throw buildValidationError(result.error, context, value.key);
  }
}

export function validateNavigationContent(
  value: NavigationContent,
  context: ValidationContext = {}
): void {
  const result = navigationSchema.safeParse(value);
  if (!result.success) {
    throw buildValidationError(result.error, context, value.key);
  }
}

export function validateSettingsContent(
  value: SettingsContent,
  context: ValidationContext = {}
): void {
  const result = settingsSchema.safeParse(value);
  if (!result.success) {
    throw buildValidationError(result.error, context, value.key);
  }
}

export function validateCollectionItem(
  value: CollectionItem,
  context: ValidationContext = {}
): void {
  const result = collectionItemSchema.safeParse(value);
  if (!result.success) {
    throw buildValidationError(result.error, context, value.key);
  }
}

export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  context: ValidationContext = {}
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw buildValidationError(result.error, context, context.content);
  }
  return result.data;
}

function buildValidationError(
  error: z.ZodError,
  context: ValidationContext,
  fallbackContent?: string
): ValidationError {
  const issues = formatIssues(error);
  const content = context.content ?? fallbackContent;

  return new ValidationError(
    `Content ${content !== undefined ? `"${content}" ` : ""}failed validation.`,
    {
      provider: context.provider,
      operation: "validate",
      content,
      locale: context.locale,
      reason: issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")
    },
    issues
  );
}
