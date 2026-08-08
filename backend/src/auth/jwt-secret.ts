// Refuse to start rather than fall back to a well-known default: a deployment
// that forgot JWT_SECRET would otherwise accept tokens forged by anyone who has
// read this repository.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}
