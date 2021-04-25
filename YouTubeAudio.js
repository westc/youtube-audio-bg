/**
 * @license Copyright 2021 - Chris West - MIT Licensed
 * @see https://github.com/westc/youtube-audio-bg/
 * @see https://developers.google.com/youtube/iframe_api_reference
 * Provides a way to embed YouTube on a web page and just play the audio.
 */
(function() {
  class YouTubeAudio {
    /**
     * Creates a YouTubeAudio instance.
     * @param {?YouTubeAudioOptions=} options
     *   The options used to initialize this instance of YouTubeAudio.
     */
    constructor(options) {
      const self = this;
      self._loop = !!options.loop;
      self._videoIds = [];
      self._orderedVideoIds = [];
      self._listenersByName = {};
      self._autoPlay = !!options.autoPlay;
      
      const workedOnInitial = callUntil(function() {
        const YT = window.YT;
        if (YT && YT.Player) {
          constructYTA(self, Object(options));
          return true;
        }
      }, 250);
  
      // If it didn't work on the initial try to load YT.Player().
      if (!workedOnInitial) {
        loadYT();
      }
    }
  
    /**
     * Updates the `loop` value.
     * @param {boolean} loop
     *   Indicates whether or not the items to be played will loop over after
     *   reaching the end.
     * @returns {boolean}
     *   The previous `loop` value.
     */
    setLoop(loop) {
      const prev = this._loop;
      this._player.setLoop(this._loop = !!loop);
      return prev;
    }
  
    /**
     * Gets a value indicating whether or not the items to be played will loop
     * over after reaching the end.
     * @returns {boolean}
     *   The value indicating whether or not the items to be played will loop over
     *   after reaching the end.
     */
    getLoop() {
      return this._loop;
    }
  
    /**
     * Seeks to a specified time in the video. If the player is paused when the
     * function is called, it will remain paused. If the function is called from
     * another state (playing, video cued, etc.), the player will play the video.
     * @param {number} seconds
     *   The seconds parameter identifies the time to which the player should
     *   advance.
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    seekTo(seconds) {
      this._player.seekTo(seconds);
      return this;
    }
  
    /**
     * Plays the currently cued/loaded item. The final player state after this
     * function executes will be "playing".
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    play() {
      this._player.playVideo();
      return this;
    }
  
    /**
     * Pauses the currently playing item. The final player state after this
     * function executes will be paused unless the player is in the ended state
     * when the function is called, in which case the player state will not
     * change.
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    pause() {
      this._player.pauseVideo();
      return this;
    }
  
    /**
     * Stops and cancels loading of the current item. This function should be
     * reserved for rare situations when you know that the user will not be
     * watching additional item in the player. If your intent is to pause the
     * item, you should just call the `pause()` function. If you want to change
     * the item that the player is playing, you can call one of the queueing
     * functions without calling `stop()` first.  Important: Unlike the `pause()`
     * function, which leaves the player in the paused state, the `stop()`
     * function could put the player into any not-playing state, including ended,
     * paused, cued or unstarted.
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    stop() {
      this._player.stopVideo();
      return this;
    }
  
    /**
     * This function loads and plays the next item in the playlist.
     * - If `next()` is called while the last item in the playlist is being
     *   played, and the playlist is set to play continuously (loop), then the
     *   first item in the list will be played.
     * - If `next()` is called while the last item in the playlist is being
     *   played, and the playlist is not set to play continuously, then playback
     *   will end.
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    next() {
      this._player.nextVideo();
      return this;
    }
  
    /**
     * This function loads and plays the previous item in the playlist.
     * - If `previous()` is called while the first item in the playlist is being
     *   played, and the playlist is set to play continuously (loop), then the
     *   player will load and play the last item in the list.
     * - If `previous()` is called while the first item in the playlist is being
     *   played, and the playlist is not set to play continuously, then the player
     *   will restart the first playlist item from the beginning.
     * @returns {YouTubeAudio}
     *   This instance of the YouTubeAudio.
     */
    previous() {
      this._player.previousVideo();
      return this;
    }
  
    /**
     * Overwrites the list of items to be played.  Playback will start immediately
     * if auto-play was set to `true`.
     * @param {Array<string>|string} items
     *   The items to be randomized and cued up to play.
     * @returns {YouTubeAudio}
     *   The current instance of YouTubeAudio.
     */
    cueItems(items) {
      if (this._autoPlay) {
        this.on('cued', _ => this._player.playVideo(), 1);
      }
      this._player.cuePlaylist(items.map(v => YouTubeAudio.parseVideoId(v)));
      this._player.setLoop(this._loop);
      return this;
    }
    
    /**
     * Overwrites the list of items to be played.  Playback will start immediately
     * if auto-play was set to `true`.
     * @param {Array<string>|string} items
     *   The items to be cued up to play.
     * @returns {YouTubeAudio}
     *   The current instance of YouTubeAudio.
     */
    cueShuffledItems(items) {
      let indices = [];
      for (let i = 0, l = items.length; i < l; i++) {
        indices.splice(Math.round(Math.random() * i), 0, i);
      }
      this._player.setLoop(this._loop);
      return this.cueItems(indices.map(i => items[i]));
    }
  
    /**
     * Sets whether or not calling `cueItems()` or `cueShuffledItems()` will
     * automatically play the specified items.
     * @param {boolean} newAutoPlay
     *   If `true` specified `cueItems()` and cueShuffledItems()` will
     *   automatically play the specified items.
     * @returns {boolean}
     *   The previously set value.
     */
    setAutoPlay(newAutoPlay) {
      const oldAutoPlay = this._autoPlay;
      this._autoPlay = !!newAutoPlay;
      return oldAutoPlay;
    }
  
    /**
     * Gets the value indicating if items will be played right after they have
     * been cued.
     * @returns {boolean}
     *   Value indicating if items will be played right after they have been cued.
     */
    getAutoPlay() {
      return this._autoPlay;
    }
  
    /**
     * Sets the volume.
     * @param {number} newVolume
     *   The new volume to set (0 to 100).
     * @returns {number}
     *   The previously set volume.
     */
    setVolume(newVolume) {
      const _player = this._player;
      const oldVolume = _player.getVolume();
      _player.setVolume(newVolume);
      return oldVolume;
    }
  
    /**
     * The current volume setting between 0 and 100.
     * @returns {number}
     *   The current volume setting between 0 and 100.
     */
    getVolume() {
      return this._player.getVolume();
    }
  
    /**
     * Mutes the sound from the YouTube player.
     * @returns {YouTubeAudio}
     *   Reference to this YouTubeAudio instance.
     */
    mute() {
      this._player.mute();
      return this;
    }
  
    /**
     * Unmutes the sound from the YouTube player.
     * @returns {YouTubeAudio}
     *   Reference to this YouTubeAudio instance.
     */
    unmute() {
      this._player.unMute();
      return this;
    }
  
    /**
     * Indicates whether the player is currently muted.
     * @returns {boolean}
     *   Boolean indicating if the player is currently muted.
     */
    isMuted() {
      return this._player.isMuted();
    }

    /**
     * Indicates whether the YouTubeAudio is ready to be used.
     * @returns {boolean}
     *   A boolean value indicating whether or no the YouTubeAudio is ready to
     *   be used.
     */
    isReady() {
      return !!this._readyArguments;
    }

    /**
     * Attempts to stop any videos and remove the YouTube IFRAME from the DOM.
     * @returns {boolean}
     *   A value indicating if the YouTubeAudio was successfully destroyed.
     */
    destroy() {
      const wrapper = this._wrapper;
      const parentNode = wrapper && wrapper.parentNode;
      if (parentNode) {
        this._player.stopVideo();
        parentNode.removeChild(wrapper);
        return true;
      }
      return false;
    }
  
    /**
     * Triggers the given event by name.
     * @param {string} eventName
     *   The name of the event.
     * @param {...*} args
     *   Any arguments that should be passed to the event listeners.
     * @returns {YouTubeAudio}
     *   A reference to this instance of the YouTubeAudio.
     */
    trigger(eventName, args) {
      const listeners = this._listenersByName[eventName];
      if (!listeners) return;
      for (let id in listeners) {
        id = +id;
        if (id === id) {
          const listener = listeners[id];
          if (0 < listener.limit--) {
            try {
              listener.handler.apply(this, args);
            }
            catch (e) {
              setTimeout(_ => { throw e; }, 0);
            }
          }
          else {
            this.off(eventName + ':' + id);
          }
        }
      }
      return this;
    }
  
    /**
     * Listens for the given event and executes the callback whenever it occurs.
     * @param {string} eventName
     *   The name of the event to bind to.
     * @param {Function} callback
     *   The callback function called whenever the specified event is triggered.
     * @param {number} opt_limit
     *   The maximum number of times that the given event will trigger this
     *   callback.
     * @returns {string}
     *   The ID of the listener that can be used to remove the listener.
     */
    on(eventName, callback, opt_limit=Infinity) {
      const listeners = this._listenersByName[eventName] = this._listenersByName[eventName] || { nextId: 1 };
      const id = listeners.nextId++;
      const listener = listeners[id] = {
        handler: callback,
        limit: opt_limit
      };
      
      // If the desired event is the onReady event and it has already fired fire
      // it immediately as long as the limit isn't too low.
      const _readyArguments = this._readyArguments;
      if (eventName === 'ready' && _readyArguments) {
        if (0 < listener.limit--) {
          try {
            listener.handler.apply(this, _readyArguments);
          }
          catch (e) {
            setTimeout(_ => { throw e; }, 0);
          }
        }
      }

      // Return the listenerId that can be passed to `off()`.
      return eventName + ':' + id;
    }
  
    /**
     * Removes the given event listener.
     * @param {string} listenerId
     *   The ID of the listener that is to be removed.
     * @returns {Function}
     *   The callback function associated with the given listener.
     */
    off(listenerId) {
      const listenerIdParts = listenerId.split(':', 2);
      const eventName = listenerIdParts[0];
      const id = listenerIdParts[1];
      const _listenersByName = this._listenersByName;
      const listener = _listenersByName[eventName][id];
      delete _listenersByName[eventName][id];
      return listener.handler;
    }
  
    /**
     * Gets the name of the current state of the YouTube player.
     * @returns {string}
     *   The uppercased name of the state which will be one of the following:
     *   BUFFERING, CUED, ENDED, PAUSED, PLAYING, or UNSTARTED.  If the state is
     *   not valid `undefined` will be returned.
     */
    getState() {
      return YouTubeAudio.States[this._stateId];
    }
  }
  
  /**
   * Used to call a function every so often until it run successfully.
   * @param {Function} callback
   *   Function which is called immediately.  If the callback returns a
   *   `true`-ish value that value will be returned by this function.
   *   Otherwise the callback will be called at the given interval over and over
   *   again until a `true`-ish value is returned.  After the initial call to
   *   callback the return value will only be used to indicate if another call
   *   to callback should be made.
   * @param {number} opt_interval
   *   The interval at which subsequent calls should be made to callback.  This
   *   is the amount of time to wait after the previous run.
   * @param {?Array=} opt_args
   *   Arguments to send to the callback function.
   * @returns {*}
   *   If the first callback returns a `true`-ish value then this value will be
   *   returned.  Otherwise undefined will be returned.
   */
  function callUntil(callback, opt_interval=1e3, opt_args=[]) {
    const self = this;
    function wrapper() {
      try {
        const initialResult = callback.apply(self, opt_args);
        if (!initialResult) {
          setTimeout(wrapper, opt_interval);
        }
        return initialResult;
      }
      catch (e) {
        setTimeout(function() { throw e; });
      }
    }
  
    return wrapper();
  }
  
  /**
   * Parses a YouTube video ID from a URL or a just returns a video ID if it is
   * passed in.
   * @param {strirng} urlOrId
   *   Takes an URL or a YouTube video ID and returns the corresponding video ID
   *   if one can be deciphered.
   * @returns {string|undefined}
   *   If the ID is found it will be returned, otherwise `undefined`.
   */
  YouTubeAudio.parseVideoId = function(urlOrId) {
    return urlOrId.replace(
      /^https?\:\/\/(?:youtu\.be\/([\w\-]+)[^]*|[^]+[\?&]v=([\w\-]+))$|([\w\-]+)/g,
      '$1$2$3'
    );
  };
  
  /**
   * Initializes a YouTubeAudio instance.
   * @param {YouTubeAudio} yta
   *   The YouTubeAudio instance being initialized.
   * @param {YouTubeAudioOptions} options
   *   The options specified for this YouTubeAudio.
   */
  function constructYTA(yta, options) {
    const REAL_STATES = YT.PlayerState;
    // NOTE:  `Object.keys()` is in bracket notation for closure compiler.
    // https://github.com/google/closure-compiler/issues/2448#issuecomment-826356533
    YouTubeAudio.States = Object['keys'](YT.PlayerState).reduce(
      (STATES, key) => {
        const value = REAL_STATES[key];
        if ('number' === typeof value) {
          STATES[STATES[value] = key] = value;
        }
        return STATES;
      },
      {}
    );
  
    // If events were passed as options make sure to add the corresponding
    // listeners.
    for (let key in options) {
      if (options.hasOwnProperty(key) && /^on[A-Z]\w*$/.test(key)) {
        const eventName = key.charAt(2).toLowerCase() + key.slice(3);
        yta.on(
          key[2].toLowerCase() + key.slice(3), // eventName
          options[key]
        );
      }
    }
  
    const wrapper = yta._wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    wrapper.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;overflow:hidden;';
    yta._player = new YT.Player(wrapper, {
      height: '390',
      width: '640',
      events: {
        onReady() {
          yta._readyArguments = arguments;
          const items = options.items || options.shuffledItems;
          if (items) {
            yta[options.items ? 'cueItems' : 'cueShuffledItems'](items);
          }
          yta.trigger('ready', arguments);
        },
        onStateChange(event) {
          event.state = YouTubeAudio.States[event.data];
          event.stateId = event.data;
          yta._stateId = event.stateId;
          yta.trigger('stateChange', arguments);
          yta.trigger(event.state.toLowerCase(), arguments);
        }
      }
    });
  }
  
  /**
   * Function that is used to setup the YouTube JavaScript API.  Only to be called
   * once internally.
   */
  function loadYT() {
    // Only call this function once.
    if (loadYT.alreadyCalled) return;
    loadYT.alreadyCalled = true;
  
    var script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
  
    const OLD_YT_READY = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
      window.onYouTubeIframeAPIReady = OLD_YT_READY;
      if ('function' === typeof OLD_YT_READY) {
        OLD_YT_READY.apply(this, arguments);
      }
    };
  }
  
  /**
   * Object used to specify the options that initialize a YouTubeAudio object.
   * @typedef {Object} YouTubeAudioOptions
   * @property {Array<string>} items
   *   Used to indicate the initial YouTube video IDs or URLs to start off with
   *   and the ordering will be kept.  This property cannot be used at the same
   *   time as the `shuffledItems` property is used.
   * @property {Array<string>} shuffledItems
   *   Used to indicate the initial YouTube video IDs or URLs to start off with
   *   but the ordering will be shuffled.  This property cannot be used at the
   *   same time as the `shuffledItems` property is used.
   * @property {boolean} loop
   *   If `true` indicates that the array of items supplied will be played in a
   *   loop.  This property is persistent.
   * @property {boolean} autoPlay
   *   If `true` indicates that the array of items supplied will be played
   *   automatically.  This property is persistent.
   * @property {Function} onReady
   *   If specified this function will be called as soon as the YouTubeAudio
   *   instance is ready to be used.
   * @property {Function} onStateChange
   *   If specified this function will be called every time the YouTube player's
   *   state changes.
   * @property {Function} onPaused
   *   If specified this function will be called every time the YouTube player's
   *   state changes to paused.
   * @property {Function} onCued
   *   If specified this function will be called every time the YouTube player's
   *   state changes to cued.
   * @property {Function} onPlaying
   *   If specified this function will be called every time the YouTube player's
   *   state changes to playing.
   * @property {Function} onUnstarted
   *   If specified this function will be called every time the YouTube player's
   *   state changes to unstarted.
   * @property {Function} onEnded
   *   If specified this function will be called every time the YouTube player's
   *   state changes to ended.
   * @property {Function} onBuffering
   *   If specified this function will be called every time the YouTube player's
   *   state changes to buffering.
   */

  window.YouTubeAudio = YouTubeAudio;
})();
