import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  DB_CLIENT: z.enum(["better-sqlite3", "pg"]).default("better-sqlite3"),

  SQLITE_FILE: z.string().default("./data/hookshot.sqlite"),

  DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),

  JWT_EXPIRES: z.string().default("24h"),

  RETENTION_DAYS: z.coerce.number().int().positive().default(7),

  MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),

  MAX_WEBHOOKS_PER_SESSION: z.coerce.number().int().positive().default(10),

  WEB_DIST: z.string().optional(),

  DEMO_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),

  DEMO_TTL_MINUTES: z.coerce.number().int().positive().default(60),
});

type Env = z.infer<typeof EnvSchema>;
export type AppConfig = Env & {
  isProduction: boolean;
  isTest: boolean;
  demoMode: boolean;
  demoTtlMinutes: number;
  maxWebhooksPerSession: number;
};

function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }

  const env = parsed.data;
  const isProduction = env.NODE_ENV === "production";

  if (isProduction && env.JWT_SECRET === "dev-insecure-secret-change-me") {
    throw new Error(
      "JWT_SECRET no puede usar el valor por defecto en producción. Define uno seguro.",
    );
  }
  if (env.DB_CLIENT === "pg" && !env.DATABASE_URL) {
    throw new Error("DB_CLIENT=pg requiere definir DATABASE_URL.");
  }

  return {
    ...env,
    isProduction,
    isTest: env.NODE_ENV === "test",
    demoMode: env.DEMO_MODE,
    demoTtlMinutes: env.DEMO_TTL_MINUTES,
    maxWebhooksPerSession: env.MAX_WEBHOOKS_PER_SESSION,
  };
}

export const config = loadConfig();
