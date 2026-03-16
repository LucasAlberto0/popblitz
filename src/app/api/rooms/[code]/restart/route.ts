import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { sessionId } = body

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Identify the player and check if they are host
    const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .eq('id', sessionId)
        .single()

    if (playerError || !player || !player.is_host) {
      return NextResponse.json({ error: 'Apenas o anfitrião pode reiniciar o jogo' }, { status: 403 })
    }

    // 1. Reset Room Status
    const { error: updateRoomError } = await supabase
      .from('rooms')
      .update({
        status: 'waiting',
        current_round: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id)

    if (updateRoomError) throw updateRoomError

    // 2. Clear Rounds (Standard flow will recreate them)
    await supabase.from('rounds').delete().eq('room_id', room.id)
    await supabase.from('round_answers').delete().match({ room_id: room.id }) // Add room_id to answers if exists, or delete by round_id

    // 3. Reset Players (Scores and status)
    const { error: updatePlayersError } = await supabase
      .from('players')
      .update({
        score: 0,
        status: 'joined'
      })
      .eq('room_id', room.id)

    if (updatePlayersError) throw updatePlayersError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error restarting game:', error)
    return NextResponse.json({ 
      error: 'Failed to restart game',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
