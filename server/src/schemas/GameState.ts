import { MapSchema, Schema, type } from "@colyseus/schema";

export class LobbyPlayer extends Schema {
  @type("string") name: string = "Player";
  @type("string") team: string = "red";
  @type("boolean") isReady: boolean = false;
  @type("boolean") isHost: boolean = false;
}

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") radius: number = 18;
  @type("number") kickRemainingMs: number = 0;
  @type("number") dashRemainingMs: number = 0;
  @type("number") dashCooldownMs: number = 0;
  @type("string") team: string = "red";
  @type("string") color: string = "#ef4444";
  @type("string") powerUpType: string = "";
  @type("number") powerUpRemainingMs: number = 0;
}

export class Ball extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") radius: number = 9;
}

export class PowerUp extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") kind: string = "MAGNET";
}

export class GameState extends Schema {
  @type({ map: LobbyPlayer }) lobbyPlayers: MapSchema<LobbyPlayer> = new MapSchema<LobbyPlayer>();
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type({ map: PowerUp }) powerUps: MapSchema<PowerUp> = new MapSchema<PowerUp>();
  @type(Ball) ball: Ball = new Ball();
  @type("number") fieldWidth: number = 960;
  @type("number") fieldHeight: number = 540;
  @type("number") goalWidth: number = 180;
  @type("number") goalDepth: number = 36;
  @type("number") scoreRed: number = 0;
  @type("number") scoreBlue: number = 0;
  @type("string") roomCode: string = "";
  @type("string") roomStatus: string = "lobby";
  @type("string") hostSessionId: string = "";
  @type("number") countdownMs: number = 0;
  @type("number") scoreLimit: number = 3;
  @type("number") timeLimitMs: number = 0;
  @type("number") timeRemainingMs: number = 0;
  @type("boolean") powerUpsEnabled: boolean = true;
  @type("string") winnerTeam: string = "";
  @type("number") lastGoalBy: number = 0;
}
