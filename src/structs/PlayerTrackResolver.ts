import { SpotifyTrack } from "../types/SpotifyMedia";
import { Observer } from "../types/Observer";
import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { isDifferent } from "../util/diff";
import { resolveTracks } from "../util/spotify-api";
import { PlayerStateObserver } from "./PlayerStateObserver";
import { SpotifySocket } from "./SpotifySocket";

export interface PlayerTrackResolverCallback {
    (states: {
        state: SpotifyPlayerState;
        track: SpotifyTrack;
    }[]): any;
}

export interface SpotifyTrackCache {
    resolve(ids: string[]): Promise<Record<string, SpotifyTrack>>;
    store(tracks: Record<string, SpotifyTrack>): Promise<void>;
}

export interface PlayerTrackResolverOptions {
    cache?: SpotifyTrackCache;
    accessToken: string;
}

/**
 * Fires a callback with a fully resolved track whenever the current track has changed
 */
export class PlayerTrackResolver implements Observer<SpotifySocket> {
    /**
     * @param callback the callback to fire when a new track plays
     * @param options options for the resolver
     */
    constructor(callback: PlayerTrackResolverCallback, options: PlayerTrackResolverOptions) {
        this.#callback = callback;
        this.#accessToken = options.accessToken;
        this.#cache = options.cache;

        this.#observer = new PlayerStateObserver(async states => {
            const updatedStates = states.filter(([diff]) => isDifferent(diff.track.uri)).map(([, state]) => state);

            const tracks = await this.tracks(updatedStates.map(state => state.track.uri.slice(14)));

            this.#callback(updatedStates.filter(state => tracks[state.track.uri.slice(14)]).map(state => ({
                state,
                track: tracks[state.track.uri.slice(14)]
            })));
        });
    }

    #accessToken: string;
    #callback: PlayerTrackResolverCallback;
    #observer: PlayerStateObserver;
    #cache: SpotifyTrackCache | undefined;

    public observe(socket: SpotifySocket): void {
        this.#observer.observe(socket);
    }

    public unobserve(socket: SpotifySocket): void {
        this.#observer.unobserve(socket);
    }

    public disconnect(): void {
        this.#observer.disconnect();
    }

    /**
     * Resolves tracks for the given IDs, deferring to the cache when possible
     * @param ids IDs to resolve
     * @returns 
     */
    public async tracks(ids: string[]): Promise<Record<string, SpotifyTrack>> {
        const tracks = this.#cache ? await this.#cache.resolve(ids) : {};
        const missing = this.#cache ? ids.filter(id => !tracks[id]) : ids;

        const resolved = await resolveTracks(missing, this.#accessToken);
        if (this.#cache && Object.keys(resolved).length) await this.#cache.store(resolved);

        return Object.assign(resolved, tracks);
    }
}