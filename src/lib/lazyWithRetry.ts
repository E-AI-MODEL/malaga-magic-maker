import { ComponentType, lazy } from "react";

const RELOAD_KEY = "vakansie:chunk-reload";

/**
 * Lazy import that survives stale deploys: when a chunk 404s because a new
 * build replaced it, reload the page once to fetch the fresh manifest.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
