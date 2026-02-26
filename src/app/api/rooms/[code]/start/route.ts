import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const SAMPLE_IMAGES = [
  { url: 'https://picsum.photos/seed/movie1/800/600', answer: 'The Matrix', hints: ['Filme de ficção científica', 'Pílula vermelha ou azul'] },
  { url: 'https://picsum.photos/seed/music1/800/600', answer: 'Bohemian Rhapsody', hints: ['MúsicaQueen', 'Opera rock'] },
  { url: 'https://picsum.photos/seed/series1/800/600', answer: 'Breaking Bad', hints: ['Série sobre química', 'Walter White'] },
  { url: 'https://picsum.photos/seed/game1/800/600', answer: 'Super Mario', hints: ['Jogo Nintendo', 'Encanador italiano'] },
  { url: 'https://picsum.photos/seed/artist1/800/600', answer: 'Michael Jackson', hints: ['Rei do Pop', 'Moonwalk'] },
  { url: 'https://picsum.photos/seed/movie2/800/600', answer: 'Titanic', hints: ['Navio afundado', 'Jack e Rose'] },
  { url: 'https://picsum.photos/seed/music2/800/600', answer: 'Billie Jean', hints: ['Michael Jackson', 'Lua de Billie Jean'] },
  { url: 'https://picsum.photos/seed/series2/800/600', answer: 'Stranger Things', hints: ['Netflix', ' mundo invertido'] },
  { url: 'https://picsum.photos/seed/game2/800/600', answer: 'Pokemon', hints: ['Pocket Monsters', 'Ash Ketchum'] },
  { url: 'https://picsum.photos/seed/artist2/800/600', answer: 'Taylor Swift', hints: ['Cantora country pop', 'Red (Taylor\'s Version)'] },
]

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
      return NextResponse.json({ error: 'Only host can start the game' }, { status: 403 })
    }

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)

    if (playersError) throw playersError

    if (!players || players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 })
    }

    const shuffledImages = [...SAMPLE_IMAGES].sort(() => Math.random() - 0.5)
    const roundsToCreate = shuffledImages.slice(0, room.total_rounds)

    const roundsData = roundsToCreate.map((img, index) => ({
      room_id: room.id,
      round_number: index + 1,
      image_url: img.url,
      answer: img.answer,
      answer_hints: img.hints,
      status: 'pending'
    }))

    const { error: roundsError } = await supabase
      .from('rounds')
      .insert(roundsData)

    if (roundsError) throw roundsError

    const { error: updateRoomError } = await supabase
      .from('rooms')
      .update({ 
        status: 'playing',
        current_round: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id)

    if (updateRoomError) throw updateRoomError

    const { error: updatePlayersError } = await supabase
      .from('players')
      .update({ status: 'playing' })
      .eq('room_id', room.id)

    if (updatePlayersError) throw updatePlayersError

    const { data: firstRound } = await supabase
      .from('rounds')
      .select('*')
      .eq('room_id', room.id)
      .eq('round_number', 1)
      .single()

    return NextResponse.json({ 
      success: true, 
      round: firstRound 
    })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
}
