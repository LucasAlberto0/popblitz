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
    const { thiefId, victimId, sessionId } = body

    if (!thiefId || !victimId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Get round and room
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*, room:rooms(*)')
      .eq('id', roundId)
      .single()

    if (roundError || !round || round.type !== 'surprise' || round.status !== 'active') {
      return NextResponse.json({ error: 'Invalid round for theft' }, { status: 400 })
    }

    // 2. Security: Is this the lucky player?
    if (round.lucky_player_id !== thiefId) {
       return NextResponse.json({ error: 'You are not the chosen thief' }, { status: 403 })
    }

    // 3. Get players
    const { data: thief } = await supabase.from('players').select('*').eq('id', thiefId).single()
    const { data: victim } = await supabase.from('players').select('*').eq('id', victimId).single()

    if (!thief || !victim || thief.session_id !== sessionId) {
       return NextResponse.json({ error: 'Invalid session/players' }, { status: 403 })
    }

    if (thief.id === victim.id) {
       return NextResponse.json({ error: 'Cannot steal from yourself' }, { status: 400 })
    }

    // 4. Calculate amount (Fixed 10 points as per user request, allows negative score)
    const stealAmount = 10

    // 5. Update scores
    await supabase.from('players').update({ score: thief.score + stealAmount }).eq('id', thiefId)
    await supabase.from('players').update({ score: victim.score - stealAmount }).eq('id', victimId)

    // 6. Record as an "answer" so it shows in the results/chat
    await supabase.from('round_answers').insert({
        round_id: roundId,
        player_id: thiefId,
        answer: `Roubou ${stealAmount} pontos de ${victim.name}`,
        is_correct: true,
        time_ms: 0,
        points_earned: stealAmount
    })

    // 7. Finish round
    await supabase.from('rounds').update({
        status: 'finished',
        ended_at: new Date().toISOString()
    }).eq('id', roundId)

    return NextResponse.json({ success: true, amount: stealAmount })
  } catch (error) {
    console.error('Error stealing points:', error)
    return NextResponse.json({ error: 'Failed to steal points' }, { status: 500 })
  }
}
