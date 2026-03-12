import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: currentRoundId } = await params
        const supabase = createAdminClient()
        const body = await request.json()
        const { sessionId } = body

        // 1. Get current round and room info
        const { data: currentRound, error: roundError } = await supabase
            .from('rounds')
            .select('*, room:rooms(*)')
            .eq('id', currentRoundId)
            .single()

        if (roundError || !currentRound) {
            return NextResponse.json({ error: 'Round not found' }, { status: 404 })
        }

        // 2. Security check
        if (currentRound.room.host_id !== sessionId) {
            return NextResponse.json({ error: 'Only host can trigger next round' }, { status: 403 })
        }

        // 3. Check for a winner (>= 120 points)
        const { data: winner } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', currentRound.room.id)
            .gte('score', 120)
            .order('score', { ascending: false })
            .limit(1)
            .single()

        if (winner) {
            // Finish game if someone reached 120 points
            await supabase
                .from('rooms')
                .update({
                    status: 'finished',
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentRound.room.id)

            return NextResponse.json({
                success: true,
                gameFinished: true,
                winner
            })
        }

        const nextRoundNumber = currentRound.round_number + 1

        // 4. Find next round
        const { data: nextRoundExist } = await supabase
            .from('rounds')
            .select('*')
            .eq('room_id', currentRound.room.id)
            .eq('round_number', nextRoundNumber)
            .single()

        let nextRound;

        if (nextRoundExist) {
            const { data } = await supabase
                .from('rounds')
                .update({
                    status: 'active',
                    started_at: new Date().toISOString()
                })
                .eq('id', nextRoundExist.id)
                .select()
                .single()
            nextRound = data
        } else {
            // Generate a new round since no more are pre-assigned
            // In a real app we'd fetch from a large pool, for now we reuse SAMPLE_IMAGES but random
            // This is a simple fallback
            const SAMPLE_IMAGES = [
                { url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=800', answer: 'Walter White', question: 'Quem é esse icônico professor?', hints: ['Breaking Bad'] },
                { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800', answer: 'The Matrix', question: 'Qual o nome desse filme?', hints: ['Neo'] },
                { url: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?auto=format&fit=crop&q=80&w=800', answer: 'Super Mario', question: 'Qual o nome desse personagem?', hints: ['Nintendo'] },
                { url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=800', answer: 'Titanic', question: 'Qual o nome do navio?', hints: ['Iceberg'] },
                { url: 'https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?auto=format&fit=crop&q=80&w=800', answer: 'Michael Jackson', question: 'Quem é o Rei do Pop?', hints: ['Moonwalk'] },
                { url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800', answer: 'Stranger Things', question: 'Qual o nome da série?', hints: ['Netflix'] },
                { url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&q=80&w=800', answer: 'Homem-Aranha', question: 'Qual o nome desse herói?', hints: ['Marvel'] },
                { url: 'https://images.unsplash.com/photo-1605462863863-10d9e47e15ee?auto=format&fit=crop&q=80&w=800', answer: 'Harry Potter', question: 'Qual o nome desse bruxo?', hints: ['Hogwarts'] },
            ]
            // 1. Fetch used question texts/answers to avoid duplicates
            const { data: usedRounds } = await supabase
                .from('rounds')
                .select('answer, question')
                .eq('room_id', currentRound.room.id)

            const usedQuestions = usedRounds?.map(r => r.answer) || []

            // 2. Fetch a random new question from the pool
            let nextQuestion = null
            try {
                const { data: poolData, error: poolError } = await supabase
                    .from('question_pool')
                    .select('*');

                if (poolError) throw poolError;

                if (poolData && poolData.length > 0) {
                    const unused = poolData.filter((q: any) => !usedQuestions.includes(q.primary_answer));
                    const listToPickFrom = unused.length > 0 ? unused : poolData;
                    nextQuestion = listToPickFrom[Math.floor(Math.random() * listToPickFrom.length)];
                }
            } catch (e) {
                console.error('Error fetching next question from pool:', e)
            }

            // 3. Map to round format (fallback to SAMPLE if pool fails)
            const newRoundData = nextQuestion
                ? {
                    url: nextQuestion.image_url || '',
                    question: nextQuestion.question,
                    answer: nextQuestion.primary_answer,
                    hints: nextQuestion.hints || [],
                    alternative_answers: nextQuestion.alternative_answers || []
                }
                : { ...SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)], alternative_answers: [] }

            const { data: newRound, error: createError } = await supabase
                .from('rounds')
                .insert({
                    room_id: currentRound.room.id,
                    round_number: currentRound.room.current_round + 1,
                    image_url: newRoundData.url,
                    question: newRoundData.question,
                    answer: newRoundData.answer,
                    answer_hints: [...newRoundData.hints, ...(newRoundData.alternative_answers || [])],
                    status: 'active',
                    started_at: new Date().toISOString()
                })
                .select()
                .single()

            if (createError) throw createError

            // Update room to the new round
            await supabase.from('rooms').update({
                current_round: currentRound.room.current_round + 1,
                updated_at: new Date().toISOString()
            }).eq('id', currentRound.room.id)

            return NextResponse.json({
                success: true,
                nextRound: newRound
            })
        }

        if (!nextRound) throw new Error('Failed to create or find next round')

        // Update room's current_round
        await supabase
            .from('rooms')
            .update({
                current_round: nextRoundNumber,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentRound.room.id)

        return NextResponse.json({
            success: true,
            nextRound
        })
    } catch (error) {
        console.error('Error transitioning to next round:', error)
        return NextResponse.json({ error: 'Failed to transition' }, { status: 500 })
    }
}
