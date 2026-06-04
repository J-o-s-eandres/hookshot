/**
 * Persistencia del JWT por webhook.
 *
 * Cada webhook tiene su propio JWT (emitido tras validar el PIN). Lo guardamos
 * en localStorage bajo una clave namespaced para que el usuario no tenga que
 * re-introducir el PIN al recargar mientras el token siga vigente.
 */
const JWT_PREFIX = "hookshot.jwt.";
const SESSION_KEY = "hookshot.session";

export function getStoredToken(webhookToken: string): string | null {
  try {
    return localStorage.getItem(JWT_PREFIX + webhookToken);
  } catch {
    return null;
  }
}

export function setStoredToken(webhookToken: string, jwt: string): void {
  try {
    localStorage.setItem(JWT_PREFIX + webhookToken, jwt);
  } catch {
    /* almacenamiento no disponible: seguimos solo en memoria */
  }
}

export function clearStoredToken(webhookToken: string): void {
  try {
    localStorage.removeItem(JWT_PREFIX + webhookToken);
  } catch {
    /* no-op */
  }
}

/** Genera o recupera el UUID de sesión para agrupar webhooks anónimos. */
export function getSessionId(): string {
  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      // Generar UUID v4 simple (crypto.randomUUID disponible en navegadores modernos)
      sessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Fallback si localStorage no está disponible
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
