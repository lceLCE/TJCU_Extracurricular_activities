chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message?.type !== 'GET_LOCATION') return;

  navigator.geolocation.getCurrentPosition((position) => {
    const { coords } = position;
    sendResponse({
        latitude: coords.latitude,
        longitude: coords.longitude,
        // accuracy: coords.accuracy,
        // altitude: coords.altitude,
        // altitudeAccuracy: coords.altitudeAccuracy,
        // heading: coords.heading,
        // speed: coords.speed,
        // timestamp: position.timestamp
      });
  }, (error) => {
    sendResponse({ error: { code: error.code || 0, message: error.message || '无法获取位置' } });
  }, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
  return true;
});

// const testResponse = {
//   latitude: 39.9042,
//   longitude: 116.4074,
//   accuracy: 10,
//   altitude: null,
//   altitudeAccuracy: null,
//   heading: null,
//   speed: null,
//   timestamp: Date.now()
// };

// sendResponse(testResponse);