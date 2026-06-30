import { ConnectionStatus } from "../hooks/useNetworkGame";

type LobbyProps = {
  status: ConnectionStatus;
  error: string | null;
  onConnect: () => void;
};

export function Lobby({ status, error, onConnect }: LobbyProps) {
  const isConnecting = status === "connecting";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
          <h1 className="text-lg font-medium tracking-tight text-white/90">
            Physics Engine V2
          </h1>
        </div>

        <p className="mb-8 text-sm leading-relaxed text-white/50">
          Authoritative multiplayer prototype. Join a room to test the server-side physics.
        </p>

        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full rounded-lg bg-white/90 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConnecting ? "Connecting..." : "Join Game"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-white/30">
          <span>WASD / Arrows</span>
          <span>Space to kick</span>
        </div>
      </div>
    </div>
  );
}
