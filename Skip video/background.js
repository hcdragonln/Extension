chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ inVideo: true, belowTitle: true });
});
