/**
 * Cache mémoire court partagé entre les visiteurs d'une même instance serveur.
 * Les appels simultanés pour la même clé sont regroupés en une seule requête,
 * et une erreur n'est jamais mise en cache.
 */
const store = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Pour les tests. */
export function clearMemo() {
  store.clear();
  inflight.clear();
}
