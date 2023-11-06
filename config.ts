export const CHESS_INFO = {
  MIN_PLAYER: 2,
  MAX_PLAYER: 2,
};

export interface ChessStatus {
  roomKey: string | null;
  size: 0 | 1 | 2;
  host: string | null;
  guest: string | null;
  whitePlayer: string | null;
  blackPlayer: string | null;
  isStarted: boolean;
  isEnded: boolean;
}

export const initialChessStatus: ChessStatus = {
  roomKey: null,
  size: 0,
  host: null,
  guest: null,
  whitePlayer: null,
  blackPlayer: null,
  isStarted: false,
  isEnded: false,
};

export interface IdInfo {
  playerName: string;
  roomKey: string;
}

export interface ChessAction {
  from: string;
  to: string;
}
