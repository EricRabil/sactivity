/// <reference types="node" />
import { EventEmitter } from "events";
import { WebSocket } from "@clusterws/cws";
import { SpotifyTrack } from "./types";
import { SpotifyProvider } from ".";
declare type SpotifyPayloadType = "ping" | "pong" | "message";
interface SpotifyPayload {
    type: SpotifyPayloadType;
    uri?: string;
    headers?: Record<string, string>;
    payloads?: any[];
}
interface SpotifyDevice {
    can_play: boolean;
    volume: number;
    name: string;
    capabilities: {
        can_be_player: boolean;
        gaia_eq_connect_id: boolean;
        supports_logout: boolean;
        is_observable: boolean;
        volume_steps: number;
        supported_types: string[];
        command_acks: boolean;
        supports_playlist_v2: boolean;
        is_controllable: boolean;
        supports_external_episodes: boolean;
        supports_command_request: boolean;
    };
    metadata: Array<{
        type: string;
        metadata: string;
    }>;
    device_software_version: string;
    device_type: string;
    spirc_version: string;
    device_id: string;
    client_id: string;
    brand: string;
    model: string;
}
interface SpotifyShallowTrack {
    uri: string;
    uid: string;
    provider: string;
    metadata: {
        context_uri: string;
        entity_uri: string;
        iteration: string;
        track_player: string;
    };
}
interface PlayerState {
    timestamp: string;
    context_uri: string;
    context_url: string;
    context_restrictions: any;
    play_origin: {
        feature_identifier: string;
        feature_version: string;
        view_uri: string;
        referrer_identifier: string;
    };
    index: {
        page: number;
        track: number;
    };
    track: SpotifyShallowTrack;
    playback_id: string;
    playback_speed: number;
    position_as_of_timestamp: string;
    duration: string;
    is_playing: boolean;
    is_paused: boolean;
    is_system_initiated: boolean;
    options: PlaybackOptions;
    restrictions: Record<string, string[]>;
    suppressions: Record<string, string[]>;
    prev_tracks: SpotifyShallowTrack[];
    next_tracks: SpotifyShallowTrack[];
    context_metdata: {
        ['zelda.context_uri']: string;
        context_owner: string;
        context_description: string;
        image_url: string;
    };
    page_metadata: any;
    session_id: string;
    queue_revision: string;
}
interface PlaybackOptions {
    shuffling_context: boolean;
    repeating_context: boolean;
    repeating_track: boolean;
}
export interface AnalysisTimeInterval {
    start: number;
    duration: number;
    confidence: number;
}
export declare namespace AnalysisTimeInterval {
    function isInterval(obj: unknown): obj is AnalysisTimeInterval;
}
export interface AnalysisSection extends AnalysisTimeInterval {
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
}
export interface AnalysisSegment extends AnalysisTimeInterval {
    loudness_start: number;
    loudness_max_time: number;
    loudness_max: number;
    loudness_end: number;
    pitches: number[];
    timbre: number[];
}
export interface AnalysisTrack {
    duration: number;
    sample_md5: string;
    offset_seconds: number;
    window_seconds: number;
    analysis_sample_rate: number;
    analysis_channels: number;
    end_of_fade_in: number;
    start_of_fade_out: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
    codestring: string;
    code_version: number;
    echoprintstring: string;
    echoprint_version: number;
    synchstring: string;
    synch_version: number;
    rhyhtmstring: string;
    rhyhtm_version: number;
}
export interface AnalysisResult {
    bars: AnalysisTimeInterval[];
    beats: AnalysisTimeInterval[];
    sections: AnalysisSection[];
    segments: AnalysisSegment[];
    tatums: AnalysisTimeInterval[];
    track: AnalysisTrack;
}
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
    constructor(socket: WebSocket, token: string, provider: SpotifyProvider);
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
    get shallowTrack(): SpotifyShallowTrack;
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
    private subscribe;
    private _deviceID;
    private trackDevice;
    private connectState;
}
export default SpotifyClient;
