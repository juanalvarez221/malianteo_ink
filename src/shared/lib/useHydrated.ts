"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false en el servidor y durante la hidratación; true después.
 * Permite leer localStorage con estado inicial perezoso sin desajustes de HTML.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
