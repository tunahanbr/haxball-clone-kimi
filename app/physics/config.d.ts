export type PhysicsConfig = {
    playerMaxSpeed: number;
    playerAcceleration: number;
    kickImpulse: number;
    dashImpulse: number;
    dashCooldownMs: number;
    ballFriction: number;
    netFriction: number;
};
export declare const DEFAULT_CONFIG: PhysicsConfig;
