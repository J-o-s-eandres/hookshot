/** Petición capturada (espejo mínimo del tipo del server). */
export interface CapturedRequest {
  id: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body: string;
}
