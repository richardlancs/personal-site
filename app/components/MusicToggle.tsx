"use client";

import { useRef, useState } from "react";
import { backgroundMusic } from "../data/portfolio";

// Quieter than full volume so it sits in the background.
const VOLUME = 0.35;

// A small round button that plays or pauses the background song.
// Nothing plays until the visitor presses it (browsers also block
// autoplaying audio). The song loops while it's on.
export default function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  async function toggleMusic() {
    const song = audio.current;
    if (!song) return;

    if (playing) {
      song.pause();
      setPlaying(false);
      return;
    }

    song.volume = VOLUME;
    try {
      await song.play();
      setPlaying(true);
    } catch {
      // The file is missing or the browser refused to play it.
      setPlaying(false);
    }
  }

  const label = `${playing ? "Pause" : "Play"} background music: ${backgroundMusic.title} by ${backgroundMusic.artist}`;

  return (
    <>
      <button
        type="button"
        onClick={toggleMusic}
        aria-label={label}
        aria-pressed={playing}
        title={label}
        className="hover-grow flex size-8 items-center justify-center rounded-full bg-foreground/5 text-muted hover:bg-foreground/10 hover:text-foreground aria-pressed:text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {playing ? (
            // Pause
            <path d="M9 6v12M15 6v12" />
          ) : (
            // Music note
            <>
              <path d="M9 18V5.5l10-2V16" />
              <circle cx="6.5" cy="18" r="2.5" />
              <circle cx="16.5" cy="16" r="2.5" />
            </>
          )}
        </svg>
      </button>
      <audio
        ref={audio}
        src={backgroundMusic.src}
        loop
        preload="none"
        onPause={() => setPlaying(false)}
      />
    </>
  );
}
