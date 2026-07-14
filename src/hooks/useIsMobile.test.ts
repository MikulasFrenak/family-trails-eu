import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    setViewportWidth(originalWidth);
  });

  it("returns true for phone-width viewports", () => {
    setViewportWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false for tablet and desktop widths", () => {
    setViewportWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns false right at the tablet boundary (640px), matching Tailwind's sm breakpoint", () => {
    setViewportWidth(640);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true one pixel below the boundary (639px)", () => {
    setViewportWidth(639);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("subscribes to media query changes and cleans up its listener on unmount", () => {
    setViewportWidth(1024);
    const addSpy = vi.spyOn(EventTarget.prototype, "addEventListener");
    const removeSpy = vi.spyOn(EventTarget.prototype, "removeEventListener");

    const { unmount } = renderHook(() => useIsMobile());
    expect(addSpy).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
