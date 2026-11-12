"use client"

import { useEffect, useState } from "react"
import { getGameSocket, updateClockOffsetFromServer } from "@/lib/socket"
import type { Room, Player, Round, RoundAnswer } from "@/types/database"

export function useRealtimeRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [upcomingRounds, setUpcomingRounds] = useState<Round[]>([])
  const [answers, setAnswers] = useState<RoundAnswer[]>([])
  const [roundResult, setRoundResult] = useState<any>(null)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!roomCode) return

    const socket = getGameSocket()
    const normalizedCode = roomCode.toUpperCase()

    const applySnapshot = (snapshot: any) => {
      if (!snapshot || snapshot.error) {
        setIsLoading(false)
        return
      }
      if (snapshot.serverNow) {
        updateClockOffsetFromServer(snapshot.serverNow)
      }
      if (snapshot.room) setRoom(snapshot.room)
      if (snapshot.players) setPlayers(snapshot.players)
      setCurrentRound(snapshot.currentRound ?? null)
      setUpcomingRounds(snapshot.upcomingRounds || [])
      setAnswers(snapshot.answers || [])
      setRoundResult(snapshot.roundResult ?? null)
      if (snapshot.chatHistory) {
        setChatHistory(snapshot.chatHistory)
      }
      setIsLoading(false)
    }

    const subscribeToRoom = () => {
      let savedPlayer: any = null
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("player") || localStorage.getItem("player")
        if (raw) {
          try {
            savedPlayer = JSON.parse(raw)
          } catch {}
        }
      }

      socket.emit(
        "room:subscribe",
        {
          roomCode: normalizedCode,
          sessionId: savedPlayer?.sessionId,
          playerId: savedPlayer?.id,
        },
        (response: any) => {
          applySnapshot(response)
        }
      )
    }

    const handleRoomState = (snapshot: any) => {
      if (snapshot?.room?.code?.toUpperCase() === normalizedCode) {
        applySnapshot(snapshot)
      }
    }

    socket.on("room:state", handleRoomState)
    socket.on("connect", subscribeToRoom)

    subscribeToRoom()

    return () => {
      socket.off("room:state", handleRoomState)
      socket.off("connect", subscribeToRoom)
    }
  }, [roomCode])

  return {
    room,
    players,
    currentRound,
    upcomingRounds,
    answers,
    roundResult,
    chatHistory,
    isLoading,
  }
}
