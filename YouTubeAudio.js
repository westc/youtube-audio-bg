function YouTubeAudio(options) {
  this.init(options);
}

(function() {
  var PLAYER_STATES_TO_NAMES, YouTube, isLoadingYTScript, YTA = YouTubeAudio, global = this;

  function mod(a, b) {
    return (a % b + b) % b;
  }

  function extend(target) {
    for (let argIndex = arguments.length; --argIndex; ) {
      for (let source = arguments[argIndex], keys = Object.keys(source), i = keys.length; i--; ) {
        target[keys[i]] = source[keys[i]];
      }
    }
    return target;
  }
  
  function loadYTScript() {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  function callUntil(callback, args, context, timeInMS) {
    var result = callback();
    if (!result) {
      setTimeout(function() {
        callUntil(callback, args, context, timeInMS);
      }, timeInMS);
    }
    return result;
  }

  function triggerHandlers(yta, name, event) {
    name = '_' + name + 'Callbacks';
    (yta[name] = yta[name] || []).forEach(function(callback) {
      try {
        callback.call(yta, event);
      }
      catch (e) {
        setTimeout(function() { throw e; }, 0);
      }
    });
  }
  
  function addAudio(yta, options) {
    var currentVideoId = null;
    yta._videoIds = options.sources.map(YTA.parseVideoId);
  
    if (options.shuffle) {
      yta._videoIds = yta._videoIds.sort(function() {
        return Math.random() < 0.5 ? -1 : 1;
      });
    }

    yta._loop = !!options.loop;

    if (options.autoPlay == undefined) {
      options.autoPlay = true;
    }
    yta._autoPlay = options.autoPlay;
  
    // Add the IFRAME player to the DOM.
    var div = document.createElement('div');
    div.id = ('ytm' + Math.random() + Math.random()).replace(/\./g, '');
    div.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;overflow:hidden;';
    document.body.appendChild(div);
  
    // This function create a YouTube player.
    yta._player = new YouTube.Player(div.id, {
      videoId: yta.getVideoId(),
      height: '0',
      width: '0',
      playerVars: {
        origin: options.origin || location.origin,
        autoplay: options.autoPlay ? 1 : 0
      },
      events: {
        onReady: function(event) {
          yta._isReady = true;
          triggerHandlers(yta, 'ready', event);
        },
        onStateChange: function(event) {
          if (YouTube.PlayerState.PLAYING == event.data) {
            triggerHandlers(yta, 'playing', event);
            var newVideoId = yta._player.getVideoData().video_id;
            if (newVideoId !== currentVideoId) {
              currentVideoId = newVideoId;
              triggerHandlers(yta, 'start', event);
            }
          }
          else if (YouTube.PlayerState.PAUSED == event.data) {
            triggerHandlers(yta, 'pause', event);
          }
          else if (YouTube.PlayerState.ENDED == event.data) {
            triggerHandlers(yta, 'end', event);
            if (yta._loop) {
              yta.playNext();
            }
          }

          triggerHandlers(yta, 'stateChange', event);
        }
      }
    });
  }

  var prototype = {
    _isReady: false,
    _readyCallbacks: null,
    _readyEvent: null,
    _videoIds: null,
    _index: 0,
    _player: null,
    constructor: YTA,
    getVideoIds: function() {
      return this._videoIds.slice();
    },
    getVideoUrls: function() {
      return this._videoIds.map(YTA.getUrlFromVideoId);
    },
    getVideoId: function() {
      return this._videoIds[this._index];
    },
    getVideoUrl: function() {
      return YTA.getUrlFromVideoId(this._videoIds[this._index]);
    },
    setSources: function(newSources) {
      var oldVideoIds = this._videoIds;
      this._videoIds = newSources.map(YTA.parseVideoId);
      return oldVideoIds;
    },
    getStateName: function() {
      return PLAYER_STATES_TO_NAMES[this._player.getPlayerState()];
    },
    playNext: function() {
      this._index = mod(this._index + 1, this._videoIds.length);
      this._player.loadVideoById(this.getVideoId());
    },
    playPrevious: function() {
      this._index = mod(this._index - 1, this._videoIds.length);
      this._player.loadVideoById(this.getVideoId());
    },
    restart: function() {
      this._player.loadVideoById(this.getVideoId());
    },
    setVolume: function(volume) {
      var lastVolume = this._player.getVolume();
      this._player.setVolume(volume);
      return lastVolume;
    },
    onPlaying: function(callback) {
      (this._playingCallbacks = this._playingCallbacks || []).push(callback);
    },
    onPause: function(callback) {
      (this._pauseCallbacks = this._pauseCallbacks || []).push(callback);
    },
    onStart: function(callback) {
      (this._startCallbacks = this._startCallbacks || []).push(callback);
    },
    onEnd: function(callback) {
      (this._endCallbacks = this._endCallbacks || []).push(callback);
    },
    onStateChange: function(callback) {
      (this._stateChangeCallbacks = this._stateChangeCallbacks || []).push(callback);
    },
    onReady: function(callback) {
      if (this._isReady) {
        callback.call(this, this._readyEvent);
      }
      else {
        (this._readyCallbacks = this._readyCallbacks || []).push(callback);
      }
      return this._isReady;
    },
    init: function(options) {
      // Make sure the options is an object.
      options = Object(options);

      var self = this;
      self.init = function() {
        throw new Error("This object's init() function was already called.");
      };
      Object.keys(YTA.prototype).forEach(function(key) {
        var value = YTA.prototype[key];
        if (!/^(init$|getVideoId$|on[A-Z])/.test(key) && 'function' === typeof value) {
          self[key] = function() {
            if (self._isReady) {
              delete self[key];
              return self[key].apply(this, arguments);
            }
            var message = 'The ' + key + '() function cannot be called yet.';
            if (options.logEarlyCalls) {
              console.error(message);
            }
            else {
              throw new Error(message);
            }
          };
        }
      });
      callUntil(function() {
        if (['interactive','complete'].indexOf(document.readyState) >= 0) {
          callUntil(function() {
            if (YouTube || (global.YT && 'function' == typeof YT.Player)) {
              if (!YouTube) {
                YouTube = global.YT;
                PLAYER_STATES_TO_NAMES = Object.keys(YouTube.PlayerState).reduce(function(carry, name) {
                  carry[YouTube.PlayerState[name]] = name;
                  return carry;
                }, {});
              }
              addAudio(self, options);
              return true;
            }
            else if (!isLoadingYTScript) {
              isLoadingYTScript = true;
              loadYTScript();
            }
          }, 50);
          return true;
        }
      }, 50);
    }
  };

  var mapping = {
    play: 'playVideo',
    stop: 'stopVideo',
    pause: 'pauseVideo',
    setVolume: 'o:setVolume',
    getCurrentTime: 1,
    getVolume: 1,
    unMute: 0,
    mute: 0,
    seekTo: 0,
    getVideoUrl: 1,
    getVideoData: 1,
    getDuration: 1,
    isMuted: 1
  };

  Object.keys(mapping).forEach(function(key) {
    var value = mapping[key];
    var fromKey = key;
    var getOld;
    if ('string' === typeof value) {
      value = value.replace(/^o:/, function() {
        getOld = true;
        return '';
      });
      fromKey = value;
      value = 0;
    }
    var code = (value ? 'return ' : '') + 'this._player.' + fromKey + '.apply(this._player, arguments)';
    if (getOld) {
      code = 'var o=this._player.g' + fromKey.slice(1) + '();' + code + ';return o';
    }
    else {
      prototype[key] = Function(code);
    }
  });


  'BUFFERING CUED ENDED PAUSED PLAYING UNSTARTED'.replace(/(\w)(\w+)/g, function(m, c1, rest) {
    prototype['is' + c1 + rest.toLowerCase()] = function() {
      return PLAYER_STATES_TO_NAMES[this._player.getPlayerState()] === m;
    };
  });

  '*isReady loop *autoPlay'.replace(/(\*?)((\w)(\w+))/g, function(m, isGetOnly, key, c1, rest) {
    var tcRest = c1.toUpperCase() + rest;
    var key = c1 + rest;
    if (!isGetOnly) {
      prototype['set' + tcRest] = Function('i', 'var o=this._' + key + ';this._' + key + '=i;return o');
    }
    prototype['get' + tcRest] = Function('return this._' + key);
  });

  extend(YTA, { 
    prototype: prototype,
    parseVideoId: function(source) {
      return source.replace(/^[^]*?[\?&]v=([^&]+)[^]*$|^[^]*?:\/\/youtu.be\/([^\/\?]+)[^]*$/, '$1$2');
    },
    getUrlFromVideoId: function(videoId) {
      return 'https://youtu.be/' + videoId;
    }
  });
})();
