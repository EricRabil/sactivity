export interface SpotifyEntity {
    external_urls: {
        spotify: string;
    };
    href: string;
    name: string;
    type: string;
    uri: string;
    id: string;
}
export interface SpotifyArtist extends SpotifyEntity {
    type: "artist";
}
export interface SpotifyAlbum extends SpotifyEntity {
    album_type: string;
    artists: any;
    images: any[];
    release_date: string;
    release_date_precision: "week" | "day" | "month";
    total_tracks: number;
    type: "album";
}
export interface SpotifyTrack extends SpotifyEntity {
    album: SpotifyAlbum;
    artists: SpotifyArtist[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: any;
    is_local: boolean;
    is_playable: boolean;
    popularity: number;
    preview_url: string;
    tags: any[];
    track_number: number;
    type: "track";
}
