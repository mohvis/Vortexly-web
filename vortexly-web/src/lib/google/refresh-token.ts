/**
 * Refreshes an expired Google OAuth access token using the stored refresh token.
 * Returns the new access token and updated expiry, or throws on failure.
 */
export interface RefreshResult {
  accessToken: string;
  expiresAt:   string;   // ISO timestamp
}

export async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult> {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt:   new Date(Date.now() + (json.expires_in - 60) * 1000).toISOString(),
  };
}
