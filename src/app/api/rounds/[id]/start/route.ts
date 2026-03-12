import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Only host can start the round' }, { status: 403 })
    }

    if (round.status !== 'pending') {
      return NextResponse.json({ error: 'Round already started or finished' }, { status: 400 })
    }

    const { error: updateRoundError } = await supabase
      .from('rounds')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', roundId)

    if (updateRoundError) throw updateRoundError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting round:', error)
    return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
  }
}
