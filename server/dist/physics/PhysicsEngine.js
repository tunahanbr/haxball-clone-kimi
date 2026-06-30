"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsEngine = exports.DEFAULT_CONFIG = void 0;
const GameState_1 = require("../schemas/GameState");
exports.DEFAULT_CONFIG = {
    playerMaxSpeed: 6.5,
    playerAcceleration: 0.9,
    kickImpulse: 14,
    dashImpulse: 24,
    dashCooldownMs: 3000,
    ballFriction: 0.988,
    netFriction: 0.78,
};
const PLAYER_FRICTION = 0.92;
const PLAYER_BASE_RADIUS = 18;
const KICK_RADIUS_BOOST = 6;
const KICK_DURATION_MS = 100;
const DASH_DURATION_MS = 200;
const BALL_RESTITUTION = 0.85;
const GOAL_COOLDOWN_MS = 800;
const EPSILON = 0.0001;
const CORNER_RADIUS = 40;
const POWERUP_RADIUS = 14;
const POWERUP_DURATION_MS = 5000;
const MAGNET_FORCE = 0.35;
const MAGNET_RANGE = 130;
const POWERUP_KINDS = ["MAGNET", "HEAVY"];
let powerUpIdCounter = 0;
class PhysicsEngine {
    constructor() {
        this.inputs = new Map();
        this.dashCooldowns = new Map();
        this.goalCooldown = 0;
        this.pendingReset = false;
        this.powerUpSpawnTimer = 0;
        this.nextPowerUpSpawnMs = 12000 + Math.random() * 3000;
        this.lastGoalTeam = null;
        this.positionsJustReset = false;
        this.config = { ...exports.DEFAULT_CONFIG };
    }
    setConfig(partial) {
        Object.assign(this.config, partial);
    }
    addPlayer(sessionId, state, preferredTeam) {
        const player = new GameState_1.Player();
        const { redCount, blueCount } = countTeams(state);
        player.team = preferredTeam ?? (redCount <= blueCount ? "red" : "blue");
        player.color = player.team === "red" ? "#ef4444" : "#3b82f6";
        const side = player.team === "red" ? 0 : 1;
        const slot = player.team === "red" ? redCount : blueCount;
        player.x = state.fieldWidth * (0.25 + side * 0.5);
        player.y = state.fieldHeight * (0.3 + (slot % 4) * 0.15);
        player.dashCooldownMs = 0;
        state.players.set(sessionId, player);
        this.inputs.set(sessionId, { up: false, down: false, left: false, right: false, kick: false, dash: false });
        this.dashCooldowns.set(sessionId, 0);
    }
    removePlayer(sessionId, state) {
        state.players.delete(sessionId);
        this.inputs.delete(sessionId);
        this.dashCooldowns.delete(sessionId);
    }
    setInput(sessionId, input) {
        this.inputs.set(sessionId, input);
    }
    resetBall(state) {
        state.ball.x = state.fieldWidth * 0.5;
        state.ball.y = state.fieldHeight * 0.5;
        state.ball.vx = 0;
        state.ball.vy = 0;
    }
    resetPositions(state) {
        this.resetBall(state);
        const redSlots = [];
        const blueSlots = [];
        state.players.forEach((p) => {
            if (p.team === "red")
                redSlots.push(p);
            else
                blueSlots.push(p);
        });
        redSlots.forEach((p, i) => {
            p.x = state.fieldWidth * 0.25;
            p.y = state.fieldHeight * (0.3 + (i % 4) * 0.15);
            p.vx = 0;
            p.vy = 0;
            p.kickRemainingMs = 0;
            p.dashRemainingMs = 0;
            p.radius = PLAYER_BASE_RADIUS;
            p.powerUpType = "";
            p.powerUpRemainingMs = 0;
        });
        blueSlots.forEach((p, i) => {
            p.x = state.fieldWidth * 0.75;
            p.y = state.fieldHeight * (0.3 + (i % 4) * 0.15);
            p.vx = 0;
            p.vy = 0;
            p.kickRemainingMs = 0;
            p.dashRemainingMs = 0;
            p.radius = PLAYER_BASE_RADIUS;
            p.powerUpType = "";
            p.powerUpRemainingMs = 0;
        });
        state.powerUps.clear();
        this.powerUpSpawnTimer = 0;
        this.nextPowerUpSpawnMs = 10000 + Math.random() * 5000;
    }
    update(state, deltaMs) {
        const dt = Math.min(deltaMs / 16.667, 3);
        this.positionsJustReset = false;
        if (this.goalCooldown > 0) {
            this.goalCooldown -= deltaMs;
            if (this.goalCooldown <= 0) {
                this.goalCooldown = 0;
                if (this.pendingReset) {
                    this.resetPositions(state);
                    this.pendingReset = false;
                    this.positionsJustReset = true;
                }
            }
            return;
        }
        if (state.powerUpsEnabled) {
            this.tickPowerUpSpawner(state, deltaMs);
        }
        state.players.forEach((player, sessionId) => {
            const input = this.inputs.get(sessionId);
            this.updatePlayer(state, player, sessionId, input, dt, deltaMs);
            const cooldown = this.dashCooldowns.get(sessionId) || 0;
            if (cooldown > 0) {
                const next = Math.max(0, cooldown - deltaMs);
                this.dashCooldowns.set(sessionId, next);
                player.dashCooldownMs = next;
            }
            else {
                player.dashCooldownMs = 0;
            }
        });
        if (state.powerUpsEnabled) {
            this.applyPowerUpEffects(state, dt, deltaMs);
        }
        state.ball.vx *= this.config.ballFriction;
        state.ball.vy *= this.config.ballFriction;
        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        const goalHalf = state.goalWidth * 0.5;
        const goalCY = state.fieldHeight * 0.5;
        const ballInGoalY = state.ball.y > goalCY - goalHalf && state.ball.y < goalCY + goalHalf;
        const ballInGoalX = state.ball.x < 0 || state.ball.x > state.fieldWidth;
        if (ballInGoalX && ballInGoalY) {
            state.ball.vx *= this.config.netFriction;
            state.ball.vy *= this.config.netFriction;
        }
        resolveBallWallCollisions(state);
        resolveCornerArc(state.ball, state.ball.radius, state, BALL_RESTITUTION);
        state.players.forEach((player) => resolveCircleCollision(player, state.ball));
        const playerArray = [];
        state.players.forEach((p) => playerArray.push(p));
        for (let i = 0; i < playerArray.length; i++) {
            for (let j = i + 1; j < playerArray.length; j++) {
                resolvePlayerCollision(playerArray[i], playerArray[j]);
            }
        }
        this.checkGoals(state);
    }
    tickPowerUpSpawner(state, deltaMs) {
        this.powerUpSpawnTimer += deltaMs;
        if (this.powerUpSpawnTimer < this.nextPowerUpSpawnMs)
            return;
        this.powerUpSpawnTimer = 0;
        this.nextPowerUpSpawnMs = 10000 + Math.random() * 5000;
        const margin = 80;
        const pu = new GameState_1.PowerUp();
        pu.x = margin + Math.random() * (state.fieldWidth - margin * 2);
        pu.y = margin + Math.random() * (state.fieldHeight - margin * 2);
        pu.kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
        state.powerUps.set(String(++powerUpIdCounter), pu);
    }
    applyPowerUpEffects(state, dt, deltaMs) {
        const pickupIds = [];
        state.powerUps.forEach((pu, puId) => {
            state.players.forEach((player) => {
                const dx = player.x - pu.x;
                const dy = player.y - pu.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.radius + POWERUP_RADIUS) {
                    if (pickupIds.indexOf(puId) === -1)
                        pickupIds.push(puId);
                    player.powerUpType = pu.kind;
                    player.powerUpRemainingMs = POWERUP_DURATION_MS;
                }
            });
        });
        pickupIds.forEach((id) => state.powerUps.delete(id));
        state.players.forEach((player) => {
            if (player.powerUpRemainingMs > 0) {
                player.powerUpRemainingMs = Math.max(0, player.powerUpRemainingMs - deltaMs);
                if (player.powerUpRemainingMs === 0)
                    player.powerUpType = "";
            }
            if (player.powerUpType === "MAGNET") {
                const dx = state.ball.x - player.x;
                const dy = state.ball.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAGNET_RANGE && dist > EPSILON) {
                    const ratio = 1 - dist / MAGNET_RANGE;
                    state.ball.vx -= (dx / dist) * MAGNET_FORCE * ratio * dt;
                    state.ball.vy -= (dy / dist) * MAGNET_FORCE * ratio * dt;
                }
            }
        });
    }
    updatePlayer(state, player, sessionId, input, dt, deltaMs) {
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
        player.vx += normalizedInput.x * this.config.playerAcceleration * dt;
        player.vy += normalizedInput.y * this.config.playerAcceleration * dt;
        if (player.dashRemainingMs <= 0) {
            const speed = length({ x: player.vx, y: player.vy });
            if (speed > this.config.playerMaxSpeed) {
                const scale = this.config.playerMaxSpeed / speed;
                player.vx *= scale;
                player.vy *= scale;
            }
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
        if (player.dashRemainingMs > 0) {
            player.dashRemainingMs -= deltaMs;
            if (player.dashRemainingMs < 0)
                player.dashRemainingMs = 0;
        }
        if (input?.dash && this.canDash(player, sessionId)) {
            this.applyDash(player, sessionId, normalizedInput);
        }
        if (input?.kick && player.kickRemainingMs <= 0) {
            player.kickRemainingMs = KICK_DURATION_MS;
            player.radius = PLAYER_BASE_RADIUS + KICK_RADIUS_BOOST;
            applyKickImpulse(player, state.ball, this.config.kickImpulse);
        }
        resolvePlayerGoalCollisions(player, PLAYER_BASE_RADIUS, state);
    }
    canDash(player, sessionId) {
        return player.dashRemainingMs <= 0 && (this.dashCooldowns.get(sessionId) || 0) <= 0;
    }
    applyDash(player, sessionId, inputDirection) {
        player.dashRemainingMs = DASH_DURATION_MS;
        this.dashCooldowns.set(sessionId, this.config.dashCooldownMs);
        player.dashCooldownMs = this.config.dashCooldownMs;
        let direction;
        const velocitySpeed = length({ x: player.vx, y: player.vy });
        if (velocitySpeed > EPSILON) {
            direction = normalize({ x: player.vx, y: player.vy });
        }
        else if (length(inputDirection) > EPSILON) {
            direction = inputDirection;
        }
        else {
            direction = { x: 1, y: 0 };
        }
        player.vx += direction.x * this.config.dashImpulse;
        player.vy += direction.y * this.config.dashImpulse;
    }
    checkGoals(state) {
        if (this.goalCooldown > 0)
            return;
        const r = state.ball.radius;
        const goalHalf = state.goalWidth * 0.5;
        const centerY = state.fieldHeight * 0.5;
        const inVerticalRange = state.ball.y > centerY - goalHalf && state.ball.y < centerY + goalHalf;
        if (inVerticalRange && state.ball.x + r * 0.2 < 0) {
            state.scoreBlue += 1;
            state.lastGoalBy = 2;
            this.lastGoalTeam = "blue";
            this.goalCooldown = GOAL_COOLDOWN_MS;
            this.pendingReset = true;
        }
        else if (inVerticalRange && state.ball.x - r * 0.2 > state.fieldWidth) {
            state.scoreRed += 1;
            state.lastGoalBy = 1;
            this.lastGoalTeam = "red";
            this.goalCooldown = GOAL_COOLDOWN_MS;
            this.pendingReset = true;
        }
    }
}
exports.PhysicsEngine = PhysicsEngine;
function countTeams(state) {
    let redCount = 0;
    let blueCount = 0;
    state.players.forEach((p) => {
        if (p.team === "red")
            redCount += 1;
        else
            blueCount += 1;
    });
    return { redCount, blueCount };
}
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
function applyKickImpulse(player, ball, impulse) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const reach = PLAYER_BASE_RADIUS + KICK_RADIUS_BOOST + ball.radius;
    if (dist < EPSILON || dist > reach)
        return;
    const normal = { x: dx / dist, y: dy / dist };
    ball.vx = normal.x * impulse + player.vx * 0.4;
    ball.vy = normal.y * impulse + player.vy * 0.4;
}
function resolveCornerArc(entity, radius, state, restitution) {
    const cr = CORNER_RADIUS;
    const { fieldWidth: fw, fieldHeight: fh } = state;
    const maxDist = cr - radius;
    if (maxDist <= 0)
        return;
    const corners = [
        { cx: cr, cy: cr },
        { cx: fw - cr, cy: cr },
        { cx: cr, cy: fh - cr },
        { cx: fw - cr, cy: fh - cr },
    ];
    for (const { cx, cy } of corners) {
        const inCornerX = cx < fw * 0.5 ? entity.x < cx : entity.x > cx;
        const inCornerY = cy < fh * 0.5 ? entity.y < cy : entity.y > cy;
        if (!inCornerX || !inCornerY)
            continue;
        const dx = entity.x - cx;
        const dy = entity.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= maxDist || dist < EPSILON)
            continue;
        const nx = dx / dist;
        const ny = dy / dist;
        entity.x = cx + nx * maxDist;
        entity.y = cy + ny * maxDist;
        const vDot = entity.vx * nx + entity.vy * ny;
        if (vDot > 0) {
            entity.vx -= (1 + restitution) * vDot * nx;
            entity.vy -= (1 + restitution) * vDot * ny;
        }
    }
}
function resolveBallWallCollisions(state) {
    const ball = state.ball;
    const r = ball.radius;
    const { fieldWidth, fieldHeight, goalWidth, goalDepth } = state;
    const cr = CORNER_RADIUS;
    const centerY = fieldHeight * 0.5;
    const goalHalf = goalWidth * 0.5;
    const goalTop = centerY - goalHalf;
    const goalBottom = centerY + goalHalf;
    const inGoalY = ball.y > goalTop && ball.y < goalBottom;
    const inStraightX = ball.x > cr && ball.x < fieldWidth - cr;
    const inStraightY = ball.y > cr && ball.y < fieldHeight - cr;
    if (ball.x - r < 0) {
        if (!inGoalY) {
            if (inStraightY) {
                ball.x = r;
                ball.vx = Math.abs(ball.vx) * BALL_RESTITUTION;
            }
        }
        else if (ball.x - r < -goalDepth) {
            ball.x = r - goalDepth;
            ball.vx = Math.abs(ball.vx) * BALL_RESTITUTION;
        }
    }
    else if (ball.x + r > fieldWidth) {
        if (!inGoalY) {
            if (inStraightY) {
                ball.x = fieldWidth - r;
                ball.vx = -Math.abs(ball.vx) * BALL_RESTITUTION;
            }
        }
        else if (ball.x + r > fieldWidth + goalDepth) {
            ball.x = fieldWidth + goalDepth - r;
            ball.vx = -Math.abs(ball.vx) * BALL_RESTITUTION;
        }
    }
    if (ball.x < 0) {
        if (ball.y - r < goalTop) {
            ball.y = goalTop + r;
            ball.vy = Math.abs(ball.vy) * BALL_RESTITUTION;
        }
        else if (ball.y + r > goalBottom) {
            ball.y = goalBottom - r;
            ball.vy = -Math.abs(ball.vy) * BALL_RESTITUTION;
        }
    }
    else if (ball.x > fieldWidth) {
        if (ball.y - r < goalTop) {
            ball.y = goalTop + r;
            ball.vy = Math.abs(ball.vy) * BALL_RESTITUTION;
        }
        else if (ball.y + r > goalBottom) {
            ball.y = goalBottom - r;
            ball.vy = -Math.abs(ball.vy) * BALL_RESTITUTION;
        }
    }
    if (inStraightX) {
        if (ball.y - r < 0) {
            ball.y = r;
            ball.vy = Math.abs(ball.vy) * BALL_RESTITUTION;
        }
        else if (ball.y + r > fieldHeight) {
            ball.y = fieldHeight - r;
            ball.vy = -Math.abs(ball.vy) * BALL_RESTITUTION;
        }
    }
}
function resolvePlayerGoalCollisions(entity, radius, state) {
    const { fieldWidth, fieldHeight, goalWidth, goalDepth } = state;
    const cr = CORNER_RADIUS;
    const centerY = fieldHeight * 0.5;
    const goalHalf = goalWidth * 0.5;
    const goalTop = centerY - goalHalf;
    const goalBottom = centerY + goalHalf;
    const inGoalY = entity.y > goalTop && entity.y < goalBottom;
    const inStraightX = entity.x > cr && entity.x < fieldWidth - cr;
    const inStraightY = entity.y > cr && entity.y < fieldHeight - cr;
    if (entity.x - radius < 0) {
        if (!inGoalY) {
            if (inStraightY) {
                entity.x = radius;
                entity.vx = Math.abs(entity.vx);
            }
        }
        else {
            if (entity.x - radius < -goalDepth) {
                entity.x = radius - goalDepth;
                entity.vx = Math.abs(entity.vx);
            }
            if (entity.x < 0) {
                if (entity.y - radius < goalTop) {
                    entity.y = goalTop + radius;
                    entity.vy = Math.abs(entity.vy);
                }
                else if (entity.y + radius > goalBottom) {
                    entity.y = goalBottom - radius;
                    entity.vy = -Math.abs(entity.vy);
                }
            }
        }
    }
    else if (entity.x + radius > fieldWidth) {
        if (!inGoalY) {
            if (inStraightY) {
                entity.x = fieldWidth - radius;
                entity.vx = -Math.abs(entity.vx);
            }
        }
        else {
            if (entity.x + radius > fieldWidth + goalDepth) {
                entity.x = fieldWidth + goalDepth - radius;
                entity.vx = -Math.abs(entity.vx);
            }
            if (entity.x > fieldWidth) {
                if (entity.y - radius < goalTop) {
                    entity.y = goalTop + radius;
                    entity.vy = Math.abs(entity.vy);
                }
                else if (entity.y + radius > goalBottom) {
                    entity.y = goalBottom - radius;
                    entity.vy = -Math.abs(entity.vy);
                }
            }
        }
    }
    if (inStraightX) {
        if (entity.y - radius < 0) {
            entity.y = radius;
            entity.vy = Math.abs(entity.vy);
        }
        else if (entity.y + radius > fieldHeight) {
            entity.y = fieldHeight - radius;
            entity.vy = -Math.abs(entity.vy);
        }
    }
    resolveCornerArc(entity, radius, state, 0.4);
}
function resolvePlayerCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = PLAYER_BASE_RADIUS * 2;
    if (distance >= minDistance || distance < EPSILON)
        return;
    const normal = { x: dx / distance, y: dy / distance };
    const overlap = minDistance - distance;
    a.x -= normal.x * overlap * 0.5;
    a.y -= normal.y * overlap * 0.5;
    b.x += normal.x * overlap * 0.5;
    b.y += normal.y * overlap * 0.5;
    const relVx = b.vx - a.vx;
    const relVy = b.vy - a.vy;
    const velocityAlongNormal = relVx * normal.x + relVy * normal.y;
    if (velocityAlongNormal > 0)
        return;
    const aHeavy = a.powerUpType === "HEAVY";
    const bHeavy = b.powerUpType === "HEAVY";
    const massA = aHeavy ? 4 : 1;
    const massB = bHeavy ? 4 : 1;
    const totalMass = massA + massB;
    const restitution = aHeavy || bHeavy ? 0.6 : 0.4;
    const impulse = -(1 + restitution) * velocityAlongNormal / totalMass;
    a.vx -= normal.x * impulse * (massB / totalMass) * 2;
    a.vy -= normal.y * impulse * (massB / totalMass) * 2;
    b.vx += normal.x * impulse * (massA / totalMass) * 2;
    b.vy += normal.y * impulse * (massA / totalMass) * 2;
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
    ball.x += normal.x * overlap * 0.85;
    ball.y += normal.y * overlap * 0.85;
    player.x -= normal.x * overlap * 0.15;
    player.y -= normal.y * overlap * 0.15;
    const relativeVelocity = { x: ball.vx - player.vx, y: ball.vy - player.vy };
    const velocityAlongNormal = dot(relativeVelocity, normal);
    if (velocityAlongNormal > 0)
        return;
    const restitution = player.powerUpType === "HEAVY" ? 0.55 : 0.2;
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    ball.vx += normal.x * impulseScalar;
    ball.vy += normal.y * impulseScalar;
    ball.vx += player.vx * 0.06;
    ball.vy += player.vy * 0.06;
    player.vx -= normal.x * impulseScalar * 0.05;
    player.vy -= normal.y * impulseScalar * 0.05;
}
//# sourceMappingURL=PhysicsEngine.js.map