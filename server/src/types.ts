export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type PlayerStatus = 'ready' | 'playing' | 'disconnected'
export type RoundStatus = 'pending' | 'active' | 'finished'

export interface RoomData {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  max_players: number
  current_round: number
  total_rounds: number
  time_per_round: number
  interval_time: number
  max_score: number
  difficulty: string
  include_audio: boolean
  only_audio: boolean
  include_surprise: boolean
  include_custom: boolean
  created_at: string
  updated_at: string
}

export interface PlayerData {
  id: string
  room_id: string
  session_id: string
  name: string
  avatar: string
  score: number
  streak: number
  status: PlayerStatus
  is_host: boolean
  player_order: number
  joined_at: string
  last_seen_at: string
  socket_id?: string | null
}

export interface InternalRoundData {
  id: string
  room_id: string
  round_number: number
  image_url: string
  audio_url: string
  type: string
  question: string
  answer: string
  answer_hints: string[]
  status: RoundStatus
  started_at: string | null
  ended_at: string | null
  ends_at_ms: number | null
  interval_ends_at_ms: number | null
  lucky_player_id: string | null
}

export interface PublicRoundData {
  id: string
  room_id: string
  round_number: number
  image_url: string
  audio_url: string
  type: string
  question: string
  // answer is ONLY populated when status === 'finished' (anti-cheat)
  answer: string
  answer_hints: string[]
  status: RoundStatus
  started_at: string | null
  ended_at: string | null
  ends_at_ms: number | null
  interval_ends_at_ms: number | null
  lucky_player_id: string | null
}

export interface RoundAnswerData {
  id: string
  round_id: string
  player_id: string
  answer: string
  is_correct: boolean
  time_ms: number
  points_earned: number
  answered_at: string
  player?: {
    name: string
    avatar: string
  }
}

export interface RoundResultPayload {
  success: boolean
  roundFinished: number
  correctAnswer: string
  answers: RoundAnswerData[]
  ranking: PlayerData[]
  gameFinished: boolean
  winner: PlayerData | null
}

export interface ChatMessageData {
  id: string
  sender: string
  text: string
  timestamp: string
  isSystem?: boolean
}

export interface RoomStateSnapshot {
  room: RoomData
  players: PlayerData[]
  currentRound: PublicRoundData | null
  upcomingRounds: PublicRoundData[]
  answers: RoundAnswerData[]
  roundResult: RoundResultPayload | null
  serverNow: number
}

