import React, { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
const AUDIO_SRC = `${BASE}audio/bgm.mp3`;
const TARGET_VOLUME = 0.35;

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const userPausedRef = useRef(false);
  const fadeIntervalRef = useRef(null);

  // Smooth fade-in
  const fadeIn = (audio) => {
    clearInterval(fadeIntervalRef.current);
    audio.volume = 0;
    fadeIntervalRef.current = setInterval(() => {
      if (audio.volume < TARGET_VOLUME) {
        audio.volume = Math.min(TARGET_VOLUME, +(audio.volume + 0.05).toFixed(2));
      } else {
        clearInterval(fadeIntervalRef.current);
      }
    }, 80);
  };

  // Smooth fade-out
  const fadeOut = (audio, onComplete) => {
    clearInterval(fadeIntervalRef.current);
    fadeIntervalRef.current = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume = Math.max(0, +(audio.volume - 0.05).toFixed(2));
      } else {
        clearInterval(fadeIntervalRef.current);
        audio.pause();
        onComplete?.();
      }
    }, 60);
  };

  useEffect(() => {
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
          // Autoplay blocked by browser policy, keep listeners active
        });
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointerdown', startPlayback);
      window.removeEventListener('keydown', startPlayback);
      window.removeEventListener('touchstart', startPlayback);
    };

    // Try immediate playback (in case browser allows autoplay)
    startPlayback();

    // Listen for first interaction to unlock audio
    window.addEventListener('pointerdown', startPlayback, { once: true });
    window.addEventListener('keydown', startPlayback, { once: true });
    window.addEventListener('touchstart', startPlayback, { once: true });

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
      userPausedRef.current = true;
      fadeOut(audio, () => setIsPlaying(false));
    } else {
      userPausedRef.current = false;
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
      aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
      title={isPlaying ? 'Pause music' : 'Play music'}
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
