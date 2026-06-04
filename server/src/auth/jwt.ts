/**
 * Emisión y verificación de JWT scoped a un webhook concreto.
 *
 * Flujo: el cliente valida el PIN → recibimos un JWT firmado que prueba que
 * puede LEER ese webhook. El JWT lleva el id interno y el token público, y un
 * `scope` para poder ampliar permisos en el futuro sin romper el formato.
 */
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface WebhookTokenPayload {
  /** id interno del webhook (subject). */
  sub: string;
  /** token público del webhook (para validar contra la ruta). */
  token: string;
  /** alcance del permiso. De momento solo "read". */
  scope: "read";
}

/** Firma un JWT para acceder a un webhook. */
export function signWebhookToken(input: {
  webhookId: string;
  token: string;
}): string {
  const payload: Omit<WebhookTokenPayload, "sub"> & { sub: string } = {
    sub: input.webhookId,
    token: input.token,
    scope: "read",
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verifica un JWT y devuelve su payload tipado.
 * Lanza si la firma es inválida o el token expiró.
 */
export function verifyWebhookToken(token: string): WebhookTokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).token !== "string" ||
    typeof (decoded as Record<string, unknown>).sub !== "string"
  ) {
    throw new Error("Payload de JWT inválido");
  }
  return decoded as unknown as WebhookTokenPayload;
}
