import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  set: (patch: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: Listener) => () => void;
}

/** Minimal external store (Zustand-like) built on useSyncExternalStore. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (patch) => {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Subscribe to a slice of a store. The selector must return a stable value (primitive or existing reference). */
export function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S): S {
  const snapshot = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
