export const SPOTIFY_TOKEN = 'https://open.spotify.com/get_access_token?reason=transport&productType=web_player';
export const SPOTIFY_DISCOVERY = 'https://apresolve.spotify.com/?type=dealer&type=spclient';
export const SPOTIFY_SUBSCRIBE = (connectionID: string) => `https://api.spotify.com/v1/me/notifications/user?connection_id=${connectionID}`;
export const SPOTIFY_TRACK = 'https://guc-spclient.spotify.com/track-playback/v1/devices';
export const SPOTIFY_CONNECT_STATE = (clientID: string) => `https://guc-spclient.spotify.com/connect-state/v1/devices/hobs_${clientID}`;
export const SPOTIFY_STREAM = (endpoint: string, token: string) => `ws${endpoint.endsWith('443') ? 's' : ''}://${endpoint.split(':')[0]}/?access_token=${token}`;
export const SPOTIFY_TRACK_DATA = (tracks: string[]) => `https://api.spotify.com/v1/tracks?ids=${tracks.join(',')}&market=from_token`;
export const SPOTIFY_AUDIO_ANALYSIS = (trackID: string) => `https://api.spotify.com/v1/audio-analysis/${trackID}`
export const SPOTIFY_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
  'sec-fetch-site': 'same-site',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty'
};