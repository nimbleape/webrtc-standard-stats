import { EventEmitter } from 'events';

var statsParser = {};

statsParser.getAllStats = function(results) {

    var stats = {};

    //loop through transport and find the connected one
    results.transport.forEach((transport) => {
        if (transport.dtlsState === 'connected') {
            stats.connectedTransport = transport;
            //go find the candidatePair, find it's candidates and then find those candidates
            results['candidate-pair'].some((pair) => {
                if (pair.id === transport.selectedCandidatePairId) {
                    stats.candidatePair = pair;
                    results['local-candidate'].some((candisdate) => {
                        if (candidate.id === pair.localCandidateId) {
                            stats.localCandidate = candidate;
                            return true;
                        }
                    });

                    results['remote-candidate'].some((candidate) => {
                        if (candidate.id === pair.remoteCandidateId) {
                            stats.remoteCandidate = candidate;
                            return true;
                        }
                    });
                    return true;
                }
            })
            return true;
        }
    })

    if (stats.connectedTransport) {
        results['certificate'].some((certificate) => {
            if (certificate.id === stats.connectedTransport.localCertificateId) {
                stats.localCertificate = certificate;
            }

            if (certificate.id === stats.connectedTransport.remoteCertificateId) {
                stats.remoteCertificate = certificate;
            }

            if (stats.remoteCertificate && stats.localCertificate) {
                return true;
            }
        });
    }

    stats.inboundRtp = results['inbound-rtp'];
    stats.outboundRtp = results['outbound-rtp'];

    stats.outboundCodecs = {};
    stats.inboundCodecs = {};

    stats.peerConnection = results['peer-connection'][0];//there will always only be one

    stats.localStreams = results.stream;

    stats.localTracks = [];
    let tmpCurrentTrackIds = [];

    results.stream.forEach((stream) => {
        tmpCurrentTrackIds = tmpCurrentTrackIds.concat(stream.trackIds);
    });

    results.track.forEach((track) => {
        if (tmpCurrentTrackIds.includes(track.id)) {
            stats.localTracks.push(track);
        }
    });

    ['inbound-rtp', 'outbound-rtp'].forEach((key) => {
        results[key].forEach((rtp) => {
            //find the currently used codecs
            results['codec'].some((codec) => {
                if (codec.id === rtp.codecId) {
                    stats[key.substr(0, key.length-4) + 'Codecs'][rtp.mediaType] = codec;
                    return true;
                }
            });
        })
    })

    return stats;
};

/**
 * [DebugWebRTC description]
 * @param {[Object]} config
 * @param {object} config.peer            PeerConnection instance
 * @param {number} config.interval        getStats interval
 */
class WebRTCStandardStats extends EventEmitter {
    constructor (config, opts = {}) {
        super();
        config = config || {};

        if (!config.peer) { throw 'cannot find PeerConnection instance'; }

        this.TYPES = {
            TYPE_CODEC: 'codec',
            TYPE_INBOUND_RTP: 'inbound-rtp',
            TYPE_OUTPOUND_RTC: 'outbound-rtp',
            TYPE_PEER_CONNECTION: 'peer-connection',
            TYPE_DATA_CHANNEL: 'data-channel',
            TYPE_TRACK: 'track',
            TYPE_TRANSPORT: 'transport',
            TYPE_CANDIDATE_PAIR: 'candidate-pair',
            TYPE_LOCAL_CANDIDATE: 'local-candidate',
            TYPE_REMOTE_CANDIDATE: 'remote-candidate',
            TYPE_CERTIFICATE: 'certificate'
        };

        this.PARSERS = {
            // PARSER_CHECK_IF_OFFERER: 'checkIfOfferer',
            // PARSER_GET_PRINT_ALGORITHM: 'getPrintAlgorithm',
            // PARSER_CHECK_AUDIO_TRACKS: 'checkAudioTracks',
            // PARSER_CHECK_VIDEO_TRACKS: 'checkVideoTracks',
            // PARSER_GET_CONNECTION: 'getConnection',
            // PARSER_GET_LOCAL_CANDIDATES: 'getLocalCandidates',
            // PARSER_GET_REMOTE_CANDIDATES: 'getRemotecandidate',
            // PARSER_GET_DATA_SENT_RECEIVED: 'getDataSentReceived',
            // PARSER_GET_STREAMS: 'getStreams',
            PARSER_GET_ALL_STATS: 'getAllStats',
        };

        this.peer = config.peer;
        this.interval = config.interval || 10000;
    }

    stop () {
        this.do = false;
        clearInterval(this.timer);
        this.timer = null;
    };

    start () {
        this.stop();
        this.do = true;
        this.timer = setInterval(this._getStatsLooper.bind(this), this.interval);
    };

    destroy () {
        this.stop();
        this.peer = null;
        this.PARSERS.values().forEach((key) => {
            this.removeAllListeners(key);
        })

        this.TYPES.values().forEach((key) => {
            this.removeAllListeners(key);
        })

    };

    getStats () {
        this._getStatsLooper();
    }

    _getStatsLooper() {
        var self = this;
        this.peer.getStats().then(function(result) {
            var items = {};

            result.forEach(function(res) {
                if (!items[res.type]) {
                    items[res.type] = [];
                }
                items[res.type].push(res);
            });

            Object.keys(items).forEach( (key) => {
                //check if theres any listeners
                if (self.listenerCount(key) > 0) {
                    self.emit(key, items[key]);
                }
            });

            Object.values(self.PARSERS).forEach( (key) => {
                if (self.listenerCount(key) > 0) {
                    self.emit(key, statsParser[key](items));
                }
            })
        });

        try {
            // failed|closed
            if (this.peer.iceConnectionState.search(/failed/gi) !== -1) {
                this.do = false;
            }
        } catch (e) {
            this.do = false;

        }

        // second argument checks to see, if target-user is still connected.
        if (!this.do) {
            this.stop();
        }

    }
}

export default WebRTCStandardStats;