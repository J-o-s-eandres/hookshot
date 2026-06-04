/**
 * Parsea un stream SSE (el body de un fetch) en eventos { event, data }.
 *
 * SSE separa eventos por una línea en blanco. Dentro de cada bloque:
 *  - `event:` define el nombre (default "message"),
 *  - una o más líneas `data:` que se concatenan con "\n",
 *  - líneas que empiezan por `:` son comentarios/keepalive y se ignoran.
 *
 * Maneja frames partidos entre chunks acumulando en un buffer.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      // Procesa todos los bloques completos disponibles en el buffer.
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseBlock(block);
        if (parsed) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line === "" || line.startsWith(":")) continue; // comentario/keepalive
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    // El estándar elimina UN espacio tras los dos puntos.
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }

  if (dataLines.length === 0) return null; // bloque sin data (p.ej. solo keepalive)
  return { event, data: dataLines.join("\n") };
}
