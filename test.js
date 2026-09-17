const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'));
assert.deepStrictEqual(manifest.permissions.sort(), ['geolocation', 'offscreen']);
assert(manifest.content_scripts.every((script) => script.matches.every((match) => match.includes('peawx.sec.tjcu.edu.cn'))));

const listeners = [];
let request;
const pageWindow = {
  wx: { getLocation() {} },
  addEventListener(type, listener) {
    if (type === 'message') listeners.push(listener);
  },
  postMessage(message) {
    request = message;
  }
};
const context = {
  window: pageWindow,
  navigator: { userAgent: 'Chrome on macOS' },
  location: { origin: 'http://peawx.sec.tjcu.edu.cn' },
  document: { documentElement: { setAttribute() {} } },
  crypto: { randomUUID: () => 'test-request' },
  setTimeout: () => 1,
  clearTimeout() {},
  setInterval() { throw new Error('wx bridge should install immediately'); },
  clearInterval() {},
  console
};
vm.runInNewContext(fs.readFileSync(`${root}/page-bridge.js`, 'utf8'), context);

let success;
let complete;
pageWindow.wx.getLocation({
  type: 'gcj02',
  success: (result) => { success = result; },
  complete: (result) => { complete = result; }
});
assert.strictEqual(request.type, 'GET_LOCATION');

listeners[0]({
  source: pageWindow,
  origin: context.location.origin,
  data: {
    source: 'daka-mac-location-extension',
    id: request.id,
    ok: true,
    location: { longitude: 117.2, latitude: 39.1, accuracy: 20, speed: null }
  }
});
assert(success.longitude > 117.2 && success.latitude > 39.1);
assert.strictEqual(complete, success);
console.log('Extension self-check: PASS');

