/**
 * Manejo del PIN de cada webhook.
 *
 * El PIN nunca se guarda en claro: solo su hash bcrypt. La verificación es
 * en tiempo constante (lo garantiza bcrypt) para evitar timing attacks.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Formato válido de PIN: 4 a 8 dígitos. */
export const PIN_REGEX = /^\d{4,8}$/;

export function isValidPinFormat(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

/** Genera el hash bcrypt de un PIN. */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/** Verifica un PIN contra su hash. */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
