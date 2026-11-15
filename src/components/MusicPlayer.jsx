import React, { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
const AUDIO_SRC = `${BASE}audio/bgm.mp3`;
const TARGET_VOLUME = 0.35;
const STORAGE_KEY = 'nike_bgm_session_muted';

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const userPausedRef = useRef(false);
  const fadeIntervalRef = useRef(null);

  // Smooth volume fade-in
  const fadeIn = (audio) => {
    clearInterval(fadeIntervalRef.current);
    audio.volume = 0;
    fadeIntervalRef.current = setInterval(() => {
      if (audio.volume < TARGET_VOLUME) {
        audio.volume = Math.min(TARGET_VOLUME, +(audio.volume + 0.05).toFixed(2));
      } else {
        clearInterval(fadeIntervalRef.current);
      }
    }, 60);
  };

  // Smooth volume fade-out
  const fadeOut = (audio, onComplete) => {
    clearInterval(fadeIntervalRef.current);
    fadeIntervalRef.current = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume = Math.max(0, +(audio.volume - 0.05).toFixed(2));
      } else {
        clearInterval(fadeIntervalRef.current);
        audio.volume = 0;
        audio.pause();
        onComplete?.();
      }
    }, 50);
  };

  useEffect(() => {
    // Clear old permanent localStorage mute flag if present from previous testing
    try {
      localStorage.removeItem('nike_bgm_disabled');
    } catch {}

    // Check if user explicitly turned music off during this session
    let isSessionMuted = false;
    try {
      isSessionMuted = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {}

    if (isSessionMuted) {
      userPausedRef.current = true;
    }

    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    const startPlayback = () => {
      if (userPausedRef.current) return;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio);
          cleanupListeners();
        })
        .catch(() => {
          // Awaiting user gesture per browser policy
        });
    };

    const cleanupListeners = () => {
      const events = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchstart', 'wheel'];
      events.forEach((evt) => {
        window.removeEventListener(evt, startPlayback);
        document.removeEventListener(evt, startPlayback);
      });
    };

    if (!isSessionMuted) {
      // 1. Try immediate playback on page mount
      startPlayback();

      // 2. Listen on user's first touch / click / scroll across the store
      const events = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchstart', 'wheel'];
      events.forEach((evt) => {
        window.addEventListener(evt, startPlayback, { once: true, passive: true });
        document.addEventListener(evt, startPlayback, { once: true, passive: true });
      });
    }

    return () => {
      cleanupListeners();
      clearInterval(fadeIntervalRef.current);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // User explicitly turned music OFF -> remember for current session and pause
      userPausedRef.current = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      fadeOut(audio, () => setIsPlaying(false));
    } else {
      // User turned music ON -> clear muted flag and resume playback
      userPausedRef.current = false;
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      audio.play().then(() => {
        setIsPlaying(true);
        fadeIn(audio);
      });
    }
  };

  return (
    <button
      type="button"
      className={`music-toggle ${isPlaying ? 'is-playing' : 'is-paused'}`}
      onClick={togglePlay}
      aria-label={isPlaying ? 'Turn music off' : 'Turn music on'}
      title={isPlaying ? 'Turn music off' : 'Turn music on'}
    >
      {isPlaying ? (
        <span className="music-bars" aria-hidden="true">
          <span className="music-bar" />
          <span className="music-bar" />
          <span className="music-bar" />
          <span className="music-bar" />
        </span>
      ) : (
        <svg
          className="music-muted-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
