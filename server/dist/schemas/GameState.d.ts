import { MapSchema, Schema } from "@colyseus/schema";
export declare class Player extends Schema {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    kickRemainingMs: number;
    color: string;
}
export declare class Ball extends Schema {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}
export declare class GameState extends Schema {
    players: MapSchema<Player>;
    ball: Ball;
    fieldWidth: number;
    fieldHeight: number;
}
