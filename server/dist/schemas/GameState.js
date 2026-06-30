"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.PowerUp = exports.Ball = exports.Player = exports.LobbyPlayer = void 0;
const schema_1 = require("@colyseus/schema");
class LobbyPlayer extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.name = "Player";
        this.team = "red";
        this.isReady = false;
        this.isHost = false;
    }
}
exports.LobbyPlayer = LobbyPlayer;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LobbyPlayer.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LobbyPlayer.prototype, "team", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LobbyPlayer.prototype, "isReady", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LobbyPlayer.prototype, "isHost", void 0);
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 18;
        this.kickRemainingMs = 0;
        this.dashRemainingMs = 0;
        this.dashCooldownMs = 0;
        this.team = "red";
        this.color = "#ef4444";
        this.powerUpType = "";
        this.powerUpRemainingMs = 0;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "kickRemainingMs", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "dashRemainingMs", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "dashCooldownMs", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "team", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "powerUpType", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "powerUpRemainingMs", void 0);
class Ball extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 9;
    }
}
exports.Ball = Ball;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Ball.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Ball.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Ball.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Ball.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Ball.prototype, "radius", void 0);
class PowerUp extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.kind = "MAGNET";
    }
}
exports.PowerUp = PowerUp;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PowerUp.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PowerUp.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PowerUp.prototype, "kind", void 0);
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.lobbyPlayers = new schema_1.MapSchema();
        this.players = new schema_1.MapSchema();
        this.powerUps = new schema_1.MapSchema();
        this.ball = new Ball();
        this.fieldWidth = 960;
        this.fieldHeight = 540;
        this.goalWidth = 180;
        this.goalDepth = 36;
        this.scoreRed = 0;
        this.scoreBlue = 0;
        this.roomCode = "";
        this.roomStatus = "lobby";
        this.hostSessionId = "";
        this.countdownMs = 0;
        this.scoreLimit = 3;
        this.timeLimitMs = 0;
        this.timeRemainingMs = 0;
        this.powerUpsEnabled = true;
        this.winnerTeam = "";
        this.lastGoalBy = 0;
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)({ map: LobbyPlayer }),
    __metadata("design:type", schema_1.MapSchema)
], GameState.prototype, "lobbyPlayers", void 0);
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", schema_1.MapSchema)
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: PowerUp }),
    __metadata("design:type", schema_1.MapSchema)
], GameState.prototype, "powerUps", void 0);
__decorate([
    (0, schema_1.type)(Ball),
    __metadata("design:type", Ball)
], GameState.prototype, "ball", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "fieldWidth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "fieldHeight", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "goalWidth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "goalDepth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "scoreRed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "scoreBlue", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "roomCode", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "roomStatus", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "hostSessionId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "countdownMs", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "scoreLimit", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "timeLimitMs", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "timeRemainingMs", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], GameState.prototype, "powerUpsEnabled", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "winnerTeam", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "lastGoalBy", void 0);
//# sourceMappingURL=GameState.js.map