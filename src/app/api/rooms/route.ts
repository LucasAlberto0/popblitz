import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { hostName, hostAvatar, maxPlayers = 16, totalRounds = 10, timePerRound = 20 } = body

    if (!hostName?.trim()) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 })
    }

    const sessionId = crypto.randomUUID()
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase()

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        host_id: sessionId,
        code: roomCode,
        max_players: maxPlayers,
        total_rounds: totalRounds,
        time_per_round: timePerRound,
        status: 'waiting'
      })
      .select()
      .single()

    if (roomError) throw roomError

    const updatedRoom = room

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        session_id: sessionId,
        name: hostName.trim(),
        avatar: hostAvatar || '🎮',
        is_host: true,
        player_order: 1,
        status: 'ready'
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({
      room: {
        ...updatedRoom,
        hostSessionId: sessionId
      },
      player: {
        ...player,
        sessionId
      }
    })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to create a room' }, { status: 405 })
}
