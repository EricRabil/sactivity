"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const cws_1 = require("@clusterws/cws");
const const_1 = require("./const");
const util_1 = require("./util");
const SpotifyClient_1 = require("./SpotifyClient");
class Sactivity {
    constructor(cookies) {
        this.cookies = cookies;
    }
    /**
     * Generate an access token from Spotify
     */
    async getAccessToken() {
        const { body: tokenResponse } = await got_1.default.get(const_1.SPOTIFY_TOKEN, {
            headers: {
                cookie: this.cookies,
                ...const_1.SPOTIFY_HEADERS
            },
            responseType: 'json'
        });
        if (!util_1.isSpotifyTokenResponse(tokenResponse)) {
            throw new util_1.SpotifyAPIError(const_1.SPOTIFY_TOKEN, tokenResponse);
        }
        return tokenResponse;
    }
    /**
     * Discover the current Spotify dealers
     */
    async discoverDealers() {
        const { body: dealerResponse } = await got_1.default.get(const_1.SPOTIFY_DISCOVERY, { responseType: 'json', headers: const_1.SPOTIFY_HEADERS });
        if (!util_1.isSpotifyDiscoveryResponse(dealerResponse)) {
            throw new util_1.SpotifyAPIError(const_1.SPOTIFY_DISCOVERY, dealerResponse);
        }
        return dealerResponse;
    }
    /**
     * Connects to Spotify and wraps the socket in a wrapper class
     */
    async connect() {
        return this._connect().then(({ socket, token }) => new SpotifyClient_1.SpotifyClient(socket, token));
    }
    /**
     * Connects to Spotify and returns the WebSocket
     */
    async _connect() {
        const { accessToken: token } = await this.getAccessToken();
        const { dealer: dealers } = await this.discoverDealers();
        for (let dealer of dealers) {
            try {
                return { socket: new cws_1.WebSocket(const_1.SPOTIFY_STREAM(dealer, token)), token };
            }
            catch (e) {
                continue;
            }
        }
        throw new util_1.SpotifyAPIError('dealer-connect', {
            message: 'Failed to connect to dealers.',
            dealers
        });
    }
}
exports.default = Sactivity;
var SpotifyClient_2 = require("./SpotifyClient");
exports.SpotifyClient = SpotifyClient_2.SpotifyClient;
