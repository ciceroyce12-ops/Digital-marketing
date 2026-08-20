const fs = require('fs');

const GOOGLE_TRENDS_URL = 'https://trends.google.com/trends/api/dailytrends?hl=id&tz=-420&geo=ID&ns=15';
const TIKTOK_TRENDS_URL = 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?countryCode=ID&period=7';

async function fetchGoogle() {
    try {
        const res = await fetch(GOOGLE_TRENDS_URL, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        if (!res.ok) {
            console.error(`Google API returned status ${res.status}`);
            return [];
        }

        const text = await res.text();
        
        // Stop if Google returns an HTML block page instead of JSON
        if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            console.error("Google Trends returned an HTML page instead of JSON (likely blocked or rate-limited).");
            return [];
        }

        // Clean the anti-XSSI prefix Google uses
        const cleaned = text.replace(/^\)\]\}',?\s*/, '');
        const data = JSON.parse(cleaned);
        const days = data?.default?.trendingSearchesDays || [];
        const stories = days.flatMap(day => day.trendingSearches || []);
        
        return stories.slice(0, 4).map(story => ({
            title: story.title?.query || story.title,
            traffic: story.formattedTraffic || story.traffic,
            started: story.formattedTime || story.startTime,
            url: story.shareUrl || 'https://trends.google.com/trending?geo=ID&hl=id'
        }));
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

    // Save the data to a JSON file
    fs.writeFileSync('trends.json', JSON.stringify(finalData, null, 2));
    console.log("trends.json successfully generated!");
}

run();
