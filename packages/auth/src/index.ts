export type SessionIdentity = Readonly<{
  userId: string;
  displayName: string;
}>;

export type AuthorizationContext<Capability extends string> = Readonly<{
  identity: SessionIdentity | null;
  capabilities: ReadonlySet<Capability>;
}>;

export function hasCapability<Capability extends string>(
  context: AuthorizationContext<Capability>,
  capability: Capability,
): boolean {
  return context.capabilities.has(capability);
}

// This package deliberately does not define sport roles or trust frontend
// checks. Each app maps its server-authorized memberships to capabilities.
