export type PhysicsConfig = {
  playerMaxSpeed: number;
  playerAcceleration: number;
  kickImpulse: number;
  dashImpulse: number;
  dashCooldownMs: number;
  ballFriction: number;
  netFriction: number;
};

export const DEFAULT_CONFIG: PhysicsConfig = {
  playerMaxSpeed: 6.5,
  playerAcceleration: 0.9,
  kickImpulse: 14,
  dashImpulse: 24,
  dashCooldownMs: 3000,
  ballFriction: 0.988,
  netFriction: 0.78,
};
