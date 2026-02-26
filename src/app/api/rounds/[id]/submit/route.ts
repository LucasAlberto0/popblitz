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
    const { playerId, playerSessionId, answer, timeMs } = body

    if (!playerId || !answer?.trim() || timeMs === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*, room:rooms(*)')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (player.session_id !== playerSessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 })
    }

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*, room:rooms(*)')
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.status !== 'active') {
      return NextResponse.json({ error: 'Round is not active' }, { status: 400 })
    }

    const { data: existingAnswer } = await supabase
      .from('round_answers')
      .select('*')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .single()

    if (existingAnswer) {
      return NextResponse.json({ error: 'Already answered' }, { status: 400 })
    }

    const normalizedAnswer = answer.toLowerCase().trim()
    const normalizedCorrect = round.answer.toLowerCase().trim()
    const isCorrect = normalizedAnswer === normalizedCorrect ||
      normalizedCorrect.includes(normalizedAnswer) && normalizedAnswer.length > 3

    let pointsEarned = 0
    let newStreak = player.streak

    if (isCorrect) {
      const basePoints = 1000
      const timeBonus = Math.max(0, Math.floor((round.room.time_per_round * 1000 - timeMs) * 2 / 1000))
      pointsEarned = basePoints + timeBonus
      newStreak = player.streak + 1
      const streakBonus = newStreak * 50
      pointsEarned += streakBonus
    } else {
      newStreak = 0
    }

    const { error: answerError } = await supabase
      .from('round_answers')
      .insert({
        round_id: roundId,
        player_id: playerId,
        answer: answer.trim(),
        is_correct: isCorrect,
        time_ms: timeMs,
        points_earned: pointsEarned
      })

    if (answerError) throw answerError

    const { error: updatePlayerError } = await supabase
      .from('players')
      .update({
        score: player.score + pointsEarned,
        streak: newStreak
      })
      .eq('id', playerId)

    if (updatePlayerError) throw updatePlayerError

    return NextResponse.json({
      success: true,
      isCorrect,
      pointsEarned,
      correctAnswer: isCorrect ? round.answer : null
    })
  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params
    const supabase = createClient()

    const { data: answers, error } = await supabase
      .from('round_answers')
      .select('*, player:players(name, avatar)')
      .eq('round_id', roundId)
      .order('points_earned', { ascending: false })

    if (error) throw error

    return NextResponse.json({ answers })
  } catch (error) {
    console.error('Error fetching answers:', error)
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 })
  }
}
