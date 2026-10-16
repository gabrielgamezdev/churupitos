import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PULL_THRESHOLD_PX, PullToRefresh } from "./pull-to-refresh";

// El dedo recorre el doble de lo que baja el indicador.
function pull(fingerPx: number) {
  fireEvent.touchStart(window, { touches: [{ clientY: 100 }] });
  fireEvent.touchMove(window, { touches: [{ clientY: 100 + fingerPx }] });
  fireEvent.touchEnd(window, { touches: [] });
}

describe("PullToRefresh", () => {
  it("recarga al estirar lo suficiente desde arriba", async () => {
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<PullToRefresh onRefresh={onRefresh}>contenido</PullToRefresh>);
    await act(async () => pull(PULL_THRESHOLD_PX * 2 + 10));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("un tirón corto no recarga", async () => {
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<PullToRefresh onRefresh={onRefresh}>contenido</PullToRefresh>);
    await act(async () => pull(PULL_THRESHOLD_PX));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("con la pantalla desplazada, estirar no recarga", async () => {
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<PullToRefresh onRefresh={onRefresh}>contenido</PullToRefresh>);
    window.scrollY = 300;
    await act(async () => pull(PULL_THRESHOLD_PX * 3));
    window.scrollY = 0;
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
