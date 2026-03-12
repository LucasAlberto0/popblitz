export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type PlayerStatus = 'ready' | 'playing' | 'disconnected'
export type RoundStatus = 'pending' | 'active' | 'finished'

export interface Room {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  max_players: number
  current_round: number
  total_rounds: number
  time_per_round: number
  max_score?: number
  difficulty?: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  avatar: string
  score: number
  streak: number
  status: PlayerStatus
  is_host: boolean
  order: number
  joined_at: string
}

export interface Round {
  id: string
  room_id: string
  round_number: number
  image_url: string
  answer: string
  answer_hints: string[]
  status: RoundStatus
  started_at: string | null
  ended_at: string | null
}

export interface RoundAnswer {
  id: string
  round_id: string
  player_id: string
  answer: string
  is_correct: boolean
  time_ms: number
  points_earned: number
  answered_at: string
}

export interface GameState {
  room: Room | null
  players: Player[]
  currentRound: Round | null
  answers: RoundAnswer[]
}

export interface CreateRoomParams {
  hostName: string
  hostAvatar: string
  maxPlayers?: number
  totalRounds?: number
  timePerRound?: number
}

export interface JoinRoomParams {
  roomCode: string
  playerName: string
  playerAvatar: string
}

export interface SubmitAnswerParams {
  roundId: string
  playerId: string
  answer: string
  timeMs: number
}
