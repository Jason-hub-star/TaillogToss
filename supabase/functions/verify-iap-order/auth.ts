/**
 * verify-iap-order auth helpers.
 * Parity: IAP-001
 */

export function isTrustedServiceRoleToken(
  token: string,
  serviceRoleKey: string | undefined | null,
): boolean {
  return Boolean(serviceRoleKey) && token === serviceRoleKey;
}
