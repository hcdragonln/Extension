document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['inVideo', 'belowTitle'], ({ inVideo, belowTitle }) => {
        document.getElementById('inVideo').checked = inVideo ?? true;
        document.getElementById('belowTitle').checked = belowTitle ?? true;
    });

    document.getElementById('save').onclick = () => {
        const inVideo = document.getElementById('inVideo').checked;
        const belowTitle = document.getElementById('belowTitle').checked;
        chrome.storage.local.set({ inVideo, belowTitle });
        window.close();
    };
});
