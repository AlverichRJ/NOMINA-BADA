/**
 * Notificaciones — stub para servidor local.
 * En Manus, este módulo enviaba notificaciones al dueño via Forge API.
 * En servidor propio, simplemente registra en consola.
 * Para implementar notificaciones reales, se puede integrar con
 * nodemailer (email), Telegram Bot API, o cualquier otro servicio.
 */
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Envía una notificación al dueño del sistema.
 * Si Forge API está configurado (corriendo en Manus), usa ese servicio.
 * Si no, registra en consola (servidor local).
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // Si hay Forge configurado (corriendo en Manus), usar el servicio real
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const normalizedBase = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    const endpoint = new URL(
      "webdevtoken.v1.WebDevService/SendNotification",
      normalizedBase
    ).toString();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
            detail ? `: ${detail}` : ""
          }`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn("[Notification] Error calling notification service:", error);
      return false;
    }
  }

  // Sin Forge: registrar en consola (servidor local)
  console.log(`[Notification] ${title}: ${content}`);
  return true;
}
