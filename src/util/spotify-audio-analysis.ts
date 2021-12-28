import axios from "axios";
import { SpotifyAnalysisResult } from "../types/SpotifyAnalysis";
import { CORE_HEADERS, USER_AGENT } from "./const";

const SPOTIFY_ANALYSIS_TOKEN = (clientID: string) => `https://accounts.spotify.com/authorize?response_type=token&redirect_uri=https%3A%2F%2Fdeveloper.spotify.com%2Fcallback&client_id=${clientID}&state=${Math.random().toString(36).substring(7)}`;
const SPOTIFY_AUDIO_ANALYSIS = (trackID: string) => `https://api.spotify.com/v1/audio-analysis/${trackID}`;

/**
 * Generates an audio analysis token from the developer portal. This is highly ephemeral and should be expected to expire very quickly.
 * @param cookie open.spotify.com cookies
 * @returns promise of an audio analysis token, or null if it failed
 */
export async function createAnalysisToken(cookie: string): Promise <string | null> {
    const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en",
        "cache-control": "max-age=0",
        cookie,
        "referer": "https://developer.spotify.com/callback/",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": USER_AGENT
    }

    const page = await axios.get("https://developer.spotify.com/console/get-audio-analysis-track/", {
        headers
    });

    const bits = /&client_id=(.*)`/g.exec(page.data);
    if(!bits) return null;

    const [, clientID] = bits;

    const result = await axios.get(SPOTIFY_ANALYSIS_TOKEN(clientID), {
        headers: {
            ...headers,
            referer: "https://developer.spotify.com/"
        },
        maxRedirects: 0,
        validateStatus: status => status === 302
    });

    const location = result.headers.location;
    if(!location) return null;

    const tokenBits = /access_token=(.*)&token_/g.exec(location);
    if(!tokenBits) return null;

    return tokenBits[1] || null;
}

/**
 * Analyzes a track
 * @param id ID of the track to analyze
 * @param token analysis token
 * @param regnerateToken callback to regenerate the analysis token
 * @returns promise of an analyzed track
 */
export async function analyzeTrack(id: string, token: string, regnerateToken?: () => Promise<string>): Promise<SpotifyAnalysisResult> {
    try {
        const { data } = await axios.get<SpotifyAnalysisResult>(SPOTIFY_AUDIO_ANALYSIS(id), {
            headers: {
              authorization: `Bearer ${token}`,
              ...CORE_HEADERS
            },
            responseType: 'json'
        });
    
        return data;
    } catch (e) {
        if (!axios.isAxiosError(e) || !e.response || e.response.status !== 401 || e.response.data.error.message !== "The access token expired" || !regnerateToken) throw e;

        return await analyzeTrack(id, await regnerateToken());
    }
}

/**
 * Analyzes an array of track IDs, returning a dictionary mapping their ID to the analysis result
 * @param ids IDs to analyze
 * @param token analysis token
 * @param regenerateToken callback to regenerate the analysis token
 * @returns promise of a dictionary mapping track ID to analysis result
 */
export async function analyzeTracks(ids: string[], token: string, regenerateToken?: () => Promise<string>): Promise<Record<string, SpotifyAnalysisResult>> {
    if (!ids.length) return {};

    const innerRegenerateToken = regenerateToken ? () => regenerateToken().then(newToken => token = newToken) : undefined;

    const tracks: Record<string, SpotifyAnalysisResult> = {};

    for (const id of ids) {
        tracks[id] = await analyzeTrack(id, token, innerRegenerateToken);
    }

    return tracks;
}