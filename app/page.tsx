"use client";

import { GameCanvas } from "./components/GameCanvas";
import { Lobby } from "./components/Lobby";
import { useNetworkGame } from "./hooks/useNetworkGame";

export default function Home() {
  const { status, room, state, sessionId, error, connect, disconnect } =
    useNetworkGame();

  if (status !== "connected" || !state) {
    return <Lobby status={status} error={error} onConnect={connect} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0A0A0A]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-sm font-medium tracking-wide text-white/90">
            Physics Engine V2
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Connected</span>
            </div>
            <button
              onClick={disconnect}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-[#0A0A0A] shadow-2xl">
          <GameCanvas room={room} state={state} sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
