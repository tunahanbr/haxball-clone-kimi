"use client";

import { useState } from "react";
import { AppView } from "../hooks/useNetworkGame";
import { GameState, LobbyPlayer } from "../schemas/GameState";
import { TeamSide, MatchSettings } from "../types/game";

type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
};

function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        isDark
          ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
          : "border-black/10 text-black/40 hover:border-black/20 hover:text-black/70"
      }`}
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}

type HomeScreenProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  error: string | null;
  isConnecting: boolean;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
};

function HomeScreen({ isDark, onToggleTheme, error, isConnecting, onCreateRoom, onJoinRoom }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joiningMode, setJoiningMode] = useState(false);

  const nameIsValid = playerName.trim().length > 0;
  const joinIsValid = nameIsValid && joinCode.trim().length > 0;

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-neutral-50";
  const cardBg = isDark ? "bg-white/[0.03]" : "bg-black/[0.03]";
  const cardBorder = isDark ? "border-white/[0.08]" : "border-black/[0.08]";
  const textPrimary = isDark ? "text-white/90" : "text-black/90";
  const textSecondary = isDark ? "text-white/35" : "text-black/40";
  const textMuted = isDark ? "text-white/20" : "text-black/20";
  const inputText = isDark ? "text-white/90 placeholder-white/20" : "text-black/90 placeholder-black/25";
  const inputFocus = isDark ? "focus:border-white/[0.18] focus:bg-white/[0.05]" : "focus:border-black/[0.18] focus:bg-black/[0.02]";
  const divider = isDark ? "bg-white/[0.06]" : "bg-black/[0.06]";
  const joinBtnText = isDark ? "text-white/50 hover:border-white/[0.18] hover:text-white/80" : "text-black/50 hover:border-black/[0.18] hover:text-black/80";

  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-center ${bg} px-6 transition-colors duration-300`}>
      <div className="absolute right-5 top-5">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.7)]" />
          <span className={`text-sm font-medium tracking-tight ${textPrimary}`}>Physics Engine V2</span>
        </div>

        <p className={`mb-8 text-[13px] leading-relaxed ${textSecondary}`}>
          Server-authoritative multiplayer. Create a room and share the code to play with friends.
        </p>

        <div className="mb-5">
          <label className={`mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] ${textMuted}`}>Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !joiningMode && nameIsValid && !isConnecting) onCreateRoom(playerName.trim());
            }}
            placeholder="Enter your name"
            maxLength={20}
            className={`w-full rounded-lg border ${cardBorder} ${cardBg} px-4 py-3 text-sm ${inputText} outline-none ring-0 transition-colors ${inputFocus}`}
          />
        </div>

        <button
          onClick={() => onCreateRoom(playerName.trim())}
          disabled={!nameIsValid || (isConnecting && !joiningMode)}
          className="mb-8 w-full rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isConnecting && !joiningMode ? "Creating room…" : "Create Room"}
        </button>

        <div className="mb-8 flex items-center gap-4">
          <div className={`h-px flex-1 ${divider}`} />
          <span className={`text-[11px] ${textMuted}`}>or join with a code</span>
          <div className={`h-px flex-1 ${divider}`} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onFocus={() => setJoiningMode(true)}
            onBlur={() => setJoiningMode(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && joinIsValid && !isConnecting) onJoinRoom(joinCode.trim(), playerName.trim());
            }}
            placeholder="ABCDE"
            maxLength={5}
            className={`flex-1 rounded-lg border ${cardBorder} ${cardBg} px-4 py-3 font-mono text-sm uppercase tracking-[0.2em] ${inputText} outline-none transition-colors ${inputFocus}`}
          />
          <button
            onClick={() => onJoinRoom(joinCode.trim(), playerName.trim())}
            disabled={!joinIsValid || (isConnecting && joiningMode)}
            className={`rounded-lg border ${cardBorder} px-5 py-3 text-sm font-medium transition-colors ${joinBtnText} disabled:cursor-not-allowed disabled:opacity-30`}
          >
            {isConnecting && joiningMode ? "…" : "Join"}
          </button>
        </div>

        {error && <p className="mt-5 text-center text-xs text-red-400/80">{error}</p>}

        <div className={`mt-12 flex justify-center gap-6 text-[11px] font-medium tracking-wide ${textMuted}`}>
          <span>WASD / Arrows</span>
          <span>Space — kick</span>
          <span>Shift — dash</span>
        </div>
      </div>
    </div>
  );
}

type PlayerRowProps = {
  id: string;
  player: LobbyPlayer;
  isMe: boolean;
  isDark: boolean;
  onSetTeam: (team: TeamSide) => void;
  onSetReady: (isReady: boolean) => void;
  isLast: boolean;
};

function PlayerRow({ player, isMe, isDark, onSetTeam, onSetReady, isLast }: PlayerRowProps) {
  const avatarStyle =
    player.team === "red"
      ? { backgroundColor: "rgba(239,68,68,0.12)", color: "rgba(239,68,68,0.85)" }
      : { backgroundColor: "rgba(59,130,246,0.12)", color: "rgba(59,130,246,0.85)" };

  const rowBorder = isDark ? "border-white/[0.05]" : "border-black/[0.05]";
  const nameCls = isDark ? "text-white/80" : "text-black/80";
  const selfTag = isDark ? "text-white/25" : "text-black/25";
  const hostBadge = isDark ? "border-amber-500/25 text-amber-500/60" : "border-amber-600/25 text-amber-600/60";
  const teamToggleBorder = isDark ? "border-white/[0.08]" : "border-black/[0.08]";
  const teamToggleDivider = isDark ? "bg-white/[0.06]" : "bg-black/[0.06]";
  const teamInactive = isDark ? "text-white/25 hover:text-white/50" : "text-black/25 hover:text-black/50";
  const readyInactive = isDark
    ? "border-white/[0.08] text-white/35 hover:border-white/[0.16] hover:text-white/65"
    : "border-black/[0.08] text-black/35 hover:border-black/[0.16] hover:text-black/65";
  const readyOtherCls = isDark ? "border-white/[0.05] text-white/20" : "border-black/[0.05] text-black/20";

  return (
    <div className={`flex items-center justify-between px-5 py-4 ${!isLast ? `border-b ${rowBorder}` : ""}`}>
      <div className="flex items-center gap-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={avatarStyle}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${nameCls}`}>
            {player.name}
            {isMe && <span className={`ml-1.5 ${selfTag}`}>(you)</span>}
          </span>
          {player.isHost && (
            <span className={`rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${hostBadge}`}>Host</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isMe ? (
          <div className={`flex overflow-hidden rounded-lg border ${teamToggleBorder}`}>
            <button
              onClick={() => onSetTeam("red")}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${player.team === "red" ? "bg-red-500/[0.18] text-red-400" : teamInactive}`}
            >Red</button>
            <div className={`w-px ${teamToggleDivider}`} />
            <button
              onClick={() => onSetTeam("blue")}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${player.team === "blue" ? "bg-blue-500/[0.18] text-blue-400" : teamInactive}`}
            >Blue</button>
          </div>
        ) : (
          <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${player.team === "red" ? "border-red-500/[0.18] text-red-500/55" : "border-blue-500/[0.18] text-blue-500/55"}`}>
            {player.team === "red" ? "Red" : "Blue"}
          </span>
        )}

        {player.isHost ? (
          <div className="w-[86px]" />
        ) : isMe ? (
          <button
            onClick={() => onSetReady(!player.isReady)}
            className={`w-[86px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${player.isReady ? "border-emerald-500/25 bg-emerald-500/[0.1] text-emerald-400" : readyInactive}`}
          >
            {player.isReady ? "Ready ✓" : "Not Ready"}
          </button>
        ) : (
          <div className={`w-[86px] rounded-lg border px-3 py-1.5 text-center text-xs font-medium ${player.isReady ? "border-emerald-500/20 text-emerald-500/55" : readyOtherCls}`}>
            {player.isReady ? "Ready" : "Waiting…"}
          </div>
        )}
      </div>
    </div>
  );
}

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
};

function ToggleSwitch({ checked, onChange, isDark }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${checked ? "bg-white/25" : isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200 ${checked ? "translate-x-4 bg-white" : "translate-x-0.5 bg-white/30"}`}
      />
    </button>
  );
}

type MatchSettingsPanelProps = {
  isDark: boolean;
  scoreLimit: number;
  timeLimitMs: number;
  powerUpsEnabled: boolean;
  onChangeSettings: (s: Partial<MatchSettings>) => void;
};

function MatchSettingsPanel({ isDark, scoreLimit, timeLimitMs, powerUpsEnabled, onChangeSettings }: MatchSettingsPanelProps) {
  const [localScoreLimit, setLocalScoreLimit] = useState(scoreLimit);
  const [localPowerUps, setLocalPowerUps] = useState(powerUpsEnabled);
  const [timeEnabled, setTimeEnabled] = useState(timeLimitMs > 0);
  const [timeMinutes, setTimeMinutes] = useState(timeLimitMs > 0 ? Math.round(timeLimitMs / 60000) : 5);

  const labelCls = isDark ? "text-white/30" : "text-black/35";
  const valCls = isDark ? "text-white/70" : "text-black/70";
  const descCls = isDark ? "text-white/30" : "text-black/35";
  const panelBorder = isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]";
  const dividerCls = isDark ? "border-white/[0.04]" : "border-black/[0.04]";
  const sliderClass = "accent-white/60 cursor-pointer";

  const changeScore = (v: number) => { setLocalScoreLimit(v); onChangeSettings({ scoreLimit: v }); };
  const changePowerUps = (v: boolean) => { setLocalPowerUps(v); onChangeSettings({ powerUpsEnabled: v }); };
  const changeTimeEnabled = (v: boolean) => { setTimeEnabled(v); onChangeSettings({ timeLimitMs: v ? timeMinutes * 60000 : 0 }); };
  const changeTimeMinutes = (m: number) => { setTimeMinutes(m); onChangeSettings({ timeLimitMs: m * 60000 }); };

  return (
    <div className={`mb-6 rounded-xl border ${panelBorder} px-5 py-4`}>
      <p className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] ${labelCls}`}>Match Settings</p>

      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className={`text-xs font-medium ${valCls}`}>Score Limit</span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={localScoreLimit}
            onChange={(e) => changeScore(Number(e.target.value))}
            className={`w-24 ${sliderClass}`}
          />
          <span className={`w-14 text-right text-xs font-semibold tabular-nums ${valCls}`}>First to {localScoreLimit}</span>
        </div>
      </div>

      <div className={`border-t ${dividerCls}`} />

      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className={`text-xs font-medium ${valCls}`}>Time Limit</span>
        <div className="flex items-center gap-3">
          {timeEnabled && (
            <input
              type="range"
              min={2}
              max={15}
              value={timeMinutes}
              onChange={(e) => changeTimeMinutes(Number(e.target.value))}
              className={`w-20 ${sliderClass}`}
            />
          )}
          <span className={`w-10 text-right text-xs font-semibold tabular-nums ${valCls}`}>
            {timeEnabled ? `${timeMinutes} min` : "Off"}
          </span>
          <ToggleSwitch checked={timeEnabled} onChange={changeTimeEnabled} isDark={isDark} />
        </div>
      </div>

      <div className={`border-t ${dividerCls}`} />

      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className={`text-xs font-medium ${valCls}`}>Power-Ups</span>
        <ToggleSwitch checked={localPowerUps} onChange={changePowerUps} isDark={isDark} />
      </div>

      {localPowerUps && (
        <div className={`mt-1 space-y-2 rounded-lg border ${dividerCls} ${isDark ? "bg-white/[0.015]" : "bg-black/[0.015]"} px-3 py-2.5`}>
          <div className="flex items-start gap-2.5">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-purple-500/20 text-[9px] font-bold text-purple-300">M</span>
            <p className={`text-[11px] leading-relaxed ${descCls}`}>
              <span className="font-semibold text-purple-300/80">Magnet</span> — pulls the ball toward you while it&apos;s nearby.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-amber-500/20 text-[9px] font-bold text-amber-300">H</span>
            <p className={`text-[11px] leading-relaxed ${descCls}`}>
              <span className="font-semibold text-amber-300/80">Heavy</span> — become an immovable wall that shoves opponents aside.
            </p>
          </div>
          <p className={`pt-0.5 text-[10px] ${isDark ? "text-white/20" : "text-black/25"}`}>
            Nodes spawn on the field every 10–15s. Each pickup lasts 5 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

type PreGameLobbyProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  state: GameState;
  sessionId: string;
  onSetTeam: (team: TeamSide) => void;
  onSetReady: (isReady: boolean) => void;
  onStartMatch: () => void;
  onDisconnect: () => void;
  onChangeMatchSettings: (s: Partial<MatchSettings>) => void;
};

function PreGameLobby({
  isDark,
  onToggleTheme,
  state,
  sessionId,
  onSetTeam,
  onSetReady,
  onStartMatch,
  onDisconnect,
  onChangeMatchSettings,
}: PreGameLobbyProps) {
  const [copied, setCopied] = useState(false);

  const isHost = sessionId === state.hostSessionId;
  const playerEntries: Array<[string, LobbyPlayer]> = [];
  state.lobbyPlayers.forEach((player, id) => playerEntries.push([id, player]));

  const nonHostEntries = playerEntries.filter(([, p]) => !p.isHost);
  const readyCount = nonHostEntries.filter(([, p]) => p.isReady).length;
  const allNonHostReady = nonHostEntries.length === 0 || nonHostEntries.every(([, p]) => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(state.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-neutral-50";
  const headerBorder = isDark ? "border-white/[0.06] bg-[#0A0A0A]/80" : "border-black/[0.06] bg-neutral-50/80";
  const leaveCls = isDark ? "text-white/35 hover:text-white/65" : "text-black/35 hover:text-black/65";
  const codePanelBorder = isDark ? "border-white/[0.08] bg-white/[0.03]" : "border-black/[0.08] bg-black/[0.03]";
  const codeText = isDark ? "text-white/90" : "text-black/90";
  const copyBtn = isDark ? "border-white/[0.08] text-white/40 hover:border-white/[0.16] hover:text-white/75" : "border-black/[0.08] text-black/40 hover:border-black/[0.16] hover:text-black/75";
  const statusText = isDark ? "text-white/30" : "text-black/35";
  const labelCls = isDark ? "text-white/25" : "text-black/30";
  const readyCountCls = isDark ? "text-white/20" : "text-black/25";
  const playerListBorder = isDark ? "border-white/[0.07] bg-white/[0.018]" : "border-black/[0.07] bg-black/[0.018]";
  const emptyTextCls = isDark ? "text-white/20" : "text-black/25";
  const startDisabledCls = isDark ? "bg-white/[0.04] text-white/20" : "bg-black/[0.04] text-black/20";
  const hintCls = isDark ? "text-white/20" : "text-black/25";

  return (
    <div className={`flex min-h-screen flex-col ${bg} transition-colors duration-300`}>
      <header className={`sticky top-0 z-10 border-b ${headerBorder} px-6 py-4 backdrop-blur-xl transition-colors duration-300`}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button onClick={onDisconnect} className={`text-xs font-medium transition-colors ${leaveCls}`}>← Leave</button>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3.5 rounded-xl border ${codePanelBorder} px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}>
              <div>
                <p className={`mb-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-white/20" : "text-black/25"}`}>Room Code</p>
                <span className={`font-mono text-base font-bold tracking-[0.3em] ${codeText}`}>{state.roomCode}</span>
              </div>
              <button onClick={handleCopyCode} className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${copyBtn}`}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span className={`text-[11px] ${statusText}`}>{playerEntries.length} {playerEntries.length === 1 ? "player" : "players"}</span>
            </div>

            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {isHost && (
            <MatchSettingsPanel
              isDark={isDark}
              scoreLimit={state.scoreLimit}
              timeLimitMs={state.timeLimitMs}
              powerUpsEnabled={state.powerUpsEnabled}
              onChangeSettings={onChangeMatchSettings}
            />
          )}

          <div className="mb-3 flex items-baseline justify-between">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${labelCls}`}>Players</span>
            {nonHostEntries.length > 0 && (
              <span className={`text-[11px] ${readyCountCls}`}>{readyCount} / {nonHostEntries.length} ready</span>
            )}
          </div>

          <div className={`mb-8 overflow-hidden rounded-2xl border ${playerListBorder} shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}>
            {playerEntries.length === 0 && (
              <div className={`px-6 py-10 text-center text-sm ${emptyTextCls}`}>Waiting for players to join…</div>
            )}
            {playerEntries.map(([id, player], index) => (
              <PlayerRow
                key={id}
                id={id}
                player={player}
                isMe={id === sessionId}
                isDark={isDark}
                onSetTeam={onSetTeam}
                onSetReady={onSetReady}
                isLast={index === playerEntries.length - 1}
              />
            ))}
          </div>

          {isHost ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onStartMatch}
                disabled={!allNonHostReady}
                className={`w-full rounded-2xl px-6 py-4 text-sm font-semibold tracking-wide transition-all duration-200 ${
                  allNonHostReady
                    ? "bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:bg-white/90 hover:shadow-[0_0_60px_rgba(255,255,255,0.16)]"
                    : `cursor-not-allowed ${startDisabledCls}`
                }`}
              >
                Start Match
              </button>
              <p className={`text-[11px] ${hintCls}`}>
                {!allNonHostReady && nonHostEntries.length > 0
                  ? "Waiting for all players to mark ready"
                  : nonHostEntries.length === 0
                  ? "Share your room code to invite players, or start solo"
                  : "All players ready — you can start the match"}
              </p>
            </div>
          ) : (
            <p className={`text-center text-[11px] ${hintCls}`}>Waiting for the host to start the match</p>
          )}
        </div>
      </main>
    </div>
  );
}

export type LobbyProps = {
  view: Exclude<AppView, "game">;
  state: GameState | null;
  sessionId: string | null;
  error: string | null;
  isConnecting: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onSetTeam: (team: TeamSide) => void;
  onSetReady: (isReady: boolean) => void;
  onStartMatch: () => void;
  onDisconnect: () => void;
  onChangeMatchSettings: (s: Partial<MatchSettings>) => void;
};

export function Lobby(props: LobbyProps) {
  if (props.view === "lobby" && props.state && props.sessionId) {
    return (
      <PreGameLobby
        isDark={props.isDark}
        onToggleTheme={props.onToggleTheme}
        state={props.state}
        sessionId={props.sessionId}
        onSetTeam={props.onSetTeam}
        onSetReady={props.onSetReady}
        onStartMatch={props.onStartMatch}
        onDisconnect={props.onDisconnect}
        onChangeMatchSettings={props.onChangeMatchSettings}
      />
    );
  }

  return (
    <HomeScreen
      isDark={props.isDark}
      onToggleTheme={props.onToggleTheme}
      error={props.error}
      isConnecting={props.isConnecting}
      onCreateRoom={props.onCreateRoom}
      onJoinRoom={props.onJoinRoom}
    />
  );
}
