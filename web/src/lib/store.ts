/**
 * Persistencia del JWT por webhook.
 *
 * Cada webhook tiene su propio JWT (emitido tras validar el PIN). Lo guardamos
 * en localStorage bajo una clave namespaced para que el usuario no tenga que
 * re-introducir el PIN al recargar mientras el token siga vigente.
 */
const PREFIX = "hookshot.jwt.";

export function getStoredToken(webhookToken: string): string | null {
  try {
    return localStorage.getItem(PREFIX + webhookToken);
  } catch {
    return null;
  }
}

export function setStoredToken(webhookToken: string, jwt: string): void {
  try {
    localStorage.setItem(PREFIX + webhookToken, jwt);
  } catch {
    /* almacenamiento no disponible: seguimos solo en memoria */
  }
}

export function clearStoredToken(webhookToken: string): void {
  try {
    localStorage.removeItem(PREFIX + webhookToken);
  } catch {
    /* no-op */
  }
}
