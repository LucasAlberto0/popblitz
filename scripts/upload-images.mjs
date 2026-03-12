/**
 * Script to download images from URLs and upload them to Supabase Storage.
 * Then clears question_pool and inserts all questions with Supabase Storage URLs.
 * 
 * Usage: node scripts/upload-images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oqdwoeblazdappzmrmsf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZHdvZWJsYXpkYXBwem1ybXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjIyODYsImV4cCI6MjA4NzY5ODI4Nn0._NYEExJFOpFzZDWYGhvKTA-bHBD1N_G_cBB3plrQtoY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'question-images';

// All images to download and upload
const IMAGES = [
    // CULTURA POP
    { name: 'walter-white.png', url: 'https://upload.wikimedia.org/wikipedia/en/0/03/Walter_White_S5B.png' },
    { name: 'joker-dark-knight.png', url: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Heath_Ledger_as_the_Joker_in_The_Dark_Knight.png' },
    { name: 'harry-potter.jpg', url: 'https://upload.wikimedia.org/wikipedia/pt/d/d4/Harry_Potter_e_a_Pedra_Filosofal_2001.jpg' },
    { name: 'spider-man.png', url: 'https://upload.wikimedia.org/wikipedia/en/2/21/Web_of_Spider-Man_Vol_1_129-1.png' },
    { name: 'darth-vader.png', url: 'https://upload.wikimedia.org/wikipedia/en/b/be/Vader_77.png' },
    { name: 'goku.png', url: 'https://upload.wikimedia.org/wikipedia/pt/a/a2/Goku_em_Dragon_Ball_Super.png' },
    { name: 'inception.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/b/b6/Inception_ver3.jpg' },
    { name: 'godfather.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/0/00/The_Godfather_poster.jpg' },
    { name: 'gollum.png', url: 'https://upload.wikimedia.org/wikipedia/en/1/17/Gollum.PNG' },
    { name: 'forrest-gump.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/5/52/Forrest_Gump_poster.jpg' },
    { name: 'doge.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/5/5f/Doge_Keep_Calm_and_Dog_On.jpg' },
    { name: 'pepe.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/6/63/Feels_good_man.jpg' },
    // GAMES
    { name: 'mario.png', url: 'https://upload.wikimedia.org/wikipedia/en/a/a9/MarioNSMBUDeluxe.png' },
    { name: 'pikachu.png', url: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Pok%C3%A9mon_Pikachu_art.png' },
    { name: 'link-zelda.png', url: 'https://upload.wikimedia.org/wikipedia/en/2/21/Link_Legend_of_Zelda.png' },
    { name: 'kratos.png', url: 'https://upload.wikimedia.org/wikipedia/en/3/39/Kratos_GoW_2018.png' },
    { name: 'master-chief.png', url: 'https://upload.wikimedia.org/wikipedia/en/0/03/Master_Chief_in_Halo_5.png' },
    // LUGARES (Commons - reliable)
    { name: 'torre-eiffel.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Tour_Eiffel_2014.jpg' },
    { name: 'estatua-liberdade.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Statue_of_Liberty_7.jpg' },
    { name: 'cristo-redentor.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Aerial_view_of_the_Statue_of_Christ_the_Redeemer.jpg' },
    { name: 'taj-mahal.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Taj_Mahal_in_March_2004.jpg' },
    { name: 'coliseu.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg' },
    { name: 'machu-picchu.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Machu_Picchu%2C_Peru.jpg' },
    { name: 'big-ben.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg' },
    // ANIMAIS (Commons)
    { name: 'leao.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Lion_waiting_in_Namibia.jpg' },
    { name: 'panda.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Grosser_Panda.JPG' },
    { name: 'elefante.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/African_Bush_Elephant.jpg' },
    { name: 'tubarao.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/White_shark.jpg' },
    { name: 'aguia.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/24_Monate_alter_Wei%C3%9Fkopfseeadler.jpg' },
    { name: 'polvo.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Octopus2.jpg' },
    // ESPORTES (Commons)
    { name: 'cristiano-ronaldo.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg' },
    { name: 'messi.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Lionel_Messi_20180626.jpg' },
    { name: 'nike.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/1200px-Logo_NIKE.svg.png' },
    // OBJETOS (Commons)
    { name: 'iphone.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Apple_iPhone_15.jpg' },
    { name: 'ps5.png', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png' },
    // COMIDA (Unsplash - always reliable)
    { name: 'pizza.jpg', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800' },
    { name: 'hamburguer.jpg', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800' },
    { name: 'sushi.jpg', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800' },
    { name: 'tacos.jpg', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800' },
    { name: 'croissant.jpg', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=800' },
    { name: 'ramen.jpg', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800' },
    { name: 'acai.jpg', url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800' },
    { name: 'coxinha.jpg', url: 'https://images.unsplash.com/photo-1626198226928-69fc52f16a44?w=800' },
    { name: 'feijoada.jpg', url: 'https://images.unsplash.com/photo-1623859184380-46bcf1cdfc3d?w=800' },
    { name: 'chocolate.jpg', url: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800' },
    // EXTRAS (Unsplash)
    { name: 'violao.jpg', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800' },
    { name: 'aurora-boreal.jpg', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800' },
    { name: 'diamante.jpg', url: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=800' },
    { name: 'cinema.jpg', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
    { name: 'dna.jpg', url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800' },
    { name: 'xadrez.jpg', url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800' },
    { name: 'vulcao.jpg', url: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=800' },
    { name: 'astronauta.jpg', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800' },
    { name: 'piramides.jpg', url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800' },
    { name: 'samurai.jpg', url: 'https://images.unsplash.com/photo-1580477367043-403f05d45818?w=800' },
    { name: 'kombi.jpg', url: 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800' },
    { name: 'skate.jpg', url: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800' },
    { name: 'grafite.jpg', url: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800' },
    { name: 'cafe.jpg', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800' },
    { name: 'vinhos.jpg', url: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800' },
    { name: 'microchip.jpg', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
    { name: 'baleia.jpg', url: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=800' },
    { name: 'pinguim.jpg', url: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=800' },
    { name: 'canguru.jpg', url: 'https://images.unsplash.com/photo-1578593828337-b5fc0264b8e5?w=800' },
    { name: 'coruja.jpg', url: 'https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?w=800' },
    { name: 'flamingo.jpg', url: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=800' },
    { name: 'tartaruga.jpg', url: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800' },
    { name: 'camaleao.jpg', url: 'https://images.unsplash.com/photo-1504450874802-0ba2bcd58596?w=800' },
    { name: 'futebol.jpg', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800' },
    { name: 'basquete.jpg', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800' },
    { name: 'tenis-esporte.jpg', url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800' },
    { name: 'surf.jpg', url: 'https://images.unsplash.com/photo-1502680390548-bdbac40551f3?w=800' },
    { name: 'karate.jpg', url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800' },
    { name: 'monte-fuji.jpg', url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800' },
    { name: 'opera-sydney.jpg', url: 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?w=800' },
    { name: 'veneza.jpg', url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800' },
    { name: 'santorini.jpg', url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800' },
    { name: 'muro-berlim.jpg', url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800' },
    { name: 'petra.jpg', url: 'https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=800' },
    { name: 'stonehenge.jpg', url: 'https://images.unsplash.com/photo-1599833975787-5c143f373c30?w=800' },
    { name: 'narvalo.jpg', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800' },
];

async function downloadAndUpload(image) {
    try {
        console.log(`  📥 Downloading ${image.name}...`);
        const response = await fetch(image.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.log(`  ❌ Failed to download ${image.name}: ${response.status}`);
            return null;
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        console.log(`  📤 Uploading ${image.name} (${(buffer.byteLength / 1024).toFixed(0)}KB)...`);

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(image.name, buffer, {
                contentType,
                upsert: true
            });

        if (error) {
            console.log(`  ❌ Upload error for ${image.name}: ${error.message}`);
            return null;
        }

        const { data: publicUrl } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(image.name);

        console.log(`  ✅ ${image.name} → ${publicUrl.publicUrl}`);
        return publicUrl.publicUrl;
    } catch (err) {
        console.log(`  ❌ Error with ${image.name}: ${err.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting image upload to Supabase Storage...\n');

    const urlMap = {};
    let success = 0;
    let failed = 0;

    for (const image of IMAGES) {
        const url = await downloadAndUpload(image);
        if (url) {
            urlMap[image.name] = url;
            success++;
        } else {
            failed++;
        }
        // Small delay between uploads
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n📊 Results: ${success} uploaded, ${failed} failed`);
    console.log('\n📝 URL Map:');
    console.log(JSON.stringify(urlMap, null, 2));

    // Write URL map to file for reference
    const fs = await import('fs');
    fs.writeFileSync('scripts/url-map.json', JSON.stringify(urlMap, null, 2));
    console.log('\n💾 URL map saved to scripts/url-map.json');
}

main().catch(console.error);
