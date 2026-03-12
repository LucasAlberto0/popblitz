import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createClient()
    const body = await request.json()
    const { playerName, playerAvatar } = body

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status === 'finished') {
      return NextResponse.json({ error: 'Game already finished' }, { status: 400 })
    }

    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)

    if (existingPlayers && existingPlayers.length >= room.max_players) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    }

    const sessionId = crypto.randomUUID()
    const playerOrder = existingPlayers ? existingPlayers.length + 1 : 1

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        session_id: sessionId,
        name: playerName.trim(),
        avatar: playerAvatar || '🎮',
        is_host: false,
        player_order: playerOrder,
        status: 'ready'
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({
      room,
      player: {
        ...player,
        sessionId
      }
    })
  } catch (error) {
    console.error('Error joining room:', error)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
