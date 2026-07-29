import jwt from "jsonwebtoken";
import env from "../config/env.js";

/** POST /api/auth/login— basic ID/password check, returns a JWT. */
export function login(req, res) {
  const { username, password } = req.body || {};
  if (username === env.authUser && password === env.authPass) {
    const token = jwt.sign({ sub: username }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
    return res.json({ token, user: { username } });
  }
  res.status(401).json({ error: "Invalid credentials" });
}
