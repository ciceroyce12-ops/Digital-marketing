const fs = require('fs');

const GOOGLE_TRENDS_URL = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID';
const TIKTOK_TRENDS_URL = 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?countryCode=ID&period=7';

async function fetchGoogle() {
    try {
        const res = await fetch(GOOGLE_TRENDS_URL, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`Google RSS returned status ${res.status}`);
            return [];
        }

        const xml = await res.text();
        
        const results = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null && results.length < 4) {
            const itemContent = match[1];
            
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            const trafficMatch = itemContent.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);

            if (titleMatch) {
                results.push({
                    title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                    traffic: trafficMatch ? trafficMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Trending',
                    started: 'Hari ini',
                    url: linkMatch ? linkMatch[1].trim() : 'https://trends.google.com/trends?geo=ID&hl=id'
                });
            }
        }

        return results;
    } catch (e) {
        console.error("Google Fetch Error:", e);
        return [];
    }
}

async function fetchTikTok() {
    try {
        const res = await fetch(TIKTOK_TRENDS_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();
        
        const results = [];
        const seen = new Set();
        const tagMatches = html.match(/#[A-Za-z0-9_][A-Za-z0-9._-]{1,49}/g) || [];
        
        for (const tag of tagMatches) {
            const normalized = tag.toLowerCase();
            if (seen.has(normalized) || normalized.length < 3) continue;
            
            results.push({ name: tag, region: 'Indonesia', period: '7 hari' });
            seen.add(normalized);
            if (results.length >= 4) break;
        }
        return results;
    } catch (e) {
        console.error("TikTok Fetch Error:", e);
        return [];
    }
}

async function run() {
    const googleData = await fetchGoogle();
    const tiktokData = await fetchTikTok();
    
    const finalData = {
        lastUpdated: new Date().toISOString(),
        google: googleData,
        tiktok: tiktokData
    };

    fs.writeFileSync('trends.json', JSON.stringify(finalData, null, 2));
    console.log("trends.json successfully generated with RSS data!");
}

run();
