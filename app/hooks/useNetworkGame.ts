"use client";

import { useEffect, useState, useCallback, useRef, useReducer } from "react";
import { Client, Room } from "colyseus.js";
import { GameState } from "../schemas/GameState";
import { PlayerInput, TeamSide, MatchSettings } from "../types/game";

export type AppView = "home" | "lobby" | "game";

export type NetworkGame = {
  view: AppView;
  room: Room<GameState> | null;
  state: GameState | null;
  sessionId: string | null;
  error: string | null;
  isConnecting: boolean;
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (code: string, playerName: string) => Promise<void>;
  setTeam: (team: TeamSide) => void;
  setReady: (isReady: boolean) => void;
  startMatch: () => void;
  disconnect: () => void;
  changeMatchSettings: (settings: Partial<MatchSettings>) => void;
};

const WS_ENDPOINT = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || "ws://localhost:2567";
const HTTP_ENDPOINT = WS_ENDPOINT.replace(/^ws/, "http");
const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

function isGameView(status: string) {
  return status === "playing" || status === "countdown" || status === "game_over";
}

export function useNetworkGame(): NetworkGame {
  const [view, setView] = useState<AppView>("home");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room<GameState> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const stateRef = useRef<GameState | null>(null);
  const [, bumpState] = useReducer((n: number) => n + 1, 0);

  const roomRef = useRef<Room<GameState> | null>(null);
  const viewRef = useRef<AppView>("home");
  const unmountedRef = useRef(false);

  const applyView = useCallback((next: AppView) => {
    if (next !== viewRef.current) {
      viewRef.current = next;
      setView(next);
    }
  }, []);

  const resetToHome = useCallback(() => {
    roomRef.current = null;
    stateRef.current = null;
    bumpState();
    applyView("home");
    setSessionId(null);
    setRoom(null);
  }, [applyView]);

  const disconnect = useCallback(() => {
    roomRef.current?.leave();
    resetToHome();
    setError(null);
  }, [resetToHome]);

  const attachRoomListeners = useCallback(
    (joinedRoom: Room<GameState>) => {
      roomRef.current = joinedRoom;
      stateRef.current = joinedRoom.state;
      bumpState();
      setRoom(joinedRoom);
      setSessionId(joinedRoom.sessionId);
      applyView(isGameView(joinedRoom.state.roomStatus) ? "game" : "lobby");

      joinedRoom.onStateChange((newState) => {
        stateRef.current = newState;
        bumpState();
        applyView(isGameView(newState.roomStatus) ? "game" : "lobby");
      });

      joinedRoom.onError((_code, message) => {
        setError(message ?? "An unexpected room error occurred");
        resetToHome();
      });

      joinedRoom.onLeave(() => resetToHome());
    },
    [applyView, resetToHome]
  );

  const createRoom = useCallback(
    async (playerName: string) => {
      if (isConnecting) return;
      setIsConnecting(true);
      setError(null);

      try {
        const client = new Client(WS_ENDPOINT);
        const joinedRoom = await withTimeout(
          client.create<GameState>("game", { name: playerName }, GameState),
          TIMEOUT_MS,
          "Timed out creating room. Is the server running?"
        );
        if (unmountedRef.current) { joinedRoom.leave(); return; }
        attachRoomListeners(joinedRoom);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create room");
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting, attachRoomListeners]
  );

  const joinRoom = useCallback(
    async (code: string, playerName: string) => {
      if (isConnecting) return;
      setIsConnecting(true);
      setError(null);

      try {
        const normalizedCode = code.toUpperCase().trim();
        const lookupRes = await withTimeout(
          fetch(`${HTTP_ENDPOINT}/api/room/${normalizedCode}`),
          TIMEOUT_MS,
          "Could not reach server. Is it running?"
        );

        if (!lookupRes.ok) {
          setError("Room not found. Check the code and try again.");
          return;
        }

        const { roomId } = (await lookupRes.json()) as { roomId: string };
        const client = new Client(WS_ENDPOINT);

        const joinedRoom = await withTimeout(
          client.joinById<GameState>(roomId, { name: playerName }, GameState),
          TIMEOUT_MS,
          "Connection timed out."
        );
        if (unmountedRef.current) { joinedRoom.leave(); return; }
        attachRoomListeners(joinedRoom);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join room");
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting, attachRoomListeners]
  );

  const setTeam = useCallback((team: TeamSide) => {
    roomRef.current?.send("set_team", team);
  }, []);

  const setReady = useCallback((isReady: boolean) => {
    roomRef.current?.send("set_ready", isReady);
  }, []);

  const startMatch = useCallback(() => {
    roomRef.current?.send("start_match");
  }, []);

  const changeMatchSettings = useCallback((settings: Partial<MatchSettings>) => {
    roomRef.current?.send("set_match_settings", settings);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      roomRef.current?.leave();
    };
  }, []);

  return {
    view,
    room,
    state: stateRef.current,
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
  };
}

export function sendInput(room: Room<GameState> | null, input: PlayerInput) {
  room?.send("input", input);
}
