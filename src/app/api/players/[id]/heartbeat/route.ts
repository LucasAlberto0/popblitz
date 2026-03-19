import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { sessionId } = body

    if (!playerId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify session matches to prevent spoofing
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('session_id')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (player.session_id !== sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 })
    }

    // Update last_seen_at and ensure status is playing/ready
    const { error: updateError } = await supabase
      .from('players')
      .update({ 
        last_seen_at: new Date().toISOString()
      })
      .eq('id', playerId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Failed to process heartbeat' }, { status: 500 })
  }
}
