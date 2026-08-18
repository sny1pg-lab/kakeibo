/**
 * 家計簿アプリ 読み込みの控え（Service Worker）
 *
 * GitHub Pages は cache-control: max-age=600 を返すため、10分あくと
 * 開くたびにアプリ一式を取り直していた。ここで端末に控えを持たせて、
 * 2回目以降は通信を待たずに画面が出るようにする。
 *
 * 古い画面に固定されないことを最優先にしている。
 *  - index.html は必ず通信を先に試す。取れなければ控えを出す
 *  - 中身のハッシュがURLに入っているファイルだけを、控え優先で返す。
 *    中身が変われば別のURLになるので、古いものを返してしまうことがない
 *  - 見覚えのない宛先には一切手を出さない。Apps Script への読み書きは
 *    ここを素通りする
 */
'use strict';

var SHELL = 'kakeibo-shell-v1';   // index.html の控え
var ASSET = 'kakeibo-asset-v1';   // ハッシュ付きのファイルとフォント

// index.html を取りに行くときの待ち時間。これを過ぎたら控えを出す
var NAV_TIMEOUT_MS = 3500;

self.addEventListener('install', function () {
  // 先に控えを集めることはしない。index.html のハッシュ付きURLは
  // ビルドのたびに変わるので、実際に読まれたものを覚えるほうが確実。
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (n) {
          if (n !== SHELL && n !== ASSET) return caches.delete(n);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// アプリ側から「控えを捨てて入れ直したい」と言われたとき
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'kakeibo-reset') return;
  event.waitUntil(
    caches.keys()
      .then(function (names) { return Promise.all(names.map(function (n) { return caches.delete(n); })); })
      .then(function () { return self.registration.unregister(); })
  );
});

function isHashedAsset(url) {
  return url.origin === self.location.origin
    && url.searchParams.has('v')
    && /\.(js|css)$/.test(url.pathname);
}

function isOwnStatic(url) {
  return url.origin === self.location.origin
    && /\.(png|webmanifest)$/.test(url.pathname);
}

// フォント本体。URLに版が入っていて中身は変わらない
function isFontFile(url) {
  return url.hostname === 'fonts.gstatic.com';
}

// フォントの指定表。中身が差し替わることがあるので控えたまま裏で更新する
function isFontCss(url) {
  return url.hostname === 'fonts.googleapis.com';
}

/**
 * 控えへの書き込みが終わるまで、このワーカーを終了させない。
 * 応答を返したあとに残る作業を放っておくと、途中で止められることがある。
 */
function keepAlive(event, promise) {
  try { event.waitUntil(promise); } catch (e) { /* 呼べない場面では何もしない */ }
}

// 別ドメインのものは中身を読めない形（opaque）で返ってくる。
// それでも控えとしては使えるので、失敗扱いにしない。
function isStorable(res) {
  return !!res && (res.ok || res.type === 'opaque');
}

/** 通信を先に試し、遅ければ控えを出す。index.html 用。 */
function navigationStrategy(event, request) {
  return caches.open(SHELL).then(function (cache) {
    var fromNetwork = fetch(request).then(function (res) {
      if (res && res.ok) keepAlive(event, cache.put(request, res.clone()));
      return res;
    });

    return cache.match(request).then(function (cached) {
      if (!cached) return fromNetwork;

      // 控えがあるなら、通信が遅いときだけそれを出す。
      // 通信が成功すれば次回の控えは新しくなる。
      return new Promise(function (resolve) {
        var settled = false;
        var timer = setTimeout(function () {
          if (!settled) { settled = true; resolve(cached); }
        }, NAV_TIMEOUT_MS);

        fromNetwork.then(function (res) {
          clearTimeout(timer);
          if (!settled) { settled = true; resolve(res); }
        }).catch(function () {
          clearTimeout(timer);
          if (!settled) { settled = true; resolve(cached); }
        });
      });
    });
  });
}

/**
 * 控えがあればそれを返す。URLに中身のハッシュが入っているので、
 * 中身が変われば別のURLになり、古いものを返す心配がない。
 */
function cacheFirst(event, request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (res) {
        if (isStorable(res)) {
          keepAlive(event, cache.put(request, res.clone()).then(function () {
            return dropOlderVersions(cache, request.url);
          }));
        }
        return res;
      });
    });
  });
}

/**
 * 同じファイルの古いハッシュ違いを控えから捨てる。
 * app.js?v=旧 が溜まり続けないようにするためで、
 * いま読み込んだURL自身は残す。
 */
function dropOlderVersions(cache, currentUrl) {
  var current = new URL(currentUrl);
  if (current.origin !== self.location.origin || !current.searchParams.has('v')) return Promise.resolve();
  return cache.keys().then(function (keys) {
    return Promise.all(keys.map(function (req) {
      var u;
      try { u = new URL(req.url); } catch (e) { return null; }
      if (u.origin !== current.origin) return null;
      if (u.pathname !== current.pathname) return null;
      if (u.href === current.href) return null;
      return cache.delete(req);
    }));
  });
}

/** 控えをすぐ返し、裏で新しいものに入れ替える。アイコンなど用。 */
function staleWhileRevalidate(event, request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var fresh = fetch(request).then(function (res) {
        if (isStorable(res)) keepAlive(event, cache.put(request, res.clone()));
        return res;
      });
      if (cached) {
        // 控えをすぐ返し、取り直しは裏で続けさせる
        keepAlive(event, fresh.catch(function () { /* 取れなければ控えのまま */ }));
        return cached;
      }
      return fresh;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(event, request));
    return;
  }

  if (isHashedAsset(url) || isFontFile(url)) {
    event.respondWith(cacheFirst(event, request, ASSET));
    return;
  }

  if (isOwnStatic(url) || isFontCss(url)) {
    event.respondWith(staleWhileRevalidate(event, request, ASSET));
    return;
  }

  // それ以外（Apps Script への読み書きを含む）は素通しする
});
