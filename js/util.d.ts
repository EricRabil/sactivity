export interface SpotifyTokenResponse {
    clientId: string;
    accessToken: string;
    accessTokenExpierationTimestampMs: number;
    isAnonymous: boolean;
}
export declare function isSpotifyTokenResponse(data: any): data is SpotifyTokenResponse;
export interface SpotifyDiscoveryResponse {
    dealer: string[];
    spclient: string[];
}
export declare function isSpotifyDiscoveryResponse(data: any): data is SpotifyDiscoveryResponse;
export declare class SpotifyAPIError extends Error {
    constructor(url: string, body: any);
}
export declare function makeid(length: number): string;
export declare function spotifyTrackID(raw: string): string | null;
