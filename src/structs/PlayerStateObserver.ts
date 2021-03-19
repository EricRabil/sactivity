import { Observer } from "../types/Observer";
import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { diff, Diffed } from "../util/diff";
import { ClusterObserver } from "./ClusterObserver";
import { SpotifySocket } from "./SpotifySocket";

export type DiffedPlayerState = Diffed<SpotifyPlayerState>;

export interface PlayerStateCallback {
    (states: [DiffedPlayerState, SpotifyPlayerState][]): any;
}

function isSpotifyPlayerState(object: unknown): object is SpotifyPlayerState {
    if (typeof object !== "object" || object === null) return false;
    for (const key of ["context_metadata", "duration", "index", "playback_id", "playback_quality", "timestamp", "track"]) {
        if (!(key in object)) return false;
    }
    return true;
}

/**
 * Observes player states, firing a callback with a diffed representation and the updated state
 */
export class PlayerStateObserver implements Observer<SpotifySocket> {
    public constructor(callback: PlayerStateCallback) {
        this.#callback = callback;
        this.#observer = new ClusterObserver(clusters => {
            const diffedStates: [DiffedPlayerState, SpotifyPlayerState][] = [];

            for (const cluster of clusters) {
                if (!isSpotifyPlayerState(cluster.player_state)) {
                    // Sometimes only a partial player state is included, e.g. no more tracks are left to play.
                    continue;
                }

                const sessionID = cluster.player_state.session_id;
                const oldState = this.#states.get(sessionID) || null;
                this.#states.set(sessionID, cluster.player_state);

                diffedStates.push([
                    diff(oldState, cluster.player_state),
                    cluster.player_state
                ]);
            }

            this.#callback(diffedStates);
        });
    }

    #callback: PlayerStateCallback;
    #states: Map<string, SpotifyPlayerState> = new Map();
    #observer: ClusterObserver;

    public observe(target: SpotifySocket) {
        this.#observer.observe(target);
    }

    public unobserve(target: SpotifySocket) {
        this.#observer.unobserve(target);
    }

    public disconnect() {
        this.#observer.disconnect();
    }
}