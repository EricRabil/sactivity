import WebSocket from "isomorphic-ws";
import { debug } from "../util/debug";
import { automatedCreateSpotifyClient } from "../util/spotify-ws-api";

export type SpotifyPayloadType = "ping" | "pong" | "message";

interface SpotifyPayload<Type extends SpotifyPayloadType> {
    type: Type;
}

export type SpotifyPingPayload = SpotifyPayload<"ping">;
export type SpotifyPongPayload = SpotifyPayload<"pong">;

/**
 * Encompasses all actual messages being sent my Spotify that isn't a ping/pong
 */
export interface SpotifyMessagePayload extends SpotifyPayload<"message"> {
    headers: Record<string, string>;
    payloads: unknown[];
    method?: string;
    uri: string;
}

export interface SpotifyPayloadMap {
    ping: SpotifyPingPayload;
    pong: SpotifyPongPayload;
    message: SpotifyMessagePayload;
}

export type AnySpotifyPayload = SpotifyPayloadMap[keyof SpotifyPayloadMap];

const SPOTIFY_PING_INTERVAL = 30000;

/**
 * Same as a SpotifyMessagePayload, but with the URI parsed to improve routing
 */
export interface ParsedSpotifyMessage extends SpotifyMessagePayload {
    /**
     * The API this message is being routed to.
     * 
     * Given hm://track-playback/v1/command, the API would be track-playback
     */
    api: string;
    /**
     * The path this message is hitting.
     * 
     * Given hm://track-playback/v1/command, the path would be /v1/command
     */
    path: string;
    /**
     * The components of the path this message is hitting.
     * 
     * Given hm://track-playback/v1/command, the components would be ["v1", "command"]
     */
    pathComponents: string[];
    /**
     * The underlying URL used to parse this message
     */
    url: URL;
}

export interface SpotifyMessageHandler {
    (message: ParsedSpotifyMessage): any;
}

export interface SpotifyConnectionIDObserver {
    (connectionID: string | null): any;
}

export interface SpotifyAccessTokenRegnerator {
    (): Promise<string>;
}

/**
 * 
 */
export abstract class SpotifySocket {
    /**
     * Constructs a Spotify socket from the given open.spotify.com cookies
     * @param cookie cookies you got
     * @returns a promise of a SpotifySocket, and the access token used to create it
     */
    public static async create(cookie: string): Promise<{
        accessToken: string;
        socket: SpotifySocket;
    }> {
        throw new Error("This must be overridden by an implementing class.");
    }

    /**
     * Constructs a SpotifySocket instance from an underlying WebSocket connection
     * @param socket connection to Spotify
     */
    public constructor(socket: WebSocket) {
        this.attach(socket);
    }

    #handlers: Map<string, Set<SpotifyMessageHandler>> = new Map();
    #connectionIDObservers: Set<SpotifyConnectionIDObserver> = new Set();
    #connectionID: string | null = null;
    #startedPing: boolean = false;
    #socket: WebSocket;

    /**
     * Generates a refreshed access token
     */
    public abstract generateAccessToken(): Promise<string>;

    /**
     * Bound function that can be passed to regnerate the token
     */
    public abstract get accessTokenRegenerator(): SpotifyAccessTokenRegnerator;

    public attach(socket: WebSocket) {
        if (this.#socket?.readyState !== this.#socket?.CLOSED) throw new Error("Cannot attach to multiple sockets.");

        this.#socket = socket;

        socket.onmessage = ({ data }) => this.handlePayload(JSON.parse(data.toString()));

        this.registerHandler("pusher", ({ path, pathComponents, headers }) => {
            switch (pathComponents.slice(0, 3).join("/")) {
                case "/v1/connections":
                    this.#connectionID = headers["Spotify-Connection-Id"] || null;
                    this.#connectionIDObservers.forEach(observer => observer(this.#connectionID));
                    if (!this.#startedPing) {
                        this.ping();
                        this.#startedPing = true;
                    }
                    break;
            }
        });
    }

    /**
     * Subscribe to changes to the Spotify connection ID
     * @param observer callback function to receive changes
     */
    public observeConnectionID(observer: SpotifyConnectionIDObserver) {
        this.#connectionIDObservers.add(observer);
    }

    /**
     * Unsubscribe from changes to the Spotify connection ID
     * @param observer callback function to unsubscribe changes
     */
    public unobserveConnectionID(observer: SpotifyConnectionIDObserver) {
        this.#connectionIDObservers.delete(observer);
    }

    /**
     * Registers a handler for the given API scope
     * @param api api scope
     * @param handler callback function for messages within this api
     */
    public registerHandler(api: string, handler: SpotifyMessageHandler) {
        const handlers = this.#handlers.get(api) || this.#handlers.set(api, new Set()).get(api)!;
        handlers.add(handler);
    }

    /**
     * Unregesters a handler from the given API scope
     * @param api api scope
     * @param handler callback function to unregister
     */
    public unregisterHandler(api: string, handler: SpotifyMessageHandler) {
        const handlers = this.#handlers.get(api);
        if (handlers) {
            handlers.delete(handler);
            if (!handlers.size) this.#handlers.delete(api);
        }
    }

    /**
     * Spotify WebSocket connection ID
     */
    public get connectionID(): string | null {
        return this.#connectionID;
    }

    public get socket(): WebSocket {
        return this.#socket;
    }

    /**
     * Handles an incoming payload from Spotify
     * @param payload payload received from Spotify
     * @private
     */
    protected handlePayload(payload: AnySpotifyPayload) {
        switch (payload.type) {
            case "pong":
                debug("spotify ponged us");
                this.deferredPing();
                break;
            case "message":
                try {
                    var url = new URL(payload.uri);
                } catch {
                    var url = new URL(`hm://${payload.uri}`);
                }
                
                const handlers = this.#handlers.get(url.hostname);
                if (!handlers) break;

                const message: ParsedSpotifyMessage = {
                    ...payload,
                    api: url.hostname,
                    path: url.pathname,
                    pathComponents: url.pathname.split("/"),
                    url
                }
                handlers.forEach(handler => handler(message));

                break;
            default:
                debug("unexpected payload received: %s", payload.type);
        }
    }

    /**
     * Sends a payload to Spotify
     * @param payload payload to send
     * @private
     */
    private send(payload: AnySpotifyPayload) {
        debug("sending %s", payload.type);
        this.socket.send(JSON.stringify(payload));
    }

    /**
     * Sends a ping payload to Spotify
     * @private
     */
    private ping() {
        this.send({ type: "ping" });
    }

    /**
     * Schedules a ping to go to Spotify after the SPOTIFY_PING_INTERVAL
     * @private
     */
    private deferredPing() {
        debug("scheduling deferred ping with interval %d", SPOTIFY_PING_INTERVAL);
        setTimeout(() => this.ping(), SPOTIFY_PING_INTERVAL);
    }
}