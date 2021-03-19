# sactivity
Spotify WebSocket Activity API Library

## How it works
Sactivity has two exports, **Sactivity** and **SpotifyClient**.

- **Sactivity** is a class that connects to Spotify for you.
1. It takes your Spotify authoirzation and uses it to generate a token for connecting to Spotify.
2. Then, it connects to one of multiple Spotify "dealers" that push notifications over a WebSocket.
3. It passes this socket to **SpotifyClient**, but you can also connect to Spotify on your own and pass it to **SpotifyClient**.

- **SpotifyClient** handles everything after connecting to the WebSocket, which can still involve some required REST requests.
1. Waits to receive an initialization payload from Spotify, which includes a connection ID
2. Calls `PUT https://api.spotify.com/v1/me/notifications/user?connection_id=${connectionID}` to subscribe to activity on the account associated with the connection ID, and by relation, the authorization you provided.
3. Calls `POST https://guc-spclient.spotify.com/track-playback/v1/devices` and temporarily registers a **fake** Spotify Web Client that will receive notifications from Spotify.
4. Calls `PUT https://guc-spclient.spotify.com/connect-state/v1/devices/hobs_${clientID}` and subscribes to media player events.
5. **SpotifyClient** will now emit various events as the media presence changes.

| Event Name | Description                                                                                       | Data Type       |
|------------|---------------------------------------------------------------------------------------------------|-----------------|
| volume     | Emitted whenever the volume has changed                                                           | number          |
| playing    | Emitted whenever music is playing again                                                           | void            |
| stopped    | Emitted whenever music is stopped                                                                 | void            |
| paused     | Emitted whenever music is paused                                                                  | void            |
| resumed    | Emitted whenever music is resumed                                                                 | void            |
| track      | Emitted whenever a new track is playing                                                           | SpotifyTrack    |
| options    | Emitted whenever playback options have changed (shuffle, repeat, repeat-one)                      | PlaybackOptions |
| position   | Emitted whenever the position in a song has changed. This includes at the start of a new track.   | string          |
| device     | Emitted whenever the device that is playing music has changed.                                    | SpotifyDevice   |
| close      | Emitted whenever the WebSocket has closed. This is a cue to reconnect after a set amount of time. | void            |

In the [tests folder](https://github.com/EricRabil/sactivity/blob/master/test/index.js), you can find a working example.

Data types are declared [here](https://github.com/EricRabil/sactivity/blob/master/ts/SpotifyClient.ts)

## Before starting
Sactivity works off of cookies issued by Spotify upon login, which seem to persist for quite a while. Here's how to obtain the cookies needed:
1. Open Chrome
2. Open devtools
3. Go to the network inspector, and in the filter type "get_access_token"
4. Navigate to https://open.spotify.com in that tab
5. Click on the network request that shows up, then copy the entirety of the `cookie` header in the Request headers.
