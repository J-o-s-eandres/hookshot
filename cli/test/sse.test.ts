import { describe, it, expect } from "vitest";
import { parseSseStream } from "../src/sse.js";

/** Crea un ReadableStream a partir de trozos de texto. */
function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i++]!));
      } else {
        controller.close();
      }
    },
  });
}

describe("parseSseStream", () => {
  it("emite eventos con su data y maneja frames partidos entre chunks", async () => {
    const stream = streamFrom([
      ": ping\n\n", // keepalive, se ignora
      "event: request\nda",
      'ta: {"id":"1"}\n\n',
      'event: request\ndata: {"id":"2"}\n\n',
    ]);

    const events: { event: string; data: string }[] = [];
    for await (const ev of parseSseStream(stream)) events.push(ev);

    expect(events).toEqual([
      { event: "request", data: '{"id":"1"}' },
      { event: "request", data: '{"id":"2"}' },
    ]);
  });

  it("junta múltiples líneas data en un solo evento", async () => {
    const stream = streamFrom(["event: x\ndata: a\ndata: b\n\n"]);
    const events: { event: string; data: string }[] = [];
    for await (const ev of parseSseStream(stream)) events.push(ev);
    expect(events).toEqual([{ event: "x", data: "a\nb" }]);
  });
});
