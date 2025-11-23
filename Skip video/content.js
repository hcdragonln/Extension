function getVideoInstance() {
    // 1. Kiểm tra window.player trước
    if (window.player?.currentTime !== undefined) {
        console.log('[MY-SCRIPT] Loại video: HTML5 (window.player)');
        return { type: "html5", video: window.player };
    }

    // 2. Kiểm tra JWPlayer
    const jw = window.jwplayer?.("player");
    if (jw && jw.getPosition) {
        console.log('[MY-SCRIPT] Loại video: JWPlayer');
        return { type: "jwplayer", jw };
    }

    // 3. Lọc các video HTML5 đang hiển thị
    const videos = Array.from(document.querySelectorAll('video')).filter(video => {
        const rect = video.getBoundingClientRect();
        const isHidden = video.offsetParent === null || rect.width === 0 || rect.height === 0;
        return !isHidden;
    });

    if (videos.length > 0) {
        // Ưu tiên video lớn nhất (tránh video preview bé)
        const largestVideo = videos.sort((a, b) => {
            const areaA = a.videoWidth * a.videoHeight;
            const areaB = b.videoWidth * b.videoHeight;
            return areaB - areaA;
        })[0];
        console.log('[MY-SCRIPT] Loại video: HTML5 (video element lớn nhất)', largestVideo);
        return { type: "html5", video: largestVideo };
    }

    console.warn('[MY-SCRIPT] Không tìm thấy video player');
    return null;
}


function createButton(label, seconds) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = seconds < 0 ? 'skip-backward' : 'skip-forward';
    btn.onclick = () => {
        console.log(`Click skip button: ${label}`);
        const inst = getVideoInstance();
        if (inst?.type === "jwplayer") {
            const cur = inst.jw.getPosition?.() || 0;
            const duration = inst.jw.getDuration?.() || 0;
            const target = Math.min(duration, Math.max(0, cur + seconds));
            inst.jw.seek(target);
            console.log(`Skip ${label} JWPlayer: ${cur} -> ${target}`);
        } else if (inst?.type === "html5") {
            const before = inst.video.currentTime;
            inst.video.currentTime += seconds;
            console.log(`Skip ${label} HTML5: ${before} -> ${inst.video.currentTime}`);
        } else {
            console.warn("❌ Không tìm thấy video hoặc jwplayer");
        }
    };
    return btn;
}

function createButtonContainer(id) {
    const container = document.createElement('div');
    container.id = id;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '12px';
    container.style.margin = '12px 0';
    container.style.zIndex = 1000;
    return container;
}

function renderButtons(id, parentSelector, prepend = false) {
    if (document.getElementById(id)) return;
    const parent = document.querySelector(parentSelector);
    if (!parent) return;

    const container = createButtonContainer(id);

    const skipRow = document.createElement('div');
    skipRow.style.display = 'flex';
    skipRow.style.flexWrap = 'wrap';
    skipRow.style.justifyContent = 'center';
    skipRow.style.gap = '8px';

    const skipButtons = [
        { label: "-10m", seconds: -600 },
        { label: "-1m", seconds: -60 },
        { label: "-10s", seconds: -10 },
        { label: "+10s", seconds: 10 },
        { label: "+1m", seconds: 60 },
        { label: "+10m", seconds: 600 }
    ];
    skipButtons.forEach(({ label, seconds }) => skipRow.appendChild(createButton(label, seconds)));

    const speedRow = document.createElement('div');
    speedRow.style.display = 'flex';
    speedRow.style.flexWrap = 'wrap';
    speedRow.style.justifyContent = 'center';
    speedRow.style.gap = '8px';

    [1, 1.5, 2, 4, 8].forEach(speed => {
        const btn = document.createElement('button');
        btn.textContent = `x${speed}`;
        btn.onclick = () => {
            const inst = getVideoInstance();
            if (inst?.type === "jwplayer" && inst.jw.setPlaybackRate) {
                inst.jw.setPlaybackRate(speed);
                console.log("Set JWPlayer speed:", speed);
            } else if (inst?.type === "html5") {
                inst.video.playbackRate = speed;
                console.log("Set HTML5 speed:", speed);
            } else {
                console.warn("Không thể set speed vì không tìm thấy player");
            }
        };
        speedRow.appendChild(btn);
    });

    container.appendChild(skipRow);
    container.appendChild(speedRow);
    prepend ? parent.prepend(container) : parent.appendChild(container);
}

function removeById(id) {
    document.getElementById(id)?.remove();
}

function getInVideoSelector() {
    const url = window.location.href;
    if (url.includes('youtube.com')) return '.ytp-left-controls';
    if (url.includes('str')) return '.jw-controlbar';
    if (url.includes('anime')) return '#video-player .jw-controlbar';
    return '.jw-controlbar';
}

function getBelowSelector() {
    const url = window.location.href;
    if (url.includes('youtube.com')) return '#below';
    if (url.includes('str')) return '#container';
    if (url.includes('anime')) return '#ah_wrapper > div.ah_content > div.watching-movie > div:nth-child(9)';
    return '#watch-block > ul > li.pu-link.active';
}

function updateButtons({ inVideo, belowTitle }) {
    const inVideoSelector = getInVideoSelector();
    const belowSelector = getBelowSelector();
    if (inVideo && inVideoSelector) renderButtons('custom-in-video', inVideoSelector, false);
    else removeById('custom-in-video');
    if (belowTitle && belowSelector) renderButtons('custom-below-title', belowSelector, true);
    else removeById('custom-below-title');
}

chrome.storage.local.get(['inVideo', 'belowTitle'], (data) => {
    updateButtons({
        inVideo: data.inVideo ?? true,
        belowTitle: data.belowTitle ?? true
    });
});

chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(['inVideo', 'belowTitle'], (data) => {
        updateButtons(data);
    });
});

const observer = new MutationObserver(() => {
    chrome.storage.local.get(['inVideo', 'belowTitle'], (data) => {
        updateButtons(data);
    });
});
observer.observe(document.body, { childList: true, subtree: true });
