"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPOTIFY_TOKEN = 'https://open.spotify.com/get_access_token?reason=transport&productType=web_player';
exports.SPOTIFY_DISCOVERY = 'https://apresolve.spotify.com/?type=dealer&type=spclient';
exports.SPOTIFY_SUBSCRIBE = (connectionID) => `https://api.spotify.com/v1/me/notifications/user?connection_id=${connectionID}`;
exports.SPOTIFY_TRACK = 'https://guc-spclient.spotify.com/track-playback/v1/devices';
exports.SPOTIFY_CONNECT_STATE = (clientID) => `https://guc-spclient.spotify.com/connect-state/v1/devices/hobs_${clientID}`;
exports.SPOTIFY_STREAM = (endpoint, token) => `ws${endpoint.endsWith('443') ? 's' : ''}://${endpoint.split(':')[0]}/?access_token=${token}`;
exports.SPOTIFY_HEADERS = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty'
};
