const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Poor man's dotenv
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) env[key.trim()] = value.trim()
})

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
    console.log('Checking database...')

    try {
        const { data: rounds, error: roundsError } = await supabase.from('rounds').select('*').limit(1)
        if (roundsError) {
            console.error('Error connecting to rounds:', roundsError.message)
        } else {
            console.log('Successfully connected to rounds table.')
            if (rounds && rounds.length > 0) {
                console.log('Columns found in rounds:', Object.keys(rounds[0]).join(', '))
                if ('question' in rounds[0]) {
                    console.log('SUCCESS: "question" column exists.')
                } else {
                    console.log('FAILURE: "question" column MISSING.')
                }
            } else {
                console.log('Rounds table is empty.')
                // Try to insert a dummy round to see if it fails
                const { error: insertError } = await supabase.from('rounds').insert([{
                    room_id: '00000000-0000-0000-0000-000000000000', // Invalid but test column existance
                    round_number: 999,
                    image_url: 'test',
                    answer: 'test',
                    question: 'test'
                }])
                if (insertError && insertError.message.includes('column "question" of relation "rounds" does not exist')) {
                    console.log('FAILURE: "question" column MISSING (confirmed by test insert).')
                } else if (insertError && insertError.message.includes('insert or update on table "rounds" violates foreign key constraint')) {
                    console.log('SUCCESS: "question" column likely exists (foreign key failed but column didn\'t).')
                } else {
                    console.log('Insert test result:', insertError ? insertError.message : 'Success (unexpected)')
                }
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err)
    }
}

check()
