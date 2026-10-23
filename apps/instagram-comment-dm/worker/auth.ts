const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const SESSION_BYTES = 32;
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export interface AuthUser {
  id: string;
  email: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function derivePassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    baseKey,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const derived = await derivePassword(password, salt);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  try {
    const salt = base64ToBytes(parts[2]);
    const expected = base64ToBytes(parts[3]);
    const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      baseKey,
      expected.length * 8,
    );
    return constantTimeEqual(new Uint8Array(bits), expected);
  } catch {
    return false;
  }
}

function sessionCookie(token: string, maxAge: number): string {
  return `__Host-session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie(): string {
  return sessionCookie("", 0);
}

async function randomToken(): Promise<string> {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SESSION_BYTES)));
}

export async function isLoginRateLimited(db: D1Database, email: string): Promise<boolean> {
  const identifierHash = await sha256(`login:${normalizeEmail(email)}`);
  const since = new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString();
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM auth_attempts WHERE identifier_hash = ?1 AND attempted_at >= ?2 AND success = 0")
    .bind(identifierHash, since)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) >= MAX_LOGIN_ATTEMPTS;
}

export async function recordLoginAttempt(db: D1Database, email: string, success: boolean): Promise<void> {
  const identifierHash = await sha256(`login:${normalizeEmail(email)}`);
  await db.prepare("INSERT INTO auth_attempts (id, identifier_hash, success) VALUES (?1, ?2, ?3)")
    .bind(crypto.randomUUID(), identifierHash, success ? 1 : 0)
    .run();
}

export async function createSession(db: D1Database, user: AuthUser): Promise<Response> {
  const token = await randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
    .run();
  return new Response(null, { status: 204, headers: { "set-cookie": sessionCookie(token, SESSION_TTL_SECONDS) } });
}

export async function getSessionUser(db: D1Database, request: Request): Promise<AuthUser | null> {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)__Host-session=([^;]+)/);
  if (!match) return null;
  const tokenHash = await sha256(match[1]);
  const now = new Date().toISOString();
  const row = await db.prepare(
    "SELECT u.id, u.email FROM sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.is_active = 1 LIMIT 1",
  ).bind(tokenHash, now).first<AuthUser>();
  if (!row) return null;
  await db.prepare("UPDATE sessions SET last_seen_at = ?1 WHERE token_hash = ?2").bind(now, tokenHash).run();
  return row;
}

export async function revokeSession(db: D1Database, request: Request): Promise<Headers> {
  const headers = new Headers({ "set-cookie": clearSessionCookie() });
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)__Host-session=([^;]+)/);
  if (match) {
    const tokenHash = await sha256(match[1]);
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
  }
  return headers;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
