export interface SpotifyTokenResponse {
  clientId: string;
  accessToken: string;
  accessTokenExpierationTimestampMs: number;
  isAnonymous: boolean;
}

export function isSpotifyTokenResponse(data: any): data is SpotifyTokenResponse {
  return 'clientId' in data && 'accessToken' in data && 'accessTokenExpirationTimestampMs' in data && 'isAnonymous' in data;
}

export interface SpotifyDiscoveryResponse {
  dealer: string[];
  spclient: string[];
}

export function isSpotifyDiscoveryResponse(data: any): data is SpotifyDiscoveryResponse {
  return 'dealer' in data && 'spclient' in data;
}

export class SpotifyAPIError extends Error {
  constructor(url: string, body: any) {
    super(`Failed to contact Spotify on endpoint ${url} - Response: ${JSON.stringify(body)}`);
  }
}

export function makeid(length: number) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
