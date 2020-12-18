/// <reference types="node" />
import { EventEmitter } from "events";
import { WebSocket } from "@clusterws/cws";
import { AnalysisResult, AsyncAnalysisCache, PlaybackOptions, PlayerState, SpotifyDevice, SpotifyPayload, SpotifyTrack } from "./types";
import Sactivity from ".";
export declare interface SpotifyClient {
    on(event: 'volume', listener: (vol: number) => any): this;
    on(event: 'playing', listener: () => any): this;
    on(event: 'stopped', listener: () => any): this;
    on(event: 'paused', listener: () => any): this;
    on(event: 'resumed', listener: () => any): this;
    on(event: 'track', listener: (track: SpotifyTrack) => any): this;
    on(event: 'trackID', listener: (trackID: string) => any): this;
    on(event: 'options', listener: (opts: PlaybackOptions) => any): this;
    on(event: 'position', listener: (pos: string) => any): this;
    on(event: 'device', listener: (device: SpotifyDevice) => any): this;
    on(event: 'close', listener: () => any): this;
    on(event: string, listener: Function): this;
}
export declare class SpotifyClient extends EventEmitter {
    readonly socket: WebSocket;
    private token;
    private provider;
    private _playerState;
    private _lastTrackURI;
    private _lastTrack;
    private _isPlaying;
    private _isPaused;
    private _lastOptions;
    private _lastPosition;
    private _lastVolume;
    private _devices;
    private _activeDeviceID;
    private _trackCache;
    _analysisCache: Record<string, AnalysisResult>;
    private _lastTimestamp;
    asyncCache?: AsyncAnalysisCache;
    constructor(socket: WebSocket, token: string, provider: Sactivity);
    /**
     * Ping Spotify in 30 seconds
     */
    deferredPing(): NodeJS.Timeout;
    ping(): void;
    /**
     * Send a payload to spotify
     * @param payload payload to send
     */
    send(payload: SpotifyPayload): void;
    /**
     * Returns the name of a device with the given ID
     * @param id device ID
     */
    deviceName(id: string): string;
    resolve(...ids: string[]): Promise<Record<string, SpotifyTrack>>;
    resolveURI(...uri: string[]): Promise<Record<string, SpotifyTrack>>;
    analyzeIfNeeded(trackIDs: string[], token?: string): Promise<void>;
    /**
     * Returns a Spotify analysis for a given track
     * @param trackID track to analyze
     */
    analyze(trackID: string, token?: string): Promise<AnalysisResult>;
    /**
     * Spotify Devices
     */
    get devices(): Record<string, SpotifyDevice>;
    /**
     * The current track
     */
    get track(): SpotifyTrack;
    get shallowTrack(): import("./types").SpotifyShallowTrack;
    set devices(devices: Record<string, SpotifyDevice>);
    /**
     * The latest PlayerState
     */
    get playerState(): PlayerState;
    /**
     * Current position in the song
     */
    get position(): number;
    set playerState(playerState: PlayerState);
    private _diffPlayerState;
    /**
     * The currently playing Spotify Device
     */
    get activeDevice(): SpotifyDevice | null;
    /**
     * The ID of the currently playing Spotify Device
     */
    get activeDeviceID(): string | null;
    set activeDeviceID(deviceID: string | null);
    /**
     * Returns a deep metadata structure for a track ID
     * @param ids ids to query
     */
    private fetchMetadata;
    /**
     * Update internal values according to a state change payload
     * @param param0 payload
     */
    private handleStateChange;
    /**
     * Process a payload from the dealer
     * @param payload payload to process
     */
    private processMessage;
    /**
     * Process a raw message from the dealer
     * @param message message to process
     */
    private processRawMessage;
    createAnalysisToken(): Promise<string | null>;
    private subscribe;
    private _deviceID;
    private trackDevice;
    private connectState;
}
export default SpotifyClient;
