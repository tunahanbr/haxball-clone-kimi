import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

gameServer.define("game", GameRoom);

app.get("/api/room/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const rooms = await matchMaker.query({ name: "game" });
    const target = rooms.find((r) => r.metadata?.code === code);
    if (!target) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json({ roomId: target.roomId });
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
});

app.use("/colyseus", monitor());

const PORT = Number(process.env.PORT) || 2567;
server.listen(PORT, () => {
  console.log(`Colyseus server listening on ws://localhost:${PORT}`);
});
