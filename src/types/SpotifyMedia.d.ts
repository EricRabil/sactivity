export interface SpotifyEntity<Type = string> {
    href: string;
    external_urls: {
        spotify: string;
    };
    id: string;
    name: string;
    type: Type;
    uri: string;
}

export type SpotifyArtist = SpotifyEntity<"artist">;

export interface SpotifyImage {
    height: number;
    url: string;
    width: number;
}

export interface SpotifyAlbum extends SpotifyEntity<"album"> {
    artists: SpotifyArtist[];
    images: SpotifyImage[];
    release_date: string;
    release_date_precision: string;
    total_tracks: number;
}

export interface SpotifyTrack extends SpotifyEntity<"track"> {
    album: SpotifyAlbum;
    artists: SpotifyArtist[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: {
        isrc: string;
    };
    is_local: boolean;
    is_playable: boolean;
    popularity: number;
    preview_url: string;
    track_number: number;
}