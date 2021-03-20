import { Cache } from "../types/Cache";

export async function tryCached<T>(ids: string[], refresh: (ids: string[]) => Promise<Record<string, T>>, cache?: Cache<T>): Promise<Record<string, T>> {
    if (!ids.length) return {};

    const tracks = cache ? await cache.resolve(ids) : {};
    const missing = cache ? ids.filter(id => !tracks[id]) : ids;

    const resolved = missing.length ? await refresh(missing) : {};
    if (cache && Object.keys(resolved).length) await cache.store(resolved);

    return Object.assign(resolved, tracks);
}