export type SpotifyPayloadType = "ping" | "pong" | "message";

export interface SpotifyPayload {
  type: SpotifyPayloadType;
  uri?: string;
  headers?: Record<string, string>;
  payloads?: any[];
}

export interface SpotifyDevice {
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

export interface SpotifyShallowTrack {
  uri: string;
  uid: string;
  provider: string;
  metadata: {
    context_uri: string;
    entity_uri: string;
    iteration: string;
    track_player: string;
  }
}

export interface PlayerState {
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

export interface PlaybackOptions {
  shuffling_context: boolean;
  repeating_context: boolean;
  repeating_track: boolean;
}

export interface StateChangePayload {
  cluster: {
    timestamp: string;
    active_device_id: string;
    player_state: PlayerState;
    devices: Record<string, SpotifyDevice>;
    transfer_data_timestamp: string;
  }
  update_reason: string;
  devices_that_changed: string[];
}

export interface AnalysisTimeInterval {
  start: number;
  duration: number;
  confidence: number;
}

export interface AsyncAnalysisCache {
  resolve(id: string): Promise<AnalysisResult | undefined | null | void>;
  resolveMany(id: string[]): Promise<Record<string, AnalysisResult>>;
  store(id: string, result: AnalysisResult): Promise<void>;
}

export namespace AnalysisTimeInterval {
  export function isInterval(obj: unknown): obj is AnalysisTimeInterval {
    return typeof obj === "object"
      && obj !== null
      && typeof (obj as Record<string, unknown>).start === "number"
      && typeof (obj as Record<string, unknown>).duration === "number"
      && typeof (obj as Record<string, unknown>).confidence === "number";
  }
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

export interface SpotifyEntity {
  external_urls: {
    spotify: string;
  }
  href: string;
  name: string;
  type: string;
  uri: string;
  id: string;
}
export interface SpotifyArtist extends SpotifyEntity {
  type: "artist";
}
export interface SpotifyAsset {
  height: number;
  width: number;
  url: string;
}
export interface SpotifyAlbum extends SpotifyEntity {
  album_type: string;
  artists: any;
  images: SpotifyAsset[];
  release_date: string;
  release_date_precision: "week" | "day" | "month";
  total_tracks: number;
  type: "album";
}
export interface SpotifyTrack extends SpotifyEntity {
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  images?: SpotifyAsset[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: any;
  linked_from: {
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    type: "track";
    uri: string;
  }
  is_local: boolean;
  is_playable: boolean;
  popularity: number;
  preview_url: string;
  tags: any[];
  track_number: number;
  type: "track";
}