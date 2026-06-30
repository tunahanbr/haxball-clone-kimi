import { GameState } from "../schemas/GameState";
export type Vector2 = {
    x: number;
    y: number;
};
export type PlayerInput = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    kick: boolean;
    dash: boolean;
};
export type PhysicsConfig = {
    playerMaxSpeed: number;
    playerAcceleration: number;
    kickImpulse: number;
    dashImpulse: number;
    dashCooldownMs: number;
    ballFriction: number;
    netFriction: number;
};
export declare const DEFAULT_CONFIG: PhysicsConfig;
export declare class PhysicsEngine {
    private inputs;
    private dashCooldowns;
    private goalCooldown;
    private pendingReset;
    private powerUpSpawnTimer;
    private nextPowerUpSpawnMs;
    lastGoalTeam: "red" | "blue" | null;
    positionsJustReset: boolean;
    config: PhysicsConfig;
    setConfig(partial: Partial<PhysicsConfig>): void;
    addPlayer(sessionId: string, state: GameState, preferredTeam?: "red" | "blue"): void;
    removePlayer(sessionId: string, state: GameState): void;
    setInput(sessionId: string, input: PlayerInput): void;
    resetBall(state: GameState): void;
    resetPositions(state: GameState): void;
    update(state: GameState, deltaMs: number): void;
    private tickPowerUpSpawner;
    private applyPowerUpEffects;
    private updatePlayer;
    private canDash;
    private applyDash;
    private checkGoals;
}
