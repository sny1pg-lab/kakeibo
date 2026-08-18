/**
 * 家計簿アプリ
 *
 * 画面と計算は「現行アプリ_参考実装.jsx」を踏襲し、
 * データの保存先だけをブラウザの保存領域からGoogleスプレッドシートに差し替えている。
 *
 * 明細は参考実装ではカテゴリの中に入れ子で持っていたが、
 * スプレッドシートは1明細1行なので、categoryIdを持つ平らな配列にしている。
 */
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } = React;

/* ------------------------------------------------------------------ */
/* 定義                                                                */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const GROUPS = ["固定費", "自由費", "予定費"];
const GROUP_ORDER = ["自由費", "予定費", "固定費"];

// 立替先と支払方法は、カテゴリと同じ categories シートに置いている。
// グループ名で見分けるだけなので、Apps Script 側は何も変えなくてよい。
// 予算のカテゴリと混ざらないよう、集計や一覧では必ず取り除く。
const PARTY_GROUP = "立替先";
const METHOD_GROUP = "支払方法";
const MASTER_GROUPS = [PARTY_GROUP, METHOD_GROUP];

// まだ一度も編集していないときに見せる中身。
// 画面から変更した時点で、この一覧がそのまま実体としてシートに書き出される。
const DEFAULT_PARTIES = ["生活費", "おいぬ", "娯楽費", "家具家電", "その他", "KITI", "ウェルボン"];
const DEFAULT_METHODS = ["楽天カード", "楽天ペイ", "楽天キャッシュ", "楽天銀行", "PayPayカード", "PayPay残高", "PASMO", "スタバカード", "NLカード", "現金", "その他"];

function isMaster(c) { return MASTER_GROUPS.indexOf(c.group) >= 0; }
function defaultsOf(group) { return group === PARTY_GROUP ? DEFAULT_PARTIES : DEFAULT_METHODS; }

/**
 * 一覧から消した名前でも、その記録を開いたときは選べるようにしておく。
 * 選択肢に無いと、編集しただけで別のものに書き換わってしまう。
 */
function withCurrent(list, value) {
  return value && list.indexOf(value) < 0 ? list.concat([value]) : list;
}
const PALETTE = ["#9B59D0", "#E08A2E", "#3FA9A0", "#D8607A", "#5B8DD6", "#7FA83C", "#C7913A", "#6C7A99", "#B0553F", "#4FA36B"];

const NAME_OPTIONS = {
  固定費: ["あんしん生命", "NISA", "iDeCo"],
  自由費: ["自由費"],
  予定費: ["交際費", "コンタクト", "美容院", "PG", "医療費"],
};
const CUSTOM_NAME = "__custom__";
const DEFAULT_TAGS = {
  自由費: ["交通費", "服飾雑貨", "美容コスメ", "外食", "その他", "収入"],
};

/* ------------------------------------------------------------------ */
/* アイコン（lucideの図形をそのままSVGにしたもの）                        */
/* ------------------------------------------------------------------ */

function Svg({ size = 24, children, className, style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style} aria-hidden="true">
      {children}
    </svg>
  );
}
const Plus = (p) => <Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>;
const X = (p) => <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>;
const Check = (p) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
const ChevronRight = (p) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>;
const ChevronLeft = (p) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>;
const Trash2 = (p) => <Svg {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></Svg>;
const Pencil = (p) => <Svg {...p}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></Svg>;
const Loader2 = (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Svg>;
const Undo2 = (p) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></Svg>;
const PencilLine = (p) => <Svg {...p}><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" /><path d="m15 5 3 3" /></Svg>;
const ListOrdered = (p) => <Svg {...p}><path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Svg>;
const PieChart = (p) => <Svg {...p}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></Svg>;
const Wallet = (p) => <Svg {...p}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></Svg>;
const Settings = (p) => <Svg {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Svg>;
const CalendarPlus = (p) => <Svg {...p}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M10 16h4" /><path d="M12 14v4" /></Svg>;
const ArrowLeftRight = (p) => <Svg {...p}><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></Svg>;
const CircleAlert = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></Svg>;

/** 明細の並び順を入れ替えるボタン。 */
function SortButton({ asc, onToggle }) {
  return (
    <button type="button" className="kb-sortbtn" onClick={onToggle}>
      <Svg size={13}>
        {asc ? <path d="m3 8 4-4 4 4" /> : <path d="m3 4 4 4 4-4" />}
        <path d="M7 4v10" />
        <path d="M12 18h9" /><path d="M12 13h6" /><path d="M12 8h3" />
      </Svg>
      {asc ? "古い順" : "新しい順"}
    </button>
  );
}

/** 「確定」のような入り切りの行。 */
function CheckRow({ checked, onChange, children }) {
  return (
    <button type="button" className={`kb-check ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="kb-check-box">{checked && <Check size={13} />}</span>
      <span>{children}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 小さな道具                                                          */
/* ------------------------------------------------------------------ */

/** 控えを取った時刻。今日なら時刻だけ、それ以外は日付も付ける。 */
function timeLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
  return sameDay ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function yen(n) {
  return `¥${Math.round(Number(n) || 0).toLocaleString("ja-JP")}`;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function yearOf(dateStr) {
  return Number(String(dateStr || "").slice(0, 4)) || 0;
}
function monthIdxOf(dateStr) {
  const m = Number(String(dateStr || "").slice(5, 7));
  return m >= 1 && m <= 12 ? m - 1 : 0;
}
function dayOf(dateStr) {
  return Number(String(dateStr || "").slice(8, 10)) || 0;
}
function weekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
}
function isIncome(e) {
  return e.type === "income";
}
function signedAmount(e) {
  const a = Math.abs(Number(e.amount) || 0);
  return isIncome(e) ? -a : a;
}
function annualBudgetOf(c) {
  return c.group === "予定費" ? Number(c.annualBudget) || 0 : (Number(c.monthlyBudget) || 0) * 12;
}
function monthBudgetOf(c) {
  return c.group === "予定費" ? (Number(c.annualBudget) || 0) / 12 : Number(c.monthlyBudget) || 0;
}
function colorOf(idx) {
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
}

/**
 * 金額の色。Excelで金額をオレンジにしていたのと同じで、
 * 未確定はオレンジ。確定した収入は緑。
 */
function amountStyle(x) {
  if (x.pending) return { color: "var(--pending)" };
  if (isIncome(x)) return { color: "var(--accent)" };
  return undefined;
}

/* ------------------------------------------------------------------ */
/* URL未設定のときの画面                                                */
/* ------------------------------------------------------------------ */

/**
 * 名前だけの一覧を編集する部品。立替先と支払方法に使う。
 * 予算のような付随する値は持たず、追加と改名と削除だけができる。
 */
function MasterList({ title, hint, names, useCount, onAdd, onRename, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);     // 変更前の名前
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState("");

  function reset() {
    setAdding(false); setEditing(null); setConfirming(null); setDraft(""); setError("");
  }
  function submitAdd() {
    const msg = onAdd(draft);
    if (msg) { setError(msg); return; }
    reset();
  }
  function submitRename() {
    const msg = onRename(editing, draft);
    if (msg) { setError(msg); return; }
    reset();
  }
  function submitDelete(name) {
    const msg = onDelete(name);
    setConfirming(null);
    if (msg) { setError(msg); return; }
    reset();
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div className="kb-section-label">{title}</div>
      <div className="kb-card" style={{ background: "#FAFAFB" }}>
        {names.map((n) => {
          const used = useCount(n);
          return (
            <div className="kb-row" key={n} style={{ cursor: "default" }}>
              {editing === n ? (
                <div className="kb-rowmain">
                  <input
                    className="kb-input"
                    value={draft}
                    autoFocus
                    onChange={(ev) => setDraft(ev.target.value)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); submitRename(); } }}
                  />
                </div>
              ) : (
                <div className="kb-rowmain">
                  <div className="kb-rowtitle">{n}</div>
                  <div className="kb-rowsub">{used > 0 ? `${used}件の記録で使用中` : "まだ使われていません"}</div>
                </div>
              )}
              <div className="kb-rowright">
                {editing === n ? (
                  <>
                    <button className="kb-iconbtn" onClick={submitRename} aria-label="名前を保存"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={reset} aria-label="取消"><X size={14} /></button>
                  </>
                ) : confirming === n ? (
                  <>
                    <button className="kb-iconbtn" style={{ color: "var(--red)" }} onClick={() => submitDelete(n)} aria-label="削除を確定"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={() => setConfirming(null)} aria-label="取消"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button className="kb-iconbtn" onClick={() => { reset(); setEditing(n); setDraft(n); }} aria-label={`${n}の名前を変える`}><Pencil size={14} /></button>
                    <button className="kb-iconbtn" onClick={() => { reset(); setConfirming(n); }} aria-label={`${n}を削除`}><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hint && <div className="kb-note">{hint}</div>}
      {error && <div className="kb-err">{error}</div>}
      {adding ? (
        <div className="kb-inline" style={{ marginTop: 9 }}>
          <input
            className="kb-input"
            value={draft}
            autoFocus
            placeholder={`${title}を入力`}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); submitAdd(); } }}
          />
          <button className="kb-btn ghost" style={{ width: "auto", padding: "0 16px" }} onClick={submitAdd}>追加</button>
        </div>
      ) : (
        <button className="kb-btn ghost" style={{ marginTop: 9 }} onClick={() => { reset(); setAdding(true); }}>
          {title}を追加
        </button>
      )}
    </div>
  );
}

function SetupScreen({ onSave }) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    const v = url.trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) {
      setErr("Apps Scriptのウェブアプリの URL（/exec で終わるもの）を貼り付けてください。");
      return;
    }
    onSave(v);
  }
  return (
    <div className="kb-setup">
      <h1>接続先の設定</h1>
      <p>データの保存先になるApps ScriptのウェブアプリのURLを貼り付けてください。この端末に記憶され、次回からは聞きません。</p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..../exec" spellCheck={false} />
      {err && <div className="kb-err">{err}</div>}
      <button onClick={submit}>保存して開く</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 本体                                                                */
/* ------------------------------------------------------------------ */

function KakeiboApp() {
  const now = new Date();
  const realYear = now.getFullYear();
  const realMonthIdx = now.getMonth();
  const realDay = now.getDate();

  const [needsSetup, setNeedsSetup] = useState(!KakeiboAPI.getUrl());
  const [tab, setTab] = useState("record");
  const [year, setYear] = useState(realYear);

  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // 控えを出しているときの、その控えを取った時刻。最新が届いたら null に戻す
  const [shownAt, setShownAt] = useState(null);
  const [sync, setSync] = useState({ pending: 0, sending: false, error: "" });
  const [toast, setToast] = useState("");

  const [anaScope, setAnaScope] = useState("year");
  const [anaMonth, setAnaMonth] = useState(realMonthIdx);
  const [histMonth, setHistMonth] = useState(null);
  const [histCat, setHistCat] = useState(null);   // null=すべて / カテゴリid / "transfer"
  const [sortAsc, setSortAsc] = useState(false); // false=新しい順 / true=古い順
  const [tkMonth, setTkMonth] = useState(null);  // 立替タブの月絞り込み。null=年間
  const [detail, setDetail] = useState(null);
  const [dMonth, setDMonth] = useState(null);
  const [dTag, setDTag] = useState(null);
  // 内訳から編集シートへ移ったとき、戻り先として内訳の状態を覚えておく
  const [detailBack, setDetailBack] = useState(null);
  const detailSheetRef = useRef(null);
  const detailScrollRef = useRef(null);

  const [manageOpen, setManageOpen] = useState(false);

  const [entryTarget, setEntryTarget] = useState(null);
  const [enDate, setEnDate] = useState("");
  const [enTag, setEnTag] = useState("");
  const [enMemo, setEnMemo] = useState("");
  const [enMethod, setEnMethod] = useState(DEFAULT_METHODS[0]);
  const [enAmount, setEnAmount] = useState("");
  const [enType, setEnType] = useState("expense");
  const [enPending, setEnPending] = useState(true);
  const [enError, setEnError] = useState("");

  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catMode, setCatMode] = useState("add");
  const [catEditId, setCatEditId] = useState(null);
  const [fName, setFName] = useState("");
  const [fNameChoice, setFNameChoice] = useState("");
  const [fGroup, setFGroup] = useState("自由費");
  const [fAmount, setFAmount] = useState("");
  const [fTags, setFTags] = useState([]);
  const [fTagInput, setFTagInput] = useState("");
  const [fNote, setFNote] = useState("");
  const [fError, setFError] = useState("");
  const [catDeleteId, setCatDeleteId] = useState(null);

  const [tkFormOpen, setTkFormOpen] = useState(false);
  const [tkEditId, setTkEditId] = useState(null);
  const [tkDate, setTkDate] = useState("");
  const [tkMemo, setTkMemo] = useState("");
  const [tkParty, setTkParty] = useState(DEFAULT_PARTIES[0]);
  const [tkAmount, setTkAmount] = useState("");
  const [tkPending, setTkPending] = useState(true);
  const [tkError, setTkError] = useState("");
  const [tkConfirmDel, setTkConfirmDel] = useState(false);

  const [trFormOpen, setTrFormOpen] = useState(false);
  const [trEditId, setTrEditId] = useState(null);
  const [trDate, setTrDate] = useState("");
  const [trFrom, setTrFrom] = useState(DEFAULT_METHODS[0]);
  const [trTo, setTrTo] = useState(DEFAULT_METHODS[6]);
  const [trAmount, setTrAmount] = useState("");
  const [trMemo, setTrMemo] = useState("");
  const [trPending, setTrPending] = useState(true);
  const [trError, setTrError] = useState("");
  const [trConfirmDel, setTrConfirmDel] = useState(false);

  const toastTimerRef = useRef(null);
  const amountRef = useRef(null);

  function flash(m) {
    setToast(m);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);
  }

  /* ---- 起動時の読み込み ---- */

  const applyData = useCallback((d) => {
    setCategories(d.categories || []);
    setEntries(d.entries || []);
    setTransfers(d.transfers || []);
    setSettlements(d.settlements || []);
  }, []);

  /**
   * 全件を読み直す。
   * quiet を立てると読み込み中の画面に切り替えず、いま出ている内容を残したまま裏で取りに行く。
   * 前回の控えを先に出しているときに使う。
   */
  const load = useCallback((opts) => {
    const quiet = !!(opts && opts.quiet);
    if (!quiet) setLoading(true);
    setRefreshing(true);
    setLoadError("");
    return KakeiboAPI.loadAll()
      .then((d) => {
        applyData(d);
        setShownAt(null);
        setLoading(false);
        setRefreshing(false);
        KakeiboAPI.recoverQueue();
      })
      .catch((err) => {
        setLoadError(err.message || String(err));
        setLoading(false);
        setRefreshing(false);
      });
  }, [applyData]);

  useEffect(() => {
    if (needsSetup) { setLoading(false); return; }
    // 前回の控えがあれば先に出す。Apps Script の応答を待つ数秒を空白にしない
    const snap = KakeiboAPI.readSnapshot();
    if (snap) {
      applyData(snap.data);
      setShownAt(snap.savedAt);
      setLoading(false);
      load({ quiet: true });
    } else {
      load();
    }
  }, [needsSetup, load, applyData]);

  /**
   * 控えを取り直す。
   * 送信し終わっていて読み込みにも失敗していないときだけにする。
   * 途中の状態を控えると、次に開いたときスプレッドシートと食い違う。
   */
  useEffect(() => {
    if (needsSetup || loading || loadError || refreshing) return;
    if (sync.pending > 0 || sync.sending) return;
    const t = setTimeout(() => {
      KakeiboAPI.writeSnapshot({ categories, entries, transfers, settlements });
    }, 800);
    return () => clearTimeout(t);
  }, [categories, entries, transfers, settlements,
      sync.pending, sync.sending, needsSetup, loading, loadError, refreshing]);

  useEffect(() => KakeiboAPI.subscribe(setSync), []);

  /* ---- 保存（画面を先に更新し、送信はキューに任せる） ---- */

  const saveCategory = (c) => KakeiboAPI.save("categories", c);
  const saveEntry = (e) => KakeiboAPI.save("entries", e);
  const saveTransfer = (t) => KakeiboAPI.save("transfers", t);
  const saveSettlement = (s) => KakeiboAPI.save("settlements", s);

  /* ---- 年で絞ったデータ ---- */

  const yearEntries = useMemo(() => entries.filter((e) => yearOf(e.date) === year), [entries, year]);
  const yearTransfers = useMemo(() => transfers.filter((t) => yearOf(t.date) === year), [transfers, year]);
  const yearSettlements = useMemo(() => settlements.filter((s) => yearOf(s.date) === year), [settlements, year]);

  /* ---- 立替先と支払方法（categories に相乗りしている） ---- */

  // 予算のカテゴリだけを取り出す。画面と集計はすべてこちらを使う
  const budgetCats = useMemo(() => categories.filter((c) => !isMaster(c)), [categories]);

  const masterRowsOf = useCallback(
    (group) => categories.filter((c) => c.group === group),
    [categories]
  );

  // 実体が無いうちは組み込みの既定値を見せる
  const namesOf = useCallback((group) => {
    const rows = masterRowsOf(group);
    return rows.length ? rows.map((r) => r.name) : defaultsOf(group);
  }, [masterRowsOf]);

  const parties = useMemo(() => namesOf(PARTY_GROUP), [namesOf]);
  const methods = useMemo(() => namesOf(METHOD_GROUP), [namesOf]);

  // 支払方法は減らせるので、番号で選ぶときは範囲からはみ出さないようにする
  const methodAt = useCallback(
    (i) => methods[Math.min(i, methods.length - 1)] || "",
    [methods]
  );

  /** その名前が実際の記録で何件使われているか。削除してよいかの判断に使う。 */
  const masterUseCount = useCallback((group, name) => {
    if (group === PARTY_GROUP) {
      return settlements.filter((s) => s.party === name).length;
    }
    return entries.filter((e) => e.method === name).length
      + transfers.filter((t) => t.from === name || t.to === name).length;
  }, [settlements, entries, transfers]);

  function makeMasterRow(group, name) {
    return {
      id: KakeiboAPI.newId(group === PARTY_GROUP ? "p_" : "m_"),
      name, group, monthlyBudget: 0, annualBudget: 0, tags: [], note: "",
    };
  }

  /**
   * 既定値を見せているだけの状態から編集を始めたときは、
   * まず既定値をそのまま実体として書き出す。
   * これをしないと、1件足しただけで残りが消えたことになってしまう。
   * mapName で、書き出す途中に名前を差し替えたり除いたりできる。
   */
  function seedMaster(group, mapName) {
    const rows = [];
    defaultsOf(group).forEach((n) => {
      const next = mapName ? mapName(n) : n;
      if (next) rows.push(makeMasterRow(group, next));
    });
    return rows;
  }

  function addMaster(group, rawName) {
    const name = (rawName || "").trim();
    if (!name) return "名前を入力してください";
    if (namesOf(group).indexOf(name) >= 0) return "同じ名前がすでにあります";

    const created = masterRowsOf(group).length ? [] : seedMaster(group);
    created.push(makeMasterRow(group, name));
    setCategories((p) => [...p, ...created]);
    created.forEach(saveCategory);
    return "";
  }

  function renameMaster(group, oldName, rawName) {
    const name = (rawName || "").trim();
    if (!name) return "名前を入力してください";
    if (name === oldName) return "";
    if (namesOf(group).indexOf(name) >= 0) return "同じ名前がすでにあります";

    const rows = masterRowsOf(group);
    if (rows.length) {
      const target = rows.find((r) => r.name === oldName);
      if (!target) return "見つかりませんでした";
      const updated = { ...target, name };
      setCategories((p) => p.map((c) => (c.id === target.id ? updated : c)));
      saveCategory(updated);
    } else {
      const created = seedMaster(group, (n) => (n === oldName ? name : n));
      setCategories((p) => [...p, ...created]);
      created.forEach(saveCategory);
    }

    // 名前で結び付けているので、すでにある記録も一緒に書き換える
    if (group === PARTY_GROUP) {
      const hit = settlements.filter((s) => s.party === oldName);
      if (hit.length) {
        setSettlements((p) => p.map((s) => (s.party === oldName ? { ...s, party: name } : s)));
        hit.forEach((s) => saveSettlement({ ...s, party: name }));
      }
    } else {
      const hitE = entries.filter((e) => e.method === oldName);
      if (hitE.length) {
        setEntries((p) => p.map((e) => (e.method === oldName ? { ...e, method: name } : e)));
        hitE.forEach((e) => saveEntry({ ...e, method: name }));
      }
      const hitT = transfers.filter((t) => t.from === oldName || t.to === oldName);
      if (hitT.length) {
        const swap = (t) => ({
          ...t,
          from: t.from === oldName ? name : t.from,
          to: t.to === oldName ? name : t.to,
        });
        setTransfers((p) => p.map((t) => (t.from === oldName || t.to === oldName ? swap(t) : t)));
        hitT.forEach((t) => saveTransfer(swap(t)));
      }
    }
    return "";
  }

  function deleteMaster(group, name) {
    const used = masterUseCount(group, name);
    if (used > 0) return `${used}件の記録で使われているため削除できません`;
    if (namesOf(group).length <= 1) return "最後のひとつは削除できません";

    const rows = masterRowsOf(group);
    if (rows.length) {
      const target = rows.find((r) => r.name === name);
      if (!target) return "見つかりませんでした";
      setCategories((p) => p.filter((c) => c.id !== target.id));
      KakeiboAPI.remove("categories", target.id);
    } else {
      const created = seedMaster(group, (n) => (n === name ? null : n));
      setCategories((p) => [...p, ...created]);
      created.forEach(saveCategory);
    }
    return "";
  }

  const catIndex = useMemo(() => {
    const m = {};
    budgetCats.forEach((c, i) => { m[c.id] = i; });
    return m;
  }, [budgetCats]);
  const catById = useCallback((id) => budgetCats.find((c) => c.id === id), [budgetCats]);

  const entriesByCat = useMemo(() => {
    const m = {};
    budgetCats.forEach((c) => { m[c.id] = []; });
    yearEntries.forEach((e) => {
      if (!m[e.categoryId]) m[e.categoryId] = [];
      m[e.categoryId].push(e);
    });
    return m;
  }, [budgetCats, yearEntries]);

  const monthlyTotalsOf = useCallback((c) => {
    const arr = Array(12).fill(0);
    (entriesByCat[c.id] || []).forEach((e) => { arr[monthIdxOf(e.date)] += signedAmount(e); });
    return arr;
  }, [entriesByCat]);

  /* ---- 明細シートの開閉 ---- */

  function todayInYear() {
    const m = year === realYear ? realMonthIdx + 1 : 1;
    const d = year === realYear ? realDay : 1;
    return `${year}-${pad2(m)}-${pad2(d)}`;
  }

  function openDetail(type, key) { setDetail({ type, key }); setDMonth(null); setDTag(null); setDetailBack(null); }
  function closeDetail() { setDetail(null); setDMonth(null); setDTag(null); setDetailBack(null); }

  /**
   * 内訳の一覧から編集シートへ移る。内訳はいったん閉じるが、
   * 編集を終えたときに同じ内訳の同じ位置へ戻れるよう、状態を覚えておく。
   */
  function leaveDetail() {
    const el = detailSheetRef.current;
    setDetailBack({ detail, dMonth, dTag, scrollTop: el ? el.scrollTop : 0 });
    setDetail(null);
  }
  /** 覚えておいた内訳へ戻す。内訳から来ていなければ何もしない。 */
  function backToDetail() {
    if (!detailBack) return;
    setDetail(detailBack.detail);
    setDMonth(detailBack.dMonth);
    setDTag(detailBack.dTag);
    detailScrollRef.current = detailBack.scrollTop;
    setDetailBack(null);
  }

  // 内訳へ戻したときは、離れる前まで見ていた位置に合わせる
  useLayoutEffect(() => {
    if (detailScrollRef.current === null) return;
    if (detail && detailSheetRef.current) detailSheetRef.current.scrollTop = detailScrollRef.current;
    detailScrollRef.current = null;
  }, [detail]);

  function openEntryNew(cat) {
    setEntryTarget({ catId: cat.id, entryId: null });
    setEnDate((d) => (d && yearOf(d) === year ? d : todayInYear()));
    setEnTag(cat.tags[0] || "");
    setEnMemo("");
    setEnAmount("");
    setEnType("expense");
    setEnPending(true);  // 入力した時点では金額は未確定
    setEnError("");
  }
  function openEntryEdit(cat, entry) {
    if (!cat) return;
    setEntryTarget({ catId: cat.id, entryId: entry.id });
    setEnDate(entry.date || `${year}-01-01`);
    setEnTag(entry.tag || cat.tags[0] || "");
    setEnMemo(entry.memo || "");
    setEnMethod(entry.method || methods[0]);
    setEnAmount(String(Math.abs(Number(entry.amount) || 0)));
    setEnType(isIncome(entry) ? "income" : "expense");
    setEnPending(!!entry.pending);
    setEnError("");
  }
  function closeEntry() { setEntryTarget(null); setEnError(""); backToDetail(); }

  function submitEntry() {
    const amount = Number(enAmount);
    if (!enDate) { setEnError("日付を入力してください"); return; }
    if (!enAmount || isNaN(amount) || amount === 0) { setEnError("金額を入力してください"); return; }
    const { catId, entryId } = entryTarget;
    const absAmount = Math.abs(amount);

    if (entryId) {
      const updated = {
        id: entryId, categoryId: catId, date: enDate, amount: absAmount,
        type: enType, tag: enTag, memo: enMemo.trim(), method: enMethod, pending: enPending,
      };
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
      saveEntry(updated);
      closeEntry();
      flash("記録を更新しました");
      return;
    }

    const created = {
      id: KakeiboAPI.newId("e_"), categoryId: catId, date: enDate, amount: absAmount,
      type: enType, tag: enTag, memo: enMemo.trim(), method: enMethod, pending: enPending,
    };
    setEntries((prev) => [...prev, created]);
    saveEntry(created);
    setEnMemo(""); setEnAmount(""); setEnError("");
    if (amountRef.current) amountRef.current.focus();
    flash(`${Number(enDate.slice(5, 7))}/${Number(enDate.slice(8, 10))}　${enType === "income" ? "収入 " : ""}${yen(absAmount)} を記録しました`);
  }

  function deleteEntry(entryId) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    KakeiboAPI.remove("entries", entryId);
    if (entryTarget && entryTarget.entryId === entryId) closeEntry();
    flash("記録を削除しました");
  }

  function fillTwelveMonths(cat) {
    const amount = Number(cat.monthlyBudget) || 0;
    if (amount <= 0) return;
    const have = new Set(
      (entriesByCat[cat.id] || []).filter((e) => e.memo === "毎月一括").map((e) => monthIdxOf(e.date))
    );
    const added = [];
    for (let m = 0; m < 12; m++) {
      if (have.has(m)) continue;
      added.push({
        id: KakeiboAPI.newId("e_"), categoryId: cat.id, date: `${year}-${pad2(m + 1)}-01`,
        amount, type: "expense", tag: "", memo: "毎月一括", method: "", pending: false,
      });
    }
    if (added.length === 0) { flash("すでに12ヶ月分が入力されています"); return; }
    setEntries((prev) => [...prev, ...added]);
    added.forEach(saveEntry);
    flash(`${added.length}ヶ月分（各 ${yen(amount)}）を入力しました`);
  }

  /* ---- カテゴリ ---- */

  function openCatAdd() {
    setCatMode("add"); setCatEditId(null);
    setFName(""); setFNameChoice(""); setFGroup(GROUP_ORDER[0]); setFAmount(""); setFTags([]); setFTagInput("");
    setFNote(""); setFError("");
    setCatFormOpen(true);
  }
  function openCatEdit(cat) {
    setCatMode("edit"); setCatEditId(cat.id);
    setFName(cat.name); setFNameChoice(CUSTOM_NAME); setFGroup(cat.group);
    setFAmount(String(cat.group === "予定費" ? cat.annualBudget || "" : cat.monthlyBudget || ""));
    setFTags([...cat.tags]); setFTagInput(""); setFNote(cat.note || ""); setFError("");
    setCatFormOpen(true);
  }
  function pickGroup(g) {
    setFGroup(g);
    if (catMode === "add") { setFNameChoice(""); setFName(""); setFAmount(""); setFTags([]); }
  }
  function pickName(v) {
    setFNameChoice(v);
    if (v === CUSTOM_NAME) { setFName(""); return; }
    setFName(v);
    if (DEFAULT_TAGS[v]) setFTags([...DEFAULT_TAGS[v]]);
  }
  function addTag() {
    const t = fTagInput.trim();
    if (!t || fTags.includes(t)) { setFTagInput(""); return; }
    setFTags((p) => [...p, t]); setFTagInput("");
  }
  function submitCat() {
    const name = fName.trim();
    const amount = Number(fAmount);
    if (!name) { setFError("カテゴリ名を選択または入力してください"); return; }
    if (!fAmount || isNaN(amount) || amount < 0) { setFError("予算額を正しく入力してください"); return; }

    if (catMode === "add") {
      const created = {
        id: KakeiboAPI.newId("c_"), name, group: fGroup,
        monthlyBudget: fGroup === "予定費" ? 0 : amount,
        annualBudget: fGroup === "予定費" ? amount : 0,
        tags: [...fTags], note: fNote.trim(),
      };
      setCategories((p) => [...p, created]);
      saveCategory(created);
    } else {
      const base = catById(catEditId);
      const updated = {
        ...base, name, group: fGroup,
        monthlyBudget: fGroup === "予定費" ? 0 : amount,
        annualBudget: fGroup === "予定費" ? amount : 0,
        tags: [...fTags], note: fNote.trim(),
      };
      setCategories((p) => p.map((c) => (c.id === catEditId ? updated : c)));
      saveCategory(updated);
    }
    setCatFormOpen(false);
  }
  /**
   * 端末に残しているアプリの控えを捨てて開き直す。
   * 画面が古いまま変わらなくなったときの逃げ道として置いている。
   * 記録そのもの（スプレッドシート側）には触れない。
   */
  function resetAppCache() {
    if (sync.pending > 0) {
      flash("未送信があります。送信が終わってからにしてください");
      return;
    }
    const reload = () => window.location.reload();
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "kakeibo-reset" });
      }
      if (window.caches && caches.keys) {
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .then(reload, reload);
        return;
      }
    } catch (e) { /* 使えない環境ではそのまま開き直すだけ */ }
    reload();
  }

  function deleteCategory(id) {
    const count = entries.filter((e) => e.categoryId === id).length;
    if (count > 0) {
      flash(`明細が${count}件あるため削除できません`);
      setCatDeleteId(null);
      return;
    }
    setCategories((p) => p.filter((c) => c.id !== id));
    KakeiboAPI.remove("categories", id);
    setCatDeleteId(null);
  }

  /* ---- 立替 ---- */

  function openTkNew() {
    setTkEditId(null); setTkDate(todayInYear()); setTkMemo(""); setTkParty(parties[0]); setTkAmount("");
    setTkConfirmDel(false);
    setTkPending(true); setTkError("");
    setTkFormOpen(true);
  }
  function openTkEdit(t) {
    setTkEditId(t.id); setTkDate(t.date || ""); setTkMemo(t.memo || "");
    setTkParty(t.party || parties[0]);
    setTkConfirmDel(false);
    setTkAmount(String(t.amount ?? "")); setTkPending(!!t.pending); setTkError("");
    setTkFormOpen(true);
  }
  function closeTk() { setTkFormOpen(false); setTkEditId(null); setTkError(""); setTkConfirmDel(false); backToDetail(); }
  function submitTk() {
    const memo = tkMemo.trim();
    const amount = Number(tkAmount);
    if (!memo) { setTkError("内容を入力してください"); return; }
    if (!tkAmount || isNaN(amount) || amount <= 0) { setTkError("金額を正しく入力してください"); return; }
    if (tkEditId) {
      const base = settlements.find((s) => s.id === tkEditId);
      const updated = { ...base, memo, party: tkParty, amount, date: tkDate, pending: tkPending };
      setSettlements((p) => p.map((s) => (s.id === tkEditId ? updated : s)));
      saveSettlement(updated);
      flash("立替の記録を更新しました");
    } else {
      const created = { id: KakeiboAPI.newId("s_"), date: tkDate, memo, party: tkParty, amount, settled: false, pending: tkPending };
      setSettlements((p) => [...p, created]);
      saveSettlement(created);
      flash(`${tkParty}　${yen(amount)} を記録しました`);
    }
    closeTk();
  }
  function deleteSettlement(id) {
    setSettlements((p) => p.filter((s) => s.id !== id));
    KakeiboAPI.remove("settlements", id);
    closeTk();
    flash("立替の記録を削除しました");
  }
  function toggleSettled(item) {
    const updated = { ...item, settled: !item.settled };
    setSettlements((p) => p.map((s) => (s.id === item.id ? updated : s)));
    saveSettlement(updated);
  }

  /* ---- 振替 ---- */

  function openTrNew() {
    setTrEditId(null); setTrDate(todayInYear()); setTrFrom(methodAt(0)); setTrTo(methodAt(6)); setTrConfirmDel(false);
    setTrAmount(""); setTrMemo(""); setTrPending(true); setTrError("");
    setTrFormOpen(true);
  }
  function openTrEdit(t) {
    setTrEditId(t.id); setTrDate(t.date || todayInYear());
    setTrFrom(t.from || methodAt(0)); setTrTo(t.to || methodAt(6)); setTrConfirmDel(false);
    setTrAmount(String(t.amount ?? "")); setTrMemo(t.memo || ""); setTrPending(!!t.pending); setTrError("");
    setTrFormOpen(true);
  }
  function submitTr() {
    const amount = Number(trAmount);
    if (!trDate) { setTrError("日付を入力してください"); return; }
    if (!trAmount || isNaN(amount) || amount <= 0) { setTrError("金額を入力してください"); return; }
    if (trFrom === trTo) { setTrError("振替元と振替先が同じです"); return; }
    if (trEditId) {
      const updated = { id: trEditId, date: trDate, amount, from: trFrom, to: trTo, memo: trMemo.trim(), pending: trPending };
      setTransfers((p) => p.map((t) => (t.id === trEditId ? updated : t)));
      saveTransfer(updated);
      flash("振替を更新しました");
    } else {
      const created = { id: KakeiboAPI.newId("t_"), date: trDate, amount, from: trFrom, to: trTo, memo: trMemo.trim(), pending: trPending };
      setTransfers((p) => [...p, created]);
      saveTransfer(created);
      flash(`${trFrom} → ${trTo}　${yen(amount)} を記録しました`);
    }
    setTrEditId(null); setTrFormOpen(false);
  }
  function deleteTransfer(id) {
    setTransfers((p) => p.filter((t) => t.id !== id));
    KakeiboAPI.remove("transfers", id);
    setTrFormOpen(false); setTrEditId(null); setTrConfirmDel(false);
    flash("振替を削除しました");
  }

  /* ---- 履歴 ---- */

  const allRows = useMemo(() => {
    const rows = [];
    yearEntries.forEach((e) => {
      const c = budgetCats.find((x) => x.id === e.categoryId);
      rows.push({
        ...e, kind: "expense",
        catId: e.categoryId,
        catName: c ? c.name : "（カテゴリなし）",
        color: colorOf(catIndex[e.categoryId]),
      });
    });
    yearTransfers.forEach((t) => rows.push({ ...t, kind: "transfer" }));
    rows.sort((a, b) => {
      const d = a.date === b.date
        ? String(a.id).localeCompare(String(b.id))
        : a.date.localeCompare(b.date);
      return sortAsc ? d : -d;
    });
    return rows;
  }, [yearEntries, yearTransfers, budgetCats, catIndex, sortAsc]);

  /* ---- 未確定（Excelで金額をオレンジにしていたもの） ---- */

  const pendingRows = useMemo(() => {
    const rows = [];
    yearEntries.forEach((e) => {
      if (!e.pending) return;
      const c = budgetCats.find((x) => x.id === e.categoryId);
      rows.push({
        ...e, kind: "expense", catId: e.categoryId,
        catName: c ? c.name : "（カテゴリなし）",
        color: colorOf(catIndex[e.categoryId]),
      });
    });
    yearTransfers.forEach((t) => { if (t.pending) rows.push({ ...t, kind: "transfer" }); });
    yearSettlements.forEach((s) => { if (s.pending) rows.push({ ...s, kind: "settlement" }); });
    rows.sort((a, b) => (a.date === b.date ? String(a.id).localeCompare(String(b.id)) : b.date.localeCompare(a.date)));
    return rows;
  }, [yearEntries, yearTransfers, yearSettlements, budgetCats, catIndex]);

  /** 金額が確定した印をつける。 */
  function confirmPending(row) {
    if (row.kind === "transfer") {
      const base = transfers.find((t) => t.id === row.id);
      const updated = { ...base, pending: false };
      setTransfers((p) => p.map((t) => (t.id === row.id ? updated : t)));
      saveTransfer(updated);
    } else if (row.kind === "settlement") {
      const base = settlements.find((s) => s.id === row.id);
      const updated = { ...base, pending: false };
      setSettlements((p) => p.map((s) => (s.id === row.id ? updated : s)));
      saveSettlement(updated);
    } else {
      const base = entries.find((e) => e.id === row.id);
      const updated = { ...base, pending: false };
      setEntries((p) => p.map((e) => (e.id === row.id ? updated : e)));
      saveEntry(updated);
    }
    flash(`${yen(row.amount)} を確定しました`);
  }

  const matchesHistCat = useCallback((row) => {
    if (histCat === null) return true;
    if (histCat === "transfer") return row.kind === "transfer";
    return row.kind !== "transfer" && row.catId === histCat;
  }, [histCat]);

  const histMonthTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    yearEntries.forEach((e) => {
      if (histCat !== null && (histCat === "transfer" || e.categoryId !== histCat)) return;
      arr[monthIdxOf(e.date)] += signedAmount(e);
    });
    return arr;
  }, [yearEntries, histCat]);

  /** カテゴリ絞り込みのチップに出す件数。 */
  const histCatCounts = useMemo(() => {
    const m = { transfer: 0 };
    allRows.forEach((r) => {
      if (histMonth !== null && histMonth !== "pending" && monthIdxOf(r.date) !== histMonth) return;
      if (r.kind === "transfer") m.transfer += 1;
      else m[r.catId] = (m[r.catId] || 0) + 1;
    });
    return m;
  }, [allRows, histMonth]);

  const histRows = allRows
    .filter((e) => histMonth === null || histMonth === "pending" || monthIdxOf(e.date) === histMonth)
    .filter(matchesHistCat);
  const histTotal = histRows.filter((e) => e.kind !== "transfer").reduce((a, e) => a + signedAmount(e), 0);
  const historyByDate = useMemo(() => {
    const out = [];
    histRows.forEach((e) => {
      const key = e.date || `${year}-01-01`;
      const last = out[out.length - 1];
      if (last && last.date === key) last.rows.push(e);
      else out.push({ date: key, rows: [e] });
    });
    return out;
  }, [histRows, year]);

  /* ---- 分析 ---- */

  const anaRows = useMemo(() => budgetCats.map((c) => {
    const totals = monthlyTotalsOf(c);
    const spent = anaScope === "year" ? totals.reduce((s, v) => s + v, 0) : totals[anaMonth];
    const budget = anaScope === "year" ? annualBudgetOf(c) : monthBudgetOf(c);
    return { cat: c, spent, budget, color: colorOf(catIndex[c.id]) };
  }).sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.cat.group), gb = GROUP_ORDER.indexOf(b.cat.group);
    if (ga !== gb) return ga - gb;
    return catIndex[a.cat.id] - catIndex[b.cat.id];
  }), [budgetCats, monthlyTotalsOf, anaScope, anaMonth, catIndex]);

  const anaTotal = anaRows.reduce((a, r) => ({ spent: a.spent + r.spent, budget: a.budget + r.budget }), { spent: 0, budget: 0 });

  const anaGroups = GROUP_ORDER.map((g) => {
    const rows = anaRows.filter((r) => r.cat.group === g);
    return {
      group: g, count: rows.length,
      spent: rows.reduce((a, r) => a + r.spent, 0),
      budget: rows.reduce((a, r) => a + r.budget, 0),
    };
  }).filter((g) => g.count > 0);

  /* ---- 明細シート ---- */

  const dCats = useMemo(() => {
    if (!detail) return [];
    if (detail.type === "category") return budgetCats.filter((c) => c.id === detail.key);
    if (detail.type === "group") return budgetCats.filter((c) => c.group === detail.key);
    return [];
  }, [detail, budgetCats]);

  const dTagOptions = detail && detail.type === "category" && dCats[0] ? dCats[0].tags : [];

  const dAllEntries = useMemo(() => {
    const out = [];
    dCats.forEach((c) => {
      (entriesByCat[c.id] || []).forEach((e) => {
        out.push({ ...e, catId: c.id, catName: c.name, color: colorOf(catIndex[c.id]) });
      });
    });
    return out;
  }, [dCats, entriesByCat, catIndex]);

  const dEntries = useMemo(() => dAllEntries.filter((e) => {
    if (anaScope === "month" && monthIdxOf(e.date) !== anaMonth) return false;
    if (dMonth !== null && monthIdxOf(e.date) !== dMonth) return false;
    if (dTag && e.tag !== dTag) return false;
    return true;
  }).sort((a, b) => {
    const d = a.date === b.date
      ? String(a.id).localeCompare(String(b.id))
      : a.date.localeCompare(b.date);
    return sortAsc ? d : -d;
  }), [dAllEntries, anaScope, anaMonth, dMonth, dTag, sortAsc]);

  const dTotal = dEntries.reduce((a, e) => a + signedAmount(e), 0);
  const dMonthTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    dAllEntries.forEach((e) => {
      if (dTag && e.tag !== dTag) return;
      arr[monthIdxOf(e.date)] += signedAmount(e);
    });
    return arr;
  }, [dAllEntries, dTag]);

  /* ---- 立替タブ ---- */

  const tkMonthTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    yearSettlements.forEach((s) => { arr[monthIdxOf(s.date)] += Number(s.amount) || 0; });
    return arr;
  }, [yearSettlements]);

  const scopedSettlements = useMemo(
    () => (tkMonth === null ? yearSettlements : yearSettlements.filter((s) => monthIdxOf(s.date) === tkMonth)),
    [yearSettlements, tkMonth]
  );

  // 一覧から消したあとも、その区分の記録が残っていれば表示に出す。
  // そうしないと記録が画面から見えなくなってしまう。
  const partyNames = useMemo(() => {
    const names = parties.slice();
    scopedSettlements.forEach((t) => {
      if (t.party && names.indexOf(t.party) < 0) names.push(t.party);
    });
    return names;
  }, [parties, scopedSettlements]);

  const partySummary = useMemo(() => partyNames.map((p) => {
    const items = scopedSettlements.filter((t) => t.party === p);
    return {
      party: p, items,
      unsettled: items.filter((t) => !t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
      settled: items.filter((t) => t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
      count: items.length,
    };
  }).filter((p) => p.count > 0).sort((a, b) => b.unsettled - a.unsettled), [partyNames, scopedSettlements]);

  const maxParty = Math.max(...partySummary.map((p) => p.unsettled + p.settled), 1);
  const dPartyItems = detail && detail.type === "party"
    ? scopedSettlements.filter((t) => t.party === detail.key).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    : [];

  // 何かしら表示できる中身があるか。控えを出している間の読み込み失敗で画面を空にしないため
  const hasData = categories.length > 0 || entries.length > 0
    || transfers.length > 0 || settlements.length > 0;

  const entryCat = entryTarget ? catById(entryTarget.catId) : null;

  const TABS = [
    { key: "record", label: "記録", icon: PencilLine },
    { key: "history", label: "履歴", icon: ListOrdered },
    { key: "analysis", label: "分析", icon: PieChart },
    { key: "settle", label: "立替", icon: Wallet },
  ];

  /* ---- 描画 ---- */

  if (needsSetup) {
    return <SetupScreen onSave={(u) => { KakeiboAPI.setUrl(u); setNeedsSetup(false); }} />;
  }

  return (
    <div className="kb">
      <div className="kb-wrap">
        {/* 見出しと状態の帯は、下にたどっても隠れないよう上に貼り付けておく。
            未送信のまま気づかず閉じてしまうのを防ぐのが主な目的。 */}
        <div className="kb-stickytop">
          <div className="kb-topbar">
            <span className="kb-title">
              {tab === "record" ? "記録" : tab === "history" ? "履歴" : tab === "analysis" ? "分析" : "立替精算"}
            </span>
            <div className="kb-yearpick">
              <button className="kb-yearbtn" onClick={() => setYear((y) => y - 1)} aria-label="前の年"><ChevronLeft size={16} /></button>
              <span className="kb-yearlabel">{year}年</span>
              <button className="kb-yearbtn" onClick={() => setYear((y) => y + 1)} aria-label="次の年"><ChevronRight size={16} /></button>
            </div>
          </div>

          {sync.error ? (
            <div className="kb-syncbar error">
              <span><b>未送信が{sync.pending}件あります。</b>{sync.error}</span>
              <button className="kb-syncbtn" onClick={() => KakeiboAPI.retry()}>再送</button>
            </div>
          ) : sync.pending > 0 && !sync.sending ? (
            <div className="kb-syncbar error">
              <span><b>未送信が{sync.pending}件あります。</b>このまま閉じると失われます。</span>
              <button className="kb-syncbtn" onClick={() => KakeiboAPI.retry()}>送信</button>
            </div>
          ) : sync.pending > 0 ? (
            <div className="kb-syncbar pending">
              <Loader2 size={14} className="kb-spin" />
              <span>保存中…（残り{sync.pending}件）</span>
            </div>
          ) : loadError && hasData ? (
            <div className="kb-syncbar error">
              <span>最新を取れませんでした。表示は{shownAt ? timeLabel(shownAt) + "時点の" : ""}控えです。</span>
              <button className="kb-syncbtn" onClick={() => load({ quiet: true })}>再読み込み</button>
            </div>
          ) : shownAt ? (
            <div className="kb-syncbar stale">
              <Loader2 size={14} className="kb-spin" />
              <span>{timeLabel(shownAt)}時点の内容です。最新を確認しています…</span>
            </div>
          ) : null}
        </div>

        <div className="kb-body">
          {loading ? (
            <div className="kb-loading"><Loader2 size={16} className="kb-spin" /> 読み込み中…</div>
          ) : loadError && !hasData ? (
            <div className="kb-card">
              <div className="kb-empty">
                <strong>データを読み込めませんでした</strong>
                {loadError}
              </div>
              <div style={{ padding: "0 14px 16px" }}>
                <button className="kb-btn" onClick={load}>もう一度読み込む</button>
                <div className="kb-btn-row" style={{ marginTop: 9 }}>
                  <button className="kb-btn ghost" onClick={() => { KakeiboAPI.setUrl(""); setNeedsSetup(true); }}>接続先を設定し直す</button>
                </div>
              </div>
            </div>
          ) : tab === "record" ? (
            <>
              {budgetCats.length === 0 ? (
                <div className="kb-card">
                  <div className="kb-empty">
                    <strong>カテゴリがありません</strong>
                    下のカテゴリ編集から追加してください。
                  </div>
                </div>
              ) : (
                GROUP_ORDER.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => (
                  <div key={g}>
                    <div className="kb-section-label">{g}</div>
                    <div className="kb-card">
                      {budgetCats.filter((c) => c.group === g).map((c) => (
                        <button className="kb-row" key={c.id} onClick={() => openEntryNew(c)}>
                          <div className="kb-dot" style={{ background: colorOf(catIndex[c.id]) }}>{c.name.slice(0, 1)}</div>
                          <div className="kb-rowmain">
                            <div className="kb-rowtitle">{c.name}</div>
                            <div className="kb-rowsub">
                              {[
                                c.tags.length > 0
                                  ? c.tags.join("・")
                                  : `${c.group === "予定費" ? "年間" : "月"}予算 ${yen(c.group === "予定費" ? c.annualBudget : c.monthlyBudget)}`,
                                c.note,
                              ].filter(Boolean).join("　")}
                            </div>
                          </div>
                          <ChevronRight size={17} className="kb-chev" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className="kb-section-label">その他</div>
              <div className="kb-card">
                <button className="kb-row" onClick={openTrNew}>
                  <div className="kb-dot" style={{ background: "#AEB4BC" }}><ArrowLeftRight size={15} /></div>
                  <div className="kb-rowmain">
                    <div className="kb-rowtitle">振替</div>
                    <div className="kb-rowsub">PASMOへのチャージなど・支出には含めません</div>
                  </div>
                  <ChevronRight size={17} className="kb-chev" />
                </button>
              </div>

              <button className="kb-hint" onClick={() => { setManageOpen(true); setCatFormOpen(false); }}>
                <Settings size={15} />
                カテゴリ編集
              </button>
            </>
          ) : tab === "history" ? (
            <>
              <div className="kb-histfilter">
                <button className={`kb-monthchip ${histMonth === null ? "on" : ""}`} onClick={() => setHistMonth(null)}>
                  <span>年間</span>
                  <b>{allRows.length === 0 ? "—" : histMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP")}</b>
                </button>
                {MONTH_LABELS.map((l, i) => (
                  <button
                    key={i}
                    className={`kb-monthchip ${histMonth === i ? "on" : ""} ${histMonthTotals[i] === 0 ? "empty" : ""}`}
                    onClick={() => setHistMonth(histMonth === i ? null : i)}
                  >
                    <span>{l}</span>
                    <b>{histMonthTotals[i] === 0 ? "—" : histMonthTotals[i].toLocaleString("ja-JP")}</b>
                  </button>
                ))}
              </div>

              {histMonth !== "pending" && (
                <div className="kb-chips" style={{ marginTop: 8, marginBottom: 0 }}>
                  <button className={`kb-tagchip ${histCat === null ? "on" : ""}`} onClick={() => setHistCat(null)}>すべて</button>
                  {budgetCats.map((c) => {
                    const n = histCatCounts[c.id] || 0;
                    return (
                      <button
                        key={c.id}
                        className={`kb-tagchip ${histCat === c.id ? "on" : ""} ${n === 0 ? "empty" : ""}`}
                        onClick={() => setHistCat(histCat === c.id ? null : c.id)}
                      >
                        {c.name}{n > 0 ? ` ${n}` : ""}
                      </button>
                    );
                  })}
                  <button
                    className={`kb-tagchip ${histCat === "transfer" ? "on" : ""} ${!histCatCounts.transfer ? "empty" : ""}`}
                    onClick={() => setHistCat(histCat === "transfer" ? null : "transfer")}
                  >
                    振替{histCatCounts.transfer ? ` ${histCatCounts.transfer}` : ""}
                  </button>
                </div>
              )}

              <button
                className={`kb-pendingchip ${histMonth === "pending" ? "on" : ""} ${pendingRows.length === 0 ? "empty" : ""}`}
                onClick={() => setHistMonth(histMonth === "pending" ? null : "pending")}
              >
                <CircleAlert size={15} />
                <span>金額が未確定</span>
                <b>{pendingRows.length}件</b>
                <ChevronRight size={16} className="kb-chev" />
              </button>
              {histMonth === "pending" ? (
                <>
                  <div className="kb-detail-total" style={{ paddingTop: 8 }}>
                    <span>未確定 {yen(pendingRows.reduce((a, r) => a + r.amount, 0))}</span>
                    <span className="kb-detail-count">{pendingRows.length}件</span>
                  </div>
                  {pendingRows.length === 0 ? (
                    <div className="kb-card">
                      <div className="kb-empty">
                        <strong>未確定の記録はありません</strong>
                        金額が確定していない記録はここに集まります。
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="kb-card">
                        {pendingRows.map((r) => (
                          <div className="kb-row" key={`${r.kind}-${r.id}`} style={{ cursor: "default" }}>
                            <span className="kb-detail-date">
                              {Number(r.date.slice(5, 7))}/{Number(r.date.slice(8, 10))}
                            </span>
                            <div
                              className="kb-rowmain"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (r.kind === "transfer") openTrEdit(r);
                                else if (r.kind === "settlement") openTkEdit(r);
                                else openEntryEdit(catById(r.catId), r);
                              }}
                            >
                              <div className="kb-rowtitle">{r.memo || r.tag || r.catName || "（内容なし）"}</div>
                              <div className="kb-rowsub">
                                {r.kind === "transfer"
                                  ? `振替・${r.from} → ${r.to}`
                                  : r.kind === "settlement"
                                    ? `立替・${r.party}`
                                    : [isIncome(r) ? "収入" : null, r.catName, r.tag, r.method].filter(Boolean).join("・")}
                              </div>
                            </div>
                            <span className="kb-amount" style={{ color: "var(--pending)" }}>
                              {isIncome(r) ? "+" : ""}{yen(r.amount)}
                            </span>
                            <button className="kb-iconbtn confirm" onClick={() => confirmPending(r)} aria-label="金額を確定する">
                              <Check size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="kb-rowsub" style={{ padding: "10px 4px 0", whiteSpace: "normal" }}>
                        カードの明細に載ったものからチェックを押してください。押すと確定になり、この一覧から消えます。
                      </div>
                    </>
                  )}
                </>
              ) : (
              <>
              <div className="kb-detail-total" style={{ paddingTop: 8 }}>
                <span>{histMonth === null ? "年間" : MONTH_LABELS[histMonth]}の支出 {yen(histTotal)}</span>
                <div className="kb-sortwrap">
                  <span className="kb-detail-count">{histRows.length}件</span>
                  <SortButton asc={sortAsc} onToggle={() => setSortAsc((v) => !v)} />
                </div>
              </div>

              {historyByDate.length === 0 ? (
                <div className="kb-card">
                  <div className="kb-empty">
                    <strong>{histMonth === null ? "記録がありません" : `${MONTH_LABELS[histMonth]}の記録がありません`}</strong>
                    {histMonth === null ? "記録タブからカテゴリを選んで入力してください。" : "上の年間を押すと全期間に戻ります。"}
                  </div>
                </div>
              ) : (
                historyByDate.map((day) => {
                  const dayTotal = day.rows.filter((e) => e.kind !== "transfer").reduce((s, e) => s + signedAmount(e), 0);
                  return (
                    <div key={day.date}>
                      <div className="kb-datehead">
                        <span className="d">{Number(day.date.slice(5, 7))}/{Number(day.date.slice(8, 10))}（{weekday(day.date)}）</span>
                        <span className="t">支出 {yen(dayTotal)}</span>
                      </div>
                      <div className="kb-card">
                        {day.rows.map((e) => e.kind === "transfer" ? (
                          <button className="kb-row" key={e.id} onClick={() => openTrEdit(e)}>
                            <div className="kb-dot" style={{ background: "#AEB4BC" }}><ArrowLeftRight size={15} /></div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">{e.memo || "振替"}</div>
                              <div className="kb-rowsub">振替・{e.from} → {e.to}</div>
                            </div>
                            <span className="kb-amount" style={{ color: e.pending ? "var(--pending)" : "var(--sub)" }}>{yen(e.amount)}</span>
                            <ChevronRight size={17} className="kb-chev" />
                          </button>
                        ) : (
                          <button className="kb-row" key={e.id} onClick={() => openEntryEdit(catById(e.catId), e)}>
                            <div className="kb-dot" style={{ background: e.color }}>{e.catName.slice(0, 1)}</div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">{e.memo || e.tag || e.catName}</div>
                              <div className="kb-rowsub">
                                {[e.pending ? "未確定" : null, isIncome(e) ? "収入" : null, e.catName, e.tag, e.method].filter(Boolean).join("・")}
                              </div>
                            </div>
                            <span className="kb-amount" style={amountStyle(e)}>
                              {isIncome(e) ? "+" : ""}{yen(Math.abs(Number(e.amount) || 0))}
                            </span>
                            <ChevronRight size={17} className="kb-chev" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              </>
              )}
            </>
          ) : tab === "analysis" ? (
            <>
              <div className="kb-seg" style={{ marginBottom: 10 }}>
                <button className={anaScope === "month" ? "on" : ""} onClick={() => setAnaScope("month")}>月別</button>
                <button className={anaScope === "year" ? "on" : ""} onClick={() => setAnaScope("year")}>年別</button>
              </div>

              {anaScope === "month" && (
                <div className="kb-monthbar">
                  <button onClick={() => setAnaMonth((m) => (m + 11) % 12)} aria-label="前の月"><ChevronLeft size={17} /></button>
                  <span>{year}年 {MONTH_LABELS[anaMonth]}</span>
                  <button onClick={() => setAnaMonth((m) => (m + 1) % 12)} aria-label="次の月"><ChevronRight size={17} /></button>
                </div>
              )}

              <div className="kb-total-card">
                <div className="kb-total-row">
                  <span className="kb-total-label">予算 {yen(anaTotal.budget)}</span>
                  <span className="kb-total-label">
                    {anaTotal.spent > anaTotal.budget ? "超過" : "残"} {yen(Math.abs(anaTotal.budget - anaTotal.spent))}
                  </span>
                </div>
                <div className="kb-total-row" style={{ marginTop: 6 }}>
                  <span className="kb-total-big" style={{ color: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--ink)" }}>
                    {yen(anaTotal.spent)}
                  </span>
                </div>
                <div className="kb-bar">
                  <span style={{
                    width: `${anaTotal.budget > 0 ? Math.min((anaTotal.spent / anaTotal.budget) * 100, 100) : 0}%`,
                    background: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--accent)",
                  }} />
                </div>
              </div>

              {anaRows.length === 0 ? (
                <div className="kb-card"><div className="kb-empty">カテゴリがありません</div></div>
              ) : (
                anaGroups.map(({ group, spent }) => (
                  <div key={group}>
                    <div className="kb-section-label kb-grouphead">
                      <span>{group}</span>
                      <b>{yen(spent)}</b>
                    </div>
                    <div className="kb-card">
                      {anaRows.filter((r) => r.cat.group === group).map(({ cat, spent, budget, color }) => {
                        // 月別のとき、自由費以外は月の予算が実感と合わないので
                        // 残と超過は出さず、使った額だけを見せる
                        const showBudget = anaScope === "year" || cat.group === "自由費";
                        const over = showBudget && budget > 0 && spent > budget;
                        const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                        return (
                          <button className="kb-row" key={cat.id} onClick={() => openDetail("category", cat.id)}>
                            <div className="kb-dot" style={{ background: color }}>{cat.name.slice(0, 1)}</div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">{cat.name}</div>
                              {showBudget && (
                                <div className="kb-bar thin">
                                  <span style={{ width: `${pct}%`, background: over ? "var(--red)" : color }} />
                                </div>
                              )}
                              {cat.note && <div className="kb-rowsub">{cat.note}</div>}
                            </div>
                            <div className="kb-ana-vals">
                              <div className="kb-ana-spent" style={{ color: over ? "var(--red)" : "var(--ink)" }}>{yen(spent)}</div>
                              {showBudget && (
                                <div className="kb-ana-rest">{over ? "超過" : "残"} {yen(Math.abs(budget - spent))}</div>
                              )}
                            </div>
                            <ChevronRight size={17} className="kb-chev" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div className="kb-histfilter">
                <button className={`kb-monthchip ${tkMonth === null ? "on" : ""}`} onClick={() => setTkMonth(null)}>
                  <span>年間</span>
                  <b>{tkMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP")}</b>
                </button>
                {MONTH_LABELS.map((l, i) => (
                  <button
                    key={i}
                    className={`kb-monthchip ${tkMonth === i ? "on" : ""} ${tkMonthTotals[i] === 0 ? "empty" : ""}`}
                    onClick={() => setTkMonth(tkMonth === i ? null : i)}
                  >
                    <span>{l}</span>
                    <b>{tkMonthTotals[i] === 0 ? "—" : tkMonthTotals[i].toLocaleString("ja-JP")}</b>
                  </button>
                ))}
              </div>

              {partySummary.length === 0 ? (
                <div className="kb-card" style={{ marginTop: 12 }}>
                  <div className="kb-empty">
                    <strong>{tkMonth === null ? "立替の記録がありません" : `${MONTH_LABELS[tkMonth]}の立替はありません`}</strong>
                    {tkMonth === null ? "右下のボタンから記録してください。" : "上の年間を押すと全期間に戻ります。"}
                  </div>
                </div>
              ) : (
                <>
                  <div className="kb-section-label">
                    {tkMonth === null ? "区分ごとの未精算" : `${MONTH_LABELS[tkMonth]}の区分ごとの未精算`}
                  </div>
                  <div className="kb-card">
                    {partySummary.map((p) => (
                      <button className="kb-row" key={p.party} onClick={() => openDetail("party", p.party)}>
                        <div className="kb-rowmain">
                          <div className="kb-partytop">
                            <span className="kb-rowtitle">{p.party}</span>
                            <span className="kb-partyamt" style={{ color: p.unsettled > 0 ? "var(--red)" : "var(--sub)" }}>
                              {yen(p.unsettled)}
                            </span>
                          </div>
                          <div className="kb-stackbar">
                            <span className="all" style={{ width: `${((p.unsettled + p.settled) / maxParty) * 100}%` }} />
                            <span className="un" style={{ width: `${(p.unsettled / maxParty) * 100}%` }} />
                          </div>
                          <div className="kb-rowsub">
                            {p.items.filter((t) => !t.settled).length}件未精算
                            {p.settled > 0 ? `・精算済み ${yen(p.settled)}` : ""}
                          </div>
                        </div>
                        <ChevronRight size={17} className="kb-chev" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {tab === "settle" && !tkFormOpen && !detail && (
          <button className="kb-fab" onClick={openTkNew} aria-label="立替を記録"><Plus size={26} /></button>
        )}

        {/* 分析・立替の明細シート */}
        {detail && (
          <div className="kb-sheet-backdrop" onClick={closeDetail}>
            <div className="kb-sheet" ref={detailSheetRef} onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">
                  {detail.type === "party"
                    ? `立替・${detail.key}${tkMonth === null ? "" : ` ${MONTH_LABELS[tkMonth]}`}`
                    : `${detail.type === "group" ? detail.key : (dCats[0] ? dCats[0].name : "")}${dTag ? `・${dTag}` : ""}`}
                  {detail.type !== "party" && (
                    <span className="kb-sheet-period">
                      {anaScope === "month" ? ` ${MONTH_LABELS[anaMonth]}` : dMonth !== null ? ` ${MONTH_LABELS[dMonth]}` : " 年間"}
                    </span>
                  )}
                </span>
                <button className="kb-close" onClick={closeDetail} aria-label="閉じる"><X size={19} /></button>
              </div>

              {detail.type === "party" ? (
                <>
                  <div className="kb-detail-total">
                    <span>未精算 {yen(dPartyItems.filter((t) => !t.settled).reduce((a, t) => a + t.amount, 0))}</span>
                    <span className="kb-detail-count">{dPartyItems.length}件</span>
                  </div>
                  <div className="kb-card" style={{ background: "#FAFAFB" }}>
                    {dPartyItems.map((t) => (
                      <div className={`kb-row ${t.settled ? "kb-settled" : ""}`} key={t.id} style={{ cursor: "default" }}>
                        <span className="kb-detail-date">
                          {t.date ? `${Number(t.date.slice(5, 7))}/${Number(t.date.slice(8, 10))}` : "—"}
                        </span>
                        <div className="kb-rowmain" onClick={() => { leaveDetail(); openTkEdit(t); }} style={{ cursor: "pointer" }}>
                          <div className="kb-rowtitle">{t.memo}</div>
                        </div>
                        <span className="kb-amount" style={{ color: t.pending ? "var(--pending)" : t.settled ? "var(--sub)" : "var(--red)" }}>{yen(t.amount)}</span>
                        <button
                          className="kb-iconbtn"
                          onClick={() => toggleSettled(t)}
                          aria-label={t.settled ? "未精算に戻す" : "精算済みにする"}
                        >
                          {t.settled ? <Undo2 size={15} /> : <Check size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {anaScope === "year" && (
                    <>
                      <div className="kb-label" style={{ marginTop: 2 }}>月をタップで絞り込み</div>
                      <div className="kb-monthchips">
                        {MONTH_LABELS.map((l, i) => (
                          <button
                            key={i}
                            className={`kb-monthchip ${dMonth === i ? "on" : ""} ${dMonthTotals[i] === 0 ? "empty" : ""}`}
                            onClick={() => setDMonth(dMonth === i ? null : i)}
                          >
                            <span>{l}</span>
                            <b>{dMonthTotals[i] === 0 ? "—" : dMonthTotals[i].toLocaleString("ja-JP")}</b>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {dTagOptions.length > 0 && (
                    <>
                      <div className="kb-label" style={{ marginTop: 12 }}>内訳をタップで絞り込み</div>
                      <div className="kb-chips">
                        <button className={`kb-tagchip ${dTag === null ? "on" : ""}`} onClick={() => setDTag(null)}>すべて</button>
                        {dTagOptions.map((t) => {
                          const tot = dAllEntries
                            .filter((e) => e.tag === t && (anaScope === "year" ? (dMonth === null || monthIdxOf(e.date) === dMonth) : monthIdxOf(e.date) === anaMonth))
                            .reduce((a, e) => a + signedAmount(e), 0);
                          return (
                            <button key={t} className={`kb-tagchip ${dTag === t ? "on" : ""} ${tot === 0 ? "empty" : ""}`} onClick={() => setDTag(dTag === t ? null : t)}>
                              {t} {tot === 0 ? "" : yen(tot)}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="kb-detail-total">
                    <span>合計 {yen(dTotal)}</span>
                    <div className="kb-sortwrap">
                      <span className="kb-detail-count">{dEntries.length}件</span>
                      <SortButton asc={sortAsc} onToggle={() => setSortAsc((v) => !v)} />
                    </div>
                  </div>

                  {dEntries.length === 0 ? (
                    <div className="kb-empty">該当する明細がありません</div>
                  ) : (
                    <div className="kb-card" style={{ background: "#FAFAFB" }}>
                      {dEntries.map((e) => (
                        <button className="kb-row" key={e.id} onClick={() => { const c = catById(e.catId); leaveDetail(); openEntryEdit(c, e); }}>
                          <span className="kb-detail-date">
                            {e.date ? `${Number(e.date.slice(5, 7))}/${Number(e.date.slice(8, 10))}` : "—"}
                          </span>
                          <div className="kb-rowmain">
                            <div className="kb-rowtitle">{e.memo || e.tag || e.catName}</div>
                            <div className="kb-rowsub">
                              {[isIncome(e) ? "収入" : null, detail.type === "group" ? e.catName : null, e.tag, e.method].filter(Boolean).join("・")}
                            </div>
                          </div>
                          <span className="kb-amount" style={amountStyle(e)}>
                            {isIncome(e) ? "+" : ""}{yen(Math.abs(Number(e.amount) || 0))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 明細の入力・編集シート */}
        {entryTarget && entryCat && (
          <div className="kb-sheet-backdrop" onClick={closeEntry}>
            <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">
                  {entryCat.name}　{entryTarget.entryId ? "の記録を編集" : "を記録"}
                </span>
                <button className="kb-close" onClick={closeEntry} aria-label="閉じる"><X size={19} /></button>
              </div>

              <div className="kb-field">
                <div className="kb-seg">
                  <button className={enType === "expense" ? "on" : ""} onClick={() => setEnType("expense")}>支出</button>
                  <button className={enType === "income" ? "on" : ""} onClick={() => setEnType("income")}>収入</button>
                </div>
              </div>
              <div className="kb-field">
                <label className="kb-label">金額（円）</label>
                <input
                  ref={amountRef}
                  className="kb-input amount"
                  type="number"
                  inputMode="numeric"
                  value={enAmount}
                  onChange={(ev) => setEnAmount(ev.target.value)}
                  placeholder="0"
                  style={enType === "income" ? { color: "var(--accent)" } : undefined}
                  autoFocus
                />
              </div>
              <div className="kb-field">
                <label className="kb-label">日付</label>
                <input className="kb-input" type="date" value={enDate}
                       min={`${year}-01-01`} max={`${year}-12-31`}
                       onChange={(ev) => setEnDate(ev.target.value)} />
              </div>
              {entryCat.tags.length > 0 && (
                <div className="kb-field">
                  <label className="kb-label">内訳</label>
                  <select className="kb-input" value={enTag} onChange={(ev) => setEnTag(ev.target.value)}>
                    {entryCat.tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div className="kb-field">
                <label className="kb-label">内容（店名など・任意）</label>
                <input className="kb-input" value={enMemo} onChange={(ev) => setEnMemo(ev.target.value)} placeholder="無印良品" />
              </div>
              <div className="kb-field">
                <label className="kb-label">支払い方法</label>
                <select className="kb-input" value={enMethod} onChange={(ev) => setEnMethod(ev.target.value)}>
                  {withCurrent(methods, enMethod).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <CheckRow checked={!enPending} onChange={(v) => setEnPending(!v)}>
                確定
              </CheckRow>
              {enError && <div className="kb-err">{enError}</div>}
              <button className="kb-btn" onClick={submitEntry}>
                {entryTarget.entryId ? "保存する" : "記録する"}
              </button>
              {entryTarget.entryId ? (
                <div className="kb-btn-row" style={{ marginTop: 9 }}>
                  <button className="kb-btn danger" onClick={() => deleteEntry(entryTarget.entryId)}>この記録を削除</button>
                </div>
              ) : (
                entryCat.group === "固定費" && entryCat.monthlyBudget > 0 && (
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={() => fillTwelveMonths(entryCat)}>
                      <CalendarPlus size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                      毎月同額で12ヶ月分を入力
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 立替の入力・編集シート */}
        {tkFormOpen && (
          <div className="kb-sheet-backdrop" onClick={closeTk}>
            <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">{tkEditId ? "立替を編集" : "立替を記録"}</span>
                <button className="kb-close" onClick={closeTk} aria-label="閉じる"><X size={19} /></button>
              </div>
              <div className="kb-field">
                <label className="kb-label">金額（円）</label>
                <input className="kb-input amount" type="number" inputMode="numeric" value={tkAmount} onChange={(ev) => setTkAmount(ev.target.value)} placeholder="0" autoFocus />
              </div>
              <div className="kb-field">
                <label className="kb-label">日付</label>
                <input className="kb-input" type="date" value={tkDate} onChange={(ev) => setTkDate(ev.target.value)} />
              </div>
              <div className="kb-field">
                <label className="kb-label">区分</label>
                <select className="kb-input" value={tkParty} onChange={(ev) => setTkParty(ev.target.value)}>
                  {withCurrent(parties, tkParty).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="kb-field">
                <label className="kb-label">内容</label>
                <input className="kb-input" value={tkMemo} onChange={(ev) => setTkMemo(ev.target.value)} placeholder="無印良品" />
              </div>
              <CheckRow checked={!tkPending} onChange={(v) => setTkPending(!v)}>
                確定
              </CheckRow>
              {tkError && <div className="kb-err">{tkError}</div>}
              <button className="kb-btn" onClick={submitTk}>{tkEditId ? "保存する" : "記録する"}</button>
              {tkEditId && (
                <div className="kb-btn-row" style={{ marginTop: 9 }}>
                  {tkConfirmDel ? (
                    <>
                      <button className="kb-btn danger" onClick={() => deleteSettlement(tkEditId)}>本当に削除する</button>
                      <button className="kb-btn ghost" onClick={() => setTkConfirmDel(false)}>やめる</button>
                    </>
                  ) : (
                    <button className="kb-btn danger" onClick={() => setTkConfirmDel(true)}>この立替を削除</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 振替の入力・編集シート */}
        {trFormOpen && (
          <div className="kb-sheet-backdrop" onClick={() => { setTrFormOpen(false); setTrEditId(null); }}>
            <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">{trEditId ? "振替を編集" : "振替を記録"}</span>
                <button className="kb-close" onClick={() => { setTrFormOpen(false); setTrEditId(null); }} aria-label="閉じる"><X size={19} /></button>
              </div>
              <div className="kb-field">
                <label className="kb-label">金額（円）</label>
                <input className="kb-input amount" type="number" inputMode="numeric" value={trAmount} onChange={(ev) => setTrAmount(ev.target.value)} placeholder="0" autoFocus />
              </div>
              <div className="kb-field">
                <label className="kb-label">日付</label>
                <input className="kb-input" type="date" value={trDate} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(ev) => setTrDate(ev.target.value)} />
              </div>
              <div className="kb-inline">
                <div className="kb-field" style={{ flex: 1 }}>
                  <label className="kb-label">振替元</label>
                  <select className="kb-input" value={trFrom} onChange={(ev) => setTrFrom(ev.target.value)}>
                    {withCurrent(methods, trFrom).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="kb-field" style={{ flex: 1 }}>
                  <label className="kb-label">振替先</label>
                  <select className="kb-input" value={trTo} onChange={(ev) => setTrTo(ev.target.value)}>
                    {withCurrent(methods, trTo).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="kb-field">
                <label className="kb-label">メモ（任意）</label>
                <input className="kb-input" value={trMemo} onChange={(ev) => setTrMemo(ev.target.value)} placeholder="PASMOチャージ" />
              </div>
              <CheckRow checked={!trPending} onChange={(v) => setTrPending(!v)}>
                確定
              </CheckRow>
              {trError && <div className="kb-err">{trError}</div>}
              <button className="kb-btn" onClick={submitTr}>{trEditId ? "保存する" : "記録する"}</button>
              {trEditId && (
                <div className="kb-btn-row" style={{ marginTop: 9 }}>
                  {trConfirmDel ? (
                    <>
                      <button className="kb-btn danger" onClick={() => deleteTransfer(trEditId)}>本当に削除する</button>
                      <button className="kb-btn ghost" onClick={() => setTrConfirmDel(false)}>やめる</button>
                    </>
                  ) : (
                    <button className="kb-btn danger" onClick={() => setTrConfirmDel(true)}>この振替を削除</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* カテゴリ管理シート */}
        {manageOpen && (
          <div className="kb-sheet-backdrop" onClick={() => { setManageOpen(false); setCatFormOpen(false); }}>
            <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">カテゴリの編集</span>
                <button className="kb-close" onClick={() => { setManageOpen(false); setCatFormOpen(false); }} aria-label="閉じる"><X size={19} /></button>
              </div>

              {catFormOpen ? (
                <>
                  <div className="kb-field">
                    <label className="kb-label">グループ</label>
                    <div className="kb-seg">
                      {GROUP_ORDER.map((g) => (
                        <button key={g} className={fGroup === g ? "on" : ""} onClick={() => pickGroup(g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="kb-field">
                    <label className="kb-label">カテゴリ名</label>
                    <select className="kb-input" value={fNameChoice} onChange={(ev) => pickName(ev.target.value)}>
                      <option value="" disabled>選択してください</option>
                      {(NAME_OPTIONS[fGroup] || []).map((n) => {
                        const taken = catMode === "add" && budgetCats.some((c) => c.name === n);
                        return <option key={n} value={n} disabled={taken}>{taken ? `${n}（登録済み）` : n}</option>;
                      })}
                      <option value={CUSTOM_NAME}>その他（手入力）</option>
                    </select>
                    {fNameChoice === CUSTOM_NAME && (
                      <input className="kb-input" style={{ marginTop: 8 }} value={fName} onChange={(ev) => setFName(ev.target.value)} placeholder="カテゴリ名を入力" />
                    )}
                  </div>
                  <div className="kb-field">
                    <label className="kb-label">{fGroup === "予定費" ? "年間予算（円）" : "月予算（円）"}</label>
                    <input className="kb-input" type="number" inputMode="numeric" value={fAmount} onChange={(ev) => setFAmount(ev.target.value)} placeholder={fGroup === "予定費" ? "100000" : "10000"} />
                  </div>
                  <div className="kb-field">
                    <label className="kb-label">内訳（記録時の選択肢になります）</label>
                    {fTags.length > 0 && (
                      <div className="kb-chips">
                        {fTags.map((t) => (
                          <span className="kb-chip" key={t}>
                            {t}
                            <button onClick={() => setFTags((p) => p.filter((x) => x !== t))} aria-label={`${t}を削除`}><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="kb-inline">
                      <input
                        className="kb-input"
                        value={fTagInput}
                        onChange={(ev) => setFTagInput(ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addTag(); } }}
                        placeholder="内訳名を入力"
                      />
                      <button className="kb-btn ghost" style={{ width: "auto", padding: "0 16px" }} onClick={addTag}>追加</button>
                    </div>
                  </div>
                  <div className="kb-field">
                    <label className="kb-label">補足（任意・一覧に表示されます）</label>
                    <input className="kb-input" value={fNote} onChange={(ev) => setFNote(ev.target.value)} placeholder="2026/6〜開始" />
                  </div>
                  {fError && <div className="kb-err">{fError}</div>}
                  <button className="kb-btn" onClick={submitCat}>{catMode === "add" ? "追加する" : "保存する"}</button>
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={() => setCatFormOpen(false)}>キャンセル</button>
                  </div>
                </>
              ) : (
                <>
                  {GROUP_ORDER.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => (
                    <div key={g}>
                      <div className="kb-section-label">{g}</div>
                      <div className="kb-card" style={{ background: "#FAFAFB" }}>
                        {budgetCats.filter((c) => c.group === g).map((c) => (
                          <div className="kb-row" key={c.id} style={{ cursor: "default" }}>
                            <div className="kb-dot" style={{ background: colorOf(catIndex[c.id]) }}>{c.name.slice(0, 1)}</div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">{c.name}</div>
                              <div className="kb-rowsub">
                                {c.group === "予定費" ? "年間" : "月"}予算 {yen(c.group === "予定費" ? c.annualBudget : c.monthlyBudget)}
                                {c.tags.length > 0 ? `・内訳${c.tags.length}件` : ""}
                                {c.note ? `　${c.note}` : ""}
                              </div>
                            </div>
                            <div className="kb-rowright">
                              <button className="kb-iconbtn" onClick={() => openCatEdit(c)} aria-label="編集"><Pencil size={14} /></button>
                              {catDeleteId === c.id ? (
                                <>
                                  <button className="kb-iconbtn" style={{ color: "var(--red)" }} onClick={() => deleteCategory(c.id)} aria-label="削除を確定"><Check size={15} /></button>
                                  <button className="kb-iconbtn" onClick={() => setCatDeleteId(null)} aria-label="取消"><X size={14} /></button>
                                </>
                              ) : (
                                <button className="kb-iconbtn" onClick={() => setCatDeleteId(c.id)} aria-label="削除"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button className="kb-btn" style={{ marginTop: 14 }} onClick={openCatAdd}>カテゴリを追加</button>

                  <MasterList
                    title="立替先"
                    hint="立替タブの区分になります。名前を変えると、これまでの記録もまとめて変わります。"
                    names={parties}
                    useCount={(n) => masterUseCount(PARTY_GROUP, n)}
                    onAdd={(n) => addMaster(PARTY_GROUP, n)}
                    onRename={(o, n) => renameMaster(PARTY_GROUP, o, n)}
                    onDelete={(n) => deleteMaster(PARTY_GROUP, n)}
                  />

                  <MasterList
                    title="支払方法"
                    hint="明細と振替で選べるようになります。名前を変えると、これまでの記録もまとめて変わります。"
                    names={methods}
                    useCount={(n) => masterUseCount(METHOD_GROUP, n)}
                    onAdd={(n) => addMaster(METHOD_GROUP, n)}
                    onRename={(o, n) => renameMaster(METHOD_GROUP, o, n)}
                    onDelete={(n) => deleteMaster(METHOD_GROUP, n)}
                  />

                  <div className="kb-section-label" style={{ marginTop: 22 }}>保存の状態</div>
                  <div className={`kb-savebox ${sync.error ? "error" : sync.pending > 0 ? "" : "ok"}`}>
                    {sync.error
                      ? `保存できていません（未送信${sync.pending}件）：${sync.error}`
                      : sync.pending > 0
                        ? `保存中です（残り${sync.pending}件）`
                        : "スプレッドシートに保存できています"}
                  </div>
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={() => { setManageOpen(false); load(); }}>読み込み直す</button>
                  </div>

                  <div className="kb-section-label" style={{ marginTop: 22 }}>接続先</div>
                  <div className="kb-savebox" style={{ wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>
                    {KakeiboAPI.getUrl()}
                  </div>
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={() => { KakeiboAPI.setUrl(""); setNeedsSetup(true); }}>設定し直す</button>
                  </div>

                  <div className="kb-section-label" style={{ marginTop: 22 }}>アプリの更新</div>
                  <div className="kb-savebox">
                    2回目からは通信を待たずに開けるよう、アプリ本体を端末に控えています。
                    画面が古いまま変わらないときは、その控えを消して開き直してください。記録には影響しません。
                  </div>
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={resetAppCache}>控えを消して開き直す</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {toast && <div className="kb-toast">{toast}</div>}
      </div>

      <nav className="kb-nav">
        <div className="kb-nav-inner">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<KakeiboApp />);
