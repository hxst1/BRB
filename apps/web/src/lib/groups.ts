/** Enlace para entrar en un grupo (ver la migración groups). */
export function groupInviteUrl(origin: string, code: string): string {
  return `${origin}/grupos/unirse/${code}`;
}

/** Si `value` tiene forma de id de grupo (uuid): así un id roto no llega a la base de datos. */
export function isGroupId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
