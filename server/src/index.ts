import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { questionPoolCache } from './questionPool'
import { RoomManager } from './RoomManager'

dotenv.config()

const PORT = Number(process.env.PORT || 4000)

async function main() {
  await questionPoolCache.init()

  const httpServer = http.createServer((req, res) => {
    // Allow CORS for health check wake-up pings from Next.js frontend
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'popblitz-game-server',
          serverNow: Date.now(),
          questionsCached: questionPoolCache.getCount(),
          activeRooms: roomManager.getRoomCount(),
          connectedPlayers: roomManager.getTotalPlayersCount(),
        })
      )
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 10000,
  })

  const roomManager = new RoomManager(io)

  io.on('connection', (socket) => {
    // 1. NTP-style Clock Sync (eliminates client clock drift)
    socket.on('clock:ping', (clientSentAt: number, ack?: (res: { clientSentAt: number; serverNow: number }) => void) => {
      const payload = { clientSentAt, serverNow: Date.now() }
      if (typeof ack === 'function') {
        ack(payload)
      } else {
        socket.emit('clock:pong', payload)
      }
    })

    // 2. Create Room
    socket.on(
      'room:create',
      (
        payload: { hostName: string; hostAvatar: string; maxPlayers?: number; totalRounds?: number; timePerRound?: number },
        ack?: (res: any) => void
      ) => {
        try {
          if (!payload?.hostName?.trim()) {
            return ack?.({ error: 'Digite seu nome para criar a sala' })
          }

          const gameRoom = roomManager.createRoom(
            payload.hostName,
            payload.hostAvatar,
            payload.maxPlayers,
            payload.totalRounds,
            payload.timePerRound
          )
          const hostPlayer = gameRoom.players[0]
          socket.join(gameRoom.room.code)
          gameRoom.bindSocket(hostPlayer.session_id, hostPlayer.id, socket.id)

          ack?.({
            room: {
              ...gameRoom.room,
              hostSessionId: hostPlayer.session_id,
            },
            player: {
              ...hostPlayer,
              sessionId: hostPlayer.session_id,
            },
            serverNow: Date.now(),
          })
        } catch (err) {
          console.error('[room:create] error:', err)
          ack?.({ error: 'Erro ao criar sala' })
        }
      }
    )

    // 3. Join Room
    socket.on(
      'room:join',
      (
        payload: { roomCode: string; playerName: string; playerAvatar: string; sessionId?: string | null },
        ack?: (res: any) => void
      ) => {
        try {
          const code = payload?.roomCode?.trim()?.toUpperCase()
          if (!code) return ack?.({ error: 'Digite o código da sala' })
          if (!payload?.playerName?.trim()) return ack?.({ error: 'Digite seu nome' })

          const gameRoom = roomManager.getRoom(code)
          if (!gameRoom) {
            return ack?.({ error: 'Sala não encontrada' })
          }

          const { player, error } = gameRoom.addOrReconnectPlayer(
            payload.playerName,
            payload.playerAvatar,
            payload.sessionId
          )

          if (error || !player) {
            return ack?.({ error: error || 'Não foi possível entrar na sala' })
          }

          socket.join(gameRoom.room.code)
          gameRoom.bindSocket(player.session_id, player.id, socket.id)

          ack?.({
            room: gameRoom.room,
            player: {
              ...player,
              sessionId: player.session_id,
            },
            serverNow: Date.now(),
          })
        } catch (err) {
          console.error('[room:join] error:', err)
          ack?.({ error: 'Erro ao entrar na sala' })
        }
      }
    )

    // 4. Subscribe / Sync State when navigating between /lobby, /game, /results
    socket.on(
      'room:subscribe',
      (
        payload: { roomCode: string; sessionId?: string; playerId?: string },
        ack?: (res: any) => void
      ) => {
        const code = payload?.roomCode?.trim()?.toUpperCase()
        const gameRoom = code ? roomManager.getRoom(code) : undefined
        if (!gameRoom) {
          return ack?.({ error: 'Sala não encontrada' })
        }

        socket.join(gameRoom.room.code)
        if (payload.sessionId || payload.playerId) {
          gameRoom.bindSocket(payload.sessionId, payload.playerId, socket.id)
        }

        const snapshot = gameRoom.getSnapshot()
        ack?.({
          ...snapshot,
          chatHistory: gameRoom.chatHistory,
        })
      }
    )

    // 5. Update Room Rules (Host only)
    socket.on('room:update_rules', (payload: any, ack?: (res: any) => void) => {
      const gameRoom = roomManager.getRoom(payload?.roomCode)
      if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

      const res = gameRoom.updateRules(payload.sessionId, payload)
      ack?.(res)
    })

    // 6. Start Game
    socket.on('room:start', (payload: any, ack?: (res: any) => void) => {
      const gameRoom = roomManager.getRoom(payload?.roomCode)
      if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

      const res = gameRoom.startGame(payload.sessionId, payload)
      ack?.(res)
    })

    // 7. Submit Answer
    socket.on(
      'round:submit',
      (
        payload: {
          roomCode: string
          roundId: string
          playerId: string
          playerSessionId: string
          answer: string
          timeMs?: number
        },
        ack?: (res: any) => void
      ) => {
        const gameRoom = roomManager.getRoom(payload?.roomCode)
        if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

        const res = gameRoom.submitAnswer(
          payload.roundId,
          payload.playerId,
          payload.playerSessionId,
          payload.answer,
          payload.timeMs
        )
        ack?.(res)
      }
    )

    // 8. Steal Points (Surprise Round)
    socket.on(
      'round:steal',
      (
        payload: {
          roomCode: string
          roundId: string
          thiefId: string
          victimId: string
          sessionId: string
        },
        ack?: (res: any) => void
      ) => {
        const gameRoom = roomManager.getRoom(payload?.roomCode)
        if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

        const res = gameRoom.stealPoints(
          payload.roundId,
          payload.thiefId,
          payload.victimId,
          payload.sessionId
        )
        ack?.(res)
      }
    )

    // 9. Participate mid-game (Spectator -> Playing)
    socket.on(
      'player:participate',
      (payload: { roomCode: string; playerId: string; sessionId: string }, ack?: (res: any) => void) => {
        const gameRoom = roomManager.getRoom(payload?.roomCode)
        if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

        const res = gameRoom.participateMidGame(payload.playerId, payload.sessionId)
        ack?.(res)
      }
    )

    // 10. Restart Game
    socket.on(
      'room:restart',
      (payload: { roomCode: string; sessionId: string }, ack?: (res: any) => void) => {
        const gameRoom = roomManager.getRoom(payload?.roomCode)
        if (!gameRoom) return ack?.({ error: 'Sala não encontrada' })

        const res = gameRoom.restartGame(payload.sessionId)
        ack?.(res)
      }
    )

    // 11. Chat Message
    socket.on(
      'chat:send',
      (payload: { roomCode: string; sender: string; text: string }, ack?: (res: any) => void) => {
        const gameRoom = roomManager.getRoom(payload?.roomCode)
        if (!gameRoom || !payload?.text?.trim()) return ack?.({ error: 'Mensagem inválida' })

        const msg = gameRoom.addChatMessage(payload.sender, payload.text)
        ack?.({ success: true, message: msg })
      }
    )

    // 12. Heartbeat
    socket.on('player:heartbeat', (payload: { roomCode: string; playerId: string; sessionId: string }) => {
      const gameRoom = roomManager.getRoom(payload?.roomCode)
      if (gameRoom) {
        gameRoom.heartbeat(payload.playerId, payload.sessionId)
      }
    })

    // 13. Leave Room View (when navigating back to Home Page)
    socket.on(
      'room:leave_view',
      (payload: { roomCode: string; sessionId?: string; playerId?: string }) => {
        const code = payload?.roomCode?.trim()?.toUpperCase()
        if (!code) return
        socket.leave(code)
        const gameRoom = roomManager.getRoom(code)
        if (gameRoom) {
          gameRoom.leaveView(payload.sessionId, payload.playerId, socket.id)
        }
      }
    )

    // 14. Check if Room is Active (at least 2 players and not closed/finished)
    socket.on(
      'room:check',
      (
        payload: { roomCode: string; sessionId?: string; playerId?: string },
        ack?: (res: { active: boolean; status?: string; isHost?: boolean }) => void
      ) => {
        const code = payload?.roomCode?.trim()?.toUpperCase()
        const gameRoom = code ? roomManager.getRoom(code) : undefined
        if (!gameRoom) {
          return ack?.({ active: false })
        }
        const status = gameRoom.isRoomActiveForReturn(payload.sessionId, payload.playerId)
        ack?.(status)
      }
    )

    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id)
    })
  })

  httpServer.listen(PORT, () => {
    console.log(`[PopBlitz Server] Listening on port ${PORT} (WebSocket + Health check ready)`)
  })
}

main().catch((err) => {
  console.error('[PopBlitz Server] Fatal startup error:', err)
  process.exit(1)
})

