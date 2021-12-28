export const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36";
export const SPOTIFY_APP_VERSION = "1.1.56.182.ga73ec2f9";
export const APP_PLATFORM = "WebPlayer";

export const CORE_HEADERS = {
    // "app-platform": APP_PLATFORM,
    referer: "https://open.spotify.com/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    // "spotify-app-version": SPOTIFY_APP_VERSION,
    "user-agent": USER_AGENT
}
