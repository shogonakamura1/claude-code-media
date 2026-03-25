// Google Search Console API クライアント（Edge Runtime互換）
// サービスアカウント認証（JWT → Access Token → API呼び出し）

export interface SearchConsoleRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface JwtHeader {
  alg: string;
  typ: string;
}

interface JwtClaims {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * PEM形式の秘密鍵をCryptoKeyに変換（Web Crypto API使用）
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Base64url エンコード
 */
function base64url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * サービスアカウントJWTを生成してAccess Tokenを取得
 */
async function getAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header: JwtHeader = { alg: "RS256", typ: "JWT" };
  const claims: JwtClaims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const unsignedJwt = `${headerB64}.${claimsB64}`;

  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  const jwt = `${unsignedJwt}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth error ${res.status}: ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.access_token;
}

/**
 * Search Console APIからデータを取得
 * @param siteUrl - サイトURL（例: "sc-domain:claudenote.jp" or "https://claudenote.jp/"）
 * @param startDate - 開始日 YYYY-MM-DD
 * @param endDate - 終了日 YYYY-MM-DD
 */
export async function fetchSearchConsoleData(
  clientEmail: string,
  privateKey: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleRow[]> {
  const accessToken = await getAccessToken(clientEmail, privateKey);

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: 1000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Search Console API error ${res.status}: ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  if (!data.rows) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.rows.map((row: any) => ({
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}
