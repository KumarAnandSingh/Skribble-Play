export type GamePhase = "lobby" | "drawing" | "results";

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  prompt: string | null;
  promptMasked: string | null;
  drawingPlayerId: string | null;
  roundEndsAt: number | null;
  scoreboard: Record<string, number>;
  correctGuessers: string[];
  readyPlayers: string[];
}
