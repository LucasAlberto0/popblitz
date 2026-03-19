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

    if (round.status === 'finished') {
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
        gameFinished: !!winner || round.room.status === 'finished',
        winner: winner || null
      })
    }

    // If not finished, proceed to finish it (Idempotent: only first call wins)
    const { error: updateRoundError } = await supabase
      .from('rounds')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString()
      })
      .eq('id', roundId)
      .eq('status', 'active') // Ensure we only update if it's still active

    if (updateRoundError) throw updateRoundError

    // --- NEW: If boolean round, apply points to all players now ---
    if (round.type === 'boolean') {
      const { data: roundAnswers } = await supabase
        .from('round_answers')
        .select('player_id, points_earned, is_correct')
        .eq('round_id', roundId)

      if (roundAnswers && roundAnswers.length > 0) {
        for (const answer of roundAnswers) {
          // Get current player state to update streak correctly
          const { data: p } = await supabase
            .from('players')
            .select('score, streak')
            .eq('id', answer.player_id)
            .single()

          if (p) {
            const newStreak = answer.is_correct ? (p.streak + 1) : 0
            await supabase
              .from('players')
              .update({
                score: p.score + answer.points_earned,
                streak: newStreak
              })
              .eq('id', answer.player_id)
          }
        }
      }
    }
    // -------------------------------------------------------------

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

    // Sync room status if game finished
    if (winner && round.room.status !== 'finished') {
      await supabase
        .from('rooms')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', round.room.id)
    }

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
