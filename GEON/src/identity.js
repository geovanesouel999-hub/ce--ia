import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "geon_uid";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signature(userId, secret) {
  return createHmac("sha256", secret).update(userId).digest("base64url");
}

export function createIdentityToken(userId, secret) {
  if (!UUID_PATTERN.test(userId)) throw new TypeError("Identificador inválido.");
  return `${userId}.${signature(userId, secret)}`;
}

export function verifyIdentityToken(token, secret) {
  if (typeof token !== "string") return null;
  const [userId, suppliedSignature, extra] = token.split(".");
  if (extra !== undefined || !UUID_PATTERN.test(userId || "") || !suppliedSignature) return null;
  const expected = Buffer.from(signature(userId, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return userId;
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export function identityMiddleware(secret, production = false) {
  return (req, res, next) => {
    const token = readCookie(req.headers.cookie, COOKIE_NAME);
    let userId = verifyIdentityToken(token, secret);
    if (!userId) {
      userId = randomUUID();
      const value = createIdentityToken(userId, secret);
      const flags = [
        `${COOKIE_NAME}=${encodeURIComponent(value)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=31536000"
      ];
      if (production) flags.push("Secure");
      res.append("Set-Cookie", flags.join("; "));
    }
    req.geonUserId = userId;
    next();
  };
}

export function sameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();
  const expected = `${req.protocol}://${req.get("host")}`;
  if (origin !== expected) {
    return res.status(403).json({ error: "Origem da solicitação não permitida." });
  }
  return next();
}

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
