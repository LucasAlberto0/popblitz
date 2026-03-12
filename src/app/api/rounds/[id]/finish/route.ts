import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params
    const supabase = createAdminClient()
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

    if (round.status !== 'finished') {
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
    }

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

    const maxScore = round.room.max_score || 120
    const winner = players?.find(p => p.score >= maxScore)

    return NextResponse.json({
      success: true,
      roundFinished: round.round_number,
      correctAnswer: round.answer,
      answers: answers || [],
      ranking: players || [],
      gameFinished: !!winner,
      winner: winner || null
    })
  } catch (error) {
    console.error('Error finishing round:', error)
    return NextResponse.json({ error: 'Failed to finish round' }, { status: 500 })
  }
}
