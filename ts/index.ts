import got from "got";
import { WebSocket } from "@clusterws/cws";
import { SPOTIFY_TOKEN, SPOTIFY_DISCOVERY, SPOTIFY_STREAM, SPOTIFY_HEADERS } from "./const";
import { isSpotifyTokenResponse, isSpotifyDiscoveryResponse, SpotifyAPIError } from "./util";
import { SpotifyClient } from "./SpotifyClient";

export interface SpotifyProvider {
  generateAccessToken(): Promise<string>;
}

export default class Sactivity implements SpotifyProvider {
  constructor(public readonly cookies: string) {
  }

  /**
   * Generate an access token from Spotify
   */
  async generateAccessToken() {
    const { body: tokenResponse } = await got.get(SPOTIFY_TOKEN, {
      headers: {
        cookie: this.cookies,
        ...SPOTIFY_HEADERS
      },
      responseType: 'json'
    });

    if (!isSpotifyTokenResponse(tokenResponse)) {
      throw new SpotifyAPIError(SPOTIFY_TOKEN, tokenResponse);
    }

    return tokenResponse.accessToken;
  }

  /**
   * Discover the current Spotify dealers
   */
  async discoverDealers() {
    const { body: dealerResponse } = await got.get(SPOTIFY_DISCOVERY, { responseType: 'json', headers: SPOTIFY_HEADERS });

    if (!isSpotifyDiscoveryResponse(dealerResponse)) {
      throw new SpotifyAPIError(SPOTIFY_DISCOVERY, dealerResponse);
    }

    return dealerResponse;
  }

  /**
   * Connects to Spotify and wraps the socket in a wrapper class
   */
  async connect() {
    return this._connect().then(({ socket, token }) => new SpotifyClient(socket, token, this));
  }

  /**
   * Connects to Spotify and returns the WebSocket
   */
  async _connect() {
    const token = await this.generateAccessToken();
    const { dealer: dealers } = await this.discoverDealers();

    for (let dealer of dealers) {
      try {
        return { socket: new WebSocket(SPOTIFY_STREAM(dealer, token)), token };
      } catch (e) {
        continue;
      }
    }

    throw new SpotifyAPIError('dealer-connect', {
      message: 'Failed to connect to dealers.',
      dealers
    });
  }
}

export * from "./SpotifyClient";
export * from "./SpotifyTrackAnalyzer";