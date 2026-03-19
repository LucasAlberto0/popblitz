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
      /*  */
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { 
      sessionId, 
      maxScore, 
      difficulty, 
      includeAudio, 
      includeSurprise, 
      includeCustom, 
      onlyAudio, 
      timePerRound, 
      intervalTime 
    } = body

    // 1. Get room to verify host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== sessionId) {
      return NextResponse.json({ error: 'Only the host can update rules' }, { status: 403 })
    }

    // 2. Update room settings
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        max_score: maxScore,
        difficulty: difficulty,
        include_audio: includeAudio,
        include_surprise: includeSurprise,
        include_custom: includeCustom,
        only_audio: onlyAudio,
        time_per_round: timePerRound,
        interval_time: intervalTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating room rules:', error)
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 })
  }
}
