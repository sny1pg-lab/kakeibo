/**
 * 家計簿アプリ データ層
 *
 * 起動時に1回だけ全件を読み込み、以降の変更は送信キューに積んで
 * 画面をブロックせずに順番に送る。失敗したら自動で再送する。
 *
 * 保存領域（localStorage）が使えない環境が移行のきっかけなので、
 * キューはメモリ上を正とし、localStorageが使える場合だけ控えを置く。
 */
(function (global) {
  'use strict';

  var CONFIG_KEY = 'kakeibo.apiUrl';
  var QUEUE_KEY = 'kakeibo.queue';
  var SNAPSHOT_KEY = 'kakeibo.snapshot';
  var COLUMNS_KEY = 'kakeibo.columns';
  var MAX_BACKOFF_MS = 30000;
  var REQUEST_TIMEOUT_MS = 30000;

  /* ---- localStorage は使えたら使う程度に留める ---- */
  var store = (function () {
    try {
      var k = '__kb_probe__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return global.localStorage;
    } catch (e) {
      return null;
    }
  })();

  function storeGet(key) {
    try { return store && store.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, value) {
    try { if (store) store.setItem(key, value); } catch (e) { /* 使えなくても動作は続ける */ }
  }
  function storeDel(key) {
    try { if (store) store.removeItem(key); } catch (e) { /* 同上 */ }
  }

  /* ---- 状態 ---- */
  var apiUrl = storeGet(CONFIG_KEY) || (global.KAKEIBO_API_URL || '');
  var queue = [];
  var inFlight = [];   // いま送信中の変更。キューからはまだ外していない
  var sending = false;
  var backoff = 1000;
  var listeners = [];
  var lastError = '';

  /**
   * サーバ側が扱える列。Apps Script が返してくる。
   * 古いまま貼り替えていない場合は返ってこないので null のままになる。
   * アプリはこれを見て、新しい項目を出すかどうかを決める。
   * 起動直後から判断できるよう、前回の値を控えておく。
   */
  var serverColumns = (function () {
    try { return JSON.parse(storeGet(COLUMNS_KEY) || 'null'); } catch (e) { return null; }
  })();

  function notify() {
    var state = {
      pending: queue.length,
      sending: sending,
      error: lastError
    };
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  function persistQueue() {
    storeSet(QUEUE_KEY, JSON.stringify(queue));
  }

  /* ---- 通信 ---- */

  function request(options) {
    if (!apiUrl) return Promise.reject(new Error('APIのURLが設定されていません。'));

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);

    var init = { method: options.method, redirect: 'follow' };
    if (controller) init.signal = controller.signal;
    if (options.body !== undefined) {
      // CORSのプリフライトを避けるため text/plain で送り、サーバ側でJSONとして読む
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body = JSON.stringify(options.body);
    }

    return fetch(apiUrl, init)
      .then(function (res) {
        if (!res.ok) throw new Error('通信に失敗しました（HTTP ' + res.status + '）');
        return res.text();
      })
      .then(function (text) {
        var json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error('応答を読み取れませんでした。URLとデプロイ設定を確認してください。');
        }
        if (!json.ok) throw new Error(json.error || 'サーバ側でエラーが発生しました。');
        return json;
      })
      .finally(function () { clearTimeout(timer); });
  }

  /* ---- 送信キュー ---- */

  /**
   * 同じテーブルの同じidに対する変更は最後のものだけ残す。
   * 連続編集で無駄な往復が増えるのを防ぐ。
   *
   * ただし送信中のものは畳まない。送信中の変更をキューから消すと、
   * 応答が返ったときにどれを取り除けばよいか分からなくなる。
   * 送信中のぶんが片付いてから、新しいほうが改めて送られる。
   */
  function enqueue(change) {
    var key = change.table + ' ' + change.record.id;
    for (var i = queue.length - 1; i >= 0; i--) {
      var q = queue[i];
      if (q.table + ' ' + q.record.id === key && inFlight.indexOf(q) < 0) {
        queue.splice(i, 1);
      }
    }
    queue.push(change);
    persistQueue();
    notify();
    flush();
  }

  function flush() {
    if (sending || !queue.length || !apiUrl) return;
    sending = true;
    lastError = '';
    notify();

    inFlight = queue.slice();
    var batch = inFlight;
    var body = batch.length === 1
      ? batch[0]
      : { action: 'bulk', changes: batch };

    request({ method: 'POST', body: body })
      .then(function () {
        // 位置ではなく現物を指してキューから外す。
        // 送信中に別の変更が積まれていても取り違えない。
        batch.forEach(function (sent) {
          var i = queue.indexOf(sent);
          if (i >= 0) queue.splice(i, 1);
        });
        inFlight = [];
        persistQueue();
        backoff = 1000;
        sending = false;
        notify();
        if (queue.length) flush();
      })
      .catch(function (err) {
        inFlight = [];
        lastError = err.message || String(err);
        sending = false;
        notify();
        var wait = backoff;
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        setTimeout(flush, wait);
      });
  }

  /* ---- 公開API ---- */

  var api = {
    setUrl: function (url) {
      var next = (url || '').trim();
      // 別のスプレッドシートに向け直したら、前の控えは中身が合わない
      if (next !== apiUrl) storeDel(SNAPSHOT_KEY);
      apiUrl = next;
      storeSet(CONFIG_KEY, apiUrl);
      if (apiUrl) flush();
    },

    getUrl: function () { return apiUrl; },

    /** 起動時の全件読み込み。 */
    loadAll: function () {
      return request({ method: 'GET' }).then(function (json) {
        var d = json.data || {};
        serverColumns = json.columns || null;
        if (serverColumns) storeSet(COLUMNS_KEY, JSON.stringify(serverColumns));
        else storeDel(COLUMNS_KEY);
        return {
          categories: (d.categories || []).map(function (c) {
            return {
              id: c.id,
              name: c.name,
              group: c.group,
              monthlyBudget: Number(c.monthlyBudget) || 0,
              annualBudget: Number(c.annualBudget) || 0,
              tags: String(c.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
              note: c.note || ''
            };
          }),
          entries: (d.entries || []).map(function (e) {
            return {
              id: e.id,
              categoryId: e.categoryId,
              date: e.date,
              amount: Number(e.amount) || 0,
              type: e.type === 'income' ? 'income' : 'expense',
              tag: e.tag || '',
              memo: e.memo || '',
              method: e.method || '',
              pending: e.pending === true || e.pending === 'TRUE'
            };
          }),
          transfers: (d.transfers || []).map(function (t) {
            return {
              id: t.id,
              date: t.date,
              amount: Number(t.amount) || 0,
              from: t.from || '',
              to: t.to || '',
              memo: t.memo || '',
              pending: t.pending === true || t.pending === 'TRUE'
            };
          }),
          settlements: (d.settlements || []).map(function (s) {
            var rec = {
              id: s.id,
              date: s.date,
              memo: s.memo || '',
              party: s.party || '',
              amount: Number(s.amount) || 0,
              settled: s.settled === true || s.settled === 'TRUE',
              pending: s.pending === true || s.pending === 'TRUE'
            };
            // 後から足した列。Apps Script が扱えるときだけ持たせる。
            // 常に持たせると、貼り替えていない環境でも保存のたびに送ってしまう
            if (api.supports('settlements', 'tag')) rec.tag = s.tag || '';
            if (api.supports('settlements', 'method')) rec.method = s.method || '';
            return rec;
          })
        };
      });
    },

    /**
     * その列をサーバが扱えるか。
     * Apps Script を貼り替えていないうちは false を返すので、
     * 画面はその項目を出さない。入れたのに保存されない事態を防ぐ。
     */
    supports: function (table, column) {
      if (!serverColumns || !serverColumns[table]) return false;
      return serverColumns[table].indexOf(column) >= 0;
    },

    /** 1件の追加・更新をキューに積む。すぐ返る。 */
    save: function (table, record) {
      var payload = Object.assign({}, record);
      if (table === 'categories' && Array.isArray(payload.tags)) {
        payload.tags = payload.tags.join(',');
      }
      enqueue({ action: 'upsert', table: table, record: payload });
    },

    /** 1件の削除をキューに積む。すぐ返る。 */
    remove: function (table, id) {
      enqueue({ action: 'delete', table: table, record: { id: id } });
    },

    /** 送信状態の購読。解除用の関数を返す。 */
    subscribe: function (fn) {
      listeners.push(fn);
      fn({ pending: queue.length, sending: sending, error: lastError });
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },

    /** 手動で再送する。 */
    retry: function () { backoff = 1000; flush(); },

    pendingCount: function () { return queue.length; },

    /** 未送信の控え（localStorageが使えた場合のみ中身がある）。 */
    recoverQueue: function () {
      var raw = storeGet(QUEUE_KEY);
      if (!raw) return 0;
      try {
        var saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) {
          queue = saved.concat(queue);
          notify();
          flush();
          return saved.length;
        }
      } catch (e) { /* 壊れていたら捨てる */ }
      return 0;
    },

    /**
     * 直前に見えていた中身の控え。
     *
     * Apps Script は起動が遅く、開いてから数秒なにも出ない時間ができる。
     * 控えを先に出しておき、最新が届いたら差し替える。
     * 保存領域が使えない環境では null が返るだけで、これまでどおり動く。
     */
    readSnapshot: function () {
      var raw = storeGet(SNAPSHOT_KEY);
      if (!raw) return null;
      try {
        var saved = JSON.parse(raw);
        if (!saved || !saved.data) return null;
        return saved;   // { savedAt, data }
      } catch (e) {
        storeDel(SNAPSHOT_KEY);
        return null;
      }
    },

    writeSnapshot: function (data) {
      storeSet(SNAPSHOT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: data }));
    },

    newId: function (prefix) {
      return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
  };

  // 未送信のまま閉じようとしたら引き止める
  global.addEventListener('beforeunload', function (e) {
    if (queue.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // 回線が戻ったら再送する
  global.addEventListener('online', function () { api.retry(); });

  global.KakeiboAPI = api;
})(window);
