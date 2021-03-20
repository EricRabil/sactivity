import { SpotifyCluster, SpotifyPlayerState } from "../types/SpotifyCluster";
import { SpotifySocket, SpotifyMessageHandler } from "./SpotifySocket";

export interface SpotifyClusterUpdatePayload {
    ack_id: string;
    cluster: SpotifyCluster;
    devices_that_changed: string[];
    update_reason: string;
}

/**
 * Ensures a value has the same top-level shape as a SpotifyClusterUpdatePayload
 * @param object the value to inspect
 * @returns whether the object appears to be a SpotifyClusterUpdatePayload
 */
function isClusterUpdatePayload(object: unknown): object is SpotifyClusterUpdatePayload {
    if (typeof object !== "object" || object === null) return false;
    for (const key of ["cluster", "devices_that_changed", "update_reason"]) {
        if (!(key in object)) return false;
    }

    return true;
}

export interface ClusterCallback {
    (clusters: SpotifyCluster[]): any;
}

/**
 * Observes the cluster state on one or more SpotifySockets
 */
export class ClusterObserver {
    public constructor(callback: ClusterCallback) {
        this.#callback = callback;
    }

    /**
     * The callback function for this observer
     */
    #callback: ClusterCallback;

    /**
     * A set of observed sockets, used when disconnecting
     */
    #observed: Set<SpotifySocket> = new Set();

    /**
     * Memoized handler for connect-state messages, so that it can be unregistered
     * @param message the connect-state message
     */
    #connectStateHandler: SpotifyMessageHandler = ({ path, payloads }) => {
        switch (path) {
            case "/v1/cluster":
                const clusters = payloads.filter(isClusterUpdatePayload).map(update => update.cluster);
                if (!clusters.length) break;
                this.#callback(clusters);
        }
    };

    /**
     * Observes a SpotifySocket's connect-state API for cluster updates
     * @param target target to observe
     */
    public observe(target: SpotifySocket): void {
        target.registerHandler("connect-state", this.#connectStateHandler);
        this.#observed.add(target);
    }

    /**
     * Unobserve's a SpotifySocket's connect-state API
     * @param target target to unobserve
     */
    public unobserve(target: SpotifySocket): void {
        target.unregisterHandler("connect-state", this.#connectStateHandler);
        this.#observed.delete(target);
    }

    /**
     * Unobserve's from all SpotifySockets
     */
    public disconnect(): void {
        this.#observed.forEach(target => this.unobserve(target));
    }
}