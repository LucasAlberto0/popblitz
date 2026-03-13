import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SAMPLE_IMAGES = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/03/Walter_White_S5B.png',
    question: 'Quem é esse icônico professor de química transformado em mestre do crime?',
    answer: 'Walter White',
    audio_url: '',
    type: 'image',
    hints: ['Breaking Bad', 'Heisenberg'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    question: 'Em que filme acompanhamos Neo na descoberta de que o mundo é uma simulação?',
    answer: 'The Matrix',
    audio_url: '',
    type: 'image',
    hints: ['Pílula vermelha ou azul', 'Keanu Reeves'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/pt/d/d4/Harry_Potter_e_a_Pedra_Filosofal_2001.jpg',
    question: 'Qual o nome do bruxo mais famoso de Hogwarts?',
    answer: 'Harry Potter',
    audio_url: '',
    type: 'image',
    hints: ['O Menino que Sobreviveu', 'Gryffindor'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a9/MarioNSMBUDeluxe.png',
    question: 'Qual o nome desse personagem da Nintendo conhecido por salvar a Princesa Peach?',
    answer: 'Super Mario',
    audio_url: '',
    type: 'image',
    hints: ['Encanador italiano', 'Cogumelos'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=800',
    question: 'Qual é o nome do navio inafundável que protagoniza um dos maiores épicos do cinema?',
    answer: 'Titanic',
    audio_url: '',
    type: 'image',
    hints: ['Jack e Rose', 'Iceberg'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Michael_Jackson_in_1988.jpg',
    question: 'Quem é conhecido mundialmente como o Rei do Pop e criador do Moonwalk?',
    answer: 'Michael Jackson',
    audio_url: '',
    type: 'image',
    hints: ['Thriller', 'Billie Jean'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800',
    question: 'Qual o nome da série da Netflix que explora o Mundo Invertido nos anos 80?',
    answer: 'Stranger Things',
    audio_url: '',
    type: 'image',
    hints: ['Eleven', 'Demogorgon'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/21/Web_of_Spider-Man_Vol_1_129-1.png',
    question: 'Quem é o super-herói amigo da vizinhança que usa um traje vermelho e azul?',
    answer: 'Homem-Aranha',
    audio_url: '',
    type: 'image',
    hints: ['Peter Parker', 'Marvel'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/1/1c/Joker_%28DC_Comics_character%29.jpg',
    question: 'Qual o vilão mais famoso do Batman?',
    answer: 'Coringa',
    audio_url: '',
    type: 'image',
    hints: ['Risada', 'Gotham City'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/b/be/Vader_77.png',
    question: 'Quem disse a frase: "Eu sou seu pai"?',
    answer: 'Darth Vader',
    audio_url: '',
    type: 'image',
    hints: ['Star Wars', 'Lado Negro'],
    alternative_answers: [] as string[]
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Tour_Eiffel_2014.jpg',
    question: 'Em que cidade fica a Torre Eiffel?',
    answer: 'Paris',
    audio_url: '',
    type: 'image',
    hints: ['França', 'Cidade Luz'],
    alternative_answers: [] as string[]
  },
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { sessionId, maxScore, difficulty, timePerRound, intervalTime, includeAudio, onlyAudio } = body

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

    // 1. Fetch random questions from the Supabase Pool
    let sourceQuestions: {
        url: string;
        audio_url: string;
        type: string;
        question: string;
        answer: string;
        hints: string[];
        alternative_answers: string[];
    }[] = []
    try {
      const { data: poolData, error: poolError } = await supabase.from('question_pool').select('*')

      if (!poolError && poolData && poolData.length > 0) {
        let filteredPool = poolData
        
        if (difficulty && difficulty !== 'all') {
          filteredPool = filteredPool.filter(q => q.difficulty === difficulty)
        }
        
        if (onlyAudio) {
          filteredPool = filteredPool.filter(q => q.type === 'audio')
        } else if (!includeAudio) {
          filteredPool = filteredPool.filter(q => q.type !== 'audio')
        }

        // Helper for Fisher-Yates Shuffle
        const shuffle = (array: any[]) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };

        // Initial Shuffle
        filteredPool = shuffle(filteredPool);

        // If audio is included, redistribute them randomly
        if (includeAudio && !onlyAudio) {
            const audioQuestions = shuffle(filteredPool.filter(q => q.type === 'audio'))
            const otherQuestions = shuffle(filteredPool.filter(q => q.type !== 'audio'))
            
            const mixed: any[] = []
            let audioIdx = 0
            let otherIdx = 0
            let consecutiveAudio = 0
            
            // Randomly pick next type but respect the "max 2 consecutive" rule
            while (mixed.length < filteredPool.length) {
                const canAddAudio = audioIdx < audioQuestions.length && consecutiveAudio < 2
                const canAddOther = otherIdx < otherQuestions.length
                
                if (!canAddAudio && !canAddOther) break

                // Decide what to add
                // If we MUST add other because of consecutive limit, or if we have no audio left
                if (!canAddAudio || (canAddOther && Math.random() < 0.8)) {
                    if (canAddOther) {
                        mixed.push(otherQuestions[otherIdx++])
                        consecutiveAudio = 0
                    } else if (canAddAudio) {
                        mixed.push(audioQuestions[audioIdx++])
                        consecutiveAudio++
                    }
                } else {
                    mixed.push(audioQuestions[audioIdx++])
                    consecutiveAudio++
                }
            }
            filteredPool = mixed
        }

        sourceQuestions = filteredPool.map(q => ({
          url: q.image_url || '',
          audio_url: q.audio_url || '',
          type: q.type || 'image',
          question: q.question,
          answer: q.primary_answer,
          hints: q.hints || [],
          alternative_answers: q.alternative_answers || []
        }))
      }
    } catch (e) {
      console.error('Error fetching from question_pool:', e)
    }

    if (sourceQuestions.length === 0) {
      sourceQuestions = SAMPLE_IMAGES.sort(() => Math.random() - 0.5)
    }

    // Create more rounds initially (at least 20 or all available)
    const numRounds = Math.min(20, sourceQuestions.length)
    const roundsToCreate = sourceQuestions.slice(0, numRounds)

    const roundsData = roundsToCreate.map((q, index) => ({
      room_id: room.id,
      round_number: index + 1,
      image_url: q.url || '',
      audio_url: (q as any).audio_url || '',
      type: (q as any).type || 'image',
      question: q.question,
      answer: q.answer,
      answer_hints: [...(q.hints || []), ...(q.alternative_answers || [])],
      status: 'pending'
    }))

    const { error: roundsError } = await supabase
      .from('rounds')
      .insert(roundsData)

    if (roundsError) {
      console.error('Database Error (Rounds Table):', roundsError)
      throw roundsError
    }

    const { error: updateRoomError } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_round: 1,
        total_rounds: 100, // Unlimited rounds basically
        time_per_round: timePerRound,
        interval_time: intervalTime || 8,
        max_score: maxScore,
        difficulty: difficulty,
        include_audio: includeAudio,
        only_audio: onlyAudio,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id)

    if (updateRoomError) throw updateRoomError

    // Activate the first round with a timestamp
    const { error: activateRoundError } = await supabase
      .from('rounds')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('room_id', room.id)
      .eq('round_number', 1)

    if (activateRoundError) throw activateRoundError

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
  } catch (error: any) {
    console.error('Error starting game:', error)
    return NextResponse.json({
      error: 'Failed to start game',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
