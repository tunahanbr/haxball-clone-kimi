"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsEngine = void 0;
const GameState_1 = require("../schemas/GameState");
const PLAYER_ACCELERATION = 0.9;
const PLAYER_MAX_SPEED = 6.5;
const PLAYER_FRICTION = 0.92;
const PLAYER_BASE_RADIUS = 18;
const KICK_RADIUS_BOOST = 6;
const KICK_DURATION_MS = 100;
const KICK_IMPULSE = 22;
const BALL_FRICTION = 0.988;
const BALL_RESTITUTION = 0.85;
const EPSILON = 0.0001;
class PhysicsEngine {
    constructor() {
        this.inputs = new Map();
    }
    addPlayer(sessionId, state) {
        const player = new GameState_1.Player();
        player.x = state.fieldWidth * 0.3;
        player.y = state.fieldHeight * 0.5;
        state.players.set(sessionId, player);
        this.inputs.set(sessionId, {
            up: false,
            down: false,
            left: false,
            right: false,
            kick: false,
        });
    }
    removePlayer(sessionId, state) {
        state.players.delete(sessionId);
        this.inputs.delete(sessionId);
    }
    setInput(sessionId, input) {
        this.inputs.set(sessionId, input);
    }
    resetBall(state) {
        state.ball.x = state.fieldWidth * 0.6;
        state.ball.y = state.fieldHeight * 0.5;
        state.ball.vx = 0;
        state.ball.vy = 0;
    }
    update(state, deltaMs) {
        const dt = Math.min(deltaMs / 16.667, 3);
        state.players.forEach((player, sessionId) => {
            const input = this.inputs.get(sessionId);
            this.updatePlayer(state, player, input, dt, deltaMs);
        });
        state.ball.vx *= BALL_FRICTION;
        state.ball.vy *= BALL_FRICTION;
        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        resolveWallCollisions(state.ball, state.ball.radius, state.fieldWidth, state.fieldHeight, BALL_RESTITUTION);
        state.players.forEach((player) => {
            resolveCircleCollision(player, state.ball);
        });
    }
    updatePlayer(state, player, input, dt, deltaMs) {
        const rawInput = { x: 0, y: 0 };
        if (input) {
            if (input.up)
                rawInput.y -= 1;
            if (input.down)
                rawInput.y += 1;
            if (input.left)
                rawInput.x -= 1;
            if (input.right)
                rawInput.x += 1;
        }
        const normalizedInput = normalize(rawInput);
        player.vx += normalizedInput.x * PLAYER_ACCELERATION * dt;
        player.vy += normalizedInput.y * PLAYER_ACCELERATION * dt;
        const speed = length({ x: player.vx, y: player.vy });
        if (speed > PLAYER_MAX_SPEED) {
            const scale = PLAYER_MAX_SPEED / speed;
            player.vx *= scale;
            player.vy *= scale;
        }
        player.vx *= PLAYER_FRICTION;
        player.vy *= PLAYER_FRICTION;
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        if (player.kickRemainingMs > 0) {
            player.kickRemainingMs -= deltaMs;
            if (player.kickRemainingMs <= 0) {
                player.kickRemainingMs = 0;
                player.radius = PLAYER_BASE_RADIUS;
            }
        }
        if (input?.kick && player.kickRemainingMs <= 0) {
            player.kickRemainingMs = KICK_DURATION_MS;
            player.radius = PLAYER_BASE_RADIUS + KICK_RADIUS_BOOST;
            applyKickImpulse(player, state.ball);
        }
        resolveWallCollisions(player, PLAYER_BASE_RADIUS, state.fieldWidth, state.fieldHeight, 1);
    }
}
exports.PhysicsEngine = PhysicsEngine;
function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}
function normalize(v) {
    const len = length(v);
    if (len < EPSILON)
        return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}
function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}
function applyKickImpulse(player, ball) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const reach = PLAYER_BASE_RADIUS + KICK_RADIUS_BOOST + ball.radius;
    if (dist < EPSILON || dist > reach)
        return;
    const normal = { x: dx / dist, y: dy / dist };
    const relativeVelocity = {
        x: ball.vx - player.vx,
        y: ball.vy - player.vy,
    };
    const separatingSpeed = dot(relativeVelocity, normal);
    if (separatingSpeed > 0)
        return;
    ball.vx += normal.x * KICK_IMPULSE + player.vx * 0.35;
    ball.vy += normal.y * KICK_IMPULSE + player.vy * 0.35;
}
function resolveWallCollisions(entity, radius, width, height, restitution) {
    if (entity.x < radius) {
        entity.x = radius;
        entity.vx = Math.abs(entity.vx) * restitution;
    }
    else if (entity.x > width - radius) {
        entity.x = width - radius;
        entity.vx = -Math.abs(entity.vx) * restitution;
    }
    if (entity.y < radius) {
        entity.y = radius;
        entity.vy = Math.abs(entity.vy) * restitution;
    }
    else if (entity.y > height - radius) {
        entity.y = height - radius;
        entity.vy = -Math.abs(entity.vy) * restitution;
    }
}
function resolveCircleCollision(player, ball) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = player.radius + ball.radius;
    if (distance >= minDistance || distance < EPSILON)
        return;
    const normal = { x: dx / distance, y: dy / distance };
    const overlap = minDistance - distance;
    const playerShare = 0.15;
    const ballShare = 0.85;
    ball.x += normal.x * overlap * ballShare;
    ball.y += normal.y * overlap * ballShare;
    player.x -= normal.x * overlap * playerShare;
    player.y -= normal.y * overlap * playerShare;
    const relativeVelocity = {
        x: ball.vx - player.vx,
        y: ball.vy - player.vy,
    };
    const velocityAlongNormal = dot(relativeVelocity, normal);
    if (velocityAlongNormal > 0)
        return;
    const restitution = 0.75;
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    ball.vx += normal.x * impulseScalar;
    ball.vy += normal.y * impulseScalar;
    ball.vx += player.vx * 0.25;
    ball.vy += player.vy * 0.25;
    player.vx -= normal.x * impulseScalar * 0.08;
    player.vy -= normal.y * impulseScalar * 0.08;
}
//# sourceMappingURL=PhysicsEngine.js.map