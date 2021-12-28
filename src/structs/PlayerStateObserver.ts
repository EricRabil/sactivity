import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { debug } from "../util/debug";
import { diff, Diffed } from "../util/diff";
import { ClusterObserver } from "./ClusterObserver";
import { ObserverWrapper } from "./internal/ObserverWrapper";
import { SpotifySocket } from "./SpotifySocket";

export type DiffedPlayerState = Diffed<SpotifyPlayerState>;

export interface PlayerStateCallback {
    (states: [DiffedPlayerState, SpotifyPlayerState][]): any;
}

function isSpotifyPlayerState(object: unknown): object is SpotifyPlayerState {
    if (typeof object !== "object" || object === null) return false;
    for (const key of ["duration", "playback_id", "playback_quality", "timestamp", "track"]) {
        if (!(key in object)) return false;
    }
    return true;
}

/**
 * Observes player states, firing a callback with a diffed representation and the updated state
 */
export class PlayerStateObserver extends ObserverWrapper<SpotifySocket> {
    public constructor(callback: PlayerStateCallback) {
        super(new ClusterObserver(clusters => {
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

            if (!diffedStates.length) return;

            this.#callback(diffedStates);
        }));

        this.#callback = callback;
    }

    #callback: PlayerStateCallback;
    #states: Map<string, SpotifyPlayerState> = new Map();
}