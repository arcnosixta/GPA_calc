type Parse<T> = (raw: string) => T | null;
type StoreOptions<T> = { legacy?: { key: string; parse?: Parse<T> }; serialize?: (value: T) => string };

export function createBrowserStore<T>(key: string, initial: T, parse: Parse<T>, options: StoreOptions<T> = {}) {
  const { legacy, serialize = JSON.stringify } = options;
  const listeners = new Set<() => void>();
  let value = initial;
  let lastRaw: string | null | undefined;
  let memoryOnly = false;
  let checkedLegacy = false;
  let pendingMigration = false;

  function getSnapshot() {
    if (typeof window === "undefined" || memoryOnly) return value;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== lastRaw) {
        lastRaw = raw;
        let saved = raw === null ? null : parse(raw);
        pendingMigration = false;
        if (legacy && raw === null && !checkedLegacy) {
          try {
            const previous = window.sessionStorage.getItem(legacy.key);
            saved = previous === null ? null : (legacy.parse ?? parse)(previous);
            pendingMigration = saved !== null;
          } catch {
            // Access to the old storage may be blocked independently.
          }
        }
        checkedLegacy = true;
        value = saved ?? initial;
      }
    } catch {
      memoryOnly = true;
    }
    return value;
  }

  function subscribe(listener: () => void) {
    getSnapshot();
    if (pendingMigration) write(value);
    listeners.add(listener);
    function onStorage(event: StorageEvent) {
      if (!memoryOnly && event.storageArea === window.localStorage && (event.key === key || event.key === null)) listener();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(next: T) {
    value = next;
    if (!memoryOnly) {
      try {
        lastRaw = serialize(next);
        window.localStorage.setItem(key, lastRaw);
      } catch {
        memoryOnly = true;
      }
    }
    if (pendingMigration && !memoryOnly && legacy) {
      try { window.sessionStorage.removeItem(legacy.key); } catch { /* Storage can be unavailable. */ }
    }
    pendingMigration = false;
  }

  function update(updater: (current: T) => T) {
    const current = getSnapshot();
    const next = updater(current);
    if (Object.is(current, next) && !pendingMigration) return;
    write(next);
    if (!Object.is(current, next)) listeners.forEach((listener) => listener());
  }

  return { getSnapshot, getServerSnapshot: () => initial, subscribe, update };
}
