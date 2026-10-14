import { describe, expect, it, vi } from "vitest";

import { createRequestBrake, RequestBrakeError } from "./request-brake";

function setup() {
  let clock = 0;
  const baseFetch = vi.fn(async () => new Response("ok"));
  const brake = createRequestBrake({ maxRequests: 3, windowMs: 1_000, now: () => clock });
  const fetch = brake.wrap(baseFetch);
  return {
    brake,
    baseFetch,
    fetch: () => fetch("https://api.ejemplo.test/rest/v1/tabla"),
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("createRequestBrake", () => {
  it("deja pasar el uso normal", async () => {
    const { fetch, baseFetch, brake } = setup();

    for (let i = 0; i < 3; i++) await expect(fetch()).resolves.toBeInstanceOf(Response);

    expect(baseFetch).toHaveBeenCalledTimes(3);
    expect(brake.isTripped()).toBe(false);
  });

  it("frena al pasar del límite dentro de la ventana, sin llegar a la red", async () => {
    const { fetch, baseFetch, brake } = setup();
    const listener = vi.fn();
    brake.subscribe(listener);

    for (let i = 0; i < 3; i++) await fetch();
    await expect(fetch()).rejects.toBeInstanceOf(RequestBrakeError);

    expect(baseFetch).toHaveBeenCalledTimes(3);
    expect(brake.isTripped()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("no se activa con consultas espaciadas", async () => {
    const { fetch, baseFetch, advance } = setup();

    for (let i = 0; i < 3; i++) await fetch();
    advance(1_000);
    for (let i = 0; i < 3; i++) await fetch();

    expect(baseFetch).toHaveBeenCalledTimes(6);
  });

  it("una vez frenado, sigue frenado aunque pase el tiempo", async () => {
    const { fetch, baseFetch, advance } = setup();

    for (let i = 0; i < 4; i++) await fetch().catch(() => {});
    advance(10 * 60_000);

    await expect(fetch()).rejects.toBeInstanceOf(RequestBrakeError);
    expect(baseFetch).toHaveBeenCalledTimes(3);
  });
});
