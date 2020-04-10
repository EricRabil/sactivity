"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isSpotifyTokenResponse(data) {
    return 'clientId' in data && 'accessToken' in data && 'accessTokenExpirationTimestampMs' in data && 'isAnonymous' in data;
}
exports.isSpotifyTokenResponse = isSpotifyTokenResponse;
function isSpotifyDiscoveryResponse(data) {
    return 'dealer' in data && 'spclient' in data;
}
exports.isSpotifyDiscoveryResponse = isSpotifyDiscoveryResponse;
class SpotifyAPIError extends Error {
    constructor(url, body) {
        super(`Failed to contact Spotify on endpoint ${url} - Response: ${JSON.stringify(body)}`);
    }
}
exports.SpotifyAPIError = SpotifyAPIError;
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.makeid = makeid;
