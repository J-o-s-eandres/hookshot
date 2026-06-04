/**
 * Contenedor de dependencias de la aplicación.
 *
 * Centraliza la construcción de repos y del hub SSE a partir de una instancia
 * de Knex. Inyectamos esto en `createApp`, lo que hace la app testeable:
 * en los tests pasamos una DB en memoria sin tocar el resto del código.
 */
import type { Knex } from "knex";
import { WebhooksRepo } from "./db/webhooks.repo.js";
import { RequestsRepo } from "./db/requests.repo.js";
import { SseHub } from "./sse/hub.js";

export interface AppDeps {
  knex: Knex;
  webhooks: WebhooksRepo;
  requests: RequestsRepo;
  hub: SseHub;
}

export function buildDeps(knex: Knex): AppDeps {
  return {
    knex,
    webhooks: new WebhooksRepo(knex),
    requests: new RequestsRepo(knex),
    hub: new SseHub(),
  };
}
