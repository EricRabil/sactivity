/// <reference types="node" />
import { EventEmitter } from "events";
import { WebSocket } from "@clusterws/cws";
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
interface SpotifyTrack {
    uri: string;
    uid: string;
    provider: string;
    metadata: {
        atrist_uri: string;
        is_explicit: "true" | "false";
        is_local: "true" | "false";
        album_disc_number: string;
        title: string;
        album_disc_count: string;
        album_artist_name: string;
        duration: string;
        ['collection.in_collection']: string;
        album_track_number: string;
        image_xlarge_url: string;
        popularity: string;
        iteration: string;
        ['collection.can_add']: string;
        has_lyrics: "true" | "false";
        artist_name: string;
        image_large_url: string;
        available_file_formats: string;
        context_uri: string;
        player: string;
        album_title: string;
        album_uri: string;
        album_track_count: string;
        image_small_url: string;
        image_url: string;
        entity_uri: string;
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
    track: SpotifyTrack;
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
    prev_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
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
export declare interface SpotifyClient {
    on(event: 'volume', listener: (vol: number) => any): this;
    on(event: 'playing', listener: () => any): this;
    on(event: 'stopped', listener: () => any): this;
    on(event: 'paused', listener: () => any): this;
    on(event: 'resumed', listener: () => any): this;
    on(event: 'track', listener: (track: SpotifyTrack) => any): this;
    on(event: 'options', listener: (opts: PlaybackOptions) => any): this;
    on(event: 'position', listener: (pos: string) => any): this;
    on(event: 'device', listener: (device: SpotifyDevice) => any): this;
    on(event: 'close', listener: () => any): this;
    on(event: string, listener: Function): this;
}
export declare class SpotifyClient extends EventEmitter {
    readonly socket: WebSocket;
    private token;
    private _playerState;
    private _lastTrack;
    private _isPlaying;
    private _isPaused;
    private _lastOptions;
    private _lastPosition;
    private _lastVolume;
    private _devices;
    private _activeDeviceID;
    constructor(socket: WebSocket, token: string);
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
    /**
     * Spotify Devices
     */
    get devices(): Record<string, SpotifyDevice>;
    /**
     * The current track
     */
    get track(): SpotifyTrack;
    set devices(devices: Record<string, SpotifyDevice>);
    /**
     * The latest PlayerState
     */
    get playerState(): PlayerState;
    set playerState(playerState: PlayerState);
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
