/**
 * Rutas de Google OAuth 2.0 — reemplaza el flujo de Manus OAuth.
 * Usa passport-google-oauth20 para el callback de Google.
 * Crea una sesión JWT firmada con jose y la guarda en cookie.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getCallbackURL(): string {
  if (ENV.appBaseUrl) {
    return `${ENV.appBaseUrl}/api/oauth/google/callback`;
  }
  return "/api/oauth/google/callback";
}

export function registerOAuthRoutes(app: Express) {
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    console.warn(
      "[OAuth] Google OAuth no configurado. Establece GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET."
    );
    app.get("/api/oauth/google", (_req, res) => {
      res.status(503).json({
        error: "Google OAuth no configurado en el servidor",
        message: "Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env",
      });
    });
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.googleClientId,
        clientSecret: ENV.googleClientSecret,
        callbackURL: getCallbackURL(),
        passReqToCallback: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value ?? null;
          const name = profile.displayName || email || googleId;

          await db.upsertUser({
            openId: googleId,
            name,
            email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });

          const user = await db.getUserByOpenId(googleId);
          if (!user) {
            return done(new Error("No se pudo crear el usuario"), undefined);
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  app.use(passport.initialize());

  // Ruta 1: Iniciar flujo de Google OAuth
  app.get(
    "/api/oauth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

  // Ruta 2: Callback de Google OAuth
  app.get(
    "/api/oauth/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/?error=auth_failed",
    }),
    async (req, res) => {
      try {
        const user = req.user as { openId: string; name: string | null } | undefined;

        if (!user || !user.openId) {
          res.status(400).json({ error: "No se recibio informacion del usuario" });
          return;
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const returnTo = (req.query.state as string) || "/";
        res.redirect(302, returnTo.startsWith("/") ? returnTo : "/");
      } catch (error) {
        console.error("[OAuth] Error en callback de Google:", error);
        res.redirect("/?error=auth_failed");
      }
    }
  );

  console.log("[OAuth] Google OAuth configurado correctamente");
}
