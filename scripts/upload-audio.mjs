/**
 * Script to download iconic movie/TV soundtrack clips from YouTube,
 * trim to 20 seconds (at the refrain/iconic part), and upload to Supabase Storage.
 * Then updates question_pool with the Supabase Storage audio URLs.
 * 
 * Requirements: yt-dlp, ffmpeg (both installed via brew)
 * Usage: node scripts/upload-audio.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';

const SUPABASE_URL = 'https://oqdwoeblazdappzmrmsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZHdvZWJsYXpkYXBwem1ybXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjIyODYsImV4cCI6MjA4NzY5ODI4Nn0._NYEExJFOpFzZDWYGhvKTA-bHBD1N_G_cBB3plrQtoY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'question-audio';
const TMP_DIR = '/tmp/pop-guess-audio';

// Each entry: YouTube URL, start time (seconds) for the iconic refrain, filename, and the primary_answer to match in DB
const SOUNDTRACKS = [
  {
    name: 'star-wars-theme.mp3',
    primary_answer: 'Star Wars',
    yt_url: 'https://www.youtube.com/watch?v=_D0ZQPqeJkk', // Star Wars Main Theme
    start: 0, // The opening fanfare IS the refrain
  },
  {
    name: 'harry-potter-hedwig.mp3',
    primary_answer: 'Harry Potter',
    yt_url: 'https://www.youtube.com/watch?v=wtHra9tFISY', // Hedwig's Theme
    start: 0,
  },
  {
    name: 'indiana-jones-theme.mp3',
    primary_answer: 'Indiana Jones',
    yt_url: 'https://www.youtube.com/watch?v=JRAPnCJXR8U', // Raiders March  
    start: 0,
  },
  {
    name: 'jurassic-park-theme.mp3',
    primary_answer: 'Jurassic Park',
    yt_url: 'https://www.youtube.com/watch?v=D8zlUUrFK-M', // Jurassic Park Theme
    start: 0,
  },
  {
    name: 'pirates-caribbean-theme.mp3',
    primary_answer: 'Piratas do Caribe',
    yt_url: 'https://www.youtube.com/watch?v=27mB8verLK8', // He's a Pirate
    start: 0,
  },
  {
    name: 'godfather-theme.mp3',
    primary_answer: 'O Poderoso Chefão',
    yt_url: 'https://www.youtube.com/watch?v=HWqKPWO5T4o', // The Godfather Theme
    start: 0,
  },
  {
    name: 'lotr-theme.mp3',
    primary_answer: 'O Senhor dos Anéis',
    yt_url: 'https://www.youtube.com/watch?v=_SBQvd6vY9s', // Concerning Hobbits
    start: 0,
  },
  {
    name: 'jaws-theme.mp3',
    primary_answer: 'Tubarão',
    yt_url: 'https://www.youtube.com/watch?v=ZvCI-gNK_y4', // Jaws Theme
    start: 0,
  },
  {
    name: 'avengers-theme.mp3',
    primary_answer: 'Vingadores',
    yt_url: 'https://www.youtube.com/watch?v=B3WJaC-7g2c', // The Avengers Theme
    start: 0,
  },
  {
    name: 'mission-impossible-theme.mp3',
    primary_answer: 'Missão Impossível',
    yt_url: 'https://www.youtube.com/watch?v=XAYhNHhxN0A', // Mission Impossible Theme
    start: 0,
  },
  {
    name: 'james-bond-theme.mp3',
    primary_answer: 'James Bond',
    yt_url: 'https://www.youtube.com/watch?v=ye8KvYKn9-0', // James Bond Theme
    start: 0,
  },
  {
    name: 'titanic-theme.mp3',
    primary_answer: 'Titanic',
    yt_url: 'https://www.youtube.com/watch?v=DNyKDI9pn0Q', // My Heart Will Go On
    start: 0,
  },
  {
    name: 'psycho-theme.mp3',
    primary_answer: 'Psicose',
    yt_url: 'https://www.youtube.com/watch?v=Me-VhC9ieh0', // Psycho - Shower Scene
    start: 0,
  },
  {
    name: 'rocky-theme.mp3',
    primary_answer: 'Rocky Balboa',
    yt_url: 'https://www.youtube.com/watch?v=DhlPAj38rHc', // Gonna Fly Now
    start: 0,
  },
  {
    name: 'interstellar-theme.mp3',
    primary_answer: 'Interestelar',
    yt_url: 'https://www.youtube.com/watch?v=UDVtMYqUAyw', // Interstellar Main Theme
    start: 0,
  },
  {
    name: 'got-theme.mp3',
    primary_answer: 'Game of Thrones',
    yt_url: 'https://www.youtube.com/watch?v=s7L2PVdrb_8', // Game of Thrones Theme
    start: 0,
  },
  {
    name: 'stranger-things-theme.mp3',
    primary_answer: 'Stranger Things',
    yt_url: 'https://www.youtube.com/watch?v=Jmv5pTyz--I', // Stranger Things Theme  
    start: 0,
  },
  {
    name: 'lion-king-theme.mp3',
    primary_answer: 'O Rei Leão',
    yt_url: 'https://www.youtube.com/watch?v=GibiNy4d4gc', // Circle of Life
    start: 0,
  },
  {
    name: 'back-to-the-future-theme.mp3',
    primary_answer: 'De Volta para o Futuro',
    yt_url: 'https://www.youtube.com/watch?v=e8TZbze72Bc', // Back to the Future Theme
    start: 0,
  },
  {
    name: 'batman-theme.mp3',
    primary_answer: 'Batman',
    yt_url: 'https://www.youtube.com/watch?v=efgDdSWDg0g', // The Dark Knight Theme
    start: 0,
  },
];

/**
 * Download audio from YouTube, trim to 20 seconds, convert to mp3
 */
function downloadAndTrim(track) {
  const rawFile = `${TMP_DIR}/${track.name.replace('.mp3', '-raw.%(ext)s')}`;
  const rawGlob = `${TMP_DIR}/${track.name.replace('.mp3', '-raw.*')}`;
  const outputFile = `${TMP_DIR}/${track.name}`;

  try {
    // Step 1: Download audio only with yt-dlp
    console.log(`  📥 Downloading audio: ${track.primary_answer}...`);
    execSync(
      `yt-dlp -x --audio-format mp3 --audio-quality 128K -o "${rawFile}" "${track.yt_url}" 2>&1`,
      { timeout: 60000 }
    );

    // Find the downloaded file (yt-dlp may change extension)
    const rawActual = execSync(`ls ${rawGlob} 2>/dev/null | head -1`, { encoding: 'utf-8' }).trim();
    
    if (!rawActual) {
      // Sometimes yt-dlp names the file with the actual extension
      const altRaw = `${TMP_DIR}/${track.name.replace('.mp3', '-raw.mp3')}`;
      if (!existsSync(altRaw)) {
        console.log(`  ❌ Downloaded file not found for ${track.primary_answer}`);
        return null;
      }
    }
    
    const sourceFile = rawActual || `${TMP_DIR}/${track.name.replace('.mp3', '-raw.mp3')}`;

    // Step 2: Trim to 20 seconds starting at the iconic part
    console.log(`  ✂️  Trimming to 20s (start: ${track.start}s)...`);
    execSync(
      `ffmpeg -y -i "${sourceFile}" -ss ${track.start} -t 20 -acodec libmp3lame -ab 128k -ar 44100 "${outputFile}" 2>&1`,
      { timeout: 30000 }
    );

    // Clean up raw file
    try { unlinkSync(sourceFile); } catch (e) { /* ignore */ }

    console.log(`  ✅ Trimmed: ${track.name}`);
    return outputFile;
  } catch (err) {
    console.log(`  ❌ Error processing ${track.primary_answer}: ${err.message?.slice(0, 200)}`);
    return null;
  }
}

/**
 * Upload audio file to Supabase Storage
 */
async function uploadToSupabase(filePath, fileName) {
  try {
    const buffer = readFileSync(filePath);
    console.log(`  📤 Uploading ${fileName} (${(buffer.byteLength / 1024).toFixed(0)}KB)...`);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      console.log(`  ❌ Upload error for ${fileName}: ${error.message}`);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    console.log(`  ✅ Uploaded → ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (err) {
    console.log(`  ❌ Upload error: ${err.message}`);
    return null;
  }
}

/**
 * Update question_pool with the audio URL
 */
async function updateQuestionPool(primaryAnswer, audioUrl) {
  const { error } = await supabase
    .from('question_pool')
    .update({ audio_url: audioUrl })
    .eq('primary_answer', primaryAnswer)
    .eq('type', 'audio');

  if (error) {
    console.log(`  ❌ DB update error for ${primaryAnswer}: ${error.message}`);
    return false;
  }
  console.log(`  💾 DB updated: ${primaryAnswer}`);
  return true;
}

async function main() {
  console.log('🎬 Pop Guess - Audio Soundtrack Uploader');
  console.log('==========================================\n');

  // Create temp dir
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const track of SOUNDTRACKS) {
    console.log(`\n🎵 [${success + failed + 1}/${SOUNDTRACKS.length}] ${track.primary_answer}`);
    console.log(`   YouTube: ${track.yt_url}`);

    // 1. Download + trim
    const localFile = downloadAndTrim(track);
    if (!localFile) {
      failed++;
      continue;
    }

    // 2. Upload to Supabase Storage
    const publicUrl = await uploadToSupabase(localFile, track.name);
    if (!publicUrl) {
      failed++;
      continue;
    }

    // 3. Update database
    const updated = await updateQuestionPool(track.primary_answer, publicUrl);
    if (updated) {
      success++;
    } else {
      failed++;
    }

    // Clean up local file
    try { unlinkSync(localFile); } catch (e) { /* ignore */ }

    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n==========================================');
  console.log(`📊 Results: ${success} uploaded, ${failed} failed`);
  console.log('==========================================\n');

  // Cleanup temp dir
  try {
    execSync(`rm -rf ${TMP_DIR}`);
  } catch (e) { /* ignore */ }
}

main().catch(console.error);
