import crypto from "crypto";

const algorithm = "aes-256-gcm";

function key() {
  const secret = process.env.DATA_ENCRYPTION_KEY;
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(value: string | null | undefined) {
  if (value == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decrypt(value: string | null | undefined) {
  if (value == null || value === "") return null;

  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(".");

    if (!ivRaw || !tagRaw || !encryptedRaw) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      algorithm,
      key(),
      Buffer.from(ivRaw, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function blindHash(value: string) {
  const secret = process.env.DATA_HASH_SECRET;
  if (!secret) throw new Error("DATA_HASH_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function cleanPhone(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value.replace(/\D/g, "");

  return cleaned || null;
}
