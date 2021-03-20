import { SpotifyTrack } from "./SpotifyMedia";

export interface SpotifyAnalysisTimeInterval {
  start: number;
  duration: number;
  confidence: number;
}

export interface AsyncSpotifyAnalysisCache {
  resolve(id: string): Promise<SpotifyAnalysisResult | undefined | null | void>;
  resolveMetadata(id: string): Promise<SpotifyTrack | undefined | null | void>;
  resolveMany(id: string[]): Promise<Record<string, SpotifyAnalysisResult>>;
  resolveManyMetadatas(id: string[]): Promise<Record<string, SpotifyTrack>>;
  store(id: string, result: SpotifyAnalysisResult): Promise<void>;
  storeMetadata(id: string, result: SpotifyTrack): Promise<void>;
  storeManyMetadatas(metadatas: Record<string, SpotifyTrack>): Promise<void>;
}

export namespace SpotifyAnalysisTimeInterval {
  export function isInterval(obj: unknown): obj is SpotifyAnalysisTimeInterval {
    return typeof obj === "object"
      && obj !== null
      && typeof (obj as Record<string, unknown>).start === "number"
      && typeof (obj as Record<string, unknown>).duration === "number"
      && typeof (obj as Record<string, unknown>).confidence === "number";
  }
}

export interface SpotifyAnalysisSection extends SpotifyAnalysisTimeInterval {
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

export interface SpotifyAnalysisSegment extends SpotifyAnalysisTimeInterval {
  loudness_start: number;
  loudness_max_time: number;
  loudness_max: number;
  loudness_end: number;
  pitches: number[];
  timbre: number[];
}

export interface SpotifyAnalysisTrack {
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

export interface SpotifyAnalysisResult {
  bars: SpotifyAnalysisTimeInterval[];
  beats: SpotifyAnalysisTimeInterval[];
  sections: SpotifyAnalysisSection[];
  segments: SpotifyAnalysisSegment[];
  tatums: SpotifyAnalysisTimeInterval[];
  track: SpotifyAnalysisTrack;
}