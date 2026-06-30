"use client";

import { useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { DebugPanel } from "./components/DebugPanel";
import { Lobby } from "./components/Lobby";
import { useNetworkGame } from "./hooks/useNetworkGame";

export default function Home() {
  const {
    view,
    room,
    state,
    sessionId,
    error,
    isConnecting,
    createRoom,
    joinRoom,
    setTeam,
    setReady,
    startMatch,
    disconnect,
    changeMatchSettings,
  } = useNetworkGame();

  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? "dark" : "light";
  const toggleTheme = () => setIsDark((d) => !d);

  if (view !== "game" || !state) {
    return (
      <Lobby
        view={view === "home" ? "home" : "lobby"}
        state={state}
        sessionId={sessionId}
        error={error}
        isConnecting={isConnecting}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onSetTeam={setTeam}
        onSetReady={setReady}
        onStartMatch={startMatch}
        onDisconnect={disconnect}
        onChangeMatchSettings={changeMatchSettings}
      />
    );
  }

  return (
    <div className={`flex min-h-screen flex-col transition-colors duration-300 ${isDark ? "bg-[#0A0A0A]" : "bg-neutral-100"}`}>
      <header className={`sticky top-0 z-10 border-b px-6 py-4 backdrop-blur-md transition-colors duration-300 ${isDark ? "border-white/10 bg-[#0A0A0A]/80" : "border-black/10 bg-white/80"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className={`text-sm font-medium tracking-wide ${isDark ? "text-white/90" : "text-black/80"}`}>
            Physics Engine V2
          </h1>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs ${isDark ? "text-white/50" : "text-black/40"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${state.roomStatus === "playing" ? "bg-emerald-500" : state.roomStatus === "countdown" ? "bg-amber-500" : "bg-red-500"}`} />
              <span className="capitalize">{state.roomStatus === "game_over" ? "Game Over" : state.roomStatus}</span>
            </div>

            <div className={`flex items-center gap-1.5 text-xs ${isDark ? "text-white/40" : "text-black/35"}`}>
              <span className="font-semibold text-red-400">{state.scoreRed}</span>
              <span className={isDark ? "text-white/20" : "text-black/20"}>—</span>
              <span className="font-semibold text-blue-400">{state.scoreBlue}</span>
            </div>

            <button
              onClick={toggleTheme}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${isDark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-black/10 text-black/60 hover:bg-black/5"}`}
            >
              {isDark ? "Light" : "Dark"}
            </button>

            <button
              onClick={disconnect}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${isDark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-black/10 text-black/60 hover:bg-black/5"}`}
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center gap-0 p-4 sm:p-6 lg:p-8">
        <div className={`relative aspect-[16/9] w-full max-w-6xl shrink-0 overflow-hidden rounded-lg border shadow-2xl transition-colors duration-300 ${isDark ? "border-white/10 bg-[#0A0A0A]" : "border-black/10 bg-neutral-200"}`}>
          <GameCanvas room={room} state={state} sessionId={sessionId} theme={theme} />
        </div>

        <div className={`w-full max-w-6xl rounded-b-lg border border-t-0 transition-colors duration-300 ${isDark ? "border-white/10" : "border-black/10"}`}>
          <DebugPanel state={state} sessionId={sessionId} room={room} isDark={isDark} />
        </div>
      </main>
    </div>
  );
}
