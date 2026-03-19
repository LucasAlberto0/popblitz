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

    // Fetch the player to verify last_seen_at
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('last_seen_at, is_host, room_id')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Safety check: only kick if last_seen_at is older than 30 seconds
    const lastSeen = player.last_seen_at ? new Date(player.last_seen_at).getTime() : 0
    const now = Date.now()
    const diff = (now - lastSeen) / 1000

    if (diff < 30) {
      return NextResponse.json({ error: 'Player is still active', diff }, { status: 400 })
    }

    // If the kicked player is the host, we might need to reassig host before deleting
    // However, the user didn't ask for host reassignment yet. 
    // Usually, host reassignment should happen either here or in the room's logic.
    // For now, let's just delete the player as requested.

    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (deleteError) throw deleteError

    // If there's a need to reassig host, check if any players are left
    if (player.is_host) {
      const { data: remainingPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', player.room_id)
        .order('joined_at', { ascending: true })
        .limit(1)

      if (remainingPlayers && remainingPlayers.length > 0) {
        await supabase
          .from('players')
          .update({ is_host: true })
          .eq('id', remainingPlayers[0].id)
      }
    }

    return NextResponse.json({ success: true, kicked: playerId })
  } catch (error) {
    console.error('Kick error:', error)
    return NextResponse.json({ error: 'Failed to kick player' }, { status: 500 })
  }
}
