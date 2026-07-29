import jwt from "jsonwebtoken";
import env from "../config/env.js";

/** Verifies the Bearer token issued by /api/auth/login. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
