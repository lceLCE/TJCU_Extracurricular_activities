(() => {
  if (/MicroMessenger/i.test(navigator.userAgent)) return;

  const PAGE_SOURCE = 'daka-mac-location-page';
  const EXTENSION_SOURCE = 'daka-mac-location-extension';
  const pending = new Map();

  function wgs84ToGcj02(longitude, latitude) {
    if (longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271) {
      return [longitude, latitude];
    }

    const pi = Math.PI;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    const x = longitude - 105.0;
    const y = latitude - 35.0;
    let dLat = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    let dLng = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    dLat += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    dLat += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
    dLat += (160.0 * Math.sin(y / 12.0 * pi) + 320.0 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
    dLng += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    dLng += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
    dLng += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;

    const radLat = latitude / 180.0 * pi;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = dLat * 180.0 / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
    dLng = dLng * 180.0 / (a / sqrtMagic * Math.cos(radLat) * pi);
    return [longitude + dLng, latitude + dLat];
  }

  function finish(options, response) {
    if (response.ok) {
      const location = response.location;
      const coordinates = options.type === 'gcj02'
        ? wgs84ToGcj02(location.longitude, location.latitude)
        : [location.longitude, location.latitude];
      const result = {
        longitude: coordinates[0],
        latitude: coordinates[1],
        accuracy: location.accuracy,
        speed: location.speed,
        errMsg: 'getLocation:ok'
      };
      options.success?.(result);
      options.complete?.(result);
      return;
    }

    const result = {
      errMsg: `getLocation:fail ${response.error?.message || '无法获取位置'}`,
      code: response.error?.code || 0
    };
    options.fail?.(result);
    options.complete?.(result);
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      message?.source !== EXTENSION_SOURCE ||
      typeof message.id !== 'string'
    ) return;

    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    finish(request.options, message);
  });

  function install() {
    if (!window.wx || typeof window.wx.getLocation !== 'function') return false;
    if (window.wx.getLocation.__dakaMacLocationBridge) return true;

    function getLocation(options = {}) {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        const request = pending.get(id);
        if (!request) return;
        pending.delete(id);
        finish(request.options, {
          ok: false,
          error: { code: 3, message: '定位请求超时' }
        });
      }, 15000);

      pending.set(id, { options, timeout });
      window.postMessage({ source: PAGE_SOURCE, type: 'GET_LOCATION', id }, location.origin);
    }

    Object.defineProperty(getLocation, '__dakaMacLocationBridge', { value: true });
    window.wx.getLocation = getLocation;
    document.documentElement?.setAttribute('data-daka-mac-location', 'ready');
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 600) clearInterval(timer);
    }, 100);
  }
})();

