import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/**
 * Vérifie le mot de passe d'accès à l'app contre APP_PASSWORD_HASH ("scrypt:<sel hex>:<hash hex>"),
 * généré par `npm run hash-password`. Le mot de passe en clair n'est stocké nulle part.
 */
export async function verifyAppPassword(password: string): Promise<boolean> {
  const stored = process.env.APP_PASSWORD_HASH;
  if (!stored) throw new Error("APP_PASSWORD_HASH manquant dans .env.local (lance `npm run hash-password`)");

  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) throw new Error("APP_PASSWORD_HASH mal formé");

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
