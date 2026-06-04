#!/usr/bin/env node
import { parseArgs } from "node:util";
import { listen } from "./listen.js";
import { create } from "./create.js";
import { log } from "./log.js";

const HELP = `
HookShot CLI — túnel local de webhooks en vivo

Uso:
  hookshot create  [--name <nombre>] --pin <pin>  [--server <url>]
  hookshot listen  --token <token> --pin <pin> --target <url>
                   [--server <url>] [--timeout <ms>] [--history <n>]

Comandos:
  create    Crea un webhook y muestra la URL de ingesta
  listen    Recibe webhooks en vivo y los reenvía a localhost

Opciones globales:
  --server   URL de HookShot (def http://localhost:3000; o env HOOKSHOT_SERVER)
  -h, --help Muestra esta ayuda

Opciones de "create":
  --name     Nombre descriptivo del webhook (opcional)
  --pin      PIN de 4-8 dígitos para proteger el historial (req; o env HOOKSHOT_PIN)

Opciones de "listen":
  --token    Token público del webhook (req)
  --pin      PIN del webhook (req; o env HOOKSHOT_PIN)
  --target   URL local a la que reenviar (req)
  --timeout  Timeout por petición en ms (def 30000)
  --history  Reenviar las últimas N peticiones del historial antes del stream
`;

function getServer(values: Record<string, string | boolean | undefined>): string {
  return (
    (values.server as string | undefined) ??
    process.env.HOOKSHOT_SERVER ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function subcommandCreate(values: Record<string, string | boolean | undefined>): void {
  const pin = (values.pin as string | undefined) ?? process.env.HOOKSHOT_PIN;
  const server = getServer(values);

  const missing: string[] = [];
  if (!pin) missing.push("--pin (o HOOKSHOT_PIN)");
  if (missing.length) {
    log.error(`Faltan argumentos: ${missing.join(", ")}`);
    console.log(HELP);
    process.exit(1);
  }

  void create({ server, name: values.name as string | undefined, pin: pin! }).then(
    () => process.exit(0),
    (err: unknown) => {
      log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    },
  );
}

function subcommandListen(values: Record<string, string | boolean | undefined>): void {
  const token = values.token as string | undefined;
  const pin = (values.pin as string | undefined) ?? process.env.HOOKSHOT_PIN;
  const target = values.target as string | undefined;
  const server = getServer(values);
  const timeoutMs = values.timeout ? Number(values.timeout) : 30000;
  const history = values.history ? Number(values.history) : undefined;

  const missing: string[] = [];
  if (!token) missing.push("--token");
  if (!pin) missing.push("--pin (o HOOKSHOT_PIN)");
  if (!target) missing.push("--target");
  if (history !== undefined && (isNaN(history) || history < 1 || history > 200))
    missing.push("--history debe ser un número entre 1 y 200");
  if (missing.length) {
    log.error(`Faltan argumentos: ${missing.join(", ")}`);
    console.log(HELP);
    process.exit(1);
  }

  const controller = new AbortController();
  process.on("SIGINT", () => {
    log.info("\nCerrando túnel\u2026");
    controller.abort();
  });

  void listen(
    { server, token: token!, pin: pin!, target: target!, timeoutMs, history },
    controller.signal,
  ).then(() => process.exit(0));
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      pin: { type: "string" },
      token: { type: "string" },
      target: { type: "string" },
      server: { type: "string" },
      timeout: { type: "string" },
      history: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const cmd = positionals[0];

  if (cmd === "create") {
    subcommandCreate(values);
  } else if (cmd === "listen") {
    subcommandListen(values);
  } else {
    console.log(HELP);
    process.exit(cmd ? 1 : 0);
  }
}

main();
