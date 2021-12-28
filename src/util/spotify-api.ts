import axios from "axios";
import { SpotifyTrack } from "../types/SpotifyMedia";
import { CORE_HEADERS } from "./const";

interface TracksResult {
    tracks: SpotifyTrack[];
}

async function _resolveTracks(ids: string[], accessToken: string): Promise<Record<string, SpotifyTrack>> {
    const { data: { tracks } } = await axios.get<TracksResult>(`https://api.spotify.com/v1/tracks?ids=${ids.join("\n")}&market=from_token`, {
        headers: {
            ...CORE_HEADERS,
            origin: "https://open.spotify.com",
            authorization: `Bearer ${accessToken}`
        }
    });

    return tracks.reduce((acc, track) => Object.assign(acc, { [track.id]: track }), {});
}

export async function resolveTracks(ids: string[], accessToken: string, regenerate?: () => Promise<string>): Promise<Record<string, SpotifyTrack>> {
    if (ids.length === 0) return {};

    try {
        return await _resolveTracks(ids, accessToken);
    } catch (e) {
        if (regenerate && axios.isAxiosError(e) && [401, 403].includes(e.response?.status || 0)) {
            return await _resolveTracks(ids, await regenerate());
        }
        throw e;
    }
}
