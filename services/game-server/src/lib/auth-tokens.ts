import jwt from "jsonwebtoken";

export type PlayerRole = "player" | "host";

export interface PlayerTokenClaims {
  roomCode: string;
  playerId: string;
  role: PlayerRole;
}

const DEFAULT_SECRET = "dev-secret";

function getSecret() {
  return process.env.AUTH_SECRET ?? DEFAULT_SECRET;
}

export function createPlayerToken(payload: PlayerTokenClaims, expiresIn = "12h") {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyPlayerToken(token: string): PlayerTokenClaims {
  return jwt.verify(token, getSecret()) as PlayerTokenClaims;
}
