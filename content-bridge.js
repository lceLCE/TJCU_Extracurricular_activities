const PAGE_SOURCE = 'daka-mac-location-page';
const EXTENSION_SOURCE = 'daka-mac-location-extension';

window.addEventListener('message', async (event) => {
  const message = event.data;
  if (
    event.source !== window ||
    event.origin !== location.origin ||
    message?.source !== PAGE_SOURCE ||
    message?.type !== 'GET_LOCATION' ||
    typeof message.id !== 'string'
  ) return;

  try {
    const response = await chrome.runtime.sendMessage({
      target: 'service-worker',
      type: 'GET_LOCATION'
    });
    window.postMessage({ source: EXTENSION_SOURCE, id: message.id, ...response }, location.origin);
  } catch (error) {
    window.postMessage({
      source: EXTENSION_SOURCE,
      id: message.id,
      ok: false,
      error: { code: 0, message: error.message || '扩展定位失败' }
    }, location.origin);
  }
});

