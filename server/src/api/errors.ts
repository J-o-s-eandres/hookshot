/**
 * Manejo centralizado de errores de la API.
 *
 * - `ApiError`: error con código HTTP explícito que los handlers pueden lanzar.
 * - `asyncHandler`: envuelve handlers async para que sus rechazos lleguen a
 *   `next()` sin try/catch repetido en cada ruta.
 * - `errorMiddleware`: traduce cualquier error a una respuesta JSON uniforme.
 */
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Envuelve un handler async y reenvía cualquier rechazo a Express. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Middleware final que serializa errores como `{ error, details? }`. */
export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos.",
      details: err.flatten(),
    });
    return;
  }

  // PayloadTooLargeError de express (body excede el límite).
  if ("type" in err && err.type === "entity.too.large") {
    res.status(413).json({ error: "El cuerpo de la petición excede el límite permitido." });
    return;
  }

  // Error inesperado: log en servidor, mensaje genérico al cliente.
  console.error("[error]", err);
  res.status(500).json({ error: "Error interno del servidor." });
};
