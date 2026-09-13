import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { errorResponse } from "../utils/response.util";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  try {
    if (!token) throw new Error("Missing token");
    const claims = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof claims === "string" || typeof claims.sub !== "string")
      throw new Error("Invalid token");
    res.locals.userId = claims.sub;
  } catch {
    return res
      .status(401)
      .json(
        errorResponse(
          "UNAUTHORIZED",
          "Tu sesión expiró. Inicia sesión nuevamente.",
        ),
      );
  }
  const userId = res.locals.userId as string;
  const forbidden = () =>
    res
      .status(403)
      .json(errorResponse("FORBIDDEN", "No tienes acceso a esta información."));
  try {
    if (req.body?.userId && req.body.userId !== userId) return forbidden();
    const path = req.path;
    const userPath =
      path.match(/^\/(?:users|financial-profiles)\/([^/]+)/) ??
      path.match(/^\/(?:life-events|savings-goals)\/user\/([^/]+)/);
    if (userPath && userPath[1] !== userId) return forbidden();
    const resources: [string, string | undefined][] = [
      [
        "agent_sessions",
        path.match(/^\/agent\/sessions\/([^/]+)/)?.[1] ??
          path.match(/^\/agent\/interactions\/session\/([^/]+)/)?.[1] ??
          req.body?.sessionId,
      ],
      [
        "life_events",
        path.match(/^\/life-events\/(?!user\/)([^/]+)/)?.[1] ??
          req.body?.lifeEventId,
      ],
      ["savings_goals", path.match(/^\/savings-goals\/(?!user\/)([^/]+)/)?.[1]],
    ];
    for (const [table, id] of resources) {
      if (!id) continue;
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
        return forbidden();
      const result = await pool.query(
        `SELECT user_id FROM ${table} WHERE id = $1`,
        [id],
      );
      if (!result.rows[0] || result.rows[0].user_id !== userId)
        return forbidden();
    }
    next();
  } catch {
    return res
      .status(503)
      .json(
        errorResponse(
          "SERVICE_UNAVAILABLE",
          "No pudimos verificar tu sesión. Intenta de nuevo.",
        ),
      );
  }
}
