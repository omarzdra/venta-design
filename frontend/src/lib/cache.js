const cache = new Map();
const inFlight = new Map();

export function cacheKey(path) {
  return path;
}

export function getCached(key, staleTime = 30000) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > staleTime) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

export function setCached(key, value) {
  cache.set(key, { value, createdAt: Date.now() });
}

export function getInFlight(key) {
  return inFlight.get(key);
}

export function setInFlight(key, promise) {
  inFlight.set(key, promise);
  promise.then(
    () => inFlight.delete(key),
    () => inFlight.delete(key)
  );
}

export function invalidateCache(prefixes = []) {
  for (const key of cache.keys()) {
    if (prefixes.some((prefix) => key.includes(prefix))) cache.delete(key);
  }
}
