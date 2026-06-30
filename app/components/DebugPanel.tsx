"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room } from "colyseus.js";
import { GameState } from "../schemas/GameState";
import { DEFAULT_CONFIG, PhysicsConfig } from "../physics/config";

type Props = {
  state: GameState | null;
  sessionId: string | null;
  room: Room<GameState> | null;
  isDark: boolean;
};

const SLIDER_DEFS: { key: keyof PhysicsConfig; label: string; min: number; max: number; step: number }[] = [
  { key: "playerMaxSpeed",    label: "Player max speed",    min: 1,   max: 15,    step: 0.1 },
  { key: "playerAcceleration",label: "Acceleration",        min: 0.1, max: 3,     step: 0.05 },
  { key: "kickImpulse",       label: "Kick impulse",        min: 2,   max: 30,    step: 0.5 },
  { key: "dashImpulse",       label: "Dash impulse",        min: 5,   max: 50,    step: 0.5 },
  { key: "dashCooldownMs",    label: "Dash cooldown (ms)",  min: 300, max: 8000,  step: 100 },
  { key: "ballFriction",      label: "Ball friction",       min: 0.9, max: 0.999, step: 0.001 },
  { key: "netFriction",       label: "Net friction",        min: 0.4, max: 0.99,  step: 0.01 },
];

export function DebugPanel({ state, sessionId, room, isDark }: Props) {
  const [godMode, setGodMode] = useState(false);
  const [fps, setFps] = useState(0);
  const [config, setConfig] = useState<PhysicsConfig>({ ...DEFAULT_CONFIG });
  const frameCountRef = useRef(0);
  const lastFpsRef = useRef(performance.now());
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let id: number;
    const loop = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsRef.current >= 1000) {
        setFps(Math.round(frameCountRef.current * 1000 / (now - lastFpsRef.current)));
        frameCountRef.current = 0;
        lastFpsRef.current = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleSlider = useCallback((key: keyof PhysicsConfig, value: number) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      room?.send("physics_config", next);
    }, 300);
  }, [config, room]);

  const localPlayer = state && sessionId ? state.players.get(sessionId) : null;
  const ball = state?.ball;

  const bg = isDark ? "bg-[#111] border-white/10 text-white/80" : "bg-white border-black/10 text-black/80";
  const dim = isDark ? "text-white/40" : "text-black/35";
  const val = isDark ? "text-emerald-400" : "text-emerald-600";
  const sectionBg = isDark ? "bg-white/5" : "bg-black/5";
  const sliderTrack = isDark ? "accent-emerald-400" : "accent-emerald-600";

  return (
    <div className={`border-t ${bg} px-6 py-4 font-mono text-xs`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <span className={`font-sans text-xs font-semibold uppercase tracking-widest ${dim}`}>Debug</span>
          <button
            onClick={() => setGodMode((g) => !g)}
            className={`rounded border px-2 py-0.5 font-sans text-xs transition-colors ${
              godMode
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : isDark ? "border-white/10 text-white/40 hover:text-white/60" : "border-black/10 text-black/40 hover:text-black/60"
            }`}
          >
            {godMode ? "⚙ God Mode ON" : "⚙ God Mode"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatBlock label="FPS" color={dim}>
            <StatRow label="render" value={`${fps}`} color={val} />
          </StatBlock>

          <StatBlock label="Ball" color={dim}>
            <StatRow label="x" value={ball ? fmt(ball.x) : "—"} color={val} />
            <StatRow label="y" value={ball ? fmt(ball.y) : "—"} color={val} />
            <StatRow label="vx" value={ball ? fmt(ball.vx) : "—"} color={val} />
            <StatRow label="vy" value={ball ? fmt(ball.vy) : "—"} color={val} />
            <StatRow label="spd" value={ball ? fmt(Math.sqrt(ball.vx ** 2 + ball.vy ** 2)) : "—"} color={val} />
          </StatBlock>

          <StatBlock label="Player" color={dim}>
            {localPlayer ? (
              <>
                <StatRow label="team" value={localPlayer.team} color={localPlayer.team === "red" ? "text-red-400" : "text-blue-400"} />
                <StatRow label="x" value={fmt(localPlayer.x)} color={val} />
                <StatRow label="y" value={fmt(localPlayer.y)} color={val} />
                <StatRow label="vx" value={fmt(localPlayer.vx)} color={val} />
                <StatRow label="vy" value={fmt(localPlayer.vy)} color={val} />
                <StatRow label="spd" value={fmt(Math.sqrt(localPlayer.vx ** 2 + localPlayer.vy ** 2))} color={val} />
              </>
            ) : (
              <StatRow label="—" value="no player" color={dim} />
            )}
          </StatBlock>

          <StatBlock label="Cooldowns" color={dim}>
            {localPlayer ? (
              <>
                <StatRow label="kick ms" value={fmt(localPlayer.kickRemainingMs)} color={val} />
                <StatRow label="dash ms" value={fmt(localPlayer.dashRemainingMs)} color={val} />
                <StatRow label="dash cd" value={fmt(localPlayer.dashCooldownMs)} color={localPlayer.dashCooldownMs > 0 ? "text-amber-400" : val} />
              </>
            ) : (
              <StatRow label="—" value="no player" color={dim} />
            )}
            <StatRow label="red" value={`${state?.scoreRed ?? 0}`} color="text-red-400" />
            <StatRow label="blue" value={`${state?.scoreBlue ?? 0}`} color="text-blue-400" />
          </StatBlock>
        </div>

        {godMode && (
          <div className={`mt-4 rounded-lg border ${isDark ? "border-white/10" : "border-black/10"} ${sectionBg} p-4`}>
            <p className={`mb-3 font-sans text-xs font-semibold uppercase tracking-widest ${dim}`}>Physics Config</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SLIDER_DEFS.map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between">
                    <span className={dim}>{label}</span>
                    <span className={val}>{config[key].toFixed(step < 1 ? (step < 0.01 ? 3 : 2) : 0)}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={config[key]}
                    onChange={(e) => handleSlider(key, parseFloat(e.target.value))}
                    className={`w-full ${sliderTrack}`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => { setConfig({ ...DEFAULT_CONFIG }); room?.send("physics_config", DEFAULT_CONFIG); }}
              className={`mt-3 rounded border px-3 py-1 font-sans text-xs transition-colors ${isDark ? "border-white/10 text-white/50 hover:text-white/80" : "border-black/10 text-black/50 hover:text-black/80"}`}
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest ${color}`}>{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-50">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function fmt(n: number) {
  return n.toFixed(2);
}
