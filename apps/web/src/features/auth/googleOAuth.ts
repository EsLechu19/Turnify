export function buildGoogleOAuthRedirectUrl(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) return null;
    return new URL('/auth/callback', parsed.origin).toString();
  } catch {
    return null;
  }
}
