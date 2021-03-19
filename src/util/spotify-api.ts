import axios from "axios";
import { SpotifyTrack } from "../types/SpotifyMedia";
import { CORE_HEADERS } from "./const";

interface TracksResult {
    tracks: SpotifyTrack[];
}

export async function resolveTracks(ids: string[], accessToken: string): Promise<Record<string, SpotifyTrack>> {
    if (ids.length === 0) return {};

    const { data: { tracks } } = await axios.get<TracksResult>(`https://api.spotify.com/v1/tracks?ids=${ids.join("\n")}&market=from_token`, {
        headers: {
            ...CORE_HEADERS,
            origin: "https://open.spotify.com",
            authorization: `Bearer ${accessToken}`
        }
    });

    return tracks.reduce((acc, track) => Object.assign(acc, { [track.id]: track }), {});
}