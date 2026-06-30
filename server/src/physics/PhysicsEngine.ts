import { Ball, GameState, Player } from "../schemas/GameState";

export type Vector2 = {
  x: number;
  y: number;
};

export type PlayerInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  kick: boolean;
};

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

export class PhysicsEngine {
  private inputs = new Map<string, PlayerInput>();

  addPlayer(sessionId: string, state: GameState) {
    const player = new Player();
    const index = state.players.size;
    player.x = index % 2 === 0 ? state.fieldWidth * 0.25 : state.fieldWidth * 0.75;
    player.y = state.fieldHeight * (0.35 + (Math.floor(index / 2) % 3) * 0.15);
    player.color = index % 2 === 0 ? "#ef4444" : "#3b82f6";
    state.players.set(sessionId, player);
    this.inputs.set(sessionId, {
      up: false,
      down: false,
      left: false,
      right: false,
      kick: false,
    });
  }

  removePlayer(sessionId: string, state: GameState) {
    state.players.delete(sessionId);
    this.inputs.delete(sessionId);
  }

  setInput(sessionId: string, input: PlayerInput) {
    this.inputs.set(sessionId, input);
  }

  resetBall(state: GameState) {
    state.ball.x = state.fieldWidth * 0.6;
    state.ball.y = state.fieldHeight * 0.5;
    state.ball.vx = 0;
    state.ball.vy = 0;
  }

  update(state: GameState, deltaMs: number) {
    const dt = Math.min(deltaMs / 16.667, 3);

    state.players.forEach((player, sessionId) => {
      const input = this.inputs.get(sessionId);
      this.updatePlayer(state, player, input, dt, deltaMs);
    });

    state.ball.vx *= BALL_FRICTION;
    state.ball.vy *= BALL_FRICTION;
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    resolveWallCollisions(
      state.ball,
      state.ball.radius,
      state.fieldWidth,
      state.fieldHeight,
      BALL_RESTITUTION
    );

    state.players.forEach((player) => {
      resolveCircleCollision(player, state.ball);
    });

    const playerArray: Player[] = [];
    state.players.forEach((p) => playerArray.push(p));
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        resolvePlayerCollision(playerArray[i], playerArray[j]);
      }
    }
  }

  private updatePlayer(
    state: GameState,
    player: Player,
    input: PlayerInput | undefined,
    dt: number,
    deltaMs: number
  ) {
    const rawInput: Vector2 = { x: 0, y: 0 };
    if (input) {
      if (input.up) rawInput.y -= 1;
      if (input.down) rawInput.y += 1;
      if (input.left) rawInput.x -= 1;
      if (input.right) rawInput.x += 1;
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

    resolveWallCollisions(
      player,
      PLAYER_BASE_RADIUS,
      state.fieldWidth,
      state.fieldHeight,
      1
    );
  }
}

function length(v: Vector2) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vector2): Vector2 {
  const len = length(v);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Vector2, b: Vector2) {
  return a.x * b.x + a.y * b.y;
}

function applyKickImpulse(player: Player, ball: Ball) {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const reach = PLAYER_BASE_RADIUS + KICK_RADIUS_BOOST + ball.radius;

  if (dist < EPSILON || dist > reach) return;

  const normal: Vector2 = { x: dx / dist, y: dy / dist };
  const relativeVelocity: Vector2 = {
    x: ball.vx - player.vx,
    y: ball.vy - player.vy,
  };
  const separatingSpeed = dot(relativeVelocity, normal);

  if (separatingSpeed > 0) return;

  ball.vx += normal.x * KICK_IMPULSE + player.vx * 0.35;
  ball.vy += normal.y * KICK_IMPULSE + player.vy * 0.35;
}

function resolveWallCollisions(
  entity: { x: number; y: number; vx: number; vy: number },
  radius: number,
  width: number,
  height: number,
  restitution: number
) {
  if (entity.x < radius) {
    entity.x = radius;
    entity.vx = Math.abs(entity.vx) * restitution;
  } else if (entity.x > width - radius) {
    entity.x = width - radius;
    entity.vx = -Math.abs(entity.vx) * restitution;
  }

  if (entity.y < radius) {
    entity.y = radius;
    entity.vy = Math.abs(entity.vy) * restitution;
  } else if (entity.y > height - radius) {
    entity.y = height - radius;
    entity.vy = -Math.abs(entity.vy) * restitution;
  }
}

function resolvePlayerCollision(a: Player, b: Player) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = PLAYER_BASE_RADIUS * 2;

  if (distance >= minDistance || distance < EPSILON) return;

  const normal: Vector2 = { x: dx / distance, y: dy / distance };
  const overlap = minDistance - distance;

  a.x -= normal.x * overlap * 0.5;
  a.y -= normal.y * overlap * 0.5;
  b.x += normal.x * overlap * 0.5;
  b.y += normal.y * overlap * 0.5;

  const relVx = b.vx - a.vx;
  const relVy = b.vy - a.vy;
  const velocityAlongNormal = relVx * normal.x + relVy * normal.y;

  if (velocityAlongNormal > 0) return;

  const impulse = -(1 + 0.4) * velocityAlongNormal * 0.5;
  a.vx -= normal.x * impulse;
  a.vy -= normal.y * impulse;
  b.vx += normal.x * impulse;
  b.vy += normal.y * impulse;
}

function resolveCircleCollision(player: Player, ball: Ball) {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = player.radius + ball.radius;

  if (distance >= minDistance || distance < EPSILON) return;

  const normal: Vector2 = { x: dx / distance, y: dy / distance };
  const overlap = minDistance - distance;

  const playerShare = 0.15;
  const ballShare = 0.85;

  ball.x += normal.x * overlap * ballShare;
  ball.y += normal.y * overlap * ballShare;
  player.x -= normal.x * overlap * playerShare;
  player.y -= normal.y * overlap * playerShare;

  const relativeVelocity: Vector2 = {
    x: ball.vx - player.vx,
    y: ball.vy - player.vy,
  };
  const velocityAlongNormal = dot(relativeVelocity, normal);

  if (velocityAlongNormal > 0) return;

  const restitution = 0.75;
  const impulseScalar = -(1 + restitution) * velocityAlongNormal;

  ball.vx += normal.x * impulseScalar;
  ball.vy += normal.y * impulseScalar;
  ball.vx += player.vx * 0.25;
  ball.vy += player.vy * 0.25;

  player.vx -= normal.x * impulseScalar * 0.08;
  player.vy -= normal.y * impulseScalar * 0.08;
}
