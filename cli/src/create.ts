import { createWebhook, CliError } from "./client.js";
import { log } from "./log.js";

export interface CreateOptions {
  server: string;
  name?: string;
  pin: string;
}

export async function create(opts: CreateOptions): Promise<void> {
  const result = await createWebhook(opts.server, {
    name: opts.name,
    pin: opts.pin,
  });

  console.log("");
  log.success("Webhook creado!");
  console.log(`  URL:      ${log.highlight(result.ingestUrl)}`);
  console.log(`  Token:    ${result.token}`);
  console.log(`  PIN:      ${opts.pin}`);
  if (result.name) console.log(`  Nombre:   ${result.name}`);
  console.log("");
  console.log(`  ${log.bold("Siguiente paso:")} recibir peticiones en local:`);
  console.log(`  hookshot listen --token ${result.token} --pin ${opts.pin} --target http://localhost:8080`);
  console.log(`  ${log.bold("O prueba con curl:")}`);
  console.log(`  curl ${result.ingestUrl}/ejemplo -d '{"hola":"mundo"}'`);
  console.log("");
}