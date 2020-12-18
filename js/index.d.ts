import { WebSocket } from "@clusterws/cws";
import { SpotifyClient } from "./SpotifyClient";
export interface SpotifyProvider {
    generateAccessToken(): Promise<string>;
}
export default class Sactivity implements SpotifyProvider {
    readonly cookies: string;
    constructor(cookies: string);
    /**
     * Generate an access token from Spotify
     */
    generateAccessToken(): Promise<string>;
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
export * from "./SpotifyClient";
export * from "./SpotifyTrackAnalyzer";
export * from "./types";
