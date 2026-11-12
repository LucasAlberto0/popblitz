import crypto from 'crypto'
import { Server } from 'socket.io'
import { GameRoom } from './GameRoom'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map()
  private io: Server

  constructor(io: Server) {
    this.io = io

    // Every 20 seconds: prune disconnected players (>65s) and empty stale rooms (>30min)
    setInterval(() => {
      this.maintenanceTick()
    }, 20000)
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = ''
      for (let i = 0; i < 4; i++) {
        code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      }
      if (!this.rooms.has(code)) {
        return code
      }
    }
    return crypto.randomBytes(2).toString('hex').toUpperCase()
  }

  public createRoom(
    hostName: string,
    hostAvatar: string,
    maxPlayers = 16,
    totalRounds = 10,
    timePerRound = 20
  ): GameRoom {
    const code = this.generateUniqueCode()
    const hostSessionId = crypto.randomUUID()
    const gameRoom = new GameRoom(
      this.io,
      code,
      hostSessionId,
      hostName,
      hostAvatar,
      maxPlayers,
      totalRounds,
      timePerRound
    )
    this.rooms.set(code, gameRoom)
    return gameRoom
  }

  public getRoom(code: string): GameRoom | undefined {
    if (!code) return undefined
    return this.rooms.get(code.toUpperCase())
  }

  public handleDisconnect(socketId: string): void {
    for (const room of this.rooms.values()) {
      room.handleSocketDisconnect(socketId)
    }
  }

  public getRoomCount(): number {
    return this.rooms.size
  }

  public getTotalPlayersCount(): number {
    let total = 0
    for (const room of this.rooms.values()) {
      total += room.players.length
    }
    return total
  }

  private maintenanceTick(): void {
    const now = Date.now()
    for (const [code, room] of this.rooms.entries()) {
      room.pruneInactivePlayers()

      // Remove room from RAM if all players were pruned or inactive for > 2 hours
      const idleMs = now - room.lastActivityAt
      if (room.players.length === 0 || idleMs > 2 * 60 * 60 * 1000) {
        room.clearTimers()
        this.rooms.delete(code)
        this.io.emit('room:activity_update', { roomCode: code })
      }
    }
  }
}

