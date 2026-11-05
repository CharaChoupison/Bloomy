// Jeton de session signé, stocké dans un cookie httpOnly.
// Format : "<expiration en ms>.<signature HMAC-SHA256 en base64url>"
// Utilise Web Crypto (crypto.subtle) : marche dans proxy.ts comme dans le reste du serveur.

export const SESSION_COOKIE = "pronoti_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

const encoder = new TextEncoder();

function getKey(): Promise<CryptoKey> {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SESSION_SECRET manquant ou trop court (32 caractères minimum) dans .env.local");
  }
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const toBase64Url = (bytes: ArrayBuffer) => Buffer.from(bytes).toString("base64url");

export async function signSession(expiresAt: number): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(`v1.${expiresAt}`));
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [exp, signature] = value.split(".");
  const expiresAt = Number(exp);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  try {
    // crypto.subtle.verify compare en temps constant (pas de fuite par mesure du temps de réponse).
    return await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      Buffer.from(signature, "base64url"),
      encoder.encode(`v1.${expiresAt}`),
    );
  } catch {
    return false;
  }
}
