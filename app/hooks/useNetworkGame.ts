"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Client, Room } from "colyseus.js";
import { GameState } from "../schemas/GameState";
import { PlayerInput } from "../types/game";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type NetworkGame = {
  status: ConnectionStatus;
  room: Room<GameState> | null;
  state: GameState | null;
  sessionId: string | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
};

const ENDPOINT = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || "ws://localhost:2567";
const CONNECTION_TIMEOUT_MS = 8000;

export function useNetworkGame(): NetworkGame {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room<GameState> | null>(null);

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<GameState> | null>(null);
  const unmountedRef = useRef(false);

  const disconnect = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    clientRef.current = null;
    setStatus("idle");
    setState(null);
    setSessionId(null);
    setRoom(null);
  }, []);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;

    setStatus("connecting");
    setError(null);

    try {
      const client = new Client(ENDPOINT);
      clientRef.current = client;

      const joinedRoom = await withTimeout(
        client.joinOrCreate<GameState>("game", {}, GameState),
        CONNECTION_TIMEOUT_MS,
        "Connection timed out. Is the server running on " + ENDPOINT + "?"
      );

      if (unmountedRef.current) {
        joinedRoom.leave();
        return;
      }

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);
      setSessionId(joinedRoom.sessionId);
      setState(joinedRoom.state);
      setStatus("connected");

      joinedRoom.onStateChange((newState) => {
        setState(newState);
      });

      joinedRoom.onError((code, message) => {
        setError(`Room error ${code}: ${message}`);
        setStatus("error");
      });

      joinedRoom.onLeave(() => {
        roomRef.current = null;
        setStatus("idle");
        setState(null);
        setSessionId(null);
        setRoom(null);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      console.error("Connection failed:", message);
      setError(message);
      setStatus("error");
    }
  }, [status]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    room,
    state,
    sessionId,
    error,
    connect,
    disconnect,
  };
}

export function sendInput(room: Room<GameState> | null, input: PlayerInput) {
  room?.send("input", input);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
