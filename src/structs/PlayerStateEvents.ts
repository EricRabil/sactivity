import EventEmitter from "eventemitter3";
import { TypedEventEmitter } from "../types/internal/TypedEventEmitter";
import { Observer } from "../types/Observer";
import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { isDifferent } from "../util/diff";
import { PlayerStateObserver } from "./PlayerStateObserver";
import { SpotifySocket } from "./SpotifySocket";

type PlayerStateTrigger = "paused" | "resumed" | "track" | "position" | "duration" | "stopped" | "started";

type Events = {
    [K in PlayerStateTrigger]: (state: SpotifyPlayerState) => void;
}

/**
 * Emits events when various attributes of a state changes
 */
export class PlayerStateEvents extends (EventEmitter as TypedEventEmitter<Events>) implements Observer<SpotifySocket> {
    public constructor() {
        super();

        this.#observer = new PlayerStateObserver(states => {
            for (const [diff, state] of states) {
                if (isDifferent(diff.is_paused)) this.emit(state.is_paused ? "paused" : "resumed", state);
                if (isDifferent(diff.track.uri)) this.emit("track", state);
                if (isDifferent(diff.position_as_of_timestamp)) this.emit("position", state);
                if (isDifferent(diff.duration)) this.emit("duration", state);
                if (isDifferent(diff.is_playing)) this.emit(state.is_playing ? "started" : "stopped", state);
            }
        });
    }

    #observer: PlayerStateObserver;

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