"use client";

import * as THREE from "three";
import type { Interest } from "../../../data/portfolio";
import { fonts } from "../kit/textures";
import { ACTIONS, BOARD, deal, handName, knightMoves, nextKnightSquare, rankLabel, shotGoesIn, type Card } from "./arcadeLogic";

// The arcade's one machine (Arcade.tsx): every interest is a mode of it,
// a small game on its screen, drawn live on a canvas while it's on.
// Changing mode boots the screen (a moment of dark, a line of light that
// opens into the picture, a loading bar, the game's title); each game has
// one thing to do (shoot, smash, move the knight, deal), by a click on the
// screen or a press of the machine's button or the page's.
//
// In still view nothing moves on its own: the boot is skipped, the screen
// holds a frame, and a press jumps straight to how it turns out.
//
// Its colours are the city's: the screen and the marquee soft black (the
// interface's ink), each mode drawn in one of the night street's three
// neon tones (kit/neon.ts: SCENE_TONES, repeated here as plain colours so
// this file stays free of the kit's materials), the words in the
// interface's pale text colour. No scanlines.

const W = 512;
const H = 400;
const FLOOR = 336;
const BOOT = 0.9;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - (1 - x) * (1 - x);
// The interface's soft blacks and pale text (app/city.css: --ink, --ink-2,
// --panel, --text), and each mode's tone
const INK = "#08090c";
const INK_2 = "#101217";
const PANEL = "#181b23";
const TEXT = "#e6e9ee";
const TONES: Record<Interest["scene"], [number, number, number]> = {
  basketball: [255, 180, 84], // gold
  badminton: [79, 216, 238], // cyan
  chess: [79, 216, 238], // cyan
  poker: [240, 98, 180], // rose
};
const rgba = ([r, g, b]: [number, number, number], a = 1) => `rgba(${r},${g},${b},${a})`;
const square = ([c, r]: [number, number]) => `${"abcde"[c]}${r + 1}`;

// The chess board's squares on the screen
const CELL = 54;
const BX = (W - CELL * BOARD) / 2;
const BY = 62;
const cellAt = ([c, r]: [number, number]) => [BX + c * CELL + CELL / 2, BY + (BOARD - 1 - r) * CELL + CELL / 2];

type Point = { x: number; y: number };

export function createMachine(modes: Interest[]) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // The marquee over the screen: the mode's name, lit
  const mc = document.createElement("canvas");
  mc.width = 512;
  mc.height = 112;
  const mg = mc.getContext("2d")!;
  const marquee = new THREE.CanvasTexture(mc);
  marquee.colorSpace = THREE.SRGBColorSpace;

  let mode = 0;
  let bootAt = -Infinity;
  // Each game's state; times are the world clock's seconds
  const ball = { score: 0, shots: 0, at: -Infinity, in: true };
  const shuttle = { rally: 0, at: -Infinity, from: { x: 0, y: 0 } as Point };
  const knight = { at: [0, 0] as [number, number], from: [0, 0] as [number, number], hopAt: -Infinity, visited: new Set(["0,0"]) };
  const cards = { deals: 0, at: -Infinity, hand: [] as Card[] };

  const scene = () => modes[mode].scene;
  const tone = () => TONES[scene()];
  const ink = () => rgba(tone());

  function drawMarquee() {
    const f = fonts();
    mg.fillStyle = INK_2;
    mg.fillRect(0, 0, 512, 112);
    // a thin line of the mode's tone round the edge
    mg.strokeStyle = rgba(tone(), 0.9);
    mg.lineWidth = 4;
    mg.strokeRect(6, 6, 500, 100);
    mg.fillStyle = rgba(tone());
    mg.font = `700 60px ${f.display}`;
    mg.textAlign = "center";
    mg.textBaseline = "middle";
    mg.fillText(modes[mode].name, 256, 60);
    marquee.needsUpdate = true;
  }

  function setMode(i: number, t: number, still: boolean) {
    mode = i;
    bootAt = still ? -Infinity : t;
    drawMarquee();
  }

  // Basketball: the ball by the shooter, bouncing as it's dribbled; a
  // shot goes up in an arc to the hoop, then through or off the rim
  const SHOOTER = { x: 120, y: FLOOR - 18 };
  const RIM = { x: 410, y: 156 };
  const ballAt = (t: number, still: boolean): Point & { flying: boolean } => {
    const p = still ? (ball.shots ? 1.6 : -1) : t - ball.at;
    if (p < 0 || p > 1.6) return { x: SHOOTER.x, y: still ? SHOOTER.y - 40 : FLOOR - 18 - Math.abs(Math.sin(t * 3.2)) * 70, flying: false };
    if (p < 1) {
      const k = p;
      const x = SHOOTER.x + (RIM.x - SHOOTER.x) * k;
      const y = (1 - k) * (SHOOTER.y - 60) + k * (RIM.y - 14) - Math.sin(k * Math.PI) * 170;
      return { x, y, flying: true };
    }
    const k = (p - 1) / 0.6;
    if (ball.in) return { x: RIM.x, y: RIM.y - 14 + ease(k) * (FLOOR - 18 - RIM.y + 14), flying: true };
    return { x: RIM.x - 30 - k * 120, y: RIM.y - 14 - Math.sin(k * Math.PI) * 60 + k * (FLOOR - 18 - RIM.y + 14), flying: true };
  };

  // Badminton: a rally over the net between two players; a smash sends
  // the shuttle steeply down into the far court
  const P1 = 80;
  const P2 = 432;
  const shuttleAt = (t: number, still: boolean): Point & { smash: number } => {
    const since = still ? 9 : t - shuttle.at;
    if (since >= 0 && since < 1.3) {
      const k = clamp01(since / 0.45);
      const land = { x: 400, y: FLOOR - 6 };
      return { x: shuttle.from.x + (land.x - shuttle.from.x) * ease(k), y: shuttle.from.y + (land.y - shuttle.from.y) * k * k, smash: 1 - since / 1.3 };
    }
    const tt = still ? 0.62 : t;
    const leg = (tt * 0.62) % 2;
    const k = leg < 1 ? leg : 2 - leg;
    const x = P1 + 26 + (P2 - P1 - 52) * k;
    const y = FLOOR - 120 - Math.sin(k * Math.PI) * 150;
    return { x, y, smash: 0 };
  };

  // Poker: where the cards are, dealt one after another and turned over
  const SLOT = (k: number) => ({ x: 158 + k * 76, y: 176 });
  const DECK = { x: 64, y: 176 };

  function press(uv: THREE.Vector2 | null, t: number, still: boolean): string | null {
    if (!still && t - bootAt < BOOT) return null;
    const at = uv ? { x: uv.x * W, y: (1 - uv.y) * H } : null;
    const near = (p: Point, r: number) => !at || Math.hypot(at.x - p.x, at.y - p.y) < r;
    switch (scene()) {
      case "basketball": {
        if (ballAt(t, false).flying && !still) return null;
        if (!near(ballAt(t, still), 60)) return null;
        ball.in = shotGoesIn(ball.shots++);
        if (ball.in) ball.score += 2;
        ball.at = t;
        return ball.in ? `Swish! Score ${ball.score}` : `Off the rim. Score ${ball.score}`;
      }
      case "badminton": {
        const s = shuttleAt(t, still);
        if (s.smash > 0 && !still) return null;
        if (!near(s, 70)) return null;
        shuttle.from = { x: s.x, y: s.y };
        shuttle.at = t;
        shuttle.rally++;
        return `Smash! ${shuttle.rally} won`;
      }
      case "chess": {
        if (!still && t - knight.hopAt < 0.4) return null;
        let to: [number, number] | undefined;
        if (at) {
          to = knightMoves(knight.at).find((sq) => {
            const [x, y] = cellAt(sq);
            return Math.abs(at.x - x) < CELL / 2 && Math.abs(at.y - y) < CELL / 2;
          });
          if (!to) return null;
        } else to = nextKnightSquare(knight.at, knight.visited);
        if (knight.visited.size >= BOARD * BOARD) knight.visited = new Set([`${knight.at[0]},${knight.at[1]}`]);
        knight.from = knight.at;
        knight.at = to;
        knight.hopAt = t;
        knight.visited.add(`${to[0]},${to[1]}`);
        return `Knight to ${square(to)}. ${knight.visited.size} squares visited`;
      }
      case "poker": {
        if (!still && t - cards.at < 1.2) return null;
        if (at && !(Math.abs(at.x - DECK.x) < 50 && Math.abs(at.y - DECK.y) < 60) && !(at.y > 110 && at.y < 240 && at.x > 110)) return null;
        cards.hand = deal(cards.deals++);
        cards.at = t;
        return handName(cards.hand);
      }
    }
  }

  function text(s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", weight = 700) {
    g.font = `${weight} ${size}px ${fonts().text}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(s, x, y);
  }

  function drawCard(x: number, y: number, card: Card | null, flip: number) {
    // flip: 0 face down, 1 face up; the card narrows through the turn
    const wScale = Math.abs(Math.cos(flip * Math.PI));
    const w = 64 * Math.max(0.06, wScale);
    const up = flip > 0.5;
    g.fillStyle = up ? TEXT : PANEL;
    g.fillRect(x - w / 2, y - 48, w, 96);
    g.strokeStyle = up ? "#b9bec7" : rgba(TONES.poker, 0.8);
    g.lineWidth = 2;
    g.strokeRect(x - w / 2 + 3, y - 45, w - 6, 90);
    if (up && card && wScale > 0.5) {
      const red = card.suit === 1 || card.suit === 2;
      const color = red ? "#b8306f" : INK_2;
      text(rankLabel(card.rank), x, y - 6, 32, color);
      text(["♠", "♥", "♦", "♣"][card.suit], x, y + 32, 28, color);
    }
  }

  function drawGame(t: number, still: boolean) {
    const s = scene();
    const fg = ink();
    g.strokeStyle = fg;
    g.fillStyle = fg;
    g.lineWidth = 4;
    g.lineCap = "round";
    if (s !== "chess") {
      g.globalAlpha = 0.45;
      g.fillRect(24, FLOOR, W - 48, 4);
      g.globalAlpha = 1;
    }
    if (s === "basketball") {
      // The shooter, the hoop on its pole, the ball
      g.beginPath();
      g.arc(SHOOTER.x - 34, FLOOR - 112, 13, 0, Math.PI * 2);
      g.moveTo(SHOOTER.x - 34, FLOOR - 98);
      g.lineTo(SHOOTER.x - 34, FLOOR - 50);
      g.lineTo(SHOOTER.x - 50, FLOOR);
      g.moveTo(SHOOTER.x - 34, FLOOR - 50);
      g.lineTo(SHOOTER.x - 18, FLOOR);
      g.moveTo(SHOOTER.x - 34, FLOOR - 86);
      g.lineTo(SHOOTER.x - 6, FLOOR - 70);
      g.moveTo(462, FLOOR);
      g.lineTo(462, RIM.y - 60);
      g.stroke();
      g.fillRect(450, RIM.y - 70, 8, 70);
      g.fillRect(RIM.x - 28, RIM.y - 2, 60, 5);
      g.globalAlpha = 0.6;
      g.lineWidth = 2;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        g.moveTo(RIM.x - 26 + k * 13, RIM.y + 3);
        g.lineTo(RIM.x - 18 + k * 9, RIM.y + 34);
      }
      g.stroke();
      g.globalAlpha = 1;
      const b = ballAt(t, still);
      g.fillStyle = "#f08a3c";
      g.beginPath();
      g.arc(b.x, b.y, 16, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#5a2a10";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(b.x - 16, b.y);
      g.lineTo(b.x + 16, b.y);
      g.moveTo(b.x, b.y - 16);
      g.lineTo(b.x, b.y + 16);
      g.stroke();
      text(`SCORE ${ball.score}`, 30, 44, 28, fg, "left");
      const since = t - ball.at;
      if (ball.shots && (still || (since > 1 && since < 2.2))) text(ball.in ? "SWISH!" : "RIM OUT", W / 2, 110, 34, TEXT);
    } else if (s === "badminton") {
      // The net, two players with their rackets, the shuttle
      g.fillRect(W / 2 - 2, FLOOR - 90, 4, 90);
      g.globalAlpha = 0.5;
      for (let k = 0; k < 6; k++) g.fillRect(W / 2 - 14, FLOOR - 88 + k * 14, 28, 2);
      g.globalAlpha = 1;
      const sh = shuttleAt(t, still);
      for (const [x, dir] of [
        [P1, 1],
        [P2, -1],
      ]) {
        g.beginPath();
        g.arc(x, FLOOR - 112, 13, 0, Math.PI * 2);
        g.moveTo(x, FLOOR - 98);
        g.lineTo(x, FLOOR - 50);
        g.lineTo(x - 14, FLOOR);
        g.moveTo(x, FLOOR - 50);
        g.lineTo(x + 14, FLOOR);
        g.moveTo(x, FLOOR - 86);
        g.lineTo(x + dir * 26, FLOOR - 120);
        g.stroke();
        g.beginPath();
        g.ellipse(x + dir * 34, FLOOR - 136, 10, 14, dir * 0.4, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = TEXT;
      g.beginPath();
      g.moveTo(sh.x, sh.y + 8);
      g.lineTo(sh.x - 10, sh.y - 10);
      g.lineTo(sh.x + 10, sh.y - 10);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(sh.x, sh.y + 8, 5, 0, Math.PI * 2);
      g.fill();
      text(`WON ${shuttle.rally}`, 30, 44, 28, fg, "left");
      if (sh.smash > 0 || (still && shuttle.rally)) text("SMASH!", W / 2, 110, 34, TEXT);
    } else if (s === "chess") {
      // The board, the squares the knight has been to, where it can go
      const moves = knightMoves(knight.at);
      for (let c2 = 0; c2 < BOARD; c2++)
        for (let r = 0; r < BOARD; r++) {
          const [x, y] = cellAt([c2, r]);
          g.fillStyle = (c2 + r) % 2 ? "rgba(255,255,255,0.06)" : rgba(TONES.chess, 0.22);
          g.fillRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
          if (knight.visited.has(`${c2},${r}`)) {
            g.fillStyle = rgba(TONES.chess, 0.3);
            g.fillRect(x - CELL / 2 + 4, y - CELL / 2 + 4, CELL - 8, CELL - 8);
          }
        }
      const pulse = still ? 1 : 0.65 + Math.sin(t * 4) * 0.35;
      g.fillStyle = TEXT;
      for (const sq of moves) {
        const [x, y] = cellAt(sq);
        g.globalAlpha = pulse;
        g.beginPath();
        g.arc(x, y, 8, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      const k = still ? 1 : clamp01((t - knight.hopAt) / 0.35);
      const [fx, fy] = cellAt(knight.from);
      const [tx, ty] = cellAt(knight.at);
      const x = fx + (tx - fx) * ease(k);
      const y = fy + (ty - fy) * ease(k) - Math.sin(k * Math.PI) * 30;
      g.fillStyle = TEXT;
      g.beginPath();
      g.moveTo(x - 15, y + 20);
      g.lineTo(x + 15, y + 20);
      g.lineTo(x + 11, y - 2);
      g.lineTo(x + 6, y - 20);
      g.lineTo(x - 4, y - 22);
      g.lineTo(x - 16, y - 6);
      g.lineTo(x - 12, y);
      g.lineTo(x - 2, y - 4);
      g.lineTo(x - 8, y + 10);
      g.closePath();
      g.fill();
      text(`${knight.visited.size}/${BOARD * BOARD}`, 30, 44, 28, fg, "left");
    } else {
      // The deck, and the hand dealt from it
      for (let k = 3; k >= 0; k--) drawCard(DECK.x - k * 2, DECK.y - k * 2, null, 0);
      const since = still ? 9 : t - cards.at;
      cards.hand.forEach((card, k) => {
        const start = k * 0.12;
        const fly = clamp01((since - start) / 0.25);
        if (fly <= 0) return;
        const slot = SLOT(k);
        const x = DECK.x + (slot.x - DECK.x) * ease(fly);
        const flip = clamp01((since - 0.7 - k * 0.06) / 0.25);
        drawCard(x, slot.y, card, flip);
      });
      if (!cards.hand.length)
        for (let k = 0; k < 5; k++) {
          const slot = SLOT(k);
          g.globalAlpha = 0.35;
          g.strokeStyle = fg;
          g.lineWidth = 2;
          g.strokeRect(slot.x - 32, slot.y - 48, 64, 96);
          g.globalAlpha = 1;
        }
      if (cards.hand.length && since > 1.1) text(handName(cards.hand).toUpperCase(), W / 2 + 40, 292, 34, TEXT);
      text(`HAND ${cards.deals}`, 30, 44, 28, fg, "left");
    }
    text(modes[mode].name.toUpperCase(), W - 30, 44, 28, TEXT, "right");
    g.globalAlpha = 0.75;
    // (right of middle: the stick stands in front of the screen's lower left)
    text(ACTIONS[s].hint, W / 2 + 60, H - 22, 24, fg, "center", 700);
    g.globalAlpha = 1;
  }

  // The boot: dark, a line of light opening into the picture, the bar
  function drawBoot(k: number) {
    const fg = ink();
    if (k < 0.15) return;
    if (k < 0.38) {
      const open = (k - 0.15) / 0.23;
      const h = Math.max(2, open * open * H);
      g.fillStyle = rgba(tone(), 1 - open * 0.6);
      g.fillRect(0, H / 2 - h / 2, W, h);
      return;
    }
    if (k < 0.78) {
      const fill = (k - 0.38) / 0.4;
      text("LOADING", W / 2, 170, 30, fg);
      g.strokeStyle = fg;
      g.lineWidth = 3;
      g.strokeRect(126, 200, 260, 22);
      g.fillStyle = fg;
      g.fillRect(130, 204, 252 * fill, 14);
      return;
    }
    text(modes[mode].name.toUpperCase(), W / 2, 210, 54, TEXT);
  }

  function draw(t: number, on: boolean, still: boolean) {
    g.fillStyle = on ? INK_2 : INK;
    g.fillRect(0, 0, W, H);
    if (on) {
      const boot = still ? 1 : (t - bootAt) / BOOT;
      if (boot >= 0 && boot < 1) drawBoot(boot);
      else drawGame(t, still);
      g.textAlign = "left";
    } else {
      g.fillStyle = "rgba(158,165,177,0.05)";
      g.fillRect(30, 30, W - 60, H - 60);
    }
    tex.needsUpdate = true;
  }

  drawMarquee();
  draw(0, false, true);
  // (the canvases too, for a scene that paints them onto its own faces)
  return { tex, marquee, canvas: c, marqueeCanvas: mc, setMode, press, draw, mode: () => mode };
}
