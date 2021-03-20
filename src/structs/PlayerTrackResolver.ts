import { SpotifyTrack } from "../types/SpotifyMedia";
import { Observer } from "../types/Observer";
import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { isDifferent } from "../util/diff";
import { resolveTracks } from "../util/spotify-api";
import { PlayerStateObserver } from "./PlayerStateObserver";
import { SpotifyAccessTokenRegnerator, SpotifySocket } from "./SpotifySocket";
import { CoordinatedSpotifySocket } from "./CoordinatedSpotifySocket";
import { Cache } from "../types/Cache";
import { tryCached } from "../util/caching";
import { ObserverWrapper } from "./internal/ObserverWrapper";

export interface PlayerTrackResolverCallback {
    (states: {
        state: SpotifyPlayerState;
        track: SpotifyTrack;
    }[]): any;
}

export type SpotifyTrackCache = Cache<SpotifyTrack>;

export interface PlayerTrackResolverOptions {
    cache?: SpotifyTrackCache;
    accessTokenRegenerator?: SpotifyAccessTokenRegnerator;
    dontInheritAccessTokenRegnerator?: boolean;
    accessToken: string;
}

/**
 * Fires a callback with a fully resolved track whenever the current track has changed
 */
export class PlayerTrackResolver extends ObserverWrapper<SpotifySocket> {
    /**
     * @param callback the callback to fire when a new track plays
     * @param options options for the resolver
     */
    constructor(callback: PlayerTrackResolverCallback, options: PlayerTrackResolverOptions) {
        super(new PlayerStateObserver(async states => {
            const updatedStates = states.filter(([diff]) => isDifferent(diff.track.uri)).map(([, state]) => state);

            const tracks = await this.tracks(updatedStates.map(state => state.track.uri.slice(14)));

            this.#callback(updatedStates.filter(state => tracks[state.track.uri.slice(14)]).map(state => ({
                state,
                track: tracks[state.track.uri.slice(14)]
            })));
        }));

        this.#callback = callback;
        this.#accessToken = options.accessToken;
        this.cache = options.cache;
        this.#accessTokenRegenerator = options.accessTokenRegenerator;
        this.dontInheritAccessTokenRegnerator = options.dontInheritAccessTokenRegnerator || false;
    }

    #accessToken: string;
    #callback: PlayerTrackResolverCallback;
    #accessTokenRegenerator?: SpotifyAccessTokenRegnerator;

    public dontInheritAccessTokenRegnerator: boolean;
    public cache: SpotifyTrackCache | undefined;

    public observe(socket: SpotifySocket): void {
        super.observe(socket);

        if (!this.dontInheritAccessTokenRegnerator && !this.#accessTokenRegenerator && socket instanceof CoordinatedSpotifySocket) {
            this.#accessTokenRegenerator = socket.accessTokenRegenerator;
        }
    }

    /**
     * Resolves tracks for the given IDs, deferring to the cache when possible
     * @param ids IDs to resolve
     * @returns 
     */
    public async tracks(ids: string[]): Promise<Record<string, SpotifyTrack>> {
        return tryCached(ids, ids => resolveTracks(ids, this.#accessToken, this.#accessTokenRegenerator), this.cache);
    }
}