"use client"

import { io, Socket } from "socket.io-client"

const PRODUCTION_SERVER_URL = "https://popblitz-game-server.onrender.com"

export function getGameServerUrl(): string {
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) {
    return process.env.NEXT_PUBLIC_GAME_SERVER_URL.replace(/\/$/, "")
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000"
    }
  }
  return PRODUCTION_SERVER_URL
}

let socketInstance: Socket | null = null
let clockOffsetMs = 0
let hasCalibratedClock = false

export function getServerNow(): number {
  return Date.now() + clockOffsetMs
}

export function updateClockOffsetFromServer(serverNow?: number): void {
  if (!serverNow || hasCalibratedClock) return
  clockOffsetMs = serverNow - Date.now()
}

async function calibrateClock(socket: Socket): Promise<void> {
  let bestRtt = Infinity
  let bestOffset = clockOffsetMs

  for (let i = 0; i < 3; i++) {
    const t0 = Date.now()
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000)
      socket.emit(
        "clock:ping",
        t0,
        (res?: { clientSentAt: number; serverNow: number }) => {
          clearTimeout(timeout)
          if (res && typeof res.serverNow === "number") {
            const t1 = Date.now()
            const rtt = t1 - t0
            if (rtt < bestRtt) {
              bestRtt = rtt
              bestOffset = res.serverNow - (t0 + rtt / 2)
            }
          }
          resolve()
        }
      )
    })
  }

  if (bestRtt < Infinity) {
    clockOffsetMs = Math.round(bestOffset)
    hasCalibratedClock = true
  }
}

export function getGameSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(getGameServerUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
    })

    socketInstance.on("connect", () => {
      calibrateClock(socketInstance!).catch(() => { })
    })
  }

  return socketInstance
}

export function wakeUpGameServer(): void {
  if (typeof window === "undefined") return
  fetch(`${getGameServerUrl()}/health`, { method: "GET", mode: "cors" })
    .then((r) => r.json())
    .then((data) => {
      if (data?.serverNow) {
        updateClockOffsetFromServer(data.serverNow)
      }
    })
    .catch(() => { })
}

export function emitWithAck<T = any>(
  event: string,
  payload: any,
  timeoutMs = 15000
): Promise<T> {
  const socket = getGameSocket()

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`))
    }, timeoutMs)

    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer)
      resolve(response)
    })
  })
}

