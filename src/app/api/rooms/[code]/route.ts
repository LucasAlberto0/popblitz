import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createAdminClient()

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('player_order', { ascending: true })

    if (playersError) throw playersError

    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('*')
      .eq('room_id', room.id)
      .order('round_number', { ascending: true })

    if (roundsError) throw roundsError

    let currentRound = null
    if (rounds && rounds.length > 0 && room.current_round > 0) {
      currentRound = rounds.find((r: any) => r.round_number === room.current_round)
    }

    return NextResponse.json({
      room,
      players: players || [],
      rounds: rounds || [],
      currentRound
    })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}
