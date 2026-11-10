"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { backgroundMusic } from "../data/portfolio";

// Quieter than full volume so it sits in the background.
const VOLUME = 0.35;

// "loading": asked for, the file is still on its way. "failed": it
// couldn't be loaded or played.
type State = "off" | "loading" | "on" | "failed";

// A small round button that plays or pauses the background song.
// Nothing plays until the visitor presses it (browsers also block
// autoplaying audio). The song loops while it's on. The button shows
// what was asked for: pressed while the song loads or plays, so a second
// press stops it either way. If the song can't be loaded, the button goes
// back to off and a short note under it says so (read out too).
export default function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>("off");
  const on = state === "loading" || state === "on";

  // The note goes away on its own after a few seconds
  useEffect(() => {
    if (state !== "failed") return;
    const timer = window.setTimeout(() => setState((s) => (s === "failed" ? "off" : s)), 6000);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function toggleMusic() {
    const song = audio.current;
    if (!song) return;

    if (on) {
      song.pause();
      setState("off");
      return;
    }

    song.volume = VOLUME;
    // Shown now, not batched with the outcome: after a failure, a second
    // try clears the note first, so a second failure is announced again
    flushSync(() => setState("loading"));
    try {
      await song.play();
      setState((s) => (s === "loading" ? "on" : s));
    } catch (error) {
      // Paused again before it started: that's not a failure
      if (error instanceof DOMException && error.name === "AbortError") return;
      // The file is missing or the browser refused to play it
      setState("failed");
    }
  }

  const label = `${on ? "Pause" : "Play"} background music: ${backgroundMusic.title} by ${backgroundMusic.artist}`;

  return (
    <>
      <button
        type="button"
        onClick={toggleMusic}
        aria-label={label}
        aria-pressed={on}
        title={label}
        className="hover-grow flex size-8 items-center justify-center rounded-full bg-foreground/5 text-muted hover:bg-foreground/10 hover:text-foreground aria-pressed:text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {on ? (
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
      {/* Always in the page, so screen readers hear it when it fills */}
      <span role="status" className="music-status">
        {state === "failed" ? "The music couldn't be loaded." : ""}
      </span>
      <audio
        ref={audio}
        src={backgroundMusic.src}
        loop
        preload="none"
        onPlaying={() => setState("on")}
        onPause={() => setState((s) => (s === "failed" ? s : "off"))}
        onError={() => setState("failed")}
      />
    </>
  );
}
