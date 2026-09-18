export type PublicDatabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

export type DatabaseFailure = Readonly<{
  code: string;
  message: string;
  retryable: boolean;
}>;

export function isPublicDatabaseConfig(
  value: Partial<PublicDatabaseConfig>,
): value is PublicDatabaseConfig {
  return Boolean(value.url?.startsWith("https://") && value.publishableKey?.trim());
}

// The Supabase client is intentionally absent until Racing v0.1 needs a real
// adapter. Service-role credentials never belong in this browser package.
