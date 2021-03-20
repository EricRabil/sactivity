import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { PlayerStateObserver } from "./PlayerStateObserver";
import { SpotifySocket } from "./SpotifySocket";
import { ObserverWrapper } from "./internal/ObserverWrapper";
import { isDifferent } from "../util/diff";
import { Cache } from "../types/Cache";
import { analyzeTracks, createAnalysisToken } from "../util/spotify-audio-analysis";
import { SpotifyAnalysisResult } from "../types/SpotifyAnalysis";
import { tryCached } from "../util/caching";
import { debug } from "../util/debug";

export interface AudioAnalysisCallback {
    (states: [SpotifyAnalysisResult, SpotifyPlayerState][]): any;
}

export type SpotifyAudioAnalysisCache = Cache<SpotifyAnalysisResult>;

export interface AudioAnalysisObserverOptions {
    cache?: SpotifyAudioAnalysisCache;
    cookie: string;
}

/**
 * Observes the current track, and fires a callback whenever the track changes.
 * 
 * The callback includes the Spotify audio analysis result, and the updated state.
 */
export class AudioAnalysisObserver extends ObserverWrapper<SpotifySocket> {
    public constructor(callback: AudioAnalysisCallback, options: AudioAnalysisObserverOptions) {
        super(new PlayerStateObserver(async states => {
            const changedStates = states.filter(state => isDifferent(state[0].track.uri) || isDifferent(state[0].position_as_of_timestamp) || isDifferent(state[0].is_playing) || isDifferent(state[0].is_paused)).map(state => state[1]);

            if (!changedStates.length) return;

            const analyzed = await this.analyzeTracks(changedStates.map(state => state.track.uri.slice(14)));

            const updates: [SpotifyAnalysisResult, SpotifyPlayerState][] = [];

            for (const state of changedStates) {
                updates.push([analyzed[state.track.uri.slice(14)], state]);
            }

            this.#callback(updates);

            await this.analyzeTracks(changedStates.flatMap(state => state.next_tracks.filter(track => !track.uri.includes("delimiter")).map(track => track.uri.slice(14))).slice(0, 5));
        }));

        this.#callback = callback;
        this.#cookie = options.cookie;
        this.cache = options.cache;
    }

    #callback: AudioAnalysisCallback;
    #cookie: string;
    #token: string | null;

    public cache: SpotifyAudioAnalysisCache | undefined;

    /**
     * Regnerates the token used to analyze tracks
     * @returns promise of the analysis token
     */
    public async regenerateAnalysisToken(): Promise<string> {
        debug("regenerating analysis token");

        const token = await createAnalysisToken(this.#cookie);
        if (!token) throw new Error("Failed to regenerate analysis token.");

        return this.#token = token;
    }

    /**
     * Analyzes an array of track IDs
     * @param ids IDs to analyze
     * @returns promise of record mapping from track ID to analysis result
     */
    public async analyzeTracks(ids: string[]): Promise<Record<string, SpotifyAnalysisResult>> {
        return tryCached(ids, async ids => analyzeTracks(ids, await this.ensureAnalysisToken(), () => this.regenerateAnalysisToken()), this.cache);
    }

    /**
     * Resolves the analysis token if it does not exist
     * @returns new analysis token
     */
    public async ensureAnalysisToken(): Promise<string> {
        if (this.#token) return this.#token;
        else return this.regenerateAnalysisToken();
    }
}