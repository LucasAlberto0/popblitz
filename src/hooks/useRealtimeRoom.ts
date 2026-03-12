"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
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

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!roomCode) return

    const fetchRoomData = async () => {
      setIsLoading(true)
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode.toUpperCase())
        .single()

      if (roomData) {
        setRoom(roomData)
      }
      setIsLoading(false)
    }

    fetchRoomData()

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

    return () => {
      supabase.removeChannel(roomSubscription)
    }
  }, [roomCode])

  useEffect(() => {
    if (!room?.id) return

    const fetchPlayersData = async () => {
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("player_order", { ascending: true })

      setPlayers(playersData || [])
    }

    fetchPlayersData()

    const playersSubscription = supabase
      .channel(`players:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", room.id!)
            .order("player_order", { ascending: true })

          setPlayers(data || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playersSubscription)
    }
  }, [room?.id, supabase])

  useEffect(() => {
    if (!room?.id || room.current_round === 0) return

    // Only fetch if we don't have the round or it's a new round
    if (currentRound && currentRound.round_number === room.current_round) return

    const fetchRoundData = async () => {
      const { data: roundData } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", room.id)
        .eq("round_number", room.current_round)
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

    fetchRoundData()
  }, [room?.id, room?.current_round, currentRound?.round_number])

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
