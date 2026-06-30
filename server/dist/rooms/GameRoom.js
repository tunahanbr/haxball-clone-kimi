"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const colyseus_1 = require("colyseus");
const GameState_1 = require("../schemas/GameState");
const PhysicsEngine_1 = require("../physics/PhysicsEngine");
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const COUNTDOWN_MS = 3000;
const GAME_OVER_RETURN_MS = 10000;
function generateRoomCode() {
    return Array.from({ length: 5 }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]).join("");
}
class GameRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 10;
        this.physics = new PhysicsEngine_1.PhysicsEngine();
        this.returnToLobbyTimer = null;
    }
    onCreate() {
        this.setState(new GameState_1.GameState());
        const code = generateRoomCode();
        this.state.roomCode = code;
        this.state.roomStatus = "lobby";
        this.setMetadata({ code });
        this.setPatchRate(1000 / 60);
        this.setSimulationInterval((deltaMs) => this.gameTick(deltaMs));
        this.onMessage("set_team", (client, team) => {
            const lobbyPlayer = this.state.lobbyPlayers.get(client.sessionId);
            if (!lobbyPlayer || this.state.roomStatus !== "lobby")
                return;
            lobbyPlayer.team = team;
            lobbyPlayer.isReady = false;
        });
        this.onMessage("set_ready", (client, isReady) => {
            const lobbyPlayer = this.state.lobbyPlayers.get(client.sessionId);
            if (!lobbyPlayer || this.state.roomStatus !== "lobby")
                return;
            lobbyPlayer.isReady = isReady;
        });
        this.onMessage("set_match_settings", (client, settings) => {
            if (client.sessionId !== this.state.hostSessionId)
                return;
            if (this.state.roomStatus !== "lobby")
                return;
            if (typeof settings.scoreLimit === "number")
                this.state.scoreLimit = Math.max(0, Math.min(10, settings.scoreLimit));
            if (typeof settings.timeLimitMs === "number")
                this.state.timeLimitMs = Math.max(0, settings.timeLimitMs);
            if (typeof settings.powerUpsEnabled === "boolean")
                this.state.powerUpsEnabled = settings.powerUpsEnabled;
        });
        this.onMessage("start_match", (client) => {
            if (client.sessionId !== this.state.hostSessionId)
                return;
            if (this.state.roomStatus !== "lobby")
                return;
            const nonHostPlayers = [];
            this.state.lobbyPlayers.forEach((p) => {
                if (!p.isHost)
                    nonHostPlayers.push(p);
            });
            const allReady = nonHostPlayers.every((p) => p.isReady);
            if (!allReady)
                return;
            this.state.lobbyPlayers.forEach((lobbyPlayer, sessionId) => {
                this.physics.addPlayer(sessionId, this.state, lobbyPlayer.team);
            });
            this.physics.resetBall(this.state);
            this.state.scoreRed = 0;
            this.state.scoreBlue = 0;
            this.state.winnerTeam = "";
            this.state.lastGoalBy = 0;
            this.state.timeRemainingMs = this.state.timeLimitMs;
            this.state.countdownMs = COUNTDOWN_MS;
            this.state.roomStatus = "countdown";
        });
        this.onMessage("input", (client, message) => {
            if (this.state.roomStatus !== "playing")
                return;
            this.physics.setInput(client.sessionId, message);
        });
        this.onMessage("physics_config", (_client, message) => {
            this.physics.setConfig(message);
        });
    }
    gameTick(deltaMs) {
        if (this.state.roomStatus === "lobby" || this.state.roomStatus === "game_over")
            return;
        if (this.state.roomStatus === "countdown") {
            this.state.countdownMs = Math.max(0, this.state.countdownMs - deltaMs);
            if (this.state.countdownMs <= 0) {
                this.state.roomStatus = "playing";
            }
            return;
        }
        if (this.state.roomStatus !== "playing")
            return;
        if (this.state.timeLimitMs > 0) {
            this.state.timeRemainingMs = Math.max(0, this.state.timeRemainingMs - deltaMs);
            if (this.state.timeRemainingMs <= 0) {
                const winner = this.state.scoreRed > this.state.scoreBlue
                    ? "red"
                    : this.state.scoreBlue > this.state.scoreRed
                        ? "blue"
                        : "draw";
                this.triggerGameOver(winner);
                return;
            }
        }
        this.physics.update(this.state, deltaMs);
        if (this.physics.lastGoalTeam !== null) {
            const scorer = this.physics.lastGoalTeam;
            this.physics.lastGoalTeam = null;
            const redWon = this.state.scoreLimit > 0 && this.state.scoreRed >= this.state.scoreLimit;
            const blueWon = this.state.scoreLimit > 0 && this.state.scoreBlue >= this.state.scoreLimit;
            if (redWon || blueWon) {
                this.triggerGameOver(redWon ? "red" : "blue");
                return;
            }
        }
        if (this.physics.positionsJustReset && this.state.roomStatus === "playing") {
            this.state.countdownMs = COUNTDOWN_MS;
            this.state.roomStatus = "countdown";
        }
    }
    triggerGameOver(winner) {
        this.state.winnerTeam = winner;
        this.state.roomStatus = "game_over";
        this.returnToLobbyTimer = setTimeout(() => {
            this.resetToLobby();
        }, GAME_OVER_RETURN_MS);
    }
    resetToLobby() {
        this.state.roomStatus = "lobby";
        this.state.scoreRed = 0;
        this.state.scoreBlue = 0;
        this.state.winnerTeam = "";
        this.state.countdownMs = 0;
        this.state.timeRemainingMs = 0;
        this.state.lastGoalBy = 0;
        this.state.players.clear();
        this.state.powerUps.clear();
        this.physics = new PhysicsEngine_1.PhysicsEngine();
        this.state.lobbyPlayers.forEach((p) => {
            p.isReady = false;
        });
    }
    onJoin(client, options) {
        if (this.state.roomStatus !== "lobby") {
            throw new Error("Match already in progress");
        }
        const lobbyPlayer = new GameState_1.LobbyPlayer();
        lobbyPlayer.name = options?.name?.trim() || `Player ${this.clients.length}`;
        if (this.state.lobbyPlayers.size === 0) {
            lobbyPlayer.isHost = true;
            this.state.hostSessionId = client.sessionId;
        }
        let redCount = 0;
        let blueCount = 0;
        this.state.lobbyPlayers.forEach((p) => {
            if (p.team === "red")
                redCount++;
            else
                blueCount++;
        });
        lobbyPlayer.team = redCount <= blueCount ? "red" : "blue";
        this.state.lobbyPlayers.set(client.sessionId, lobbyPlayer);
    }
    onLeave(client) {
        this.state.lobbyPlayers.delete(client.sessionId);
        if (this.state.roomStatus === "playing" || this.state.roomStatus === "countdown") {
            this.physics.removePlayer(client.sessionId, this.state);
        }
        if (client.sessionId === this.state.hostSessionId && this.state.lobbyPlayers.size > 0) {
            let newHostId;
            this.state.lobbyPlayers.forEach((_, id) => {
                if (!newHostId)
                    newHostId = id;
            });
            if (newHostId) {
                const newHost = this.state.lobbyPlayers.get(newHostId);
                if (newHost) {
                    newHost.isHost = true;
                    this.state.hostSessionId = newHostId;
                }
            }
        }
    }
    onDispose() {
        if (this.returnToLobbyTimer)
            clearTimeout(this.returnToLobbyTimer);
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=GameRoom.js.map