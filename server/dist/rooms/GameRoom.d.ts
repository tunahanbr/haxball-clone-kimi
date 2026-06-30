import { Room, Client } from "colyseus";
import { GameState } from "../schemas/GameState";
export declare class GameRoom extends Room<GameState> {
    maxClients: number;
    private physics;
    private returnToLobbyTimer;
    onCreate(): void;
    private gameTick;
    private triggerGameOver;
    private resetToLobby;
    onJoin(client: Client, options: {
        name?: string;
    }): void;
    onLeave(client: Client): void;
    onDispose(): void;
}
