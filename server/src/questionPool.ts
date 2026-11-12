import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

export interface PoolQuestion {
  id: string
  type: string
  image_url: string
  audio_url: string
  question: string
  primary_answer: string
  alternative_answers: string[]
  hints: string[]
  category: string
  difficulty: string
}

const FALLBACK_QUESTIONS: PoolQuestion[] = [
  {
    id: 'fallback-1',
    type: 'image',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/0/03/Walter_White_S5B.png',
    audio_url: '',
    question: 'Quem é esse icônico professor de química transformado em mestre do crime?',
    primary_answer: 'Walter White',
    alternative_answers: [],
    hints: ['Breaking Bad', 'Heisenberg'],
    category: 'Séries',
    difficulty: 'medium',
  },
  {
    id: 'fallback-2',
    type: 'image',
    image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    audio_url: '',
    question: 'Em que filme acompanhamos Neo na descoberta de que o mundo é uma simulação?',
    primary_answer: 'The Matrix',
    alternative_answers: ['Matrix'],
    hints: ['Pílula vermelha ou azul', 'Keanu Reeves'],
    category: 'Filmes',
    difficulty: 'easy',
  },
  {
    id: 'fallback-3',
    type: 'image',
    image_url: 'https://upload.wikimedia.org/wikipedia/pt/d/d4/Harry_Potter_e_a_Pedra_Filosofal_2001.jpg',
    audio_url: '',
    question: 'Qual o nome do bruxo mais famoso de Hogwarts?',
    primary_answer: 'Harry Potter',
    alternative_answers: [],
    hints: ['O Menino que Sobreviveu', 'Gryffindor'],
    category: 'Filmes',
    difficulty: 'easy',
  },
  {
    id: 'fallback-4',
    type: 'image',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/a/a9/MarioNSMBUDeluxe.png',
    audio_url: '',
    question: 'Qual o nome desse personagem da Nintendo conhecido por salvar a Princesa Peach?',
    primary_answer: 'Super Mario',
    alternative_answers: ['Mario'],
    hints: ['Encanador italiano', 'Cogumelos'],
    category: 'Games',
    difficulty: 'easy',
  },
  {
    id: 'fallback-5',
    type: 'image',
    image_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=800',
    audio_url: '',
    question: 'Qual é o nome do navio inafundável que protagoniza um dos maiores épicos do cinema?',
    primary_answer: 'Titanic',
    alternative_answers: [],
    hints: ['Jack e Rose', 'Iceberg'],
    category: 'Filmes',
    difficulty: 'easy',
  },
]

class QuestionPoolCache {
  private questions: PoolQuestion[] = []
  private lastLoadedAt = 0

  /**
   * Read-only load from public.question_pool in Supabase.
   * NEVER writes, updates, or deletes anything in Supabase.
   */
  public async init(): Promise<void> {
    await this.refresh()
    // Refresh in background every 15 minutes in case new questions are added in Supabase
    setInterval(() => {
      this.refresh().catch((err) => {
        console.error('[QuestionPoolCache] Background refresh failed:', err)
      })
    }, 15 * 60 * 1000)
  }

  public async refresh(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[QuestionPoolCache] Missing SUPABASE_URL or SUPABASE_ANON_KEY, using fallback questions.')
      if (this.questions.length === 0) {
        this.questions = FALLBACK_QUESTIONS
      }
      return
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // Fetch all questions in batches of 1000 (since PostgREST default limit is 1000 rows per request!)
      let allRows: any[] = []
      let from = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('question_pool')
          .select('*')
          .range(from, from + pageSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break

        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }

      if (allRows.length > 0) {
        this.questions = allRows.map((q) => ({
          id: q.id,
          type: q.type || 'image',
          image_url: q.image_url || '',
          audio_url: q.audio_url || '',
          question: q.question || '',
          primary_answer: q.primary_answer || '',
          alternative_answers: Array.isArray(q.alternative_answers) ? q.alternative_answers : [],
          hints: Array.isArray(q.hints) ? q.hints : [],
          category: q.category || 'Geral',
          difficulty: q.difficulty || 'medium',
        }))
        this.lastLoadedAt = Date.now()
        console.log(`[QuestionPoolCache] Loaded ${this.questions.length} questions into RAM from Supabase (READ-ONLY).`)
      } else if (this.questions.length === 0) {
        this.questions = FALLBACK_QUESTIONS
      }
    } catch (err) {
      console.error('[QuestionPoolCache] Error fetching question_pool from Supabase:', err)
      if (this.questions.length === 0) {
        this.questions = FALLBACK_QUESTIONS
      }
    }
  }

  public getAll(): PoolQuestion[] {
    return this.questions.length > 0 ? this.questions : FALLBACK_QUESTIONS
  }

  public getCount(): number {
    return this.questions.length
  }

  public getLastLoadedAt(): number {
    return this.lastLoadedAt
  }
}

export const questionPoolCache = new QuestionPoolCache()

