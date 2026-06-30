import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") radius: number = 18;
  @type("number") kickRemainingMs: number = 0;
  @type("string") color: string = "#ffffff";
}

export class Ball extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") radius: number = 9;
}

export class GameState extends Schema {
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type(Ball) ball: Ball = new Ball();
  @type("number") fieldWidth: number = 960;
  @type("number") fieldHeight: number = 540;
}
