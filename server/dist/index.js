"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const monitor_1 = require("@colyseus/monitor");
const GameRoom_1 = require("./rooms/GameRoom");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server,
    }),
});
gameServer.define("game", GameRoom_1.GameRoom);
app.use("/colyseus", (0, monitor_1.monitor)());
const PORT = Number(process.env.PORT) || 2567;
server.listen(PORT, () => {
    console.log(`Colyseus server listening on ws://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map