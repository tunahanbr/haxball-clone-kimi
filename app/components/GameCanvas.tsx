"use client";

import { useEffect, useRef, RefObject } from "react";
import { Room } from "colyseus.js";
import { GameState, Player, Ball, PowerUp } from "../schemas/GameState";
import { PlayerInput } from "../types/game";
import { sendInput } from "../hooks/useNetworkGame";

const BALL_COLOR = "#ffffff";
const BALL_GLOW = "rgba(255,255,255,0.6)";
const GOAL_POST = "#ffffff";
const RED_GLOW = "rgba(239,68,68,0.9)";
const BLUE_GLOW = "rgba(59,130,246,0.9)";
const RED_TRAIL = "rgba(239,68,68,0.5)";
const BLUE_TRAIL = "rgba(59,130,246,0.5)";
const POWERUP_RADIUS_PX = 14;
const BALL_TRAIL_SPEED_THRESHOLD = 5;
const SHAKE_PLAYER_SPEED_THRESHOLD = 8;

const THEMES = {
  dark: {
    outerBg: "#2d7a3a",
    grassDark: "#2d7a3a",
    grassLight: "#338542",
    fieldLine: "rgba(255,255,255,0.92)",
    netBg: "rgba(0,0,0,0.22)",
    netLine: "rgba(255,255,255,0.28)",
    scorePill: "rgba(0,0,0,0.55)",
  },
  light: {
    outerBg: "#6abf70",
    grassDark: "#57a85f",
    grassLight: "#6abf70",
    fieldLine: "rgba(255,255,255,0.95)",
    netBg: "rgba(0,0,0,0.15)",
    netLine: "rgba(255,255,255,0.35)",
    scorePill: "rgba(0,0,0,0.35)",
  },
};

type Theme = "dark" | "light";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type BallTrailPoint = {
  x: number;
  y: number;
  age: number;
};

type GameCanvasProps = {
  room: Room<GameState> | null;
  state: GameState | null;
  sessionId: string | null;
  theme: Theme;
};

export function GameCanvas({ room, state, sessionId, theme }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(state);
  const themeRef = useRef<Theme>(theme);
  const scoreRef = useRef({ red: 0, blue: 0 });
  const goalPopupRef = useRef<{ team: string; startTime: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ballTrailRef = useRef<BallTrailPoint[]>([]);
  const shakeRef = useRef({ x: 0, y: 0, decay: 0 });
  const prevPlayersRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());

  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const inputRef = useRef<PlayerInput>({
    up: false, down: false, left: false, right: false, kick: false, dash: false,
  });
  const inputLockedRef = useRef(false);

  useEffect(() => {
    const isShift = (e: KeyboardEvent) => e.key === "Shift" || e.code.startsWith("Shift");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (inputLockedRef.current) return;
      const k = e.key;
      if (k === " " || isShift(e)) e.preventDefault();

      let changed = false;
      if (k === "ArrowUp" || k === "w" || k === "W") { changed = !inputRef.current.up; inputRef.current.up = true; }
      if (k === "ArrowDown" || k === "s" || k === "S") { changed = !inputRef.current.down; inputRef.current.down = true; }
      if (k === "ArrowLeft" || k === "a" || k === "A") { changed = !inputRef.current.left; inputRef.current.left = true; }
      if (k === "ArrowRight" || k === "d" || k === "D") { changed = !inputRef.current.right; inputRef.current.right = true; }
      if (k === " " || e.code === "Space") { changed = !inputRef.current.kick; inputRef.current.kick = true; }
      if (isShift(e)) { changed = !inputRef.current.dash; inputRef.current.dash = true; }

      if (changed) sendInput(room, inputRef.current);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") inputRef.current.up = false;
      if (k === "ArrowDown" || k === "s" || k === "S") inputRef.current.down = false;
      if (k === "ArrowLeft" || k === "a" || k === "A") inputRef.current.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") inputRef.current.right = false;
      if (k === " " || e.code === "Space") inputRef.current.kick = false;
      if (isShift(e)) inputRef.current.dash = false;
      sendInput(room, inputRef.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [room]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = Math.floor(entry.contentRect.width);
        canvas.height = Math.floor(entry.contentRect.height);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const deltaMs = Math.min(now - lastTime, 50);
      lastTime = now;
      const s = stateRef.current;

      if (s) {
        const isLocked = s.roomStatus === "countdown" || s.roomStatus === "game_over";
        inputLockedRef.current = isLocked;

        const colors = THEMES[themeRef.current];
        const view = computeView(canvas, s);

        if (s.scoreRed !== scoreRef.current.red || s.scoreBlue !== scoreRef.current.blue) {
          const team = s.scoreRed > scoreRef.current.red ? "red" : "blue";
          goalPopupRef.current = { team, startTime: Date.now() };
          scoreRef.current = { red: s.scoreRed, blue: s.scoreBlue };
          spawnGoalParticles(particlesRef.current, s.ball.x, s.ball.y, team, view);
        }

        detectPlayerCollisions(s, prevPlayersRef, shakeRef);

        updateBallTrail(ballTrailRef.current, s.ball, view, deltaMs);
        updateParticles(particlesRef.current, deltaMs);
        updateShake(shakeRef, deltaMs);

        ctx.save();
        if (shakeRef.current.x !== 0 || shakeRef.current.y !== 0) {
          ctx.translate(shakeRef.current.x, shakeRef.current.y);
        }

        ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);
        drawField(ctx, s, view, colors);
        drawNet(ctx, s, view, colors);
        drawGoals(ctx, s, view, colors);

        drawBallTrail(ctx, ballTrailRef.current, s.ball.radius, view);
        drawParticles(ctx, particlesRef.current);
        drawBall(ctx, s.ball, view);

        s.powerUps.forEach((pu) => drawPowerUp(ctx, pu, view));

        s.players.forEach((player, id) => {
          drawPlayer(ctx, player, id === sessionId, view);
        });

        ctx.restore();

        drawScore(ctx, canvas.width, s, colors);

        const localPlayer = sessionId ? s.players.get(sessionId) : undefined;
        if (localPlayer && s.roomStatus !== "game_over") {
          drawPlayerHUD(ctx, canvas, localPlayer);
        }

        if (goalPopupRef.current) {
          const elapsed = Date.now() - goalPopupRef.current.startTime;
          const duration = 1800;
          if (elapsed < duration) {
            drawGoalPopup(ctx, canvas, goalPopupRef.current.team, elapsed / duration);
          } else {
            goalPopupRef.current = null;
          }
        }

        if (s.roomStatus === "countdown") {
          drawCountdown(ctx, canvas, s.countdownMs);
        }

        if (s.roomStatus === "game_over") {
          drawGameOver(ctx, canvas, s);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame((t) => { lastTime = t; render(t); });
    return () => cancelAnimationFrame(rafId);
  }, [sessionId]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-crosshair"
      aria-label="Haxball multiplayer canvas"
    />
  );
}

type View = { scale: number; offsetX: number; offsetY: number };

function computeView(canvas: HTMLCanvasElement, state: GameState): View {
  const totalWidth = state.fieldWidth + state.goalDepth * 2;
  const totalHeight = state.fieldHeight;
  const scale = Math.min(canvas.width / totalWidth, canvas.height / totalHeight);
  const offsetX = (canvas.width - totalWidth * scale) * 0.5 + state.goalDepth * scale;
  const offsetY = (canvas.height - totalHeight * scale) * 0.5;
  return { scale, offsetX, offsetY };
}

function toScreen(x: number, y: number, view: View) {
  return { x: x * view.scale + view.offsetX, y: y * view.scale + view.offsetY };
}

function updateBallTrail(trail: BallTrailPoint[], ball: Ball, view: View, deltaMs: number) {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > BALL_TRAIL_SPEED_THRESHOLD) {
    const pos = toScreen(ball.x, ball.y, view);
    trail.push({ x: pos.x, y: pos.y, age: 0 });
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].age += deltaMs;
    if (trail[i].age > 300) trail.splice(i, 1);
  }
  if (trail.length > 20) trail.splice(0, trail.length - 20);
}

function drawBallTrail(ctx: CanvasRenderingContext2D, trail: BallTrailPoint[], ballRadius: number, view: View) {
  const r = ballRadius * view.scale;
  for (const point of trail) {
    const alpha = Math.max(0, 1 - point.age / 300) * 0.35;
    const size = r * (1 - point.age / 300) * 0.8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function spawnGoalParticles(particles: Particle[], bx: number, by: number, team: string, view: View) {
  const pos = toScreen(bx, by, view);
  const color = team === "red" ? "#ef4444" : "#3b82f6";
  const altColor = team === "red" ? "#f87171" : "#60a5fa";
  for (let i = 0; i < 48; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 800 + Math.random() * 400,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.5 ? color : altColor,
    });
  }
}

function updateParticles(particles: Particle[], deltaMs: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += deltaMs;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.life >= p.maxLife) particles.splice(i, 1);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function detectPlayerCollisions(
  s: GameState,
  prevPlayersRef: RefObject<Map<string, { vx: number; vy: number }>>,
  shakeRef: RefObject<{ x: number; y: number; decay: number }>
) {
  s.players.forEach((player, id) => {
    const prev = prevPlayersRef.current.get(id);
    if (prev) {
      const dvx = player.vx - prev.vx;
      const dvy = player.vy - prev.vy;
      const delta = Math.sqrt(dvx * dvx + dvy * dvy);
      if (delta > SHAKE_PLAYER_SPEED_THRESHOLD) {
        const intensity = Math.min(delta / 20, 1) * 5;
        shakeRef.current.x = (Math.random() - 0.5) * intensity;
        shakeRef.current.y = (Math.random() - 0.5) * intensity;
        shakeRef.current.decay = intensity;
      }
    }
    prevPlayersRef.current.set(id, { vx: player.vx, vy: player.vy });
  });
}

function updateShake(shakeRef: RefObject<{ x: number; y: number; decay: number }>, deltaMs: number) {
  const s = shakeRef.current;
  if (s.decay > 0) {
    s.decay = Math.max(0, s.decay - deltaMs * 0.04);
    s.x *= 0.75;
    s.y *= 0.75;
    if (s.decay < 0.1) { s.x = 0; s.y = 0; }
  }
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, view: View) {
  const pos = toScreen(pu.x, pu.y, view);
  const r = POWERUP_RADIUS_PX * view.scale;
  const t = Date.now() / 1000;
  const pulse = 1 + Math.sin(t * 3) * 0.12;
  const color = pu.kind === "MAGNET" ? "#a855f7" : "#f59e0b";
  const glow = pu.kind === "MAGNET" ? "rgba(168,85,247,0.8)" : "rgba(245,158,11,0.8)";

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(t * 1.2);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 6;
    const mx = Math.cos(angle) * r;
    const my = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.lineTo(mx, my);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.font = `bold ${Math.round(r * 0.8)}px ui-sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(pu.kind === "MAGNET" ? "M" : "H", pos.x, pos.y);
  ctx.restore();
}

function drawField(ctx: CanvasRenderingContext2D, state: GameState, view: View, colors: typeof THEMES.dark) {
  ctx.fillStyle = colors.outerBg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const topLeft = toScreen(0, 0, view);
  const bottomRight = toScreen(state.fieldWidth, state.fieldHeight, view);
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const cr = 40 * view.scale;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(topLeft.x, topLeft.y, width, height, cr);
  ctx.clip();

  const stripeCount = 8;
  const sw = width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.grassDark : colors.grassLight;
    ctx.fillRect(topLeft.x + i * sw, topLeft.y, sw, height);
  }
  ctx.restore();

  const lw = Math.max(1.5, view.scale * 1.5);
  ctx.strokeStyle = colors.fieldLine;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(topLeft.x, topLeft.y, width, height, cr);
  ctx.stroke();

  const cx = topLeft.x + width * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, topLeft.y);
  ctx.lineTo(cx, bottomRight.y);
  ctx.stroke();

  const cy = topLeft.y + height * 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) * 0.12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawNet(ctx: CanvasRenderingContext2D, state: GameState, view: View, colors: typeof THEMES.dark) {
  const { fieldWidth, fieldHeight, goalWidth, goalDepth } = state;
  const centerY = fieldHeight * 0.5;
  const goalHalf = goalWidth * 0.5;
  const goalTop = centerY - goalHalf;
  const goalBottom = centerY + goalHalf;

  const leftMouthTop = toScreen(0, goalTop, view);
  const leftBackBottom = toScreen(-goalDepth, goalBottom, view);
  const rightMouthTop = toScreen(fieldWidth, goalTop, view);
  const rightBackBottom = toScreen(fieldWidth + goalDepth, goalBottom, view);

  ctx.fillStyle = colors.netBg;
  ctx.fillRect(leftBackBottom.x, leftMouthTop.y, leftMouthTop.x - leftBackBottom.x, leftBackBottom.y - leftMouthTop.y);
  ctx.fillRect(rightMouthTop.x, rightMouthTop.y, rightBackBottom.x - rightMouthTop.x, rightBackBottom.y - rightMouthTop.y);

  const cellSize = 15;
  ctx.strokeStyle = colors.netLine;
  ctx.lineWidth = Math.max(0.5, view.scale * 0.6);

  for (let y = goalTop; y <= goalBottom + cellSize; y += cellSize) {
    const cy = Math.min(y, goalBottom);
    const ls = toScreen(-goalDepth, cy, view);
    const le = toScreen(0, cy, view);
    ctx.beginPath(); ctx.moveTo(ls.x, ls.y); ctx.lineTo(le.x, le.y); ctx.stroke();
    const rs = toScreen(fieldWidth, cy, view);
    const re = toScreen(fieldWidth + goalDepth, cy, view);
    ctx.beginPath(); ctx.moveTo(rs.x, rs.y); ctx.lineTo(re.x, re.y); ctx.stroke();
  }

  for (let x = -goalDepth; x <= 0; x += cellSize) {
    const ls = toScreen(x, goalTop, view);
    const le = toScreen(x, goalBottom, view);
    ctx.beginPath(); ctx.moveTo(ls.x, ls.y); ctx.lineTo(le.x, le.y); ctx.stroke();
  }
  for (let x = fieldWidth; x <= fieldWidth + goalDepth; x += cellSize) {
    const rs = toScreen(x, goalTop, view);
    const re = toScreen(x, goalBottom, view);
    ctx.beginPath(); ctx.moveTo(rs.x, rs.y); ctx.lineTo(re.x, re.y); ctx.stroke();
  }
}

function drawGoals(ctx: CanvasRenderingContext2D, state: GameState, view: View, colors: typeof THEMES.dark) {
  const goalHalf = state.goalWidth * 0.5;
  const centerY = state.fieldHeight * 0.5;
  const depth = state.goalDepth;
  const postRadius = 7 * view.scale;
  const lw = Math.max(1.5, view.scale * 1.5);

  const leftMouthTop = toScreen(0, centerY - goalHalf, view);
  const leftMouthBottom = toScreen(0, centerY + goalHalf, view);
  const leftBackTop = toScreen(-depth, centerY - goalHalf, view);
  const leftBackBottom = toScreen(-depth, centerY + goalHalf, view);
  const rightMouthTop = toScreen(state.fieldWidth, centerY - goalHalf, view);
  const rightMouthBottom = toScreen(state.fieldWidth, centerY + goalHalf, view);
  const rightBackTop = toScreen(state.fieldWidth + depth, centerY - goalHalf, view);
  const rightBackBottom = toScreen(state.fieldWidth + depth, centerY + goalHalf, view);

  ctx.strokeStyle = colors.fieldLine;
  ctx.lineWidth = lw;

  ctx.beginPath();
  ctx.moveTo(leftBackTop.x, leftBackTop.y);
  ctx.lineTo(leftMouthTop.x, leftMouthTop.y);
  ctx.lineTo(leftMouthBottom.x, leftMouthBottom.y);
  ctx.lineTo(leftBackBottom.x, leftBackBottom.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightBackTop.x, rightBackTop.y);
  ctx.lineTo(rightMouthTop.x, rightMouthTop.y);
  ctx.lineTo(rightMouthBottom.x, rightMouthBottom.y);
  ctx.lineTo(rightBackBottom.x, rightBackBottom.y);
  ctx.stroke();

  [leftMouthTop, leftMouthBottom, rightMouthTop, rightMouthBottom].forEach(({ x, y }) => drawPost(ctx, x, y, postRadius));
}

function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = GOAL_POST;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isLocal: boolean, view: View) {
  const isKicking = player.kickRemainingMs > 0;
  const isDashing = player.dashRemainingMs > 0;
  const hasPowerUp = player.powerUpType !== "";
  const pos = toScreen(player.x, player.y, view);
  const r = 18 * view.scale;
  const teamGlow = player.team === "red" ? RED_GLOW : BLUE_GLOW;
  const trailColor = player.team === "red" ? RED_TRAIL : BLUE_TRAIL;

  if (isDashing) drawDashTrail(ctx, player, pos.x, pos.y, view, trailColor);

  if (hasPowerUp) {
    const puColor = player.powerUpType === "MAGNET" ? "rgba(168,85,247,0.4)" : "rgba(245,158,11,0.4)";
    const t = Date.now() / 1000;
    const auraR = r + 8 + Math.sin(t * 4) * 3;
    ctx.save();
    ctx.shadowColor = player.powerUpType === "MAGNET" ? "rgba(168,85,247,0.9)" : "rgba(245,158,11,0.9)";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = puColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, auraR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = teamGlow;
  ctx.shadowBlur = isDashing ? 48 : isKicking ? 32 : isLocal ? 24 : 14;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (isLocal) {
    ctx.save();
    if (isKicking) { ctx.shadowColor = "rgba(255,255,255,0.9)"; ctx.shadowBlur = 14; }
    ctx.strokeStyle = isKicking ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = isKicking ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayerHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, player: Player) {
  const pad = 16;
  const baseX = pad;
  let baseY = canvas.height - pad;

  if (player.powerUpType !== "") {
    baseY = drawPowerUpHUD(ctx, baseX, baseY, player) - 10;
  }

  drawDashHUD(ctx, baseX, baseY, player);
}

function drawDashHUD(ctx: CanvasRenderingContext2D, x: number, bottomY: number, player: Player) {
  const maxCooldown = 3000;
  const ready = player.dashCooldownMs <= 0;
  const progress = ready ? 1 : 1 - player.dashCooldownMs / maxCooldown;
  const teamColor = player.team === "red" ? "#ef4444" : "#3b82f6";

  const w = 150;
  const h = 40;
  const y = bottomY - h;

  ctx.save();
  ctx.fillStyle = "rgba(10,10,10,0.55)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 9px ui-sans-serif, system-ui";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("DASH", x + 12, y + 16);

  ctx.textAlign = "right";
  ctx.fillStyle = ready ? "rgba(52,211,153,0.9)" : "rgba(255,255,255,0.4)";
  ctx.fillText(ready ? "SHIFT · READY" : "RECHARGING", x + w - 12, y + 16);

  const barX = x + 12;
  const barY = y + 24;
  const barW = w - 24;
  const barH = 6;

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, barH / 2);
  ctx.fill();

  if (ready) {
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = ready ? teamColor : "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerUpHUD(ctx: CanvasRenderingContext2D, x: number, bottomY: number, player: Player): number {
  const maxDuration = 5000;
  const progress = Math.max(0, Math.min(1, player.powerUpRemainingMs / maxDuration));
  const seconds = Math.ceil(player.powerUpRemainingMs / 1000);
  const isMagnet = player.powerUpType === "MAGNET";
  const color = isMagnet ? "#a855f7" : "#f59e0b";
  const glow = isMagnet ? "rgba(168,85,247,0.7)" : "rgba(245,158,11,0.7)";
  const name = isMagnet ? "MAGNET" : "HEAVY";

  const w = 150;
  const h = 48;
  const y = bottomY - h;

  ctx.save();
  ctx.fillStyle = "rgba(10,10,10,0.6)";
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.stroke();

  const iconX = x + 22;
  const iconY = y + 24;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(iconX, iconY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isMagnet ? "M" : "H", iconX, iconY + 0.5);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 11px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(name, x + 40, y + 19);

  ctx.font = "600 11px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.fillText(`${seconds}s`, x + w - 12, y + 19);

  const barX = x + 40;
  const barY = y + 28;
  const barW = w - 52;
  const barH = 5;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, barH / 2);
  ctx.fill();

  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
  ctx.fill();
  ctx.restore();

  return y;
}

function drawDashTrail(
  ctx: CanvasRenderingContext2D,
  player: Player,
  px: number,
  py: number,
  view: View,
  trailColor: string
) {
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed < 0.1) return;
  const intensity = Math.min(player.dashRemainingMs / 200, 1);
  const nx = -(player.vx / speed);
  const ny = -(player.vy / speed);
  const trailLength = 28 * view.scale * intensity;

  ctx.save();
  ctx.shadowColor = trailColor;
  ctx.shadowBlur = 12 * intensity;
  ctx.strokeStyle = trailColor;
  ctx.lineWidth = 12 * view.scale * intensity;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + nx * trailLength, py + ny * trailLength);
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, view: View) {
  const pos = toScreen(ball.x, ball.y, view);
  ctx.save();
  ctx.shadowColor = BALL_GLOW;
  ctx.shadowBlur = 20;
  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, ball.radius * view.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScore(ctx: CanvasRenderingContext2D, width: number, state: GameState, colors: typeof THEMES.dark) {
  ctx.save();
  ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const boxW = 160;
  const boxH = 44;
  const boxX = width / 2 - boxW / 2;
  const boxY = 10;

  ctx.fillStyle = colors.scorePill;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  ctx.fillStyle = "#ef4444";
  ctx.fillText(`${state.scoreRed}`, width / 2 - 42, boxY + 8);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("—", width / 2, boxY + 8);
  ctx.fillStyle = "#3b82f6";
  ctx.fillText(`${state.scoreBlue}`, width / 2 + 42, boxY + 8);

  if (state.timeLimitMs > 0 && state.roomStatus === "playing") {
    const remaining = Math.ceil(state.timeRemainingMs / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    ctx.font = "500 12px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`${minutes}:${String(seconds).padStart(2, "0")}`, width / 2, boxY + boxH + 4);
  }

  ctx.restore();
}

function drawCountdown(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, countdownMs: number) {
  const number = Math.ceil(countdownMs / 1000);
  const progress = (countdownMs % 1000) / 1000;
  const scale = 0.8 + progress * 0.2;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = 24;
  ctx.font = "bold 72px ui-sans-serif, system-ui, -apple-system";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), 0, 2);
  ctx.restore();
}

function drawGoalPopup(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  team: string,
  progress: number
) {
  const alpha = progress < 0.15 ? progress / 0.15 : progress > 0.75 ? (1 - progress) / 0.25 : 1;
  const bounce = 1 + Math.sin(progress * Math.PI) * 0.06;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(bounce, bounce);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(-110, -55, 220, 100, 14);
  ctx.fill();

  ctx.shadowColor = team === "red" ? "rgba(239,68,68,0.9)" : "rgba(59,130,246,0.9)";
  ctx.shadowBlur = 28;
  ctx.font = "bold 56px ui-sans-serif, system-ui, -apple-system";
  ctx.fillStyle = team === "red" ? "#ef4444" : "#3b82f6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GOAL!", 0, -12);

  ctx.shadowBlur = 0;
  ctx.font = "500 18px ui-sans-serif, system-ui, -apple-system";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(team === "red" ? "Red Team scores" : "Blue Team scores", 0, 28);

  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: GameState) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, w, h);

  const panelW = Math.min(420, w - 48);
  const panelH = 240;
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  ctx.fillStyle = "rgba(10,10,10,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 20);
  ctx.fill();
  ctx.stroke();

  const team = state.winnerTeam;
  const winColor = team === "red" ? "#ef4444" : team === "blue" ? "#3b82f6" : "rgba(255,255,255,0.7)";
  const winLabel = team === "red" ? "Red Wins" : team === "blue" ? "Blue Wins" : "Draw";

  ctx.shadowColor = winColor;
  ctx.shadowBlur = 32;
  ctx.font = "bold 48px ui-sans-serif, system-ui, -apple-system";
  ctx.fillStyle = winColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(winLabel, w / 2, py + 36);

  ctx.shadowBlur = 0;
  ctx.font = "600 32px ui-sans-serif, system-ui";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${state.scoreRed}  —  ${state.scoreBlue}`, w / 2, py + 108);

  ctx.font = "400 13px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText("Returning to lobby…", w / 2, py + 165);

  ctx.restore();
}
