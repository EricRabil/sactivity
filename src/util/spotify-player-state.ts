import { SpotifyPlayerState } from "../types/SpotifyCluster";

/**
 * Computes the current position of a player state
 * @param playerState player state
 * @returns current position relative to the start of the song, in milliseconds
 */
export function playerStatePosition(playerState: SpotifyPlayerState): number {
    if (playerState.is_paused) return +playerState.position_as_of_timestamp;

    return +playerState.position_as_of_timestamp + (Date.now() - +playerState.timestamp);
}
