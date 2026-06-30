import { Room, Client } from "colyseus";
import { GameState } from "../schemas/GameState";
import { PhysicsEngine, PlayerInput } from "../physics/PhysicsEngine";

export class GameRoom extends Room<GameState> {
  maxClients = 8;
  private physics = new PhysicsEngine();

  onCreate() {
    this.setState(new GameState());
    this.physics.resetBall(this.state);
    this.setPatchRate(1000 / 60);
    this.setSimulationInterval((deltaMs) => this.physics.update(this.state, deltaMs));

    this.onMessage("input", (client, message: PlayerInput) => {
      this.physics.setInput(client.sessionId, message);
    });
  }

  onJoin(client: Client) {
    this.physics.addPlayer(client.sessionId, this.state);
  }

  onLeave(client: Client) {
    this.physics.removePlayer(client.sessionId, this.state);
  }
}
