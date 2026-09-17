const OFFSCREEN_URL = 'offscreen.html';
let creatingOffscreen;
let activeRequest;

async function ensureOffscreen() {
  const url = chrome.runtime.getURL(OFFSCREEN_URL);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (contexts.length) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['GEOLOCATION'],
      justification: 'Read the Mac physical location when the target page requests it.'
    }).finally(() => {
      creatingOffscreen = null;
    });
  }
  await creatingOffscreen;
}

async function getLocation() {
  await ensureOffscreen();
  try {
    const response = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'GET_LOCATION' });
    if (response?.error) {
      const error = new Error(response.error.message);
      error.code = response.error.code;
      throw error;
    }
    return response;
  } finally {
    await chrome.offscreen.closeDocument();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'service-worker' || message?.type !== 'GET_LOCATION') return;

  if (!activeRequest) {
    activeRequest = getLocation().finally(() => {
      activeRequest = null;
    });
  }

  activeRequest
    .then((location) => sendResponse({ ok: true, location }))
    .catch((error) => sendResponse({
      ok: false,
      error: { code: error?.code || 0, message: error?.message || '无法获取位置' }
    }));
  return true;
});
