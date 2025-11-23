// ====================
// Tìm video hoặc JWPlayer instance
// ====================
function getVideoInstance() {
  try {
    const jw = window.jwplayer?.("player");
    if (jw && jw.getPosition) return { type: "jwplayer", jw };
  } catch (e) {}

  const vids = Array.from(document.querySelectorAll("video")).filter(v => {
    const rect = v.getBoundingClientRect();
    const visible = v.offsetParent !== null && rect.width > 0 && rect.height > 0;
    return visible;
  });
  if (vids.length > 0) {
    const largest = vids.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0];
    return { type: "html5", video: largest };
  }
  return null;
}

// Xóa track cũ
function removeExistingExtTracks(video) {
  const existing = Array.from(video.querySelectorAll('track[data-ext-sub="true"]'));
  existing.forEach(t => t.remove());
}

// Tạo overlay hiển thị sub custom
function renderSubtitleOverlay(id, parentSelector, text = "") {
  let subEl = document.getElementById(id);
  const parent = document.querySelector(parentSelector);
  if (!parent) return null;

  if (!subEl) {
    subEl = document.createElement("div");
    subEl.id = id;


    subEl.style.position = "absolute";
    subEl.style.left = "0";
    subEl.style.right = "0";
    subEl.style.bottom = "70px"; // đẩy lên 1 xíu (tăng từ 40px -> 60px)
    subEl.style.display = "flex";
    subEl.style.justifyContent = "center";
    subEl.style.pointerEvents = "none"; // không chắn click
    subEl.style.zIndex = "9999";


    subEl.style.color = "#fff";
    subEl.style.fontWeight = "700";
    subEl.style.textAlign = "center";
    // multiple text-shadow để tạo viền đen rõ ràng
    subEl.style.textShadow =
      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 6px rgba(0,0,0,0.6)";
    subEl.style.padding = "6px 12px";
    subEl.style.borderRadius = "4px";
    subEl.style.maxWidth = "90%";
    subEl.style.margin = "0 auto";
    subEl.style.whiteSpace = "pre-wrap";
    subEl.style.lineHeight = "1.15";

    parent.appendChild(subEl);

    try {
      const inst = getVideoInstance();
      if (inst && inst.type === "html5" && inst.video) {
        const vw = inst.video.clientWidth || inst.video.videoWidth || 640;
        const computed = Math.max(18, Math.round(vw * 0.035)); // ~3.5% width, min 18px
        subEl.style.fontSize = computed + "px";
      } else {
        subEl.style.fontSize = "20px"; // fallback
      }
    } catch (e) {
      subEl.style.fontSize = "20px";
    }
  }

  subEl.textContent = text || "";
  return subEl;
}


// Lấy selector overlay chung với skip button
function getInVideoSelector() {
    const url = window.location.href;
    if (url.includes('youtube.com')) return '.ytp-left-controls';
    if (url.includes('streamqq')) return '.jw-controlbar';
    if (url.includes('animehay')) return '#video-player .jw-controlbar';
    return '.jw-controlbar';
}

// Gắn VTT
function addSubtitleFromText(vttText) {
  const inst = getVideoInstance();
  if (!inst) {
    return { success: false, message: "Không tìm thấy video trên trang." };
  }

  try {
    const blob = new Blob([vttText], { type: "text/vtt" });
    const blobUrl = URL.createObjectURL(blob);

    if (inst.type === "html5") {
      const video = inst.video;
      removeExistingExtTracks(video);

      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = "Custom Sub";
      track.srclang = "vi";
      track.src = blobUrl;
      track.default = true;
      track.setAttribute("data-ext-sub", "true");
      video.appendChild(track);

      setTimeout(() => {
        try {
          const tracks = video.textTracks;
          for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].label === "Custom Sub") {
              tracks[i].mode = "showing";
              // Nếu trang chặn hiển thị caption -> ta tự render overlay
              startCustomSubRenderer(tracks[i]);
            }
          }
        } catch (e) {}
      }, 200);

      setTimeout(() => {
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      }, 5 * 60 * 1000);

      return { success: true, message: "Đã gắn subtitle vào video HTML5." };

    } else if (inst.type === "jwplayer") {
      try {
        inst.jw.setCaptions({ files: [{ file: blobUrl, label: "Custom Sub" }] });
        return { success: true, message: "Đã gắn subtitle vào JWPlayer." };
      } catch (e) {
        return { success: false, message: "Không thể gắn sub vào JWPlayer: " + e.message };
      }
    } else {
      return { success: false, message: "Loại player không hỗ trợ." };
    }
  } catch (err) {
    return { success: false, message: "Lỗi khi tạo blob: " + err.message };
  }
}

// Renderer cho overlay custom khi caption bị chặn
let customSubInterval = null;
function startCustomSubRenderer(track) {
  if (customSubInterval) clearInterval(customSubInterval);
  const parentSelector = getInVideoSelector();
  customSubInterval = setInterval(() => {
    const activeCues = track.activeCues;
    let text = "";
    if (activeCues && activeCues.length > 0) {
      text = activeCues[0].text;
    }
    renderSubtitleOverlay("custom-sub", parentSelector, text);
  }, 200);
}

// Lắng nghe message từ popup
chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
  if (msg && msg.action === "addSubtitleFromText" && typeof msg.vttText === "string") {
    const res = addSubtitleFromText(msg.vttText);
    sendResp(res);
  }
});
