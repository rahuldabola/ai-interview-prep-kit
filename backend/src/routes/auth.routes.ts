import { Router } from "express";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { cookieOptions, issueToken, SESSION_COOKIE } from "../auth/jwt.js";
import { loginSchema, registerSchema } from "../validation/requestSchemas.js";
import { validateBody } from "../middleware/validateBody.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash });
    const token = issueToken({ userId: user._id.toString() });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.status(201).json({ user: { id: user._id, email: user.email } });
  })
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const token = issueToken({ userId: user._id.toString() });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.json({ user: { id: user._id, email: user.email } });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).send();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new HttpError(401, "SESSION_EXPIRED", "Your session has expired, please sign in again");
    }
    res.json({ user: { id: user._id, email: user.email } });
  })
);
