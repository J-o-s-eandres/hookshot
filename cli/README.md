# @hookshot_cli/cli

> HookShot CLI — local webhook tunnel for live debugging. An ngrok alternative for webhook inspection.

## Installation

```bash
npx @hookshot_cli/cli --help
```

## Quick start

```bash
# 1. Create a webhook
npx @hookshot_cli/cli create --pin 1234

# 2. Start the tunnel (forwards requests to your local port)
npx @hookshot_cli/cli listen \
  --token <webhook-token> \
  --pin 1234 \
  --target http://localhost:8080
```

Each incoming request is forwarded to `http://localhost:8080` preserving method, path, query, headers and body:

```
16:45:14  POST  /order  → 200  18ms
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOOKSHOT_SERVER` | `http://localhost:3000` | HookShot server URL |
| `HOOKSHOT_PIN` | — | Webhook PIN (alternative to `--pin`) |

## Commands

### `create`

Creates a webhook and prints its token and URL.

```bash
npx @hookshot_cli/cli create --pin 1234
```

### `listen`

Listens to a webhook's SSE stream and forwards each request to a local target.

```bash
npx @hookshot_cli/cli listen \
  --token <token> \
  --pin 1234 \
  --target http://localhost:8080
```

## License

MIT

---

# @hookshot_cli/cli

> HookShot CLI — túnel local de webhooks en vivo. Alternativa a ngrok para depurar webhooks.

## Instalación

```bash
npx @hookshot_cli/cli --help
```

## Uso rápido

```bash
# 1. Crear un webhook
npx @hookshot_cli/cli create --pin 1234

# 2. Arrancar el túnel
npx @hookshot_cli/cli listen \
  --token <token-del-webhook> \
  --pin 1234 \
  --target http://localhost:8080
```

Cada petición entrante se reenvía a `http://localhost:8080` conservando method, ruta, query, headers y body:

```
16:45:14  POST  /pedido  → 200  18ms
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HOOKSHOT_SERVER` | `http://localhost:3000` | URL del servidor HookShot |
| `HOOKSHOT_PIN` | — | PIN del webhook (alternativa a `--pin`) |

## Comandos

### `create`

Crea un webhook y muestra su token y URL.

```bash
npx @hookshot_cli/cli create --pin 1234
```

### `listen`

Escucha el stream SSE de un webhook y reenvía cada petición a un destino local.

```bash
npx @hookshot_cli/cli listen \
  --token <token> \
  --pin 1234 \
  --target http://localhost:8080
```

## Licencia

MIT
