"use client";

import { useEffect, useState } from "react";
import { DAYLIGHTS, WEATHER_PRESETS, type SkyState } from "../../../lib/sky";
import { useWorld, world } from "../store";
import { parseSkyParam } from "./param";

// Development only (World3D.tsx loads it only when NODE_ENV is
// "development", so a production build has none of it): every weather
// preset at every time of day, set as a preview the live reading doesn't
// override, and "Follow live" to hand the sky back.
//
// For screenshots, the same from the address: ?sky=rain-night, or with
// how far into the phase, ?sky=clear-dusk-0.8. ?sky=live hands it back.

const preview = (sky: Omit<SkyState, "source">) => world.set({ sky: { ...sky, source: "preview" } });
// The live driver takes over again from the fallback
const followLive = () => world.set({ sky: { ...world.get().sky, source: "fallback" } });

export default function DevSkyPanel() {
  const sky = useWorld((s) => s.sky);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(location.search).get("sky");
    if (param === "live") followLive();
    const parsed = parseSkyParam(param);
    if (parsed) world.set({ sky: parsed });
  }, []);

  const button = (on: boolean): React.CSSProperties => ({
    font: "inherit",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid #b9ad9d",
    background: on ? "#1e107a" : "#fff9f2",
    color: on ? "#fff9f2" : "#1d1e1e",
    cursor: "pointer",
  });

  return (
    <div
      data-dev-sky-panel
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 60,
        font: "12px/1.4 ui-monospace, monospace",
        color: "#1d1e1e",
        background: "#fff9f2",
        border: "1px solid #b9ad9d",
        borderRadius: 8,
        padding: open ? 10 : 4,
        boxShadow: "0 2px 10px rgb(29 30 30 / 0.15)",
      }}
    >
      <button type="button" style={button(false)} onClick={() => setOpen(!open)} aria-expanded={open}>
        sky: {sky.preset} · {sky.daylight} · {sky.source}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 3 }}>
            <tbody>
              {WEATHER_PRESETS.map((preset) => (
                <tr key={preset}>
                  <th style={{ textAlign: "left", fontWeight: 500, paddingRight: 6 }}>{preset}</th>
                  {DAYLIGHTS.map((daylight) => (
                    <td key={daylight}>
                      <button
                        type="button"
                        style={button(sky.preset === preset && sky.daylight === daylight && sky.source === "preview")}
                        onClick={() => preview({ preset, daylight, progress: sky.daylight === daylight ? sky.progress : 0.5 })}
                      >
                        {daylight}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            progress
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sky.progress}
              onChange={(e) => preview({ preset: sky.preset, daylight: sky.daylight, progress: Number(e.target.value) })}
            />
            {sky.progress.toFixed(2)}
          </label>
          <button type="button" style={button(sky.source !== "preview")} onClick={followLive}>
            Follow live
          </button>
        </div>
      )}
    </div>
  );
}
