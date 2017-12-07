# webrtc-standard-stats

## Installation & Usage

### npm

```bash
$ npm install webrtc-standard-stats
```

```js
var WebRTCStandardStats = require('webrtc-standard-stats');
var peer = new RTCPeerConnection();

var stats = new WebRTCStandardStats({
    peer: peer,
    interval: 1000
});

//TYPES
stats.on(stats.TYPES.TYPE_CANDIDATE_PAIR, function (results) {
    // do your work
});

//PARSERS
stats.on(stats.PARSERS.PARSER_CHECK_AUDIO_TRACKS, function (audio) {
    //do your work
});

stats.stop();//Stop getting statistics, you can re-start it by start api
stats.start();//Re-start getting statistics

stats.getStats();//Just get one lot of stats emitted to the listeners

//Stop getting the statistics and destroy the instance
stats.desroy();

```