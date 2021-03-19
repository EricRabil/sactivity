export interface SpotifyClusterDevice {
    can_play: boolean;
    capabilities: {
        can_be_player: boolean;
        command_acks: boolean;
        gaia_eq_connect_id: boolean;
        is_controllable: boolean;
        is_observable: boolean;
        supported_types: string[];
        supports_command_request: boolean;
        supports_external_episodes: boolean;
        supports_gzip_pushes: boolean;
        supports_logout: boolean;
        supports_playlist_v2: boolean;
        supports_rename: boolean;
        supports_set_options_command: boolean;
        supports_transfer_command: boolean;
        volume_steps: number;
    };
    client_id: string;
    device_id: string;
    device_software_version: string;
    device_type: string;
    metadata_map: Record<string, string>;
    name: string;
    public_ip: string;
    spirc_version: string;
    volume: number;
}

export interface SpotifyPlayerContext {
    context_description: string;
    context_owner: string;
    "filtering.predicate": string;
    image_url: string;
    "zelda.context_uri": string;
}

export interface SpotifyPlayerIndex {
    page: number;
    track: number;
}

export interface SpotifyPlayerTrack {
    metadata: {
        "actions.skipping_next_past_track": string;
        "actions.skipping_prev_past_track": string;
        album_title: string;
        album_uri: string;
        artist_uri: string;
        "collection.artist.is_banned": string;
        "collection.is_banned": string;
        context_uri: string;
        entity_uri: string;
        image_large_url: string;
        image_small_url: string;
        image_url: string;
        image_xlarge_url: string;
        interaction_id: string;
        iteration: string;
        page_instance_id: string;
        track_player: string;
    };
    provider: string;
    uid: string;
    uri: string;
}

export interface SpotifyPlayerOptions {
    repeating_context: boolean;
    repeating_track: boolean;
    shuffling_context: boolean;
}

export interface SpotifyPlayOrigin {
    feature_classes: string[];
    feature_identifier: string;
    feature_version: string;
    referrer_identifier: string;
    view_uri: string;
}

export interface SpotifyPlaybackQuality {
    bitrate_level: string;
}

export interface SpotifyPlayerRestrictions {
    disallow_resuming_reasons: string[];
}

export interface SpotifyPlayerStateFragment {
    context_restrictions: Record<string, unknown>;
    context_uri: string;
    context_url: string;
    is_paused: boolean;
    is_playing: boolean;
    is_system_initiated: boolean;
    next_tracks: SpotifyPlayerTrack[];
    options: SpotifyPlayerOptions;
    page_metadata: Record<string, unknown>;
    play_origin: SpotifyPlayOrigin;
    playback_speed: number;
    position_as_of_timestamp: string;
    prev_tracks: SpotifyPlayerTrack[];
    queue_revision: string;
    restrictions: SpotifyPlayerRestrictions;
    session_id: string;
    suppressions: Record<string, unknown>;
}

export interface SpotifyPlayerState extends SpotifyPlayerStateFragment {
    context_metadata: SpotifyPlayerContext;
    duration: string;
    index: SpotifyPlayerIndex;
    playback_id: string;
    playback_quality: SpotifyPlaybackQuality;
    timestamp: string;
    track: SpotifyPlayerTrack;
}

export interface SpotifyCluster {
    active_device_id: string;
    devices: Record<string, SpotifyClusterDevice>;
    need_full_player_state: boolean;
    not_playing_since_timestamp?: string;
    player_state: SpotifyPlayerState | SpotifyPlayerStateFragment;
    server_timestamp_ms: string;
    timestamp: string;
    transfer_data_timestamp: string;
}

export interface SpotifyClusterUpdatePayload {
    ack_id: string;
    cluster: SpotifyCluster;
    devices_that_changed: string[];
    update_reason: string;
}