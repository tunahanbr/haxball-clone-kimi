import { Room, Client } from "colyseus";
import { GameState } from "../schemas/GameState";
export declare class GameRoom extends Room<GameState> {
    maxClients: number;
    private physics;
    onCreate(): void;
    onJoin(client: Client): void;
    onLeave(client: Client): void;
}
