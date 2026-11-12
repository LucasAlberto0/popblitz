import crypto from 'crypto'
import { Server } from 'socket.io'
import { questionPoolCache, PoolQuestion } from './questionPool'
import {
  ChatMessageData,
  InternalRoundData,
  PlayerData,
  PublicRoundData,
  RoomData,
  RoomStateSnapshot,
  RoundAnswerData,
  RoundResultPayload,
} from './types'

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
}

export class GameRoom {
  public room: RoomData
  public players: PlayerData[] = []
  public rounds: InternalRoundData[] = []
  public answersByRound: Map<string, RoundAnswerData[]> = new Map()
  public roundResult: RoundResultPayload | null = null
  public chatHistory: ChatMessageData[] = []
  public lastActivityAt: number = Date.now()

  private io: Server
  private roundTimer: NodeJS.Timeout | null = null
  private intervalTimer: NodeJS.Timeout | null = null

  constructor(
    io: Server,
    code: string,
    hostSessionId: string,
    hostName: string,
    hostAvatar: string,
    maxPlayers = 16,
    totalRounds = 10,
    timePerRound = 20
  ) {
    this.io = io
    const nowIso = new Date().toISOString()
    const roomId = crypto.randomUUID()

    this.room = {
      id: roomId,
      code: code.toUpperCase(),
      host_id: hostSessionId,
      status: 'waiting',
      max_players: maxPlayers,
      current_round: 0,
      total_rounds: totalRounds,
      time_per_round: timePerRound,
      interval_time: 8,
      max_score: 120,
      difficulty: 'all',
      include_audio: true,
      only_audio: false,
      include_surprise: false,
      include_custom: false,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const hostPlayer: PlayerData = {
      id: crypto.randomUUID(),
      room_id: roomId,
      session_id: hostSessionId,
      name: hostName.trim(),
      avatar: hostAvatar || 'game',
      score: 0,
      streak: 0,
      status: 'ready',
      is_host: true,
      player_order: 1,
      joined_at: nowIso,
      last_seen_at: nowIso,
      socket_id: null,
    }

    this.players.push(hostPlayer)
  }

  public clearTimers(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer)
      this.roundTimer = null
    }
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer)
      this.intervalTimer = null
    }
  }

  public touch(): void {
    this.lastActivityAt = Date.now()
  }

  public addOrReconnectPlayer(
    playerName: string,
    playerAvatar: string,
    existingSessionId?: string | null
  ): { player?: PlayerData; error?: string } {
    this.touch()

    if (this.room.status === 'finished') {
      return { error: 'A partida já foi encerrada' }
    }

    // Reconnect ONLY if sessionId matches an existing player that is NOT currently connected in another live tab
    if (existingSessionId) {
      const existingBySession = this.players.find((p) => p.session_id === existingSessionId)
      if (existingBySession && !existingBySession.socket_id) {
        existingBySession.last_seen_at = new Date().toISOString()
        if (playerName?.trim()) existingBySession.name = playerName.trim()
        if (playerAvatar) existingBySession.avatar = playerAvatar
        this.broadcastState()
        return { player: existingBySession }
      }
    }

    if (this.players.length >= this.room.max_players) {
      return { error: 'A sala está cheia' }
    }

    let finalName = playerName.trim()
    const nameExists = this.players.some((p) => p.name.toLowerCase() === finalName.toLowerCase())
    if (nameExists) {
      let counter = 2
      while (
        this.players.some((p) => p.name.toLowerCase() === `${finalName.toLowerCase()} ${counter}`)
      ) {
        counter++
      }
      finalName = `${finalName} ${counter}`
    }

    const nowIso = new Date().toISOString()
    const sessionId = crypto.randomUUID()
    const newPlayer: PlayerData = {
      id: crypto.randomUUID(),
      room_id: this.room.id,
      session_id: sessionId,
      name: finalName,
      avatar: playerAvatar || 'game',
      score: 0,
      streak: 0,
      status: 'ready',
      is_host: false,
      player_order: this.players.length + 1,
      joined_at: nowIso,
      last_seen_at: nowIso,
      socket_id: null,
    }

    this.players.push(newPlayer)
    this.broadcastState()
    return { player: newPlayer }
  }

  public bindSocket(sessionId: string | undefined, playerId: string | undefined, socketId: string): PlayerData | null {
    this.touch()
    const player = this.players.find(
      (p) => (sessionId && p.session_id === sessionId) || (playerId && p.id === playerId)
    )
    if (!player) return null

    const wasOffline = !player.socket_id
    player.socket_id = socketId
    player.last_seen_at = new Date().toISOString()

    if (wasOffline) {
      this.broadcastSystemChat(`${player.name} entrou na sala`, `join-${player.id}-${Date.now()}`)
    }
    this.broadcastState()
    return player
  }

  public handleSocketDisconnect(socketId: string): void {
    const player = this.players.find((p) => p.socket_id === socketId)
    if (!player) return

    player.socket_id = null
    player.last_seen_at = new Date().toISOString()
    this.broadcastState()
  }

  public heartbeat(playerId: string, sessionId: string): boolean {
    const player = this.players.find((p) => p.id === playerId && p.session_id === sessionId)
    if (!player) return false
    player.last_seen_at = new Date().toISOString()
    this.touch()
    return true
  }

  public pruneInactivePlayers(): void {
    const now = Date.now()
    const beforeCount = this.players.length
    const toRemove: PlayerData[] = []

    for (const p of this.players) {
      // Only remove if socket is disconnected AND last_seen_at > 65s
      const lastSeenMs = p.last_seen_at ? new Date(p.last_seen_at).getTime() : now
      if (!p.socket_id && now - lastSeenMs > 65000) {
        toRemove.push(p)
      }
    }

    if (toRemove.length === 0) return

    for (const removed of toRemove) {
      this.players = this.players.filter((p) => p.id !== removed.id)
      this.broadcastSystemChat(`${removed.name} saiu da sala`, `leave-${removed.id}-${Date.now()}`)
    }

    // Reassign host if the host left and players remain
    if (this.players.length > 0 && !this.players.some((p) => p.is_host)) {
      const nextHost = this.players[0]
      nextHost.is_host = true
      this.room.host_id = nextHost.session_id
      this.broadcastSystemChat(`${nextHost.name} agora é o anfitrião`, `host-${nextHost.id}-${Date.now()}`)
    }

    if (this.players.length !== beforeCount) {
      this.broadcastState()
    }
  }

  public updateRules(
    sessionId: string,
    rules: {
      maxScore?: number
      difficulty?: string
      includeAudio?: boolean
      includeSurprise?: boolean
      includeCustom?: boolean
      onlyAudio?: boolean
      timePerRound?: number
      intervalTime?: number
    }
  ): { success: boolean; error?: string } {
    this.touch()
    if (this.room.host_id !== sessionId) {
      return { success: false, error: 'Apenas o anfitrião pode alterar as regras' }
    }

    if (rules.maxScore !== undefined) this.room.max_score = Number(rules.maxScore)
    if (rules.difficulty !== undefined) this.room.difficulty = rules.difficulty
    if (rules.includeAudio !== undefined) this.room.include_audio = Boolean(rules.includeAudio)
    if (rules.includeSurprise !== undefined) this.room.include_surprise = Boolean(rules.includeSurprise)
    if (rules.includeCustom !== undefined) this.room.include_custom = Boolean(rules.includeCustom)
    if (rules.onlyAudio !== undefined) this.room.only_audio = Boolean(rules.onlyAudio)
    if (rules.timePerRound !== undefined) this.room.time_per_round = Number(rules.timePerRound)
    if (rules.intervalTime !== undefined) this.room.interval_time = Number(rules.intervalTime)
    this.room.updated_at = new Date().toISOString()

    this.broadcastState()
    return { success: true }
  }

  public participateMidGame(playerId: string, sessionId: string): { success: boolean; error?: string } {
    this.touch()
    const player = this.players.find((p) => p.id === playerId && p.session_id === sessionId)
    if (!player) return { success: false, error: 'Jogador não encontrado' }

    player.status = 'playing'
    player.last_seen_at = new Date().toISOString()
    this.broadcastState()
    return { success: true }
  }

  private pickLuckyPlayerId(): string | null {
    const now = Date.now()
    const playingPlayers = this.players.filter((p) => p.status === 'playing' || p.status === 'ready')
    const activePlayers = playingPlayers.filter((p) => {
      if (p.socket_id) return true
      const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0
      return now - lastSeen < 20000
    })
    const pool = activePlayers.length > 0 ? activePlayers : this.players
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)].id
  }

  private buildRoundsDeck(): InternalRoundData[] {
    const allPool = questionPoolCache.getAll()
    let filteredPool: PoolQuestion[] = [...allPool]

    if (this.room.difficulty && this.room.difficulty !== 'all') {
      filteredPool = filteredPool.filter((q) => q.difficulty === this.room.difficulty)
    }

    if (this.room.only_audio) {
      filteredPool = filteredPool.filter((q) => q.type === 'audio')
    } else if (!this.room.include_audio) {
      filteredPool = filteredPool.filter((q) => q.type !== 'audio')
    }

    const customQuestionsPool = shuffle(allPool.filter((q) => q.type === 'custom'))
    filteredPool = filteredPool.filter((q) => q.type !== 'custom')
    filteredPool = shuffle(filteredPool)

    // Respect max 2 consecutive audio rounds rule
    if (this.room.include_audio && !this.room.only_audio) {
      const audioQuestions = shuffle(filteredPool.filter((q) => q.type === 'audio'))
      const otherQuestions = shuffle(filteredPool.filter((q) => q.type !== 'audio'))

      const mixed: PoolQuestion[] = []
      let audioIdx = 0
      let otherIdx = 0
      let consecutiveAudio = 0

      while (mixed.length < filteredPool.length) {
        const canAddAudio = audioIdx < audioQuestions.length && consecutiveAudio < 2
        const canAddOther = otherIdx < otherQuestions.length
        if (!canAddAudio && !canAddOther) break

        if (!canAddAudio || (canAddOther && Math.random() < 0.8)) {
          if (canAddOther) {
            mixed.push(otherQuestions[otherIdx++])
            consecutiveAudio = 0
          } else if (canAddAudio) {
            mixed.push(audioQuestions[audioIdx++])
            consecutiveAudio++
          }
        } else {
          mixed.push(audioQuestions[audioIdx++])
          consecutiveAudio++
        }
      }
      filteredPool = mixed
    }

    if (filteredPool.length === 0) {
      filteredPool = shuffle(questionPoolCache.getAll())
    }

    const numRounds = Math.min(120, Math.max(50, filteredPool.length))
    const selected = filteredPool.slice(0, numRounds)

    const deck: InternalRoundData[] = selected.map((q, index) => ({
      id: crypto.randomUUID(),
      room_id: this.room.id,
      round_number: index + 1,
      image_url: q.image_url || '',
      audio_url: q.audio_url || '',
      type: q.type || 'image',
      question: q.question || '',
      answer: q.primary_answer,
      answer_hints: [...(q.hints || []), ...(q.alternative_answers || [])],
      status: 'pending',
      started_at: null,
      ended_at: null,
      ends_at_ms: null,
      interval_ends_at_ms: null,
      lucky_player_id: null,
    }))

    // Inject custom questions every 12..20 rounds if enabled
    if (this.room.include_custom && customQuestionsPool.length > 0) {
      let currentPos = 0
      let customIdx = 0
      while (customIdx < customQuestionsPool.length) {
        const interval = Math.floor(Math.random() * (20 - 12 + 1)) + 12
        currentPos += interval
        if (currentPos > deck.length) break

        const q = customQuestionsPool[customIdx++]
        for (let i = currentPos - 1; i < deck.length; i++) {
          deck[i].round_number++
        }

        deck.splice(currentPos - 1, 0, {
          id: crypto.randomUUID(),
          room_id: this.room.id,
          round_number: currentPos,
          image_url: q.image_url || '',
          audio_url: q.audio_url || '',
          type: 'custom',
          question: q.question || '',
          answer: q.primary_answer,
          answer_hints: [...(q.hints || []), ...(q.alternative_answers || [])],
          status: 'pending',
          started_at: null,
          ended_at: null,
          ends_at_ms: null,
          interval_ends_at_ms: null,
          lucky_player_id: null,
        })
        currentPos++
      }
    }

    // Inject surprise (steal) rounds if enabled
    if (this.room.include_surprise && deck.length >= 6) {
      const surprisePos = Math.min(Math.floor(Math.random() * 7) + 6, deck.length)
      for (let i = surprisePos - 1; i < deck.length; i++) {
        deck[i].round_number++
      }

      deck.splice(surprisePos - 1, 0, {
        id: crypto.randomUUID(),
        room_id: this.room.id,
        round_number: surprisePos,
        image_url: '',
        audio_url: '',
        type: 'surprise',
        question: 'Rodada Surpresa! Um jogador será sorteado para roubar pontos.',
        answer: 'Surpresa',
        answer_hints: [],
        status: 'pending',
        started_at: null,
        ended_at: null,
        ends_at_ms: null,
        interval_ends_at_ms: null,
        lucky_player_id: this.pickLuckyPlayerId(),
      })
    }

    return deck
  }

  public startGame(
    sessionId: string,
    rules?: {
      maxScore?: number
      difficulty?: string
      timePerRound?: number
      intervalTime?: number
      includeAudio?: boolean
      includeSurprise?: boolean
      includeCustom?: boolean
      onlyAudio?: boolean
    }
  ): { success: boolean; error?: string } {
    this.touch()
    if (this.players.length < 2) {
      return { success: false, error: 'São necessários pelo menos 2 jogadores para iniciar' }
    }

    if (rules) {
      if (rules.maxScore !== undefined) this.room.max_score = Number(rules.maxScore)
      if (rules.difficulty !== undefined) this.room.difficulty = rules.difficulty
      if (rules.timePerRound !== undefined) this.room.time_per_round = Number(rules.timePerRound)
      if (rules.intervalTime !== undefined) this.room.interval_time = Number(rules.intervalTime)
      if (rules.includeAudio !== undefined) this.room.include_audio = Boolean(rules.includeAudio)
      if (rules.includeSurprise !== undefined) this.room.include_surprise = Boolean(rules.includeSurprise)
      if (rules.includeCustom !== undefined) this.room.include_custom = Boolean(rules.includeCustom)
      if (rules.onlyAudio !== undefined) this.room.only_audio = Boolean(rules.onlyAudio)
    }

    this.clearTimers()
    this.answersByRound.clear()
    this.roundResult = null

    for (const p of this.players) {
      p.status = 'playing'
      p.score = 0
      p.streak = 0
    }

    this.rounds = this.buildRoundsDeck()
    this.room.status = 'playing'
    this.room.current_round = 1
    this.room.total_rounds = this.rounds.length
    this.room.updated_at = new Date().toISOString()

    this.activateRound(1)
    return { success: true }
  }

  private activateRound(roundNumber: number): void {
    this.clearTimers()
    this.roundResult = null

    let round = this.rounds.find((r) => r.round_number === roundNumber)

    // Dynamic fallback if match exceeds pre-built deck
    if (!round) {
      const pool = questionPoolCache.getAll()
      const q = pool[Math.floor(Math.random() * pool.length)]
      round = {
        id: crypto.randomUUID(),
        room_id: this.room.id,
        round_number: roundNumber,
        image_url: q.image_url || '',
        audio_url: q.audio_url || '',
        type: q.type || 'image',
        question: q.question || '',
        answer: q.primary_answer,
        answer_hints: [...(q.hints || []), ...(q.alternative_answers || [])],
        status: 'pending',
        started_at: null,
        ended_at: null,
        ends_at_ms: null,
        interval_ends_at_ms: null,
        lucky_player_id: null,
      }
      this.rounds.push(round)
    }

    if (round.type === 'surprise') {
      round.lucky_player_id = this.pickLuckyPlayerId()
    }

    const nowMs = Date.now()
    const nowIso = new Date(nowMs).toISOString()

    // Calculate authoritative duration:
    // Round 1 adds 6000ms for the "5, 4, 3, 2, 1, JÁ!" animation
    // Surprise rounds are 50s + 4000ms for the raffle animation
    const baseDurationSec = round.type === 'surprise' ? 50 : this.room.time_per_round || 20
    const extraAnimationMs =
      (roundNumber === 1 ? 6000 : 0) + (round.type === 'surprise' ? 4000 : 0)
    const totalDurationMs = baseDurationSec * 1000 + extraAnimationMs

    round.status = 'active'
    round.started_at = nowIso
    round.ended_at = null
    round.ends_at_ms = nowMs + totalDurationMs
    round.interval_ends_at_ms = null

    this.room.current_round = roundNumber
    this.room.updated_at = nowIso
    this.answersByRound.set(round.id, [])

    this.broadcastState()

    // Authoritative server timer to finish the round automatically
    this.roundTimer = setTimeout(() => {
      this.finishCurrentRound()
    }, totalDurationMs)
  }

  public submitAnswer(
    roundId: string,
    playerId: string,
    playerSessionId: string,
    rawAnswer: string,
    clientTimeMs?: number
  ): {
    success?: boolean
    isCorrect?: boolean
    pointsEarned?: number
    correctAnswer?: string | null
    error?: string
  } {
    this.touch()
    const currentRound = this.getCurrentInternalRound()
    if (!currentRound || currentRound.id !== roundId || currentRound.status !== 'active') {
      return { error: 'Rodada não está ativa' }
    }

    const player = this.players.find((p) => p.id === playerId && p.session_id === playerSessionId)
    if (!player) {
      return { error: 'Sessão inválida' }
    }

    const roundAnswers = this.answersByRound.get(roundId) || []

    // Prevent multiple answers if already got it right (or in boolean rounds where only 1 try is allowed)
    const alreadyCorrect = roundAnswers.some((a) => a.player_id === playerId && a.is_correct)
    if (alreadyCorrect) {
      return { error: 'Você já acertou esta rodada' }
    }
    if (currentRound.type === 'boolean' && roundAnswers.some((a) => a.player_id === playerId)) {
      return { error: 'Você já respondeu esta rodada' }
    }

    // Compute authoritative elapsed time on server
    const startedMs = currentRound.started_at ? new Date(currentRound.started_at).getTime() : Date.now()
    const offsetMs = currentRound.round_number === 1 ? 6000 : 0
    const serverElapsedMs = Math.max(0, Date.now() - (startedMs + offsetMs))
    const timeMs =
      clientTimeMs !== undefined
        ? Math.max(0, Math.min(serverElapsedMs + 1000, clientTimeMs))
        : serverElapsedMs

    const normalizedGuess = normalizeStr(rawAnswer)
    const variants = [
      normalizeStr(currentRound.answer),
      ...(currentRound.answer_hints || []).map((h) => normalizeStr(h)),
    ].filter(Boolean)

    const isCorrect = variants.some((v) => normalizedGuess === v)
    const previousCorrectCount = roundAnswers.filter((a) => a.is_correct).length
    const position = previousCorrectCount + 1

    let pointsEarned = 0
    let newStreak = player.streak

    if (isCorrect) {
      const isAudio = currentRound.type === 'audio'
      const isBoolean = currentRound.type === 'boolean'
      const timeSec = timeMs / 1000

      if (isBoolean) {
        pointsEarned = 6
      } else if (isAudio) {
        if (position === 1 && timeSec <= 15) {
          pointsEarned = 10
        } else if (timeSec <= 12) {
          pointsEarned = Math.max(7, Math.round(9 - 2 * (timeSec / 12)))
        } else if (timeSec <= 18) {
          const ratio = (timeSec - 12) / 6
          pointsEarned = Math.max(1, Math.round(6 - 5 * ratio))
        } else {
          pointsEarned = 1
        }
      } else {
        if (position === 1 && timeSec <= 10) {
          pointsEarned = 10
        } else if (position === 2 && timeSec <= 4) {
          pointsEarned = 10
        } else if (timeSec <= 10) {
          pointsEarned = Math.max(7, Math.round(9 - 2 * (timeSec / 10)))
        } else if (timeSec <= 15) {
          const ratio = (timeSec - 10) / 5
          pointsEarned = Math.max(4, Math.round(6 - 2 * ratio))
        } else {
          const timeLimitSec = this.room.time_per_round || 20
          const ratio = Math.max(0, Math.min(1, (timeSec - 15) / (timeLimitSec - 15 || 1)))
          pointsEarned = Math.max(1, Math.round(3 - 2 * ratio))
        }
      }

      newStreak = player.streak + 1
    } else {
      newStreak = 0
      if (currentRound.type === 'boolean') {
        pointsEarned = -4
      }
    }

    const answerEntry: RoundAnswerData = {
      id: crypto.randomUUID(),
      round_id: roundId,
      player_id: playerId,
      answer: rawAnswer.trim(),
      is_correct: isCorrect,
      time_ms: timeMs,
      points_earned: pointsEarned,
      answered_at: new Date().toISOString(),
      player: {
        name: player.name,
        avatar: player.avatar,
      },
    }

    roundAnswers.push(answerEntry)
    roundAnswers.sort((a, b) => a.time_ms - b.time_ms)
    this.answersByRound.set(roundId, roundAnswers)

    // In non-boolean rounds, update player score immediately
    if (currentRound.type !== 'boolean' && isCorrect) {
      player.score += pointsEarned
      player.streak = newStreak
    } else if (currentRound.type !== 'boolean' && !isCorrect) {
      player.streak = 0
    }

    // Check if all active playing players have completed this round
    const activePlayers = this.players.filter((p) => p.status === 'playing')
    const everyoneDone =
      activePlayers.length > 0 &&
      activePlayers.every((p) => {
        if (currentRound.type === 'boolean') {
          return roundAnswers.some((a) => a.player_id === p.id)
        }
        return roundAnswers.some((a) => a.player_id === p.id && a.is_correct)
      })

    if (everyoneDone) {
      this.finishCurrentRound()
    } else {
      this.broadcastState()
    }

    return {
      success: true,
      isCorrect,
      pointsEarned,
      correctAnswer: isCorrect && currentRound.type !== 'boolean' ? currentRound.answer : null,
    }
  }

  public stealPoints(
    roundId: string,
    thiefId: string,
    victimId: string,
    sessionId: string
  ): { success?: boolean; amount?: number; error?: string } {
    this.touch()
    const currentRound = this.getCurrentInternalRound()
    if (
      !currentRound ||
      currentRound.id !== roundId ||
      currentRound.type !== 'surprise' ||
      currentRound.status !== 'active'
    ) {
      return { error: 'Rodada inválida para roubo' }
    }

    if (currentRound.lucky_player_id !== thiefId) {
      return { error: 'Você não foi o jogador sorteado' }
    }

    const thief = this.players.find((p) => p.id === thiefId && p.session_id === sessionId)
    const victim = this.players.find((p) => p.id === victimId)

    if (!thief || !victim) {
      return { error: 'Jogadores inválidos' }
    }
    if (thief.id === victim.id) {
      return { error: 'Você não pode roubar de si mesmo' }
    }

    const stealAmount = 10
    thief.score += stealAmount
    victim.score -= stealAmount

    const roundAnswers = this.answersByRound.get(roundId) || []
    roundAnswers.push({
      id: crypto.randomUUID(),
      round_id: roundId,
      player_id: thiefId,
      answer: `Roubou ${stealAmount} pontos de ${victim.name}`,
      is_correct: true,
      time_ms: 0,
      points_earned: stealAmount,
      answered_at: new Date().toISOString(),
      player: {
        name: thief.name,
        avatar: thief.avatar,
      },
    })
    this.answersByRound.set(roundId, roundAnswers)

    this.finishCurrentRound()
    return { success: true, amount: stealAmount }
  }

  public finishCurrentRound(): RoundResultPayload | null {
    const currentRound = this.getCurrentInternalRound()
    if (!currentRound) return null

    // Idempotent: if already finished, return cached result
    if (currentRound.status === 'finished' && this.roundResult) {
      return this.roundResult
    }

    this.clearTimers()

    const nowMs = Date.now()
    const nowIso = new Date(nowMs).toISOString()
    const intervalSec = this.room.interval_time || 8

    currentRound.status = 'finished'
    currentRound.ended_at = nowIso
    currentRound.interval_ends_at_ms = nowMs + intervalSec * 1000

    const roundAnswers = this.answersByRound.get(currentRound.id) || []

    // Apply deferred boolean round points when round finishes
    if (currentRound.type === 'boolean') {
      for (const ans of roundAnswers) {
        const p = this.players.find((pl) => pl.id === ans.player_id)
        if (p) {
          p.score += ans.points_earned
          p.streak = ans.is_correct ? p.streak + 1 : 0
        }
      }
    }

    const sortedRanking = [...this.players].sort((a, b) => b.score - a.score)
    const maxScore = this.room.max_score || 120
    const winner = sortedRanking.find((p) => p.score >= maxScore) || null

    this.roundResult = {
      success: true,
      roundFinished: currentRound.round_number,
      correctAnswer: currentRound.answer,
      answers: roundAnswers,
      ranking: sortedRanking,
      gameFinished: Boolean(winner),
      winner,
    }

    this.broadcastState()

    // Authoritative server timer for the interval between rounds
    this.intervalTimer = setTimeout(() => {
      if (winner) {
        this.room.status = 'finished'
        this.room.updated_at = new Date().toISOString()
        this.broadcastState()
      } else {
        this.activateRound(currentRound.round_number + 1)
      }
    }, intervalSec * 1000)

    return this.roundResult
  }

  public restartGame(identifier: string): { success: boolean; error?: string } {
    this.touch()
    const hostPlayer = this.players.find(
      (p) => p.is_host && (p.id === identifier || p.session_id === identifier)
    )
    if (!hostPlayer && this.room.host_id !== identifier) {
      return { success: false, error: 'Apenas o anfitrião pode reiniciar o jogo' }
    }

    this.clearTimers()
    this.rounds = []
    this.answersByRound.clear()
    this.roundResult = null

    this.room.status = 'waiting'
    this.room.current_round = 0
    this.room.updated_at = new Date().toISOString()

    for (const p of this.players) {
      p.score = 0
      p.streak = 0
      p.status = 'ready'
    }

    this.broadcastState()
    return { success: true }
  }

  public addChatMessage(sender: string, text: string): ChatMessageData {
    this.touch()
    const msg: ChatMessageData = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: sender || 'Jogador',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    this.chatHistory.push(msg)
    if (this.chatHistory.length > 80) {
      this.chatHistory.shift()
    }
    this.io.to(this.room.code).emit('chat:message', msg)
    return msg
  }

  private broadcastSystemChat(text: string, id: string): void {
    const msg: ChatMessageData = {
      id,
      sender: 'Sistema',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    }
    this.chatHistory.push(msg)
    if (this.chatHistory.length > 80) {
      this.chatHistory.shift()
    }
    this.io.to(this.room.code).emit('chat:message', msg)
  }

  private getCurrentInternalRound(): InternalRoundData | null {
    if (this.room.current_round === 0) return null
    return this.rounds.find((r) => r.round_number === this.room.current_round) || null
  }

  private toPublicRound(round: InternalRoundData): PublicRoundData {
    const isFinished = round.status === 'finished'
    return {
      id: round.id,
      room_id: round.room_id,
      round_number: round.round_number,
      image_url: round.image_url,
      audio_url: round.audio_url,
      type: round.type,
      question: round.question,
      // Mask answer until round is finished so nobody can cheat via DevTools
      answer: isFinished ? round.answer : '',
      answer_hints: isFinished ? round.answer_hints : [],
      status: round.status,
      started_at: round.started_at,
      ended_at: round.ended_at,
      ends_at_ms: round.ends_at_ms,
      interval_ends_at_ms: round.interval_ends_at_ms,
      lucky_player_id: round.lucky_player_id,
    }
  }

  public getSnapshot(): RoomStateSnapshot {
    const currentInternal = this.getCurrentInternalRound()
    const upcomingInternal =
      this.room.current_round > 0
        ? this.rounds.filter(
          (r) =>
            r.round_number >= this.room.current_round &&
            r.round_number <= this.room.current_round + 5
        )
        : []

    return {
      room: this.room,
      players: this.players,
      currentRound: currentInternal ? this.toPublicRound(currentInternal) : null,
      upcomingRounds: upcomingInternal.map((r) => this.toPublicRound(r)),
      answers: currentInternal ? this.answersByRound.get(currentInternal.id) || [] : [],
      roundResult: this.roundResult,
      serverNow: Date.now(),
    }
  }

  public broadcastState(): void {
    this.io.to(this.room.code).emit('room:state', this.getSnapshot())
  }
}

