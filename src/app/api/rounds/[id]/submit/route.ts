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

    const { data: existingCorrectAnswer } = await supabase
      .from('round_answers')
      .select('*')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .eq('is_correct', true)
      .single()

    if (existingCorrectAnswer) {
      return NextResponse.json({ error: 'Already answered correctly' }, { status: 400 })
    }

    const normalizeStr = (str: string) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, ""); // remove punctuation
    }

    const normalizedAnswer = normalizeStr(answer)
    const normalizedCorrect = normalizeStr(round.answer)

    // Check main answer and all alternative variants in answer_hints
    const variants = [normalizedCorrect, ...(round.answer_hints || []).map((h: string) => normalizeStr(h))]

    const isCorrect = variants.some(v =>
      normalizedAnswer === v ||
      // Allows abbreviations such as 'ps2' to match correctly, and checks if user answer is at least 3 chars contained in correct
      (v.length > 3 && v.includes(normalizedAnswer) && normalizedAnswer.length >= 3) ||
      (normalizedAnswer === v.replace(/\s/g, '')) // E.g., match "ps2" if variant is "ps 2"
    )

    let pointsEarned = 0
    let newStreak = player.streak

    if (isCorrect) {
      // Points from 1 to 10 based on speed
      // 10 points if timeMs is 0 (immediate)
      // 1 point if timeMs is equal to timeLimit (last second)
      const timeLimitMs = round.room.time_per_round * 1000
      const speedRatio = Math.max(0, Math.min(1, timeMs / timeLimitMs))
      pointsEarned = Math.max(1, Math.min(10, Math.round(1 + 9 * (1 - speedRatio))))
      newStreak = player.streak + 1
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
    const supabase = createAdminClient()

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

