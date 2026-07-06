const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// ⭐ 유튜브 API 키
const API_KEY = 'AIzaSyCVqkPF2-XgtcuaW7qlAfrILTsYdTDrk0c';

// 오직 진짜 멤버 16명만 남은 깔끔한 명단입니다!
const members = [
    { name: "심가을 대표님", id: "UCdgGYzOCehIeirGdyfrqVvQ", isFixed: true },
    { name: "채수빈", id: "UCQ7EA5OOmBGICxLVko9GcIg", isFixed: false },
    { name: "연준", id: "UCCagjiCDkSWCjAQU3CjYahw", isFixed: false },
    { name: "박시울", id: "UCR01hU0e7ugHP7WHgFlC30g", isFixed: false },
    { name: "김선재", id: "UC6dHUvwtv9tmz9loMCiYKXg", isFixed: false },
    { name: "유동건", id: "UCBW9_nl-mDNIykX182Xzq6w", isFixed: false },
    { name: "최시훈", id: "UC-uPo6c4zgV6qbIMQjSvIfw", isFixed: false },
    { name: "구니스", id: "UCPa1OhAUj2_qSkyTHFEFz8g", isFixed: false },
    { name: "준호", id: "UCTSTQPpTWvvav4sSyYkSkew", isFixed: false },
    { name: "우혁", id: "UCUNS9M5-6U1By_yPGXmaf0g", isFixed: false },
    { name: "백도현", id: "UC9PlC5g67fFlDn4DO_3lr7w", isFixed: false },
    { name: "서준", id: "UC2RbrYhQFIUANNJwEIhnilw", isFixed: false },
    { name: "백현준", id: "UCzYsV4Cu2qYGsx0WW2GbaHA", isFixed: false },
    { name: "차선호DAISKI♥", id: "UC-fAFNoIebLPDUlMWY3P6oA", isFixed: false },
    { name: "루빈", id: "UCL3Upa2xdndT1SWWYj_PhbA", isFixed: false },
    { name: "윤유준", id: "UCvQ5AIKf-tYvWwo9DZf0CJA", isFixed: false },
    { name: "태민", id: "UCbe-jMZu1XzvBmY845ppvJA", isFixed: false },
    { name: "성찬", id: "UCvZB4kRvnQIrZtpDwupz_uA", isFixed: false },
];

let cachedResults = [];

// 차단 없는 완벽한 라이브 확인 로직 (RSS + API 조합)
async function updateCache() {
    console.log("\n🔄 유튜브 정문(API)으로 안전하게 현황 업데이트 시작...");
    try {
        const newResults = [];
        let allVideoIds = [];
        const memberVideoMap = {};
        const liveMemberIds = new Set();

        for (const member of members) {
            // 1단계: 모든 진짜 멤버들 뒷문(RSS)으로 최근 영상 수집
            try {
                const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${member.id}`;
                const rssResponse = await axios.get(rssUrl);
                const videoIds = [...rssResponse.data.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>/g)].map(m => m[1]).slice(0, 2);
                
                videoIds.forEach(id => {
                    allVideoIds.push(id);
                    memberVideoMap[id] = member;
                });
            } catch (e) {
                console.log(`${member.name} RSS 가져오기 실패`);
            }
        }

        // 2단계: 유튜브 API 정문에 들고 가서 진짜 라이브인지 확인
        if (allVideoIds.length > 0) {
            const videoIdsString = allVideoIds.join(','); 
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIdsString}&key=${API_KEY}`;
            
            const apiResponse = await axios.get(apiUrl);
            const items = apiResponse.data.items || [];

            for (const item of items) {
                const isLive = item.snippet.liveBroadcastContent === 'live';
                
                if (isLive) {
                    const videoId = item.id;
                    const member = memberVideoMap[videoId];
                    
                    if (!liveMemberIds.has(member.id)) {
                        liveMemberIds.add(member.id);
                        newResults.push({
                            ...member,
                            isLive: true,
                            title: item.snippet.title,
                            videoId: videoId,
                            thumbUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`
                        });
                    }
                }
            }
        }

        // 라이브가 아닌 멤버들 오프라인 처리
        for (const member of members) {
            if (!liveMemberIds.has(member.id)) {
                newResults.push({ ...member, isLive: false });
            }
        }

        cachedResults = newResults;
        console.log(`✅ 업데이트 완료! (현재 라이브: ${liveMemberIds.size}명)`);
        
    } catch (error) {
        console.error("업데이트 중 에러 발생:", error.message);
    }
}

updateCache();
setInterval(updateCache, 180000); // 3분마다 자동 확인

app.get('/api/live-status', (req, res) => {
    if (cachedResults.length === 0) {
        res.json(members.map(m => ({ ...m, isLive: false, title: "서버가 유튜브에서 최신 현황을 가져오는 중입니다..." })));
    } else {
        res.json(cachedResults);
    }
});

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 차단 없는 API 서버가 켜졌습니다! (포트: ${PORT})`);
});