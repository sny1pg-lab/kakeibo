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

  // 家計簿ごとに接続先のスプレッドシートが違う。一覧と、いま選んでいるものを端末に持つ
  var BOOKS_KEY = 'kakeibo.books';
  var CURRENT_KEY = 'kakeibo.book';
  // 控え・送信キュー・扱える列は家計簿ごとに分ける。混ざると別の家計簿へ書き込んでしまう
  var QUEUE_KEY = 'kakeibo.queue';
  var SNAPSHOT_KEY = 'kakeibo.snapshot';
  var COLUMNS_KEY = 'kakeibo.columns';
  var OLD_CONFIG_KEY = 'kakeibo.apiUrl';   // 家計簿が1つだったころの接続先
  // 引き継ぎで作る最初の家計簿の名前。app は公開リポジトリへ出るので、
  // 人の名前は書かずに当たり障りのないものにしてある。画面から変えられる
  var FIRST_BOOK_NAME = '個人';
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

  /* ---- 家計簿 ---- */

  /** 家計簿ごとの控え置き場。id を付けて混ざらないようにする。 */
  function bookKey(base, id) { return base + '.' + id; }

  function readBooks() {
    try {
      var saved = JSON.parse(storeGet(BOOKS_KEY) || 'null');
      if (Array.isArray(saved)) return saved.filter(function (b) { return b && b.id && b.url; });
    } catch (e) { /* 壊れていたら作り直す */ }
    return null;
  }

  /**
   * 家計簿が1つだったころの設定を引き継ぐ。
   * 接続先も控えも送信キューも、そのまま最初の家計簿のものとして名前を付け替える。
   * 更新したら設定が消えていた、ということが起きないようにするため。
   */
  function migrate() {
    var url = storeGet(OLD_CONFIG_KEY) || (global.KAKEIBO_API_URL || '');
    if (!url) return [];
    var id = 'b1';
    ['queue', 'snapshot', 'columns'].forEach(function (n) {
      var base = 'kakeibo.' + n;
      var v = storeGet(base);
      if (v !== null && v !== undefined) { storeSet(bookKey(base, id), v); storeDel(base); }
    });
    storeDel(OLD_CONFIG_KEY);
    var books = [{ id: id, name: FIRST_BOOK_NAME, url: url }];
    storeSet(BOOKS_KEY, JSON.stringify(books));
    storeSet(CURRENT_KEY, id);
    return books;
  }

  var books = readBooks() || migrate();
  var bookId = (function () {
    var id = storeGet(CURRENT_KEY);
    if (id && books.some(function (b) { return b.id === id; })) return id;
    return books.length ? books[0].id : '';
  })();

  function currentBook() {
    for (var i = 0; i < books.length; i++) if (books[i].id === bookId) return books[i];
    return null;
  }
  function persistBooks() {
    storeSet(BOOKS_KEY, JSON.stringify(books));
    storeSet(CURRENT_KEY, bookId);
  }

  /* ---- 状態 ---- */
  var apiUrl = currentBook() ? currentBook().url : '';
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
   * 貼り替えの具合は家計簿ごとに違うので、これも分けて持つ。
   */
  var serverColumns = null;
  function loadColumns() {
    try { serverColumns = JSON.parse(storeGet(bookKey(COLUMNS_KEY, bookId)) || 'null'); }
    catch (e) { serverColumns = null; }
  }
  loadColumns();

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
    if (bookId) storeSet(bookKey(QUEUE_KEY, bookId), JSON.stringify(queue));
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
    /* ---- 家計簿 ---- */

    books: function () { return books.map(function (b) { return { id: b.id, name: b.name, url: b.url }; }); },

    currentBookId: function () { return bookId; },

    currentBookName: function () { var b = currentBook(); return b ? b.name : ''; },

    /** 家計簿を足す。1つめを足した時点でそれが選ばれる。 */
    addBook: function (name, url) {
      var b = { id: api.newId('b'), name: (name || '').trim(), url: (url || '').trim() };
      if (!b.name || !b.url) throw new Error('名前と接続先の両方が要ります。');
      books.push(b);
      if (!bookId) { bookId = b.id; apiUrl = b.url; loadColumns(); }
      persistBooks();
      if (apiUrl) flush();
      return b;
    },

    renameBook: function (id, name) {
      var b = null;
      books.forEach(function (x) { if (x.id === id) b = x; });
      if (!b) return;
      b.name = (name || '').trim() || b.name;
      persistBooks();
    },

    /** 接続先を差し替える。控えは中身が合わなくなるので捨てる。 */
    setBookUrl: function (id, url) {
      var next = (url || '').trim();
      if (!next) return;
      books.forEach(function (b) {
        if (b.id !== id || b.url === next) return;
        b.url = next;
        storeDel(bookKey(SNAPSHOT_KEY, id));
        storeDel(bookKey(COLUMNS_KEY, id));
        if (id === bookId) { apiUrl = next; serverColumns = null; }
      });
      persistBooks();
    },

    /**
     * 端末の登録から外す。スプレッドシートには触れないので、
     * 接続先を入れ直せばまた見られる。
     */
    removeBook: function (id) {
      books = books.filter(function (b) { return b.id !== id; });
      [QUEUE_KEY, SNAPSHOT_KEY, COLUMNS_KEY].forEach(function (k) { storeDel(bookKey(k, id)); });
      if (id === bookId) {
        bookId = books.length ? books[0].id : '';
        queue = [];
        apiUrl = currentBook() ? currentBook().url : '';
        loadColumns();
        if (bookId) api.recoverQueue();
      }
      persistBooks();
      notify();
    },

    /**
     * 別の家計簿へ切り替える。
     *
     * 未送信が残ったまま切り替えると、どの家計簿へ送るはずだったのか分からなくなる。
     * 送り終わるのを待ってから切り替え、送れなければ切り替えずに理由を返す。
     */
    switchTo: function (id) {
      var target = null;
      books.forEach(function (b) { if (b.id === id) target = b; });
      if (!target) return Promise.reject(new Error('その家計簿は登録されていません。'));
      if (id === bookId) return Promise.resolve();

      function activate() {
        persistQueue();
        bookId = id;
        apiUrl = target.url;
        queue = [];
        loadColumns();
        persistBooks();
        api.recoverQueue();
        notify();
      }

      if (!queue.length) { activate(); return Promise.resolve(); }

      api.retry();
      return new Promise(function (resolve, reject) {
        var stop = null, done = false;
        function finish(fn, arg) {
          if (done) return;
          done = true;
          setTimeout(function () { if (stop) stop(); }, 0);
          fn(arg);
        }
        stop = api.subscribe(function (st) {
          if (st.pending === 0) { activate(); finish(resolve); }
          else if (st.error && !st.sending) { finish(reject, new Error(st.error)); }
        });
      });
    },

    getUrl: function () { return apiUrl; },

    /** 起動時の全件読み込み。 */
    loadAll: function () {
      return request({ method: 'GET' }).then(function (json) {
        var d = json.data || {};
        serverColumns = json.columns || null;
        if (serverColumns) storeSet(bookKey(COLUMNS_KEY, bookId), JSON.stringify(serverColumns));
        else storeDel(bookKey(COLUMNS_KEY, bookId));
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
            var rec = {
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
            // 後から足した列。Apps Script が扱えるときだけ持たせる
            if (api.supports('entries', 'formula')) rec.formula = e.formula || '';
            return rec;
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
            if (api.supports('settlements', 'formula')) rec.formula = s.formula || '';
            return rec;
          }),
          // 年ごとの予算。シートを増やす前は空で返る
          budgets: (d.budgets || []).map(function (b) {
            return {
              id: b.id,
              year: Number(b.year) || 0,
              target: b.target || '',
              monthly: Number(b.monthly) || 0,
              annual: Number(b.annual) || 0,
              method: b.method || '',
              memo: b.memo || ''
            };
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

    /**
     * そのテーブルをサーバが扱えるか。
     * シートを1枚増やしたときに、貼り替え前は画面ごと出さないために使う。
     */
    supportsTable: function (table) {
      return !!(serverColumns && serverColumns[table]);
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
      if (!bookId) return 0;
      var raw = storeGet(bookKey(QUEUE_KEY, bookId));
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
      if (!bookId) return null;
      var raw = storeGet(bookKey(SNAPSHOT_KEY, bookId));
      if (!raw) return null;
      try {
        var saved = JSON.parse(raw);
        if (!saved || !saved.data) return null;
        return saved;   // { savedAt, data }
      } catch (e) {
        storeDel(bookKey(SNAPSHOT_KEY, bookId));
        return null;
      }
    },

    writeSnapshot: function (data) {
      if (!bookId) return;
      storeSet(bookKey(SNAPSHOT_KEY, bookId),
        JSON.stringify({ savedAt: new Date().toISOString(), data: data }));
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
