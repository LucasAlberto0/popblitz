import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params
    const supabase = createClient()
    const body = await request.json()
    const { sessionId } = body

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*, room:rooms(*)')
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.room.host_id !== sessionId) {
      return NextResponse.json({ error: 'Only host can finish the round' }, { status: 403 })
    }

    const { error: updateRoundError } = await supabase
      .from('rounds')
      .update({ 
        status: 'finished',
        ended_at: new Date().toISOString()
      })
      .eq('id', roundId)

    if (updateRoundError) throw updateRoundError

    const { data: answers } = await supabase
      .from('round_answers')
      .select('*, player:players(name, avatar)')
      .eq('round_id', roundId)
      .order('time_ms', { ascending: true })

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', round.room.id)
      .order('score', { ascending: false })

    const nextRoundNumber = round.round_number + 1

    if (nextRoundNumber <= round.room.total_rounds) {
      const { data: nextRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('room_id', round.room.id)
        .eq('round_number', nextRoundNumber)
        .single()

      await supabase
        .from('rooms')
        .update({ 
          current_round: nextRoundNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', round.room.id)

      return NextResponse.json({
        success: true,
        roundFinished: round.round_number,
        nextRound,
        correctAnswer: round.answer,
        answers: answers || [],
        ranking: players || []
      })
    } else {
      await supabase
        .from('rooms')
        .update({ 
          status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', round.room.id)

      return NextResponse.json({
        success: true,
        gameFinished: true,
        roundFinished: round.round_number,
        correctAnswer: round.answer,
        answers: answers || [],
        finalRanking: players || []
      })
    }
  } catch (error) {
    console.error('Error finishing round:', error)
    return NextResponse.json({ error: 'Failed to finish round' }, { status: 500 })
  }
}
