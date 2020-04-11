export declare const SPOTIFY_TOKEN = "https://open.spotify.com/get_access_token?reason=transport&productType=web_player";
export declare const SPOTIFY_DISCOVERY = "https://apresolve.spotify.com/?type=dealer&type=spclient";
export declare const SPOTIFY_SUBSCRIBE: (connectionID: string) => string;
export declare const SPOTIFY_TRACK = "https://guc-spclient.spotify.com/track-playback/v1/devices";
export declare const SPOTIFY_CONNECT_STATE: (clientID: string) => string;
export declare const SPOTIFY_STREAM: (endpoint: string, token: string) => string;
export declare const SPOTIFY_TRACK_DATA: (tracks: string[]) => string;
export declare const SPOTIFY_HEADERS: {
    'user-agent': string;
    'sec-fetch-site': string;
    'sec-fetch-mode': string;
    'sec-fetch-dest': string;
};
