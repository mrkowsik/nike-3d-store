import React, { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
const AUDIO_SRC = `${BASE}audio/bgm.mp3`;
const TARGET_VOLUME = 0.35;
const STORAGE_KEY = 'nike_bgm_disabled';

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
    // Check if user previously chose to turn music off
    const isExplicitlyDisabled = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isExplicitlyDisabled) {
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
          // Waiting for first user interaction
        });
    };

    const cleanupListeners = () => {
      const events = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchstart', 'wheel'];
      events.forEach((evt) => {
        window.removeEventListener(evt, startPlayback);
        document.removeEventListener(evt, startPlayback);
      });
    };

    if (!isExplicitlyDisabled) {
      // 1. Try immediate playback on visit
      startPlayback();

      // 2. Listen across all natural visitor interactions
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
      // User explicitly turned music OFF -> remember preference and keep it OFF
      userPausedRef.current = true;
      localStorage.setItem(STORAGE_KEY, 'true');
      fadeOut(audio, () => setIsPlaying(false));
    } else {
      // User turned music ON -> clear disabled preference and resume playback
      userPausedRef.current = false;
      localStorage.removeItem(STORAGE_KEY);
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
