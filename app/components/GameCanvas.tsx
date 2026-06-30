"use client";

import { useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { GameState, Player, Ball } from "../schemas/GameState";
import { PlayerInput } from "../types/game";
import { sendInput } from "../hooks/useNetworkGame";

const FIELD_BACKGROUND = "#0A0A0A";
const FIELD_BORDER = "rgba(255, 255, 255, 0.1)";
const CENTER_LINE = "rgba(255, 255, 255, 0.08)";
const LOCAL_PLAYER_GLOW = "rgba(255, 255, 255, 0.45)";
const REMOTE_PLAYER_GLOW = "rgba(255, 255, 255, 0.2)";
const BALL_COLOR = "#3b82f6";
const BALL_GLOW = "rgba(59, 130, 246, 0.6)";
const KICK_RING_COLOR = "rgba(255, 255, 255, 0.35)";

type GameCanvasProps = {
  room: Room<GameState> | null;
  state: GameState | null;
  sessionId: string | null;
};

export function GameCanvas({ room, state, sessionId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const inputRef = useRef<PlayerInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    kick: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === " ") {
        event.preventDefault();
      }

      let changed = false;
      if (key === "ArrowUp" || key === "w" || key === "W") {
        changed = !inputRef.current.up;
        inputRef.current.up = true;
      }
      if (key === "ArrowDown" || key === "s" || key === "S") {
        changed = !inputRef.current.down;
        inputRef.current.down = true;
      }
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        changed = !inputRef.current.left;
        inputRef.current.left = true;
      }
      if (key === "ArrowRight" || key === "d" || key === "D") {
        changed = !inputRef.current.right;
        inputRef.current.right = true;
      }
      if (key === " " || event.code === "Space") {
        changed = !inputRef.current.kick;
        inputRef.current.kick = true;
      }

      if (changed) {
        sendInput(room, inputRef.current);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowUp" || key === "w" || key === "W") {
        inputRef.current.up = false;
      }
      if (key === "ArrowDown" || key === "s" || key === "S") {
        inputRef.current.down = false;
      }
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        inputRef.current.left = false;
      }
      if (key === "ArrowRight" || key === "d" || key === "D") {
        inputRef.current.right = false;
      }
      if (key === " " || event.code === "Space") {
        inputRef.current.kick = false;
      }

      sendInput(room, inputRef.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [room]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;

    const render = () => {
      const currentState = stateRef.current;
      if (currentState) {
        const scaleX = canvas.width / currentState.fieldWidth;
        const scaleY = canvas.height / currentState.fieldHeight;

        drawField(ctx, canvas.width, canvas.height);
        drawBall(ctx, currentState.ball, scaleX, scaleY);

        currentState.players.forEach((player, id) => {
          const isLocal = id === sessionId;
          drawPlayer(ctx, player, isLocal, scaleX, scaleY);
        });
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [sessionId]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      aria-label="Haxball multiplayer canvas"
    />
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = FIELD_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = FIELD_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = CENTER_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  const centerX = width / 2;
  const centerY = height / 2;
  const centerRadius = Math.min(width, height) * 0.12;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isLocal: boolean,
  scaleX: number,
  scaleY: number
) {
  const isKicking = player.kickRemainingMs > 0;
  const px = player.x * scaleX;
  const py = player.y * scaleY;
  const r = 18 * scaleX;

  ctx.save();
  ctx.shadowColor = isLocal ? LOCAL_PLAYER_GLOW : REMOTE_PLAYER_GLOW;
  ctx.shadowBlur = isKicking ? 28 : 18;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (isKicking) {
    ctx.strokeStyle = KICK_RING_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, player.radius * scaleX, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, scaleX: number, scaleY: number) {
  ctx.save();
  ctx.shadowColor = BALL_GLOW;
  ctx.shadowBlur = 20;
  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(ball.x * scaleX, ball.y * scaleY, ball.radius * scaleX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
