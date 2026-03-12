import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createClient()
    const body = await request.json()
    const { sessionId } = body

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== sessionId) {
      return NextResponse.json({ error: 'Only host can finish the game' }, { status: 403 })
    }

    await supabase
      .from('rooms')
      .update({
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id)

    const { data: finalPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('score', { ascending: false })

    return NextResponse.json({
      success: true,
      finalRanking: finalPlayers
    })
  } catch (error) {
    console.error('Error finishing game:', error)
    return NextResponse.json({ error: 'Failed to finish game' }, { status: 500 })
  }
}
