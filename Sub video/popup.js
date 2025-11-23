// Đọc file từ popup, gửi TEXT tới content script
document.getElementById('attachBtn').addEventListener('click', () => {
  const input = document.getElementById('fileInput');
  if (!input.files || !input.files[0]) {
    alert('Vui lòng chọn file .srt hoặc .vtt trước.');
    return;
  }

  const file = input.files[0];
  console.log("[Popup] File được chọn:", file.name);

  const reader = new FileReader();

  reader.onload = () => {
    let text = reader.result;
    console.log("[Popup] Nội dung file gốc:\n", text);

    // Nếu là .srt thì convert sang vtt
    if (file.name.toLowerCase().endsWith('.srt')) {
      console.log("[Popup] File là .srt → tiến hành convert sang VTT");
      text = convertSrtToVttText(text);
      console.log("[Popup] Nội dung sau khi convert SRT → VTT:\n", text);
    } else {
      // nếu là vtt nhưng không có header WEBVTT, thêm header
      if (!/^WEBVTT/m.test(text)) {
        console.log("[Popup] File VTT nhưng thiếu header → thêm WEBVTT");
        text = 'WEBVTT\n\n' + text;
      }
      console.log("[Popup] Nội dung VTT cuối cùng:\n", text);
    }

    // gửi nội dung text sang content script ở tab hiện hành
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        alert('Không có tab đang hoạt động.');
        return;
      }
      console.log("[Popup] Gửi phụ đề tới tab:", tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, { action: 'addSubtitleFromText', vttText: text }, (resp) => {
        if (chrome.runtime.lastError) {
          alert('Không thể gửi tin nhắn tới trang (content script có thể chưa inject). Hãy thử reload trang.');
          console.error("[Popup] Lỗi gửi message:", chrome.runtime.lastError);
        } else {
          console.log("[Popup] Response từ content script:", resp);
        }
      });
    });
  };

  reader.onerror = () => {
    alert('Lỗi đọc file.');
    console.error("[Popup] FileReader error:", reader.error);
  };

  reader.readAsText(file);
});
//convert srt to vtt
function convertSrtToVttText(srt) {
  console.log("[Convert] Bắt đầu convert SRT sang VTT");
  if (srt.charCodeAt(0) === 0xFEFF) {
    console.log("[Convert] Bỏ BOM ở đầu file");
    srt = srt.slice(1);
  }
  let vtt = srt.replace(/\r+/g, '');
  vtt = vtt.replace(/^\s*\d+\s*$/gm, '');
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  vtt = vtt.replace(
  /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/g,
  '$1 --> $2 line:80%'
);

  vtt = 'WEBVTT\n\n' + vtt.trim() + '\n';
  console.log("[Convert] Kết quả VTT:\n", vtt);
  return vtt;
}
