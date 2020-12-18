"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
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
    async generateAccessToken() {
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
        return tokenResponse.accessToken;
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
        return this._connect().then(({ socket, token }) => new SpotifyClient_1.SpotifyClient(socket, token, this));
    }
    /**
     * Connects to Spotify and returns the WebSocket
     */
    async _connect() {
        const token = await this.generateAccessToken();
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
__exportStar(require("./SpotifyClient"), exports);
__exportStar(require("./SpotifyTrackAnalyzer"), exports);
__exportStar(require("./types"), exports);
