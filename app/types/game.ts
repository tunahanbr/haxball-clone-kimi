export type PlayerInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  kick: boolean;
  dash: boolean;
};

export type TeamSide = "red" | "blue";

export type MatchSettings = {
  scoreLimit: number;
  timeLimitMs: number;
  powerUpsEnabled: boolean;
};
