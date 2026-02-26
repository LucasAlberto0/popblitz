"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import type { Room, Player, Round, RoundAnswer } from "@/types/database"

type RealtimeEvent = {
  type: "players" | "room" | "round" | "answers"
  action: "INSERT" | "UPDATE" | "DELETE"
  new?: any
  old?: any
}

export function useRealtimeRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [answers, setAnswers] = useState<RoundAnswer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (!roomCode) return

    const fetchInitialData = async () => {
      setIsLoading(true)
      
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode.toUpperCase())
        .single()

      if (roomData) {
        setRoom(roomData)

        const { data: playersData } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomData.id)
          .order("player_order", { ascending: true })

        setPlayers(playersData || [])

        if (roomData.current_round > 0) {
          const { data: roundData } = await supabase
            .from("rounds")
            .select("*")
            .eq("room_id", roomData.id)
            .eq("round_number", roomData.current_round)
            .single()

          if (roundData) {
            setCurrentRound(roundData)

            const { data: answersData } = await supabase
              .from("round_answers")
              .select("*")
              .eq("round_id", roundData.id)
              .order("time_ms", { ascending: true })

            setAnswers(answersData || [])
          }
        }
      }

      setIsLoading(false)
    }

    fetchInitialData()

    const roomSubscription = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode.toUpperCase()}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setRoom((prev) => (prev ? { ...prev, ...payload.new as Room } : payload.new as Room))
          }
        }
      )
      .subscribe()

    const playersSubscription = supabase
      .channel(`players:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        async (payload) => {
          if (room) {
            const { data } = await supabase
              .from("players")
              .select("*")
              .eq("room_id", room.id)
              .order("player_order", { ascending: true })

            setPlayers(data || [])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomSubscription)
      supabase.removeChannel(playersSubscription)
    }
  }, [roomCode])

  useEffect(() => {
    if (!currentRound) return

    const roundSubscription = supabase
      .channel(`round:${currentRound.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `id=eq.${currentRound.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setCurrentRound((prev) => (prev ? { ...prev, ...payload.new as Round } : payload.new as Round))
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "round_answers",
          filter: `round_id=eq.${currentRound.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("round_answers")
            .select("*")
            .eq("round_id", currentRound.id)
            .order("time_ms", { ascending: true })

          setAnswers(data || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roundSubscription)
    }
  }, [currentRound?.id])

  return {
    room,
    players,
    currentRound,
    answers,
    isLoading,
  }
}
