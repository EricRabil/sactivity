import { WebSocket } from "@clusterws/cws";
import { SpotifyClient } from "./SpotifyClient";
export default class Sactivity {
    readonly cookies: string;
    constructor(cookies: string);
    /**
     * Generate an access token from Spotify
     */
    getAccessToken(): Promise<import("./util").SpotifyTokenResponse>;
    /**
     * Discover the current Spotify dealers
     */
    discoverDealers(): Promise<import("./util").SpotifyDiscoveryResponse>;
    /**
     * Connects to Spotify and wraps the socket in a wrapper class
     */
    connect(): Promise<SpotifyClient>;
    /**
     * Connects to Spotify and returns the WebSocket
     */
    _connect(): Promise<{
        socket: WebSocket;
        token: string;
    }>;
}
export { SpotifyClient } from "./SpotifyClient";
