const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// ⭐ 유튜브 API 키
const API_KEY = 'AIzaSyCVqkPF2-XgtcuaW7qlAfrILTsYdTDrk0c';

// 오직 진짜 멤버 16명만 남은 깔끔한 명단입니다!
const members = [
    { name: "김인환 대표님", id: "UC1B9SsfgCoOBlX4KU1eA_WA", isFixed: true },
    { name: "김혁", id: "UC3UKBF6jTpoPH65w5wzg80g", isFixed: false },
    { name: "여운", id: "UCMBuA0M8UnGkj82whDYWBDw", isFixed: false },
    { name: "이신우", id: "UCFlqjyz1C7khLh_cHVaWuvw", isFixed: false },
    { name: "강대호", id: "UCgLxSBFLmPnLbUkBXZpQiSA", isFixed: false },
    { name: "차유현", id: "UCHv64fI_DmPRFFPBI2VxnRw", isFixed: false },
    { name: "환", id: "UCGiB_G92IXI5im2PNg2f2Yw", isFixed: false },
    { name: "건리버", id: "UClGYjcolB4Q_IxlGgRM8zTg", isFixed: false },
    { name: "이강유", id: "UCV7bzTsAx2wOgC2oGQL9ngA", isFixed: false },
    { name: "권우빈", id: "UCbHo8G-J874FHyGcpgn0_7w", isFixed: false },
    { name: "성준", id: "UCTsKA_kkLEWFO60VJoG0r-w", isFixed: false },
    { name: "조성빈", id: "UCFd6y1h3EEDzjL_f7nYDepg", isFixed: false },
    { name: "안재현", id: "UCQXtfhG3S0aa7f7f230s9qQ", isFixed: false },
    { name: "천우", id: "UCViKwH--dgPkGcydqqt-jDA", isFixed: false },
    { name: "도일", id: "UCQDAyvoteXG9NbiCp0qvftg", isFixed: false },
    { name: "이준", id: "UCrpF73OTLavqN87jw5hi0Rg", isFixed: false }
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