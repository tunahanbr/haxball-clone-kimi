"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const colyseus_1 = require("colyseus");
const GameState_1 = require("../schemas/GameState");
const PhysicsEngine_1 = require("../physics/PhysicsEngine");
class GameRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 8;
        this.physics = new PhysicsEngine_1.PhysicsEngine();
    }
    onCreate() {
        this.setState(new GameState_1.GameState());
        this.physics.resetBall(this.state);
        this.setSimulationInterval((deltaMs) => this.physics.update(this.state, deltaMs));
        this.onMessage("input", (client, message) => {
            this.physics.setInput(client.sessionId, message);
        });
    }
    onJoin(client) {
        this.physics.addPlayer(client.sessionId, this.state);
    }
    onLeave(client) {
        this.physics.removePlayer(client.sessionId, this.state);
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=GameRoom.js.map