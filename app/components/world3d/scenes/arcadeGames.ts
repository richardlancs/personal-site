"use client";

import * as THREE from "three";
import type { Interest } from "../../../data/portfolio";
import { fonts } from "../textures";

// The arcade's cabinets' screens (Arcade.tsx): each plays its interest as
// a little game, drawn live on a canvas while the cabinet is on.

// The moment each screen's game is held at in still view: the ball on its
// way up, the shuttle near the top, the knight mid-hop, five cards dealt
export const STILL_FRAME = 4.4;

// The cabinet's screen: a little game that plays the interest, drawn
// live on a canvas while the cabinet is on
export function attractScreen(interest: Interest, hue: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 200;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (t: number, on: boolean) => {
    const f = fonts();
    g.fillStyle = on ? "#141a22" : "#0b0d0c";
    g.fillRect(0, 0, 256, 200);
    if (!on) {
      g.fillStyle = "rgba(160,190,170,0.06)";
      g.fillRect(20, 20, 216, 160);
      tex.needsUpdate = true;
      return;
    }
    const ink = `hsl(${hue},70%,72%)`;
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = 3;
    // The floor line
    g.globalAlpha = 0.4;
    g.fillRect(20, 150, 216, 3);
    g.globalAlpha = 1;
    const s = interest.scene;
    if (s === "basketball") {
      // A hoop, and the ball bouncing toward it
      g.strokeRect(196, 52, 26, 4);
      g.beginPath();
      g.moveTo(222, 30);
      g.lineTo(222, 150);
      g.stroke();
      const p = (t * 0.6) % 1;
      const x = 40 + p * 160;
      const y = 140 - Math.abs(Math.sin(p * Math.PI * 3)) * (90 - p * 40);
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fill();
    } else if (s === "badminton") {
      g.fillRect(126, 95, 4, 55);
      g.globalAlpha = 0.5;
      for (let k = 0; k < 5; k++) g.fillRect(118, 95 + k * 6, 20, 1);
      g.globalAlpha = 1;
      const p = (Math.sin(t * 1.4) + 1) / 2;
      const x = 40 + p * 176;
      const y = 140 - Math.sin(p * Math.PI) * 110;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 8, y - 12);
      g.lineTo(x + 8, y - 12);
      g.closePath();
      g.fill();
    } else if (s === "chess") {
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 8; col++) {
          g.globalAlpha = (row + col) % 2 ? 0.55 : 0.15;
          g.fillRect(28 + col * 25, 50 + row * 25, 25, 25);
        }
      g.globalAlpha = 1;
      const step = Math.floor(t * 0.8) % 4;
      const hop = (t * 0.8) % 1;
      const x = 40 + step * 50 + hop * 25;
      const y = 120 - Math.sin(hop * Math.PI) * 30 - step * 0;
      g.fillStyle = "#fff3d6";
      g.beginPath();
      g.moveTo(x - 9, y + 12);
      g.lineTo(x + 9, y + 12);
      g.lineTo(x + 6, y - 6);
      g.lineTo(x - 2, y - 12);
      g.lineTo(x - 9, y - 4);
      g.closePath();
      g.fill();
    } else {
      // Cards dealt one after another
      const n = Math.floor(t * 1.2) % 6;
      for (let k = 0; k < Math.min(n, 5); k++) {
        g.fillStyle = "#f3ecdc";
        g.fillRect(34 + k * 40, 70, 30, 44);
        g.fillStyle = k % 2 ? "#c2493c" : "#22262a";
        g.font = `700 18px ${f.text}`;
        g.fillText(["A", "K", "Q", "J", "10"][k], 39 + k * 40, 92);
      }
    }
    g.fillStyle = "#fff3d6";
    g.font = `700 20px ${f.text}`;
    g.textAlign = "center";
    g.fillText(interest.name.toUpperCase(), 128, 34);
    // The cabinets show an interest; they aren't games, so nothing asks for a coin
    g.textAlign = "left";
    // Scanlines
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < 200; y += 3) g.fillRect(0, y, 256, 1);
    tex.needsUpdate = true;
  };
  draw(0, false);
  return { tex, draw };
}
