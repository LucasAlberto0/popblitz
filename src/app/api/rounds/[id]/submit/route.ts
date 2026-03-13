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

    // Get number of existing correct answers to determine position
    const { count: previousCorrectCount } = await supabase
      .from('round_answers')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId)
      .eq('is_correct', true)

    const position = (previousCorrectCount || 0) + 1
    let pointsEarned = 0
    let newStreak = player.streak

    if (isCorrect) {
      const isAudio = round.type === 'audio'
      const isBoolean = round.type === 'boolean'
      const timeSec = timeMs / 1000

      if (isBoolean) {
        // Boolean Rules: 6 pts (no time pressure needed as it's binary, though we can add first-to-answer bonus if wanted)
        // User requested exactly 6 points for correct
        pointsEarned = 6
      } else if (isAudio) {
        // Audio Rules: ...
        if (position === 1 && timeSec <= 15) {
          pointsEarned = 10
        } else if (timeSec <= 12) {
          pointsEarned = Math.max(7, Math.round(9 - (2 * (timeSec / 12))))
        } else if (timeSec <= 18) {
          const ratio = (timeSec - 12) / 6
          pointsEarned = Math.max(1, Math.round(6 - (5 * ratio)))
        } else {
          pointsEarned = 1
        }
      } else {
        // Standard Rules: ...
        if (position <= 2 && timeSec <= 4) {
          pointsEarned = 10
        } else if (timeSec <= 10) {
          pointsEarned = Math.max(7, Math.round(9 - (2 * (timeSec / 10))))
        } else if (timeSec <= 15) {
          const ratio = (timeSec - 10) / 5
          pointsEarned = Math.max(4, Math.round(6 - (2 * ratio)))
        } else {
          const timeLimitSec = round.room.time_per_round
          const ratio = Math.max(0, Math.min(1, (timeSec - 15) / (timeLimitSec - 15 || 1)))
          pointsEarned = Math.max(1, Math.round(3 - (2 * ratio)))
        }
      }

      newStreak = player.streak + 1
    } else {
      newStreak = 0
      // Boolean Rules: -4 pts for error
      if (round.type === 'boolean') {
        pointsEarned = -4
      }
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

    // --- NEW: Check if everyone has answered correctly to finish round early ---
    const { data: activePlayers } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', round.room.id)
      .eq('status', 'playing')

    const { data: correctAnswers } = await supabase
      .from('round_answers')
      .select('player_id')
      .eq('round_id', roundId)
      .eq('is_correct', true)

    if (activePlayers && correctAnswers && correctAnswers.length >= activePlayers.length) {
      // Check if all active players are in the correctAnswers list
      const activePlayerIds = activePlayers.map(p => p.id)
      const correctPlayerIds = correctAnswers.map(a => a.player_id)
      const allAnswered = activePlayerIds.every(id => correctPlayerIds.includes(id))

      if (allAnswered) {
        await supabase
          .from('rounds')
          .update({
            status: 'finished',
            ended_at: new Date().toISOString()
          })
          .eq('id', roundId)
      }
    }
    // --------------------------------------------------------------------------

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

