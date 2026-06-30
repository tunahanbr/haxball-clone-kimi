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
};
export declare class PhysicsEngine {
    private inputs;
    addPlayer(sessionId: string, state: GameState): void;
    removePlayer(sessionId: string, state: GameState): void;
    setInput(sessionId: string, input: PlayerInput): void;
    resetBall(state: GameState): void;
    update(state: GameState, deltaMs: number): void;
    private updatePlayer;
}
