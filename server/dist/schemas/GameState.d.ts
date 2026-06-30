import { MapSchema, Schema } from "@colyseus/schema";
export declare class LobbyPlayer extends Schema {
    name: string;
    team: string;
    isReady: boolean;
    isHost: boolean;
}
export declare class Player extends Schema {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    kickRemainingMs: number;
    dashRemainingMs: number;
    dashCooldownMs: number;
    team: string;
    color: string;
    powerUpType: string;
    powerUpRemainingMs: number;
}
export declare class Ball extends Schema {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}
export declare class PowerUp extends Schema {
    x: number;
    y: number;
    kind: string;
}
export declare class GameState extends Schema {
    lobbyPlayers: MapSchema<LobbyPlayer>;
    players: MapSchema<Player>;
    powerUps: MapSchema<PowerUp>;
    ball: Ball;
    fieldWidth: number;
    fieldHeight: number;
    goalWidth: number;
    goalDepth: number;
    scoreRed: number;
    scoreBlue: number;
    roomCode: string;
    roomStatus: string;
    hostSessionId: string;
    countdownMs: number;
    scoreLimit: number;
    timeLimitMs: number;
    timeRemainingMs: number;
    powerUpsEnabled: boolean;
    winnerTeam: string;
    lastGoalBy: number;
}
