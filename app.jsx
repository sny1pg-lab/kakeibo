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
/**
 * グループと、その予算の持ち方。
 *
 * もとは「固定費＝月額」「予定費＝年額」「自由費＝残り」と、
 * グループの名前がそのまま持ち方を決めていた。家計簿が増えて、
 * 光熱費・生活費・娯楽費のように別の分け方をしたい家計簿が出てきたので、
 * 名前と持ち方を切り離した。名前は家計簿ごとに自由につけられる。
 */
const KIND_MONTH = "月間";   // 月額をマスターにする
const KIND_YEAR = "年間";    // 年額をマスターにする
const KIND_REST = "残り";    // 収入から他を引いた残り。金額は持たない
const KIND_NONE = "なし";    // 予算を置かない
const KINDS = [KIND_MONTH, KIND_YEAR, KIND_NONE, KIND_REST];
// 画面に出す言い方。保存する値（KIND_REST など）は変えない
const KIND_LABEL = { [KIND_MONTH]: "月間予算", [KIND_YEAR]: "年間予算", [KIND_NONE]: "予算外", [KIND_REST]: "収入の残り" };

// 設定が無いときの並びと持ち方。ゆきの家計簿はこれで動いている
const LEGACY_GROUPS = [
  { name: "自由費", kind: KIND_REST },
  { name: "予定費", kind: KIND_YEAR },
  { name: "固定費", kind: KIND_MONTH },
];
const GROUP_ROW = "set_groups";
// 家計簿の連動でできる行の印。立替先の写しと、写しから入った明細に付く。
// どちらも連動元が持つものなので、こちら側では直せないようにする
const LINK_PREFIX = "lk_";
function isLinked(x) { return String(x && x.id).indexOf(LINK_PREFIX) === 0; }
// カテゴリの並び順。id を並べた1行として持つ。ここに無いものは後ろに回る
const CATORDER_ROW = "set_catorder";
// 店名の候補に並べる数。これを越えるぶんは、打って絞り込んでもらう
const SHOP_CHIPS = 12;

/** 一覧の中で1つだけ位置を入れ替える。 */
function moveItem(list, i, delta) {
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  const t = next[i];
  next[i] = next[j];
  next[j] = t;
  return next;
}

/** 設定行の tags（"光熱費:月間,生活費:年間" の形）からグループの並びを作る。 */
function parseGroups(tags) {
  const out = [];
  (tags || []).forEach((t) => {
    const i = String(t).lastIndexOf(":");
    if (i <= 0) return;
    const name = t.slice(0, i).trim();
    const kind = t.slice(i + 1).trim();
    if (name && KINDS.indexOf(kind) >= 0 && !out.some((g) => g.name === name)) out.push({ name, kind });
  });
  return out.length ? out : null;
}
function serializeGroups(defs) { return defs.map((g) => `${g.name}:${g.kind}`); }

// 立替先と支払方法は、カテゴリと同じ categories シートに置いている。
// グループ名で見分けるだけなので、Apps Script 側は何も変えなくてよい。
// 予算のカテゴリと混ざらないよう、集計や一覧では必ず取り除く。
const PARTY_GROUP = "立替先";
const METHOD_GROUP = "支払方法";

// 家計簿ごとに使わない機能。これも categories シートに相乗りさせている。
// 端末ではなくスプレッドシートに持たせるのは、同じ家計簿を2人で開くため。
// 片方で消した機能が、もう片方の端末では出たままにならないようにしている。
const FEATURE_GROUP = "設定";
const FEATURE_ROW = "set_features";
// 補足は1行に収まる長さにする。一覧の下段は伸びずに省略されるため。
// defaultOff は、設定していない家計簿では使わないもの。あとから足した機能に使う。
// 設定の行は「使わないもの」を並べるので、この印が付いたものだけ "+" を頭に付けて
// 「使う」ほうを覚える。付けないと、既存の家計簿でも勝手に出てしまう
const FEATURES = [
  { key: "pending", label: "金額の確定", hint: "あとからチェックで確定にします" },
  { key: "esettle", label: "明細の精算", hint: "立て替えたぶんに精算済みの印を付けます", defaultOff: true },
  { key: "settle", label: "立替", hint: "立て替えたぶんを区分ごとに集めます" },
  { key: "transfer", label: "振替", hint: "チャージなど。支出には数えません" },
  { key: "method", label: "支払い方法", hint: "記録に引き落とし先を残します" },
];
const MASTER_GROUPS = [PARTY_GROUP, METHOD_GROUP, FEATURE_GROUP];

// 立替先も支払方法も、組み込みの既定値は置いていない。家計簿ごとに中身が違うため。
// 新しい家計簿は空から始めて、カテゴリ編集で足していく。

// 履歴の絞り込みで、固定費のカテゴリをひとまとめに扱うための印。
// カテゴリのidと混ざらないよう、idには使われない形にしてある。
const HIST_GROUP = "group:";

// budgets シートで収入の枠を表す target。カテゴリのidとは混ざらない形にしてある
const INCOME_TARGET = "income";

function isMaster(c) { return MASTER_GROUPS.indexOf(c.group) >= 0; }

/** 一覧の並べ替え。上下の矢印を2つ並べる。端では押せなくする。 */
function MoveButtons({ i, count, onMove, what }) {
  if (count <= 1) return null;
  return (
    <>
      <button className="kb-iconbtn arrow" disabled={i === 0}
              onClick={() => onMove(-1)} aria-label={`${what}を上へ`}><ChevronUp size={15} /></button>
      <button className="kb-iconbtn arrow" disabled={i === count - 1}
              onClick={() => onMove(1)} aria-label={`${what}を下へ`}><ChevronDown size={15} /></button>
    </>
  );
}

/**
 * 一覧から消した名前でも、その記録を開いたときは選べるようにしておく。
 * 選択肢に無いと、編集しただけで別のものに書き換わってしまう。
 */
function withCurrent(list, value) {
  return value && list.indexOf(value) < 0 ? list.concat([value]) : list;
}
const PALETTE = ["#9B59D0", "#E08A2E", "#3FA9A0", "#D8607A", "#5B8DD6", "#7FA83C", "#C7913A", "#6C7A99", "#B0553F", "#4FA36B"];

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
const ChevronDown = (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
const ChevronUp = (p) => <Svg {...p}><path d="m18 15-6-6-6 6" /></Svg>;
const RefreshCw = (p) => <Svg {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></Svg>;
const BookOpen = (p) => <Svg {...p}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></Svg>;
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
const Target = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>;
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
/**
 * 予算の金額。年額をマスターにして、月額は12で割って出す。
 * 割り切れないときだけ小数1桁まで見せる。
 * 先に月額を丸めてから12倍すると年額とずれるので、丸めるのは表示のときだけにする。
 */
function yenExact(n) {
  const v = Number(n) || 0;
  const r = Math.round(v * 10) / 10;
  // toFixed は文字列を返すので、そこから toLocaleString しても桁区切りが入らない。
  // 数値のまま桁数を指定して整える。
  const opts = Number.isInteger(r) ? {} : { minimumFractionDigits: 1, maximumFractionDigits: 1 };
  return `¥${r.toLocaleString("ja-JP", opts)}`;
}
function colorOf(idx) {
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
}

/**
 * 金額欄に打たれたものが式なら、その式をそのまま返す。
 * 数字だけを直接打った場合は空を返し、古い式が残らないようにする。
 */
function enteredFormula(src) {
  const text = String(src == null ? "" : src).trim();
  if (!KakeiboCalc.looksLikeExpression(text)) return "";
  return KakeiboCalc.evalAmount(text).ok ? text : "";
}

/**
 * 金額欄の中身を数値にする。式が打たれていれば計算した結果を返す。
 * 計算できなければ NaN を返し、これまでどおり入力のやり直しを促す。
 */
function amountValue(src) {
  const r = KakeiboCalc.evalAmount(src);
  return r.ok ? Math.round(r.value) : NaN;
}

/**
 * 金額の入力欄。式をそのまま打てる。
 *
 * 「1634+1090+460」と打つと、下に計算結果が出て、保存するときは3184になる。
 * スマホの数字キーボードには記号が出ないので、欄のすぐ下に記号のボタンを置く。
 * ボタンはカーソルの位置に差し込むので、途中に足すこともできる。
 */
function AmountField({ value, onChange, income, inputRef }) {
  const ownRef = useRef(null);
  const ref = inputRef || ownRef;
  // 記号を差し込んだあとのカーソル位置。
  // 値を変えると再描画で末尾に飛ぶので、描画が終わってから戻す
  const caretRef = useRef(null);

  useEffect(() => {
    if (caretRef.current == null) return;
    const el = ref.current;
    const at = caretRef.current;
    caretRef.current = null;
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(at, at); } catch (e) { /* 型によっては動かない */ }
  });
  const calc = KakeiboCalc.evalAmount(value);
  const showCalc = KakeiboCalc.looksLikeExpression(value);

  /** カーソルの位置に記号を差し込む。キーボードは出したままにする。 */
  function insert(text) {
    const el = ref.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart == null ? value.length : el.selectionStart;
    const end = el.selectionEnd == null ? start : el.selectionEnd;
    caretRef.current = start + text.length;
    onChange(value.slice(0, start) + text + value.slice(end));
  }

  function backspace() {
    const el = ref.current;
    const start = el && el.selectionStart != null ? el.selectionStart : value.length;
    const end = el && el.selectionEnd != null ? el.selectionEnd : start;
    if (start === 0 && start === end) return;
    const from = start === end ? start - 1 : start;
    caretRef.current = from;
    onChange(value.slice(0, from) + value.slice(end));
  }

  return (
    <>
      <input
        ref={ref}
        className="kb-input amount"
        type="text"
        /* 式を打てるようにするため type は text。iOSでは数字のキーボードが出る */
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder="0"
        style={income ? { color: "var(--accent)" } : undefined}
      />
      {showCalc && (
        <div className={`kb-calc ${calc.ok ? "" : "ng"}`}>
          {calc.ok ? `= ${yen(calc.value)}` : "式が正しくありません"}
        </div>
      )}
      <div className="kb-keys">
        {/* ボタンを押しても入力欄の焦点を奪わない。
            奪うとカーソルの位置が末尾に戻り、スマホではキーボードも閉じてしまう */}
        {["+", "-", "×", "÷", "(", ")"].map((k) => (
          <button key={k} type="button" className="kb-key"
                  onPointerDown={(ev) => ev.preventDefault()}
                  onClick={() => insert(k)}>{k}</button>
        ))}
        <button type="button" className="kb-key wide"
                onPointerDown={(ev) => ev.preventDefault()}
                onClick={backspace} aria-label="1文字消す">⌫</button>
      </div>
    </>
  );
}

/**
 * 明細の見出し。「内訳 店名 内容」を1行にまとめる。
 * 同じ言葉が続くときと、空のものは飛ばす。
 * 全部空ならカテゴリ名を出す。
 */
function joinTitle(parts) {
  const out = [];
  parts.forEach((v) => {
    const t = String(v || "").trim();
    if (t && out.indexOf(t) < 0) out.push(t);
  });
  return out.join(" ");
}
function entryTitle(e) {
  return joinTitle([e.tag, e.shop, e.memo]) || e.catName || "";
}

/**
 * 一覧の1行の見出し。明細も振替も立替も同じ形にする。
 */
function rowTitle(x, kind) {
  if (kind === "transfer") return x.memo || "振替";
  // 店名も内容も空なら、せめてどこの立替かは出す
  if (kind === "settlement") return joinTitle([x.shop, x.memo]) || x.party || "";
  return entryTitle(x);
}

/** 下段の補足。既定は支払い方法で、振替だけ振替元と振替先を出す。 */
function rowSub(x, kind) {
  if (kind === "transfer") return `振替・${x.from} → ${x.to}`;
  return x.method || "";
}

/**
 * 一覧に出す1行の中身。履歴・明細・立替・未確定のどこでもこれを使う。
 *
 * 画面ごとに同じ見た目を別々に書いていたころは、直しが片方にしか入らず
 * 見た目がずれた（未確定の一覧だけ「内訳 内容」にならず、式も出ていなかった）。
 * ここに集約したので、見出しの決まりを変えるときは1か所だけ直せばよい。
 *
 * 上段は「内訳 内容」と、金額を出した式を控えめに添えたもの。
 * 立て替えて後で受け取った場合など、あとから理由が分かるようにするため。
 * 下段は補足。中身が無くても場所は確保して、一覧の行の高さを揃える。
 * sub を渡すと下段だけ差し替えられる（未確定はカテゴリも要るため）。
 */
function RowMain({ x, kind = x.kind, sub, ...rest }) {
  const note = sub === undefined ? rowSub(x, kind) : sub;
  return (
    <div className="kb-rowmain" {...rest}>
      <div className="kb-rowtitle">
        {rowTitle(x, kind)}
        {x.formula ? <span className="kb-formula">{x.formula}</span> : null}
      </div>
      {note ? <div className="kb-rowsub">{note}</div> : null}
    </div>
  );
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
function MasterList({ title, hint, names, boxes, useCount, onAdd, onRename, onDelete }) {
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
      {(boxes || [{ box: "", groups: [{ name: "", rows: names.map((n) => ({ id: n, name: n })) }] }]).map((b) => (
        <React.Fragment key={b.box || "_"}>
          {b.box && <div className="kb-section-label sub">{b.box}</div>}
          {b.groups.map((gp) => (
            <React.Fragment key={gp.name || "_"}>
              {gp.name && <div className="kb-section-label sub" style={{ marginLeft: 12 }}>{gp.name}</div>}
      <div className="kb-card" style={{ background: "#FAFAFB" }}>
        {gp.rows.map((row) => {
          const n = row.name;
          const used = useCount(n);
          // 連動でできた写しは、連動元の家計簿が持つもの。ここでは直せない
          const locked = isLinked(row);
          return (
            <div className="kb-row" key={row.id} style={{ cursor: "default" }}>
              {editing === n ? (
                <div className="kb-rowmain">
                  <input
                    className="kb-input"
                    value={draft}
                   
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
                {locked ? (
                  <span className="kb-rowsub" style={{ marginRight: 4 }}>連動</span>
                ) : editing === n ? (
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
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
      {hint && <div className="kb-note">{hint}</div>}
      {error && <div className="kb-err">{error}</div>}
      {adding ? (
        <div className="kb-inline" style={{ marginTop: 9 }}>
          <input
            className="kb-input"
            value={draft}
           
            placeholder={`${title}を入力`}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); submitAdd(); } }}
          />
          <button className="kb-btn ghost" style={{ width: "auto", padding: "0 16px" }} onClick={submitAdd}>追加</button>
        </div>
      ) : (
        <button className="kb-btn" style={{ marginTop: 9 }} onClick={() => { reset(); setAdding(true); }}>
          {title}を追加
        </button>
      )}
    </div>
  );
}

/** 接続先のURLとして正しい形か。 */
function validUrl(v) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v);
}

/**
 * 家計簿の切り替えと登録。
 *
 * 家計簿ごとに接続先のスプレッドシートが違う。端末に登録したものだけが並ぶので、
 * 教えていないURLの家計簿はこの端末からは開けない。
 * 「端末から外す」はこの端末の登録を消すだけで、スプレッドシートには触れない。
 */
function BookSheet({ books, currentId, onPick, onAdd, onRename, onSetUrl, onRemove, onClose }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setAdding(false); setEditing(null); setConfirming(null);
    setName(""); setUrl(""); setError("");
  }
  function submitAdd() {
    if (!name.trim()) { setError("名前を入れてください。"); return; }
    if (!validUrl(url.trim())) { setError("Apps ScriptのウェブアプリのURL（/exec で終わるもの）を貼り付けてください。"); return; }
    if (books.some((b) => b.name === name.trim())) { setError("同じ名前がすでにあります。"); return; }
    onAdd(name.trim(), url.trim());
    reset();
  }
  function submitEdit() {
    if (!name.trim()) { setError("名前を入れてください。"); return; }
    const u = url.trim();
    if (u && !validUrl(u)) { setError("接続先のURLの形が違います。"); return; }
    onRename(editing, name.trim());
    if (u) onSetUrl(editing, u);
    reset();
  }

  return (
    <div className="kb-sheet-backdrop" onClick={onClose}>
      <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
        <div className="kb-sheet-head">
          <span className="kb-sheet-title">家計簿</span>
          <button className="kb-close" onClick={onClose} aria-label="閉じる"><X size={19} /></button>
        </div>

        <div className="kb-card" style={{ background: "#FAFAFB" }}>
          {books.map((b) => (
            <div className="kb-row" key={b.id} style={{ cursor: "default" }}>
              {editing === b.id ? (
                <div className="kb-rowmain">
                  <input className="kb-input" value={name} onChange={(ev) => setName(ev.target.value)} placeholder="名前" />
                  <input className="kb-input" style={{ marginTop: 6, fontSize: 16 }} value={url}
                         onChange={(ev) => setUrl(ev.target.value)} spellCheck={false}
                         placeholder="接続先を変えるときだけ入れる" />
                </div>
              ) : (
                <>
                  <div className="kb-dot" style={{ background: b.id === currentId ? "var(--accent)" : "#C4C8CE" }}>
                    {b.id === currentId ? <Check size={15} /> : <BookOpen size={14} />}
                  </div>
                  <button className="kb-bookpick" onClick={() => onPick(b.id)}>
                    <div className="kb-rowtitle">{b.name}</div>
                    <div className="kb-rowsub">{b.id === currentId ? "いま開いています" : "切り替える"}</div>
                  </button>
                </>
              )}
              <div className="kb-rowright">
                {editing === b.id ? (
                  <>
                    <button className="kb-iconbtn" onClick={submitEdit} aria-label="保存"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={reset} aria-label="取消"><X size={14} /></button>
                  </>
                ) : confirming === b.id ? (
                  <>
                    <button className="kb-iconbtn" style={{ color: "var(--red)" }}
                            onClick={() => { onRemove(b.id); reset(); }} aria-label="外すのを確定"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={() => setConfirming(null)} aria-label="取消"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button className="kb-iconbtn" onClick={() => { reset(); setEditing(b.id); setName(b.name); }}
                            aria-label={`${b.name}を編集`}><Pencil size={14} /></button>
                    {books.length > 1 && (
                      <button className="kb-iconbtn" onClick={() => { reset(); setConfirming(b.id); }}
                              aria-label={`${b.name}を端末から外す`}><Trash2 size={14} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {confirming && (
          <div className="kb-note">
            この端末の登録から外すだけです。スプレッドシートの中身は消えません。接続先を入れ直せばまた開けます。
          </div>
        )}
        {error && <div className="kb-err" style={{ marginTop: 9 }}>{error}</div>}

        {adding ? (
          <div style={{ marginTop: 12 }}>
            <div className="kb-field">
              <label className="kb-label">名前</label>
              <input className="kb-input" value={name} onChange={(ev) => setName(ev.target.value)} placeholder="家計" />
            </div>
            <div className="kb-field">
              <label className="kb-label">接続先</label>
              <input className="kb-input" value={url} onChange={(ev) => setUrl(ev.target.value)} spellCheck={false}
                     placeholder="https://script.google.com/macros/s/..../exec" />
            </div>
            <div className="kb-btn-row">
              <button className="kb-btn ghost" onClick={reset}>やめる</button>
              <button className="kb-btn" onClick={submitAdd}>追加</button>
            </div>
          </div>
        ) : (
          <button className="kb-btn" style={{ marginTop: 12 }} onClick={() => { reset(); setAdding(true); }}>
            家計簿を追加
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * グループの一覧。名前と、予算の持ち方（月間・年間・予算外・残り）を決める。
 *
 * もとはグループの名前がそのまま持ち方を決めていたが、
 * 家計簿ごとに分け方が違うので、名前と持ち方を切り離した。
 */
function GroupList({ defs, useCount, onSave }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(KIND_YEAR);
  const [error, setError] = useState("");

  function reset() {
    setAdding(false); setEditing(null); setConfirming(null);
    setName(""); setKind(KIND_YEAR); setError("");
  }
  function submitAdd() {
    const n = name.trim();
    if (!n) { setError("名前を入れてください。"); return; }
    if (defs.some((g) => g.name === n)) { setError("同じ名前がすでにあります。"); return; }
    onSave([...defs, { name: n, kind }]);
    reset();
  }
  function submitEdit() {
    const n = name.trim();
    if (!n) { setError("名前を入れてください。"); return; }
    if (defs.some((g) => g.name === n && g.name !== editing)) { setError("同じ名前がすでにあります。"); return; }
    onSave(defs.map((g) => (g.name === editing ? { name: n, kind } : g)), editing, n);
    reset();
  }
  function submitDelete(g) {
    if (useCount(g.name) > 0) { setError(`${g.name}にはカテゴリがあるため消せません。`); setConfirming(null); return; }
    onSave(defs.filter((x) => x.name !== g.name));
    reset();
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div className="kb-section-label">グループ</div>
      <div className="kb-card" style={{ background: "#FAFAFB" }}>
        {defs.map((g, gi) => {
          const used = useCount(g.name);
          return (
            <div className="kb-row" key={g.name} style={{ cursor: "default" }}>
              {editing === g.name ? (
                <div className="kb-rowmain">
                  <input className="kb-input" value={name} onChange={(ev) => setName(ev.target.value)} />
                  <div className="kb-seg" style={{ marginTop: 6 }}>
                    {KINDS.map((k) => (
                      <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="kb-rowmain">
                  <div className="kb-rowtitle">{g.name}</div>
                  <div className="kb-rowsub">
                    {KIND_LABEL[g.kind]}・{used > 0 ? `カテゴリ${used}件` : "カテゴリなし"}
                  </div>
                </div>
              )}
              <div className="kb-rowright">
                {editing === g.name ? (
                  <>
                    <button className="kb-iconbtn" onClick={submitEdit} aria-label="保存"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={reset} aria-label="取消"><X size={14} /></button>
                  </>
                ) : confirming === g.name ? (
                  <>
                    <button className="kb-iconbtn" style={{ color: "var(--red)" }} onClick={() => submitDelete(g)} aria-label="削除を確定"><Check size={15} /></button>
                    <button className="kb-iconbtn" onClick={() => setConfirming(null)} aria-label="取消"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <MoveButtons i={gi} count={defs.length} what={g.name}
                                 onMove={(d) => { reset(); onSave(moveItem(defs, gi, d)); }} />
                    <button className="kb-iconbtn" onClick={() => { reset(); setEditing(g.name); setName(g.name); setKind(g.kind); }}
                            aria-label={`${g.name}を編集`}><Pencil size={14} /></button>
                    {defs.length > 1 && (
                      <button className="kb-iconbtn" onClick={() => { reset(); setConfirming(g.name); }}
                              aria-label={`${g.name}を削除`}><Trash2 size={14} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="kb-note">
        並んでいる順に画面へ出ます。月間予算は月額、年間予算は年額で持ちます。
        予算外は金額を置きません。収入の残りは、収入から月間予算と年間予算をすべて引いた額が
        自動で入るもので、金額は自分では変えられません。
      </div>
      {error && <div className="kb-err">{error}</div>}
      {adding ? (
        <div style={{ marginTop: 9 }}>
          <input className="kb-input" value={name} onChange={(ev) => setName(ev.target.value)} placeholder="グループ名を入力" />
          <div className="kb-seg" style={{ marginTop: 8 }}>
            {KINDS.map((k) => (
              <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <div className="kb-btn-row" style={{ marginTop: 9 }}>
            <button className="kb-btn ghost" onClick={reset}>やめる</button>
            <button className="kb-btn" onClick={submitAdd}>追加</button>
          </div>
        </div>
      ) : (
        <button className="kb-btn" style={{ marginTop: 9 }} onClick={() => { reset(); setAdding(true); }}>
          グループを追加
        </button>
      )}
    </div>
  );
}

/**
 * 店名の入力欄。これまでに使った店名を候補として下に並べる。
 *
 * 候補はその家計簿の記録から作るので、家計簿ごとに中身が違う。
 * 打つたびに絞り込むので、欄をもう1つ増やさずに探せる。
 * 数が多い家計簿（おうちは100種類を越える）でも、数文字打てば目当てが出る。
 */
function ShopField({ value, onChange, options, label }) {
  const hits = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? options.filter((n) => n.toLowerCase().indexOf(q) >= 0 && n !== value.trim()) : options;
    return list.slice(0, SHOP_CHIPS);
  }, [value, options]);
  return (
    <div className="kb-field">
      <label className="kb-label">{label}</label>
      <input className="kb-input" value={value} onChange={(ev) => onChange(ev.target.value)} placeholder="無印良品" />
      {hits.length > 0 && (
        <div className="kb-chips kb-shopchips">
          {hits.map((n) => (
            <button key={n} className="kb-tagchip" onPointerDown={(ev) => ev.preventDefault()}
                    onClick={() => onChange(n)}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupScreen({ onSave }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    const n = name.trim();
    const v = url.trim();
    if (!n) { setErr("家計簿の名前を入れてください。"); return; }
    if (!validUrl(v)) {
      setErr("Apps Scriptのウェブアプリの URL（/exec で終わるもの）を貼り付けてください。");
      return;
    }
    onSave(n, v);
  }
  return (
    <div className="kb-setup">
      <h1>家計簿の設定</h1>
      <p>家計簿の名前と、データの保存先になるApps ScriptのウェブアプリのURLを入れてください。この端末に記憶され、次回からは聞きません。あとから増やせます。</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="家計簿の名前" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..../exec" spellCheck={false} />
      {err && <div className="kb-err">{err}</div>}
      <button onClick={submit}>保存して開く</button>
    </div>
  );
}

/**
 * 予算タブ。手書きの一覧表と同じ並びで見せる。
 *
 * 上が月の部（月間予算の各件・年間予算のまとめ・残り）、下が年の部（年間予算の各件）。
 * 収入を起点にして、月間と年間を引いた残りが「残り」のグループに入る。
 * 残りのグループが無い家計簿では、引いた額を「余り」として出す。
 * 予算を置かないグループは、一番下に名前だけ並べる。
 */
function BudgetTab({ year, plan, cats, groupDefs, named, onEdit }) {
  const inGroup = (name) => cats.filter((c) => c.group === name);
  const groupsOf = (kind) => groupDefs.filter((g) => g.kind === kind);
  const catsOf = (kind) => groupsOf(kind).flatMap((g) => inGroup(g.name));

  const monthCats = catsOf(KIND_MONTH);
  const yearCats = catsOf(KIND_YEAR);
  const restCats = catsOf(KIND_REST);
  const noneCats = catsOf(KIND_NONE);
  // グループに名前を付けている家計簿では、1つでも見出しを出す。
  // 設定していない家計簿（ゆき）では、月＝固定費・年＝予定費と決まっているので出さない
  const showHead = (kind) => named || groupsOf(kind).filter((g) => inGroup(g.name).length).length > 1;

  const Row = ({ label, amount, memo, onClick, derived, strong }) => (
    <button className="kb-row kb-bgrow" onClick={onClick} disabled={!onClick}>
      <div className="kb-rowmain">
        <div className="kb-rowtitle" style={strong ? { fontWeight: 700 } : undefined}>{label}</div>
        {/* 引き落とし先は一覧に出さない（編集シートでは設定できる） */}
        {memo ? <div className="kb-rowsub">{memo}</div> : null}
      </div>
      <span className="kb-amount" style={derived ? { color: "var(--pending)" } : undefined}>
        {amount === null ? "\u2014" : yenExact(amount)}
      </span>
      {onClick ? <ChevronRight size={17} className="kb-chev" /> : <span style={{ width: 17 }} />}
    </button>
  );

  /** グループごとに見出しを挟みながらカテゴリを並べる。 */
  const Section = ({ kind, amountOf, editKind, subOf }) => (
    <>
      {groupsOf(kind).map((g) => {
        const list = inGroup(g.name);
        if (!list.length) return null;
        return (
          <React.Fragment key={g.name}>
            {showHead(kind) && <div className="kb-section-label sub">{g.name}</div>}
            <div className="kb-card">
              {list.map((c) => (
                <Row
                  key={c.id}
                  label={c.name}
                  amount={amountOf(c)}
                  memo={subOf ? subOf(c) : (plan.per[c.id] ? plan.per[c.id].memo : "")}
                  onClick={() => onEdit({ target: c.id, label: c.name, kind: editKind })}
                />
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <>
      <div className="kb-section-label">収入（月）</div>
      <div className="kb-card">
        <Row
          label="毎月の収入"
          amount={plan.income.monthly}
          memo={plan.income.memo}
          strong
          onClick={() => onEdit({ target: INCOME_TARGET, label: "毎月の収入", kind: "income" })}
        />
      </div>
      <div className="kb-note">
        {plan.hasRest
          ? `この金額を月間予算と年間予算に割り振り、残りが${restCats.length ? restCats[0].name : "残り"}になります。`
          : "この金額と予算の合計との差が、下の余りになります。"}
        年間では {yenExact(plan.income.annual)} です。
      </div>

      <div className="kb-section-label">月</div>
      <Section kind={KIND_MONTH} amountOf={(c) => (plan.per[c.id] ? plan.per[c.id].monthly : 0)} editKind="monthly" />
      {(yearCats.length > 0 || restCats.length > 0 || !plan.hasRest) && (
        <div className="kb-card">
          {restCats.map((c) => (
            <Row
              key={c.id}
              label={c.name}
              amount={plan.per[c.id] ? plan.per[c.id].monthly : 0}
              memo={(plan.per[c.id] && plan.per[c.id].memo) || "収入から月間予算と年間予算を引いた残り"}
              derived
              onClick={() => onEdit({ target: c.id, label: c.name, kind: "note" })}
            />
          ))}
          {yearCats.length > 0 && (
            <Row label="年間予算" amount={plan.yearAnnual / 12} memo="下の年間予算の合計を12で割った額" derived />
          )}
          {!plan.hasRest && (
            <Row label="余り" amount={plan.restAnnual / 12} memo="収入から予算の合計を引いた額" derived />
          )}
        </div>
      )}

      <div className="kb-card" style={{ marginTop: 10 }}>
        <div className="kb-bgtotal">
          <span>合計（月）</span>
          <b>{yenExact(plan.income.monthly)}</b>
        </div>
        <div className="kb-bgtotal sub">
          <span>×12</span>
          <b>{yenExact(plan.income.annual)}</b>
        </div>
      </div>

      <div className="kb-section-label">年</div>
      {yearCats.length === 0 ? (
        <div className="kb-card"><div className="kb-empty">年間予算のカテゴリがありません</div></div>
      ) : (
        <Section
          kind={KIND_YEAR}
          amountOf={(c) => (plan.per[c.id] ? plan.per[c.id].annual : 0)}
          editKind="annual"
          /* 年額だけだと月にいくら使えるのか分からないので、12で割った額を添える */
          subOf={(c) => [
            `月平均 ${yenExact(plan.per[c.id] ? plan.per[c.id].annual / 12 : 0)}`,
            plan.per[c.id] ? plan.per[c.id].memo : "",
          ].filter(Boolean).join("　")}
        />
      )}

      {yearCats.length > 0 && (
        <div className="kb-card" style={{ marginTop: 10 }}>
          <div className="kb-bgtotal">
            <span>合計（年）</span>
            <b>{yenExact(plan.yearAnnual)}</b>
          </div>
          <div className="kb-bgtotal sub">
            <span>÷12</span>
            <b>{yenExact(plan.yearAnnual / 12)}</b>
          </div>
        </div>
      )}

      {noneCats.length > 0 && (
        <>
          <div className="kb-section-label">予算外</div>
          <div className="kb-card">
            {noneCats.map((c) => (
              <Row key={c.id} label={c.name} amount={null}
                   memo={plan.per[c.id] ? plan.per[c.id].memo : ""}
                   onClick={() => onEdit({ target: c.id, label: c.name, kind: "note" })} />
            ))}
          </div>
          <div className="kb-note">予算を置かないカテゴリです。使った額は実績タブで見られます。</div>
        </>
      )}

      <div className="kb-note">
        {year}年の予算です。上の年を切り替えると、その年の予算を別に持てます。
        オレンジの金額は計算で出たものなので、直接は変えられません。
      </div>
    </>
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

  const [needsSetup, setNeedsSetup] = useState(!KakeiboAPI.books().length);
  // いま見ている家計簿。切り替えたらここが変わり、読み込みからやり直す
  const [bookId, setBookId] = useState(() => KakeiboAPI.currentBookId());
  const [booksOpen, setBooksOpen] = useState(false);
  // 家計簿の名前や並びを変えたときに、画面を描き直させるためだけの目印
  const [, bumpBooks] = useState(0);
  const [tab, setTab] = useState("record");
  const [year, setYear] = useState(realYear);

  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [budgets, setBudgets] = useState([]);

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
  const [enMethod, setEnMethod] = useState("");
  const [enAmount, setEnAmount] = useState("");
  const [enType, setEnType] = useState("expense");
  const [enPending, setEnPending] = useState(true);
  const [enSettled, setEnSettled] = useState(false);   // 立て替えたぶんを精算したか
  const [enShop, setEnShop] = useState("");            // 店名。内容とは別に持つ
  const [settleTag, setSettleTag] = useState(null);    // 未精算の一覧の絞り込み（内訳）
  const [settleConfirm, setSettleConfirm] = useState(false);
  const [enError, setEnError] = useState("");
  const [enConfirmDel, setEnConfirmDel] = useState(false);

  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catMode, setCatMode] = useState("add");
  const [catEditId, setCatEditId] = useState(null);
  const [fName, setFName] = useState("");
  const [fGroup, setFGroup] = useState("");
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
  const [tkShop, setTkShop] = useState("");   // 店名。内容とは別に持つ
  const [tkParty, setTkParty] = useState("");
  const [tkAmount, setTkAmount] = useState("");
  const [tkPending, setTkPending] = useState(true);
  const [tkError, setTkError] = useState("");
  const [tkConfirmDel, setTkConfirmDel] = useState(false);
  const [tkMethod, setTkMethod] = useState("");

  const [trFormOpen, setTrFormOpen] = useState(false);
  const [trEditId, setTrEditId] = useState(null);
  const [trDate, setTrDate] = useState("");
  const [trFrom, setTrFrom] = useState("");
  const [trTo, setTrTo] = useState("");
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
    setBudgets(d.budgets || []);
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

  // bookId が変わると、切り替えた先の控えを出してから読み直す
  useEffect(() => {
    if (needsSetup) { setLoading(false); return; }
    setLoadError("");
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
  }, [needsSetup, bookId, load, applyData]);

  /**
   * 控えを取り直す。
   * 送信し終わっていて読み込みにも失敗していないときだけにする。
   * 途中の状態を控えると、次に開いたときスプレッドシートと食い違う。
   */
  useEffect(() => {
    if (needsSetup || loading || loadError || refreshing) return;
    if (sync.pending > 0 || sync.sending) return;
    const t = setTimeout(() => {
      KakeiboAPI.writeSnapshot({ categories, entries, transfers, settlements, budgets });
    }, 800);
    return () => clearTimeout(t);
  }, [categories, entries, transfers, settlements, budgets,
      sync.pending, sync.sending, needsSetup, bookId, loading, loadError, refreshing]);

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

  /* ---- 予算の編集 ---- */

  const [bgTarget, setBgTarget] = useState(null); // { target, label, kind } kind: monthly|annual|income
  const [bgAmount, setBgAmount] = useState("");
  const [bgMethod, setBgMethod] = useState("");
  const [bgMemo, setBgMemo] = useState("");
  const [bgError, setBgError] = useState("");

  /* ---- 年ごとの予算 ---- */

  /**
   * この家計簿のグループと、予算の持ち方。
   * 設定の行が無ければ、これまでどおり 自由費・予定費・固定費 で動く。
   */
  const groupDefs = useMemo(() => {
    const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === GROUP_ROW);
    const saved = row && parseGroups(row.tags);
    if (saved) return saved;
    // 設定が無い家計簿。すでに従来のグループのカテゴリがあれば、これまでどおり動かす。
    // 中身が空の家計簿には何も置かない。ほかの家計簿の分け方を持ち込まないため
    const used = categories.filter((c) => !isMaster(c)).map((c) => c.group);
    return LEGACY_GROUPS.some((g) => used.indexOf(g.name) >= 0) ? LEGACY_GROUPS : [];
  }, [categories]);
  const groupOrder = useMemo(() => groupDefs.map((g) => g.name), [groupDefs]);
  const kindOf = useCallback((name) => {
    const g = groupDefs.find((x) => x.name === name);
    return g ? g.kind : KIND_NONE;
  }, [groupDefs]);

  /**
   * グループの一覧を保存する。
   * 名前を変えたときは、そのグループのカテゴリも新しい名前に付け替える。
   * 付け替えないと、どのグループにも属さないカテゴリができて画面から消える。
   */
  function saveGroups(defs, oldName, newName) {
    if (oldName && newName && oldName !== newName) {
      const moved = categories
        .filter((c) => !isMaster(c) && c.group === oldName)
        .map((c) => Object.assign({}, c, { group: newName }));
      if (moved.length) {
        setCategories((p) => p.map((c) => moved.find((m) => m.id === c.id) || c));
        moved.forEach(saveCategory);
      }
    }
    writeGroups(defs);
  }

  function writeGroups(defs) {
    const row = {
      id: GROUP_ROW, name: "グループ", group: FEATURE_GROUP,
      monthlyBudget: 0, annualBudget: 0, tags: serializeGroups(defs), note: "",
    };
    setCategories((p) => (p.some((c) => c.id === GROUP_ROW)
      ? p.map((c) => (c.id === GROUP_ROW ? row : c))
      : [...p, row]));
    saveCategory(row);
  }


  /**
   * その年の予算を組み立てる。
   *
   * グループごとに持ち方が違う。月間は月額、年間は年額をマスターにし、
   * 予算外は金額を持たない。「残り」のグループがあれば、
   * 収入から他をすべて引いた額がそこに入る（ゆきの自由費）。
   * 残りのグループが無い家計簿では、引いた額を「余り」として出す。
   *
   * budgets シートが無い、またはその年の行が1件も無いときは、
   * カテゴリが持っている従来の予算をそのまま使う。貼り替え前でも画面が壊れないようにするため。
   */
  const budgetPlan = useMemo(() => {
    const rows = budgets.filter((b) => b.year === year);
    const byTarget = {};
    rows.forEach((b) => { byTarget[b.target] = b; });
    const live = rows.length > 0;

    const cats = categories.filter((c) => !isMaster(c));
    const per = {};

    let monthAnnual = 0;    // 月間予算のグループの年額合計
    let yearAnnual = 0;     // 年間予算のグループの年額合計
    cats.forEach((c) => {
      const row = byTarget[c.id];
      const kind = kindOf(c.group);
      if (kind === KIND_MONTH) {
        const monthly = live ? (row ? row.monthly : 0) : (Number(c.monthlyBudget) || 0);
        per[c.id] = { monthly, annual: monthly * 12, method: row ? row.method : "", memo: row ? row.memo : "" };
        monthAnnual += monthly * 12;
      } else if (kind === KIND_YEAR) {
        const annual = live ? (row ? row.annual : 0) : (Number(c.annualBudget) || 0);
        per[c.id] = { monthly: annual / 12, annual, method: row ? row.method : "", memo: row ? row.memo : "" };
        yearAnnual += annual;
      } else if (kind === KIND_NONE) {
        per[c.id] = { monthly: 0, annual: 0, method: row ? row.method : "", memo: row ? row.memo : "", none: true };
      }
    });

    // 収入。行が無いうちは、月間と年間と従来の残りを足した額を初期値として見せる
    const restCats = cats.filter((c) => kindOf(c.group) === KIND_REST);
    const legacyRestAnnual = restCats.reduce((a, c) => a + (Number(c.monthlyBudget) || 0) * 12, 0);
    const incomeRow = byTarget[INCOME_TARGET];
    // 行が無いうちは、Excelの予算表と同じ出し方にする。
    // 年間の月額を丸めてから足すので、ここでは端数が出ない
    const legacyIncomeMonthly =
      monthAnnual / 12 + legacyRestAnnual / 12 + Math.round(yearAnnual / 12);
    const incomeMonthly = live && incomeRow ? incomeRow.monthly : legacyIncomeMonthly;
    const incomeAnnual = incomeMonthly * 12;

    // 残りのグループがあれば、引いた額をその頭のひとつに寄せる
    const restAnnual = incomeAnnual - monthAnnual - yearAnnual;
    restCats.forEach((c, i) => {
      const a = i === 0 ? restAnnual : 0;
      const row = byTarget[c.id];
      per[c.id] = { monthly: a / 12, annual: a, method: row ? row.method : "", memo: row ? row.memo : "", derived: true };
    });

    return {
      live,
      rows,
      per,
      income: { monthly: incomeMonthly, annual: incomeAnnual, method: incomeRow ? incomeRow.method : "", memo: incomeRow ? incomeRow.memo : "" },
      monthAnnual,
      yearAnnual,
      // 残りのグループが無い家計簿では、これが「余り」になる
      restAnnual,
      hasRest: restCats.length > 0,
    };
  }, [budgets, categories, year, kindOf]);

  function openBudget(t) {
    const row = budgetPlan.rows.find((b) => b.target === t.target);
    const cur = t.target === INCOME_TARGET
      ? budgetPlan.income
      : (budgetPlan.per[t.target] || { monthly: 0, annual: 0, method: "", memo: "" });
    const amount = t.kind === "annual" ? cur.annual : cur.monthly;
    setBgTarget(t);
    setBgAmount(amount ? String(Math.round(amount)) : "");
    setBgMethod(row ? row.method : (cur.method || ""));
    setBgMemo(row ? row.memo : (cur.memo || ""));
    setBgError("");
  }

  function submitBudget() {
    const t = bgTarget;
    const amount = amountValue(bgAmount);
    if (t.kind !== "note" && (bgAmount === "" || isNaN(amount) || amount < 0)) {
      setBgError("金額を正しく入力してください"); return;
    }
    const existing = budgets.find((b) => b.year === year && b.target === t.target);
    const rec = {
      id: existing ? existing.id : KakeiboAPI.newId("b_"),
      year,
      target: t.target,
      // 自由費は計算で出るので金額は持たせない
      monthly: t.kind === "note" || t.kind === "annual" ? 0 : amount,
      annual: t.kind === "annual" ? amount : 0,
      method: bgMethod,
      memo: bgMemo.trim(),
    };

    // その年の行がまだ1件も無いときは、いま見えている内容をまとめて書き出す。
    // 1件だけ保存すると、残りが0になったように見えてしまう。
    const extra = [];
    if (!budgetPlan.live) {
      const seed = (target, kind, monthly, annual) => {
        if (target === t.target) return;
        extra.push({
          id: KakeiboAPI.newId("b_"), year, target,
          monthly: kind === "annual" ? 0 : monthly,
          annual: kind === "annual" ? annual : 0,
          method: "", memo: "",
        });
      };
      seed(INCOME_TARGET, "income", Math.round(budgetPlan.income.monthly), 0);
      budgetCats.forEach((c) => {
        const b = budgetPlan.per[c.id];
        if (!b) return;
        const k = kindOf(c.group);
        if (k === KIND_MONTH) seed(c.id, "monthly", b.monthly, 0);
        else if (k === KIND_YEAR) seed(c.id, "annual", 0, b.annual);
        else if (k === KIND_NONE) seed(c.id, "annual", 0, 0);
      });
    }

    const all = [rec, ...extra];
    setBudgets((prev) => {
      const rest = prev.filter((b) => !all.some((x) => x.year === b.year && x.target === b.target));
      return [...rest, ...all];
    });
    all.forEach((r) => KakeiboAPI.save("budgets", r));
    setBgTarget(null);
    flash(`${t.label}の予算を保存しました`);
  }

  const budgetOf = useCallback(
    (c) => budgetPlan.per[c.id] || { monthly: 0, annual: 0, method: "", memo: "" },
    [budgetPlan]
  );

  /* ---- 立替先と支払方法（categories に相乗りしている） ---- */

  // 予算のカテゴリだけを取り出す。画面と集計はすべてこちらを使う
  /**
   * 予算のカテゴリだけを取り出し、決めた並び順にする。
   * 並び順は設定の1行に id を並べて持つ。そこに無いものは後ろへ回す。
   * シートの行の順に頼ると、直すたびに順番が変わってしまうため。
   */
  const budgetCats = useMemo(() => {
    const list = categories.filter((c) => !isMaster(c));
    const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === CATORDER_ROW);
    if (!row || !row.tags.length) return list;
    const at = {};
    row.tags.forEach((id, i) => { at[id] = i; });
    return list.slice().sort((a, b) => {
      const ia = at[a.id] === undefined ? 9999 : at[a.id];
      const ib = at[b.id] === undefined ? 9999 : at[b.id];
      return ia === ib ? 0 : ia - ib;
    });
  }, [categories]);

  /** カテゴリの並び順を保存する。渡された順にそのまま覚える。 */
  function saveCatOrder(list) {
    const row = {
      id: CATORDER_ROW, name: "カテゴリの並び", group: FEATURE_GROUP,
      monthlyBudget: 0, annualBudget: 0, tags: list.map((c) => c.id), note: "",
    };
    setCategories((p) => (p.some((c) => c.id === CATORDER_ROW)
      ? p.map((c) => (c.id === CATORDER_ROW ? row : c))
      : [...p, row]));
    saveCategory(row);
  }

  /**
   * グループの中でカテゴリを1つ動かす。
   * 並び順は家計簿ぜんぶで1本なので、動かしたあとにグループ順で並べ直して保存する。
   */
  function moveCat(cat, delta) {
    const inGroup = budgetCats.filter((c) => c.group === cat.group);
    const i = inGroup.findIndex((c) => c.id === cat.id);
    const moved = moveItem(inGroup, i, delta);
    if (moved === inGroup) return;
    const out = [];
    groupOrder.forEach((g) => {
      out.push(...(g === cat.group ? moved : budgetCats.filter((c) => c.group === g)));
    });
    // どのグループにも属さないカテゴリが残っていたら後ろに付ける
    budgetCats.forEach((c) => { if (out.indexOf(c) < 0) out.push(c); });
    saveCatOrder(out);
  }

  const masterRowsOf = useCallback(
    (group) => categories.filter((c) => c.group === group),
    [categories]
  );

  const namesOf = useCallback((group) => masterRowsOf(group).map((r) => r.name), [masterRowsOf]);

  const parties = useMemo(() => namesOf(PARTY_GROUP), [namesOf]);
  const partyRows = useMemo(() => masterRowsOf(PARTY_GROUP), [masterRowsOf]);

  const methods = useMemo(() => namesOf(METHOD_GROUP), [namesOf]);

  /**
   * これまでに使った店名。よく使う順に並べる。
   * 明細と立替の両方から集めるので、立替で入れた店も明細で選べる。
   */
  const shopOptions = useMemo(() => {
    const count = {};
    const add = (v) => {
      const t = String(v || "").trim();
      if (t) count[t] = (count[t] || 0) + 1;
    };
    entries.forEach((e) => add(e.shop));
    settlements.forEach((s) => add(s.shop));
    return Object.keys(count).sort((a, b) => (count[b] - count[a]) || a.localeCompare(b, "ja"));
  }, [entries, settlements]);

  /* ---- この家計簿で使う機能 ---- */

  /**
   * 使わない機能は categories の1行に相乗りさせて持つ。
   * 行が無ければ全部使う。おうちのように立替も振替も使わない家計簿があるため。
   */
  // 明細の精算は列を1つ増やしている。貼り替えていないうちは出さない
  const canSettleEntry = KakeiboAPI.supports("entries", "settled");
  // 店名も同じ。貼り替え前は欄を出さない。入れても保存されずに消えるため
  const canShop = KakeiboAPI.supports("entries", "shop");
  const tkCanShop = KakeiboAPI.supports("settlements", "shop");

  const uses = useMemo(() => {
    const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === FEATURE_ROW);
    const saved = row ? row.tags : [];
    const out = {};
    FEATURES.forEach((f) => {
      out[f.key] = f.defaultOff ? saved.indexOf("+" + f.key) >= 0 : saved.indexOf(f.key) < 0;
    });
    return out;
  }, [categories]);

  function toggleUse(key, on) {
    const state = (f) => (f.key === key ? on : uses[f.key]);
    const off = FEATURES
      .filter((f) => (f.defaultOff ? state(f) : !state(f)))
      .map((f) => (f.defaultOff ? "+" + f.key : f.key));
    const row = {
      id: FEATURE_ROW, name: "使わない機能", group: FEATURE_GROUP,
      monthlyBudget: 0, annualBudget: 0, tags: off, note: "",
    };
    setCategories((p) => (p.some((c) => c.id === FEATURE_ROW)
      ? p.map((c) => (c.id === FEATURE_ROW ? row : c))
      : [...p, row]));
    saveCategory(row);
  }

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

  function addMaster(group, rawName) {
    const name = (rawName || "").trim();
    if (!name) return "名前を入力してください";
    if (namesOf(group).indexOf(name) >= 0) return "同じ名前がすでにあります";

    const row = makeMasterRow(group, name);
    setCategories((p) => [...p, row]);
    saveCategory(row);
    return "";
  }

  function renameMaster(group, oldName, rawName) {
    const name = (rawName || "").trim();
    if (!name) return "名前を入力してください";
    if (name === oldName) return "";
    if (namesOf(group).indexOf(name) >= 0) return "同じ名前がすでにあります";

    const target = masterRowsOf(group).find((r) => r.name === oldName);
    if (!target) return "見つかりませんでした";
    const updated = { ...target, name };
    setCategories((p) => p.map((c) => (c.id === target.id ? updated : c)));
    saveCategory(updated);

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
    const target = masterRowsOf(group).find((r) => r.name === name);
    if (!target) return "見つかりませんでした";
    setCategories((p) => p.filter((c) => c.id !== target.id));
    KakeiboAPI.remove("categories", target.id);
    return "";
  }

  // 履歴の絞り込みでは、月間予算のグループは1件ずつ出さずにまとめて扱う。
  // 毎月の引き落としが並ぶだけで、1件ずつ選ぶ意味が薄いため。
  // ゆきの固定費3件、おうちの光熱費3件がこれにあたる。
  const monthlyGroups = useMemo(
    () => groupDefs.filter((g) => g.kind === KIND_MONTH && budgetCats.some((c) => c.group === g.name)),
    [groupDefs, budgetCats]
  );
  // カテゴリのid → まとめる先のグループ名
  const groupedCatIds = useMemo(() => {
    const m = {};
    budgetCats.forEach((c) => { if (kindOf(c.group) === KIND_MONTH) m[c.id] = c.group; });
    return m;
  }, [budgetCats, kindOf]);

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
    setEnMemo(""); setEnShop("");
    setEnAmount("");
    setEnType("expense");
    if (!uses.method) setEnMethod("");
    // 入力した時点では金額は未確定。確定の管理を使わない家計簿では最初から確定にする
    setEnPending(uses.pending);
    setEnSettled(false);   // 入れた時点では未精算
    setEnError("");
    setEnConfirmDel(false);
  }
  function openEntryEdit(cat, entry) {
    if (!cat) return;
    setEntryTarget({ catId: cat.id, entryId: entry.id });
    setEnDate(entry.date || `${year}-01-01`);
    setEnTag(entry.tag || cat.tags[0] || "");
    setEnMemo(entry.memo || ""); setEnShop(entry.shop || "");
    setEnMethod(entry.method || methods[0]);
    // 式で入れた記録は式のまま出す。金額を手で打ち直せば式は消える
    setEnAmount(entry.formula || String(Math.abs(Number(entry.amount) || 0)));
    setEnType(isIncome(entry) ? "income" : "expense");
    setEnPending(!!entry.pending);
    setEnSettled(!!entry.settled);
    setEnError("");
    setEnConfirmDel(false);
  }
  /**
   * 入力中にカテゴリを切り替える。
   * 内訳の選択肢もそのカテゴリのものに入れ替わるので、
   * いま選んでいる内訳が新しいカテゴリに無ければ先頭に寄せる。
   */
  function pickEntryCat(id) {
    const next = budgetCats.find((c) => c.id === id);
    if (!next) return;
    setEntryTarget((t) => ({ ...t, catId: id }));
    setEnTag((tag) => (next.tags.indexOf(tag) >= 0 ? tag : (next.tags[0] || "")));
  }

  function closeEntry() { setEntryTarget(null); setEnError(""); setEnConfirmDel(false); backToDetail(); }

  function submitEntry() {
    const amount = amountValue(enAmount);
    if (!enDate) { setEnError("日付を入力してください"); return; }
    if (!enAmount || isNaN(amount) || amount === 0) { setEnError("金額を入力してください"); return; }
    const { catId, entryId } = entryTarget;
    const absAmount = Math.abs(amount);

    if (entryId) {
      const updated = {
        id: entryId, categoryId: catId, date: enDate, amount: absAmount,
        type: enType, tag: enTag, memo: enMemo.trim(), method: enMethod, pending: enPending,
      };
      if (KakeiboAPI.supports("entries", "formula")) updated.formula = enteredFormula(enAmount);
      if (canSettleEntry) updated.settled = enSettled;
      if (canShop) updated.shop = enShop.trim();
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
    if (KakeiboAPI.supports("entries", "formula")) created.formula = enteredFormula(enAmount);
    if (canSettleEntry) created.settled = enSettled;
    if (canShop) created.shop = enShop.trim();
    setEntries((prev) => [...prev, created]);
    saveEntry(created);
    // 1件入れて閉じる使い方が多いので、記録したらシートを閉じる。
    // もともとは連続入力のために開いたままにしていた
    closeEntry();
    flash(`${Number(enDate.slice(5, 7))}/${Number(enDate.slice(8, 10))}　${enType === "income" ? "収入 " : ""}${yen(absAmount)} を記録しました`);
  }

  function deleteEntry(entryId) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    KakeiboAPI.remove("entries", entryId);
    if (entryTarget && entryTarget.entryId === entryId) closeEntry();
    flash("記録を削除しました");
  }

  function fillTwelveMonths(cat) {
    const amount = Math.round(budgetOf(cat).monthly);
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
    setFName(""); setFGroup(groupOrder[0] || ""); setFAmount(""); setFTags([]); setFTagInput("");
    setFNote(""); setFError("");
    setCatFormOpen(true);
  }
  function openCatEdit(cat) {
    setCatMode("edit"); setCatEditId(cat.id);
    setFName(cat.name); setFGroup(cat.group);
    setFAmount(String(kindOf(cat.group) === KIND_YEAR ? cat.annualBudget || "" : cat.monthlyBudget || ""));
    setFTags([...cat.tags]); setFTagInput(""); setFNote(cat.note || ""); setFError("");
    setCatFormOpen(true);
  }
  function pickGroup(g) {
    setFGroup(g);
    if (catMode === "add") {
      setFName(""); setFAmount(""); setFTags([]);
      // 自由費には内訳の下地を入れておく。ほかは家計簿ごとに違うので空から
      if (DEFAULT_TAGS[g]) setFTags([...DEFAULT_TAGS[g]]);
    }
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
    if (!budgetPlan.live && (!fAmount || isNaN(amount) || amount < 0)) {
      setFError("予算額を正しく入力してください"); return;
    }

    if (catMode === "add") {
      const created = {
        id: KakeiboAPI.newId("c_"), name, group: fGroup,
        monthlyBudget: kindOf(fGroup) === KIND_YEAR ? 0 : amount,
        annualBudget: kindOf(fGroup) === KIND_YEAR ? amount : 0,
        tags: [...fTags], note: fNote.trim(),
      };
      setCategories((p) => [...p, created]);
      saveCategory(created);
    } else {
      const base = catById(catEditId);
      const updated = {
        ...base, name, group: fGroup,
        monthlyBudget: kindOf(fGroup) === KIND_YEAR ? 0 : amount,
        annualBudget: kindOf(fGroup) === KIND_YEAR ? amount : 0,
        tags: [...fTags], note: fNote.trim(),
      };
      setCategories((p) => p.map((c) => (c.id === catEditId ? updated : c)));
      saveCategory(updated);

      // グループを変えると、予算のマスターが月額と年額で入れ替わる。
      // 金額を移し替えないと、入れたはずの予算が0になったように見える。
      // 年をまたいで持っているので、その年だけでなく全部の年を直す。
      if (base && base.group !== fGroup) {
        const moved = budgets
          .filter((b) => b.target === catEditId)
          .map((b) => {
            if (kindOf(fGroup) === KIND_YEAR) {
              return Object.assign({}, b, { annual: b.annual || b.monthly * 12, monthly: 0 });
            }
            if (kindOf(fGroup) === KIND_MONTH) {
              return Object.assign({}, b, { monthly: b.monthly || Math.round(b.annual / 12), annual: 0 });
            }
            // 残りは計算で出す。予算外は金額を持たない
            return Object.assign({}, b, { monthly: 0, annual: 0 });
          });
        if (moved.length) {
          setBudgets((p) => p.map((b) => moved.find((m) => m.id === b.id) || b));
          moved.forEach((m) => KakeiboAPI.save("budgets", m));
        }
      }
    }
    setCatFormOpen(false);
  }
  /* ---- 家計簿の切り替え ---- */

  /**
   * 別の家計簿へ移る。
   *
   * 未送信が残っていると、どの家計簿へ送るはずだったのか分からなくなる。
   * 送り終わってから切り替え、送れなければ切り替えずに理由を出す。
   * 絞り込みや開いている明細は、切り替え先には無いものを指しているので戻す。
   */
  function pickBook(id) {
    if (id === KakeiboAPI.currentBookId()) { setBooksOpen(false); return; }
    KakeiboAPI.switchTo(id).then(() => {
      setHistCat(null);
      setHistMonth(null);
      setDetail(null);
      setLoading(true);
      setBookId(id);
      setBooksOpen(false);
      flash(`${KakeiboAPI.currentBookName()}に切り替えました`);
    }).catch((err) => {
      flash(`未送信が送れないため切り替えられません。${err.message || err}`);
    });
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
    // 予算の行も一緒に消す。残すとシートに参照先の無い行がたまる
    budgets.filter((b) => b.target === id).forEach((b) => KakeiboAPI.remove("budgets", b.id));
    setBudgets((p) => p.filter((b) => b.target !== id));
    setCatDeleteId(null);
  }

  /* ---- 立替 ---- */

  function openTkNew() {
    setTkEditId(null); setTkDate(todayInYear()); setTkMemo(""); setTkShop(""); setTkParty(parties[0]); setTkAmount("");
    setTkConfirmDel(false); setTkMethod(methods[0]);
    setTkPending(true); setTkError("");
    setTkFormOpen(true);
  }
  function openTkEdit(t) {
    setTkEditId(t.id); setTkDate(t.date || ""); setTkMemo(t.memo || ""); setTkShop(t.shop || "");
    setTkParty(t.party || parties[0]);
    setTkConfirmDel(false); setTkMethod(t.method || methods[0]);
    // 式で入れた記録は式のまま出す。金額を手で打ち直せば式は消える
    setTkAmount(t.formula || String(t.amount ?? "")); setTkPending(!!t.pending); setTkError("");
    setTkFormOpen(true);
  }
  function closeTk() { setTkFormOpen(false); setTkEditId(null); setTkError(""); setTkConfirmDel(false); backToDetail(); }
  /**
   * 立替に足した項目。Apps Script が対応していないうちは何も付けない。
   * 付けても保存されないので、入れたつもりで消えるより出さないほうがよい。
   */
  function extraTk() {
    const out = {};
    if (tkSupportsMethod) out.method = tkMethod;
    if (KakeiboAPI.supports("settlements", "formula")) out.formula = enteredFormula(tkAmount);
    if (tkCanShop) out.shop = tkShop.trim();
    return out;
  }

  function submitTk() {
    const memo = tkMemo.trim();
    const amount = amountValue(tkAmount);
    // 店名も内容も任意。店名だけ入れて済ませたいことが多いため
    if (!tkAmount || isNaN(amount) || amount <= 0) { setTkError("金額を正しく入力してください"); return; }
    if (tkEditId) {
      const base = settlements.find((s) => s.id === tkEditId);
      const updated = { ...base, memo, party: tkParty, amount, date: tkDate, pending: tkPending, ...extraTk() };
      setSettlements((p) => p.map((s) => (s.id === tkEditId ? updated : s)));
      saveSettlement(updated);
      flash("立替の記録を更新しました");
    } else {
      const created = { id: KakeiboAPI.newId("s_"), date: tkDate, memo, party: tkParty, amount, settled: false, pending: tkPending, ...extraTk() };
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
    const to = methodAt(6);   // 支払方法が無ければ空
    setTrEditId(null); setTrDate(todayInYear()); setTrFrom(methodAt(0)); setTrTo(to); setTrConfirmDel(false);
    // 内容は振替先の名前を初期値にする。「PASMO」「スタバカード」と書くのが常なので
    setTrAmount(""); setTrMemo(to); setTrPending(true); setTrError("");
    setTrFormOpen(true);
  }
  function openTrEdit(t) {
    setTrEditId(t.id); setTrDate(t.date || todayInYear());
    setTrFrom(t.from || methodAt(0)); setTrTo(t.to || methodAt(6)); setTrConfirmDel(false);
    setTrAmount(String(t.amount ?? "")); setTrMemo(t.memo || ""); setTrPending(!!t.pending); setTrError("");
    setTrFormOpen(true);
  }
  function submitTr() {
    const amount = amountValue(trAmount);
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
    rows.sort((a, b) => {
      const d = a.date === b.date
        ? String(a.id).localeCompare(String(b.id))
        : a.date.localeCompare(b.date);
      return sortAsc ? d : -d;
    });
    return rows;
  }, [yearEntries, yearTransfers, yearSettlements, budgetCats, catIndex, sortAsc]);

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

  /* ---- 明細の精算 ---- */

  /** まだ精算していない明細。立て替えた人（内訳）で絞り込めるようにする。 */
  const unsettledRows = useMemo(() => {
    if (!canSettleEntry) return [];
    const rows = yearEntries
      .filter((e) => !e.settled && !isIncome(e))
      .map((e) => {
        const c = budgetCats.find((x) => x.id === e.categoryId);
        return {
          ...e, kind: "expense", catId: e.categoryId,
          catName: c ? c.name : "（カテゴリなし）",
          color: colorOf(catIndex[e.categoryId]),
        };
      });
    rows.sort((a, b) => {
      const d = a.date === b.date
        ? String(a.id).localeCompare(String(b.id))
        : a.date.localeCompare(b.date);
      return sortAsc ? d : -d;
    });
    return rows;
  }, [canSettleEntry, yearEntries, budgetCats, catIndex, sortAsc]);

  // 絞り込みに出す内訳。もと・ゆきのように立て替えた人を選ぶために使う
  const unsettledTags = useMemo(() => {
    const seen = [];
    unsettledRows.forEach((r) => { if (r.tag && seen.indexOf(r.tag) < 0) seen.push(r.tag); });
    return seen;
  }, [unsettledRows]);

  // 絞っていた内訳が片付くと選択肢から消える。そのままだと一覧が空のままになるので、
  // いま出せる内訳に無い絞り込みは効かせない
  const settleTagNow = settleTag && unsettledTags.indexOf(settleTag) >= 0 ? settleTag : null;
  const shownUnsettled = useMemo(
    () => (settleTagNow ? unsettledRows.filter((r) => r.tag === settleTagNow) : unsettledRows),
    [unsettledRows, settleTagNow]
  );

  /** 精算済みの印を付け外しする。 */
  function markSettled(row, settled) {
    const base = entries.find((e) => e.id === row.id);
    if (!base) return;
    const updated = { ...base, settled };
    setEntries((p) => p.map((e) => (e.id === row.id ? updated : e)));
    saveEntry(updated);
  }

  /** いま見えているぶんをまとめて精算済みにする。 */
  function settleShown() {
    const list = shownUnsettled;
    if (!list.length) return;
    const ids = {};
    list.forEach((r) => { ids[r.id] = true; });
    const updated = entries.filter((e) => ids[e.id]).map((e) => ({ ...e, settled: true }));
    setEntries((p) => p.map((e) => (ids[e.id] ? { ...e, settled: true } : e)));
    updated.forEach(saveEntry);
    setSettleConfirm(false);
    flash(`${updated.length}件を精算済みにしました`);
  }

  const matchesHistCat = useCallback((row) => {
    if (histCat === null) return true;
    if (histCat === "transfer") return row.kind === "transfer";
    if (String(histCat).startsWith(HIST_GROUP)) {
      return row.kind !== "transfer" && groupedCatIds[row.catId] === histCat.slice(HIST_GROUP.length);
    }
    return row.kind !== "transfer" && row.catId === histCat;
  }, [histCat, groupedCatIds]);

  const histMonthTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    yearEntries.forEach((e) => {
      if (histCat === "transfer") return;
      if (String(histCat).startsWith(HIST_GROUP)) {
        if (groupedCatIds[e.categoryId] !== histCat.slice(HIST_GROUP.length)) return;
      } else if (histCat !== null && e.categoryId !== histCat) {
        return;
      }
      arr[monthIdxOf(e.date)] += signedAmount(e);
    });
    return arr;
  }, [yearEntries, histCat, groupedCatIds]);

  /** カテゴリ絞り込みのチップに出す件数。 */
  const histCatCounts = useMemo(() => {
    const m = { transfer: 0 };
    monthlyGroups.forEach((g) => { m[HIST_GROUP + g.name] = 0; });
    allRows.forEach((r) => {
      if (typeof histMonth === "number" && monthIdxOf(r.date) !== histMonth) return;
      if (r.kind === "transfer") { m.transfer += 1; return; }
      m[r.catId] = (m[r.catId] || 0) + 1;
      if (groupedCatIds[r.catId]) m[HIST_GROUP + groupedCatIds[r.catId]] += 1;
    });
    return m;
  }, [allRows, histMonth, groupedCatIds, monthlyGroups]);

  const histRows = allRows
    .filter((e) => typeof histMonth !== "number" || monthIdxOf(e.date) === histMonth)
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

  /* ---- 実績（画面の名前。中では analysis と呼んでいる） ---- */

  const anaRows = useMemo(() => budgetCats.map((c) => {
    const totals = monthlyTotalsOf(c);
    const spent = anaScope === "year" ? totals.reduce((s, v) => s + v, 0) : totals[anaMonth];
    const b = budgetOf(c);
    const budget = anaScope === "year" ? b.annual : b.monthly;
    // 予算外のグループは、そもそも予算を置かないカテゴリ。
    // 残や超過を出しても意味が無いので、印を付けて外しておく
    return { cat: c, spent, budget, color: colorOf(catIndex[c.id]), noBudget: kindOf(c.group) === KIND_NONE };
  }).sort((a, b) => {
    const ga = groupOrder.indexOf(a.cat.group), gb = groupOrder.indexOf(b.cat.group);
    if (ga !== gb) return ga - gb;
    return catIndex[a.cat.id] - catIndex[b.cat.id];
  }), [budgetCats, monthlyTotalsOf, anaScope, anaMonth, catIndex]);

  /**
   * 合計。予算外のカテゴリは予算と突き合わせないので、超過の計算から外す。
   * 混ぜると、予算を守れているかが分からなくなる。
   * 使った額そのものは別に「予算外」として見せる。
   */
  const anaTotal = anaRows.filter((r) => !r.noBudget)
    .reduce((a, r) => ({ spent: a.spent + r.spent, budget: a.budget + r.budget }), { spent: 0, budget: 0 });
  const anaOutside = anaRows.filter((r) => r.noBudget).reduce((a, r) => a + r.spent, 0);

  /**
   * 月平均を出すときに割る月数。
   * 終わった年は12で割る。いまの年は経過したぶんだけで割らないと、
   * まだ使っていない月に薄まって実感より小さく出る。
   */
  const anaMonths = year < realYear ? 12 : year > realYear ? 12 : realMonthIdx + 1;
  const perMonth = useCallback((v) => Math.round(v / anaMonths), [anaMonths]);

  const anaGroups = groupOrder.map((g) => {
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
  }), [partyNames, scopedSettlements]);
  /**
   * 連動でおうちへ写る立替先か。
   *
   * この先については申請という段階が無い。入れた時点でおうちへ届くため。
   * 実際にお金を動かす精算は、おうち側の「精算していない」で管理する。
   * ここで申請の印まで出すと、2つの意味が同じ画面に混ざって分からなくなる。
   */
  const linkedParty = useCallback(
    (name) => partyRows.some((r) => isLinked(r) && r.name === name),
    [partyRows]
  );

  const summaryOf = useCallback(
    (name) => partySummary.find((p) => p.party === name) || { party: name, items: [], unsettled: 0, settled: 0, count: 0 },
    [partySummary]
  );

  /**
   * 立替先を枠でまとめる。連動でできた写しは note に「枠/グループ」が入っている。
   * 枠を持たないものは最後に「このほか」としてまとめる。
   */
  const partyBoxes = useMemo(() => {
    const out = [];
    // 一覧から消した立替先でも、記録が残っていれば出す。見えないと直せなくなる
    const extra = [];
    scopedSettlements.forEach((t) => {
      if (t.party && !partyRows.some((r) => r.name === t.party)
          && !extra.some((r) => r.name === t.party)) {
        extra.push({ id: "x_" + t.party, name: t.party, note: "" });
      }
    });
    partyRows.concat(extra).forEach((r) => {
      const parts = String(r.note || "").split("/");
      const box = (parts[0] || "").trim();
      const grp = (parts[1] || "").trim();
      let b = out.find((x) => x.box === box);
      if (!b) { b = { box, groups: [] }; out.push(b); }
      let g = b.groups.find((x) => x.name === grp);
      if (!g) { g = { name: grp, rows: [] }; b.groups.push(g); }
      g.rows.push(r);
    });
    // 枠のないものを最後に回す
    return out.sort((a, b) => (a.box ? 0 : 1) - (b.box ? 0 : 1));
  }, [partyRows, scopedSettlements]);

  const maxParty = Math.max(...partySummary.map((p) => p.unsettled + p.settled), 1);
  const dPartyItems = detail && detail.type === "party"
    ? scopedSettlements
        .filter((t) => t.party === detail.key)
        .sort((a, b) => (sortAsc ? 1 : -1) * (a.date || "").localeCompare(b.date || ""))
    : [];

  // Apps Script が新しい列を扱えるか。貼り替えるまでは false になり、項目自体を出さない。
  // tag の列も用意してあるが、内容の欄と紛らわしいので画面には出していない
  const tkSupportsMethod = KakeiboAPI.supports("settlements", "method");

  // 何かしら表示できる中身があるか。控えを出している間の読み込み失敗で画面を空にしないため
  const hasData = categories.length > 0 || entries.length > 0
    || transfers.length > 0 || settlements.length > 0;

  const entryCat = entryTarget ? catById(entryTarget.catId) : null;

  const TABS = [
    // 予算は budgets シートを増やしてからでないと保存できないので、
    // 貼り替え前は出さない（入れたのに消えるのを防ぐ）
    ...(KakeiboAPI.supportsTable("budgets") ? [{ key: "budget", label: "予算", icon: Target }] : []),
    { key: "record", label: "記録", icon: PencilLine },
    { key: "history", label: "履歴", icon: ListOrdered },
    { key: "analysis", label: "実績", icon: PieChart },
    ...(uses.settle ? [{ key: "settle", label: "立替", icon: Wallet }] : []),
  ];

  // 立替を使わない家計簿に切り替えたとき、立替タブに居たままにしない
  useEffect(() => {
    if (!uses.settle && tab === "settle") setTab("record");
  }, [uses.settle, tab]);

  /* ---- 描画 ---- */

  if (needsSetup) {
    return <SetupScreen onSave={(n, u) => {
      const b = KakeiboAPI.addBook(n, u);
      setBookId(b.id);
      setNeedsSetup(false);
    }} />;
  }

  return (
    <div className="kb">
      {/* 見出しと状態の帯は、下にたどっても隠れないよう上に貼り付けておく。
          未送信のまま気づかず閉じてしまうのを防ぐのが主な目的。
          帯そのものは画面の端から端まで伸ばし、中身だけを本文と同じ幅に絞る。
          下のタブと同じ作りにして、広い画面でも白い帯がつながって見えるようにしている。 */}
      <div className="kb-stickytop">
        <div className="kb-topbar">
          <div className="kb-bar-inner">
            {/* 見出しはいま開いている家計簿の名前にしてある。
                どの画面にいるかは下のタブの色で分かるので、上に重ねて出す必要が薄い。
                かわりに、どの家計簿を見ているかが常に目に入る */}
            <button className="kb-booktitle" onClick={() => setBooksOpen(true)}>
              <span>{KakeiboAPI.currentBookName() || "家計簿"}</span>
              <ChevronDown size={15} />
            </button>
            <div className="kb-yearpick">
              {/* ほかの端末から入った記録は開き直すまで出てこない。
                  家計は2人で使うので、その場で取り直せるようにしている */}
              <button className="kb-yearbtn" onClick={() => load({ quiet: true })}
                      disabled={refreshing} aria-label="最新を読み込む">
                <RefreshCw size={15} className={refreshing ? "kb-spin" : undefined} />
              </button>
              <button className="kb-yearbtn" onClick={() => setYear((y) => y - 1)} aria-label="前の年"><ChevronLeft size={16} /></button>
              <span className="kb-yearlabel">{year}年</span>
              <button className="kb-yearbtn" onClick={() => setYear((y) => y + 1)} aria-label="次の年"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {sync.error ? (
          <div className="kb-syncbar error">
            <div className="kb-bar-inner">
              <span><b>未送信が{sync.pending}件あります。</b>{sync.error}</span>
              <button className="kb-syncbtn" onClick={() => KakeiboAPI.retry()}>再送</button>
            </div>
          </div>
        ) : sync.pending > 0 && !sync.sending ? (
          <div className="kb-syncbar error">
            <div className="kb-bar-inner">
              <span><b>未送信が{sync.pending}件あります。</b>このまま閉じると失われます。</span>
              <button className="kb-syncbtn" onClick={() => KakeiboAPI.retry()}>送信</button>
            </div>
          </div>
        ) : sync.pending > 0 ? (
          <div className="kb-syncbar pending">
            <div className="kb-bar-inner">
              <Loader2 size={14} className="kb-spin" />
              <span>保存中…（残り{sync.pending}件）</span>
            </div>
          </div>
        ) : loadError && hasData ? (
          <div className="kb-syncbar error">
            <div className="kb-bar-inner">
              <span>最新を取れませんでした。表示は{shownAt ? timeLabel(shownAt) + "時点の" : ""}控えです。</span>
              <button className="kb-syncbtn" onClick={() => load({ quiet: true })}>再読み込み</button>
            </div>
          </div>
        ) : shownAt ? (
          <div className="kb-syncbar stale">
            <div className="kb-bar-inner">
              <Loader2 size={14} className="kb-spin" />
              <span>{timeLabel(shownAt)}時点の内容です。最新を確認しています…</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="kb-wrap">
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
                  <button className="kb-btn ghost" onClick={() => setBooksOpen(true)}>家計簿の設定を見る</button>
                </div>
              </div>
            </div>
          ) : tab === "budget" ? (
            <BudgetTab
              year={year}
              plan={budgetPlan}
              cats={budgetCats}
              groupDefs={groupDefs}
              named={groupDefs !== LEGACY_GROUPS}
              onEdit={openBudget}
            />
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
                groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => (
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
                                  : kindOf(c.group) === KIND_YEAR
                                    ? `年間予算 ${yenExact(budgetOf(c).annual)}`
                                    : kindOf(c.group) === KIND_NONE
                                      ? "予算外"
                                      : `月予算 ${yenExact(budgetOf(c).monthly)}`,
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

              {uses.transfer && (
                <>
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
                </>
              )}

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

              {histMonth !== "pending" && histMonth !== "unsettled" && (
                <div className="kb-chips" style={{ marginTop: 8, marginBottom: 0 }}>
                  <button className={`kb-tagchip ${histCat === null ? "on" : ""}`} onClick={() => setHistCat(null)}>すべて</button>
                  {budgetCats.filter((c) => !groupedCatIds[c.id]).map((c) => {
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
                  {monthlyGroups.map((g) => {
                    const key = HIST_GROUP + g.name;
                    return (
                      <button
                        key={key}
                        className={`kb-tagchip ${histCat === key ? "on" : ""} ${!histCatCounts[key] ? "empty" : ""}`}
                        onClick={() => setHistCat(histCat === key ? null : key)}
                      >
                        {g.name}{histCatCounts[key] ? ` ${histCatCounts[key]}` : ""}
                      </button>
                    );
                  })}
                  {uses.transfer && (
                    <button
                      className={`kb-tagchip ${histCat === "transfer" ? "on" : ""} ${!histCatCounts.transfer ? "empty" : ""}`}
                      onClick={() => setHistCat(histCat === "transfer" ? null : "transfer")}
                    >
                      振替{histCatCounts.transfer ? ` ${histCatCounts.transfer}` : ""}
                    </button>
                  )}
                </div>
              )}

              {(uses.pending || pendingRows.length > 0) && (
              <button
                className={`kb-pendingchip ${histMonth === "pending" ? "on" : ""} ${pendingRows.length === 0 ? "empty" : ""}`}
                onClick={() => setHistMonth(histMonth === "pending" ? null : "pending")}
              >
                <CircleAlert size={15} />
                <span>金額が未確定</span>
                <b>{pendingRows.length}件</b>
                <ChevronRight size={16} className="kb-chev" />
              </button>
              )}
              {uses.esettle && canSettleEntry && (
                <button
                  className={`kb-pendingchip settle ${histMonth === "unsettled" ? "on" : ""} ${unsettledRows.length === 0 ? "empty" : ""}`}
                  onClick={() => { setHistMonth(histMonth === "unsettled" ? null : "unsettled"); setSettleConfirm(false); }}
                >
                  <Wallet size={15} />
                  <span>精算していない</span>
                  <b>{unsettledRows.length}件</b>
                  <ChevronRight size={16} className="kb-chev" />
                </button>
              )}
              {histMonth === "unsettled" ? (
                <>
                  {unsettledTags.length > 1 && (
                    <div className="kb-chips" style={{ marginTop: 8, marginBottom: 0 }}>
                      <button className={`kb-tagchip ${settleTagNow === null ? "on" : ""}`} onClick={() => { setSettleTag(null); setSettleConfirm(false); }}>すべて</button>
                      {unsettledTags.map((t) => (
                        <button key={t} className={`kb-tagchip ${settleTagNow === t ? "on" : ""}`}
                                onClick={() => { setSettleTag(settleTagNow === t ? null : t); setSettleConfirm(false); }}>
                          {t} {unsettledRows.filter((r) => r.tag === t).length}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="kb-detail-total" style={{ paddingTop: 8 }}>
                    <span>未精算 {yen(shownUnsettled.reduce((a, r) => a + r.amount, 0))}</span>
                    <div className="kb-sortwrap">
                      <span className="kb-detail-count">{shownUnsettled.length}件</span>
                      <SortButton asc={sortAsc} onToggle={() => setSortAsc((v) => !v)} />
                    </div>
                  </div>
                  {shownUnsettled.length === 0 ? (
                    <div className="kb-card">
                      <div className="kb-empty">
                        <strong>精算していない記録はありません</strong>
                        立て替えたぶんはここに集まります。
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* まとめて印を付ける。数が多いので、押し間違いを防ぐため2段階にする */}
                      <div className="kb-btn-row" style={{ marginBottom: 10 }}>
                        {settleConfirm ? (
                          <>
                            <button className="kb-btn ghost" onClick={() => setSettleConfirm(false)}>やめる</button>
                            <button className="kb-btn" onClick={settleShown}>
                              {shownUnsettled.length}件を精算済みにする
                            </button>
                          </>
                        ) : (
                          <button className="kb-btn ghost" onClick={() => setSettleConfirm(true)}>
                            <Check size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                            この一覧の{shownUnsettled.length}件をまとめて精算済みにする
                          </button>
                        )}
                      </div>
                      <div className="kb-card">
                        {shownUnsettled.map((r) => (
                          <div className="kb-row" key={r.id} style={{ cursor: "default" }}>
                            <span className="kb-detail-date">
                              {Number(r.date.slice(5, 7))}/{Number(r.date.slice(8, 10))}
                            </span>
                            <RowMain
                              x={r}
                              style={{ cursor: "pointer" }}
                              onClick={() => openEntryEdit(catById(r.catId), r)}
                              sub={[r.catName, r.method].filter(Boolean).join("・")}
                            />
                            <span className="kb-amount" style={amountStyle(r)}>{yen(r.amount)}</span>
                            <button className="kb-iconbtn confirm" onClick={() => markSettled(r, true)} aria-label="精算済みにする">
                              <Check size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="kb-rowsub" style={{ padding: "10px 4px 0", whiteSpace: "normal" }}>
                        精算したものからチェックを押してください。押すとこの一覧から消えます。
                        内訳で絞ってからまとめて押すと、立て替えた人ごとに片付けられます。
                      </div>
                    </>
                  )}
                </>
              ) : histMonth === "pending" ? (
                <>
                  <div className="kb-detail-total" style={{ paddingTop: 8 }}>
                    <span>未確定 {yen(pendingRows.reduce((a, r) => a + r.amount, 0))}</span>
                    <div className="kb-sortwrap">
                      <span className="kb-detail-count">{pendingRows.length}件</span>
                      <SortButton asc={sortAsc} onToggle={() => setSortAsc((v) => !v)} />
                    </div>
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
                            {/* 下段は、一覧にカテゴリの色が出ないぶんどこの記録かを補う。
                                内訳は上段に出るようになったので、ここには重ねない */}
                            <RowMain
                              x={r}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (r.kind === "transfer") openTrEdit(r);
                                else if (r.kind === "settlement") openTkEdit(r);
                                else openEntryEdit(catById(r.catId), r);
                              }}
                              sub={
                                r.kind === "transfer"
                                  ? `振替・${r.from} → ${r.to}`
                                  : r.kind === "settlement"
                                    ? [`立替・${r.party}`, r.method].filter(Boolean).join("・")
                                    : [isIncome(r) ? "収入" : null, r.catName, r.method].filter(Boolean).join("・")
                              }
                            />
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
                            <RowMain x={e} />
                            <span className="kb-amount" style={{ color: e.pending ? "var(--pending)" : "var(--sub)" }}>{yen(e.amount)}</span>
                            <ChevronRight size={17} className="kb-chev" />
                          </button>
                        ) : (
                          <button className="kb-row" key={e.id} onClick={() => openEntryEdit(catById(e.catId), e)}>
                            <div className="kb-dot" style={{ background: e.color }}>{e.catName.slice(0, 1)}</div>
                            <RowMain x={e} />
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
                  {anaScope === "year" && (
                    <span className="kb-total-label">月平均 {yen(perMonth(anaTotal.spent))}</span>
                  )}
                </div>
                <div className="kb-bar">
                  <span style={{
                    width: `${anaTotal.budget > 0 ? Math.min((anaTotal.spent / anaTotal.budget) * 100, 100) : 0}%`,
                    background: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--accent)",
                  }} />
                </div>
                {/* 予算外は予算と突き合わせないので、合計とは別に添える */}
                {anaOutside > 0 && (
                  <div className="kb-total-row" style={{ marginTop: 8 }}>
                    <span className="kb-total-label">予算外 {yen(anaOutside)}</span>
                    <span className="kb-total-label">あわせて {yen(anaTotal.spent + anaOutside)}</span>
                  </div>
                )}
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
                        // 予算外のカテゴリは、使った額だけを出す
                        const showBudget = (anaScope === "year" || kindOf(cat.group) === KIND_REST)
                          && kindOf(cat.group) !== KIND_NONE;
                        // 予算0のカテゴリも、使っていれば超過として出す。
                        // budget > 0 を条件に入れていたころは「残 ¥161,238」と出て逆に見えた
                        const over = showBudget && spent > budget;
                        const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : (spent > 0 ? 100 : 0);
                        return (
                          <button className="kb-row" key={cat.id} onClick={() => openDetail("category", cat.id)}>
                            <div className="kb-dot" style={{ background: color }}>{cat.name.slice(0, 1)}</div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">
                                {cat.name}
                                {cat.note && <span className="kb-titlenote">{cat.note}</span>}
                              </div>
                              {showBudget && (
                                <div className="kb-bar thin">
                                  <span style={{ width: `${pct}%`, background: over ? "var(--red)" : color }} />
                                </div>
                              )}
                              {/* 月平均。年間の予算と月の実感を結びつけるために出す */}
                              {anaScope === "year" && (
                                <div className="kb-rowsub">月平均 {yen(perMonth(spent))}</div>
                              )}

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

              {partyBoxes.length === 0 ? (
                <div className="kb-card" style={{ marginTop: 12 }}>
                  <div className="kb-empty">
                    <strong>立替先がありません</strong>
                    カテゴリ編集から追加してください。
                  </div>
                </div>
              ) : (
                <>
                  <div className="kb-section-label">
                    {/* 連動する先には申請という段階が無いので、見出しは中立な言い方にする */}
                    {tkMonth === null ? "区分ごと" : `${MONTH_LABELS[tkMonth]}の区分ごと`}
                  </div>
                  {/* 枠ごとに見出しを挟む。連動でできた立替先は、
                      連動先のグループの見出しの下に、その並びのまま出る。
                      記録が無くても出すので、どこへ入れるかがここで分かる */}
                  {partyBoxes.map((b) => (
                    <React.Fragment key={b.box || "_"}>
                      {b.box ? <div className="kb-section-label">{b.box}</div>
                             : partyBoxes.length > 1 ? <div className="kb-section-label">このほか</div> : null}
                      {b.groups.map((gp) => {
                        // 枠を持たないものは、記録があるぶんだけ出す
                        const list = b.box ? gp.rows : gp.rows.filter((r) => summaryOf(r.name).count > 0);
                        if (!list.length) return null;
                        return (
                          <React.Fragment key={gp.name || "_"}>
                            {gp.name && <div className="kb-section-label sub">{gp.name}</div>}
                            <div className="kb-card">
                              {list.map((r) => summaryOf(r.name)).map((p) => (
                      <button className="kb-row" key={p.party} onClick={() => openDetail("party", p.party)}>
                        <div className="kb-rowmain">
                          <div className="kb-partytop">
                            <span className="kb-rowtitle">{p.party}</span>
                            <span className="kb-partyamt" style={{
                              color: linkedParty(p.party)
                                ? (p.count > 0 ? "var(--ink)" : "var(--sub)")
                                : (p.unsettled > 0 ? "var(--red)" : "var(--sub)"),
                            }}>
                              {yen(linkedParty(p.party) ? p.unsettled + p.settled : p.unsettled)}
                            </span>
                          </div>
                          <div className="kb-stackbar">
                            <span className="all" style={{ width: `${((p.unsettled + p.settled) / maxParty) * 100}%` }} />
                            {!linkedParty(p.party) && (
                              <span className="un" style={{ width: `${(p.unsettled / maxParty) * 100}%` }} />
                            )}
                          </div>
                          <div className="kb-rowsub">
                            {linkedParty(p.party)
                              ? `${p.count}件・おうちへ連動`
                              : `${p.items.filter((t) => !t.settled).length}件未申請${p.settled > 0 ? `・申請済み ${yen(p.settled)}` : ""}`}
                          </div>
                        </div>
                        <ChevronRight size={17} className="kb-chev" />
                      </button>
                              ))}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {tab === "settle" && !tkFormOpen && !detail && (
          <button className="kb-fab" onClick={openTkNew} aria-label="立替を記録"><Plus size={26} /></button>
        )}

        {/* 実績・立替の明細シート */}
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
                    <span>
                      {linkedParty(detail.key)
                        ? `合計 ${yen(dPartyItems.reduce((a, t) => a + t.amount, 0))}`
                        : `未申請 ${yen(dPartyItems.filter((t) => !t.settled).reduce((a, t) => a + t.amount, 0))}`}
                    </span>
                    <div className="kb-sortwrap">
                      <span className="kb-detail-count">{dPartyItems.length}件</span>
                      <SortButton asc={sortAsc} onToggle={() => setSortAsc((v) => !v)} />
                    </div>
                  </div>
                  <div className="kb-card" style={{ background: "#FAFAFB" }}>
                    {dPartyItems.map((t) => {
                      const linked = linkedParty(t.party);
                      return (
                      <div className={`kb-row ${!linked && t.settled ? "kb-settled" : ""}`} key={t.id} style={{ cursor: "default" }}>
                        <span className="kb-detail-date">
                          {t.date ? `${Number(t.date.slice(5, 7))}/${Number(t.date.slice(8, 10))}` : "—"}
                        </span>
                        <RowMain x={t} kind="settlement" onClick={() => { leaveDetail(); openTkEdit(t); }} style={{ cursor: "pointer" }} />
                        <span className="kb-amount" style={{
                          color: t.pending ? "var(--pending)"
                            : linked ? undefined
                            : t.settled ? "var(--sub)" : "var(--red)",
                        }}>{yen(t.amount)}</span>
                        {linked ? (
                          <span style={{ width: 30 }} />
                        ) : (
                          <button
                            className="kb-iconbtn"
                            onClick={() => toggleSettled(t)}
                            aria-label={t.settled ? "未申請に戻す" : "申請済みにする"}
                          >
                            {t.settled ? <Undo2 size={15} /> : <Check size={16} />}
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  {linkedParty(detail.key) && (
                    <div className="kb-note">
                      おうちの家計簿に連動しています。実際にお金を受け取る精算は、おうちの履歴にある「精算していない」で管理します。
                    </div>
                  )}
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
                          <RowMain x={e} />
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
                  {entryTarget.entryId ? "記録を編集" : "記録する"}
                </span>
                <button className="kb-close" onClick={closeEntry} aria-label="閉じる"><X size={19} /></button>
              </div>

              {/* カテゴリはここで選べる。間違えたときや続けて別のカテゴリを
                  入れたいときに、いちいち閉じなくて済むようにするため */}
              <div className="kb-field">
                <label className="kb-label">カテゴリ</label>
                <select className="kb-input" value={entryTarget.catId}
                        onChange={(ev) => pickEntryCat(ev.target.value)}>
                  {groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => (
                    <optgroup key={g} label={g}>
                      {budgetCats.filter((c) => c.group === g).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="kb-field">
                <div className="kb-seg">
                  <button className={enType === "expense" ? "on" : ""} onClick={() => setEnType("expense")}>支出</button>
                  <button className={enType === "income" ? "on" : ""} onClick={() => setEnType("income")}>収入</button>
                </div>
              </div>
              <div className="kb-field">
                <label className="kb-label">金額（円）</label>
                <AmountField value={enAmount} onChange={setEnAmount}
                             income={enType === "income"} inputRef={amountRef} />
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
              {canShop && (
                <ShopField label="店名（任意）" value={enShop} onChange={setEnShop} options={shopOptions} />
              )}
              <div className="kb-field">
                <label className="kb-label">{canShop ? "内容（任意）" : "内容（店名など・任意）"}</label>
                <input className="kb-input" value={enMemo} onChange={(ev) => setEnMemo(ev.target.value)} placeholder={canShop ? "歯ブラシ換え" : "無印良品"} />
              </div>
              {uses.method && (
                <div className="kb-field">
                  <label className="kb-label">支払い方法</label>
                  <select className="kb-input" value={enMethod} onChange={(ev) => setEnMethod(ev.target.value)}>
                    {withCurrent(methods, enMethod).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              {uses.pending && (
                <CheckRow checked={!enPending} onChange={(v) => setEnPending(!v)}>
                  確定
                </CheckRow>
              )}
              {uses.esettle && canSettleEntry && (
                <CheckRow checked={enSettled} onChange={setEnSettled}>
                  精算済み
                </CheckRow>
              )}
              {enError && <div className="kb-err">{enError}</div>}
              {/* 連動で入った明細は、個人の家計簿が持つもの。
                  ここで直しても、次に向こうを触ったときに上書きされて気づけない */}
              {isLinked({ id: entryTarget.entryId }) ? (
                <div className="kb-note" style={{ padding: "0 0 4px" }}>
                  この記録は個人の家計簿の立替から入ったものです。直すときは、そちらの立替を直してください。
                </div>
              ) : (
              <button className="kb-btn" onClick={submitEntry}>
                {entryTarget.entryId ? "保存する" : "記録する"}
              </button>
              )}
              {entryTarget.entryId && !isLinked({ id: entryTarget.entryId }) ? (
                <div className="kb-btn-row" style={{ marginTop: 9 }}>
                  {enConfirmDel ? (
                    <>
                      <button className="kb-btn danger" onClick={() => deleteEntry(entryTarget.entryId)}>本当に削除する</button>
                      <button className="kb-btn ghost" onClick={() => setEnConfirmDel(false)}>やめる</button>
                    </>
                  ) : (
                    <button className="kb-btn danger" onClick={() => setEnConfirmDel(true)}>この記録を削除</button>
                  )}
                </div>
              ) : (
                kindOf(entryCat.group) === KIND_MONTH && budgetOf(entryCat).monthly > 0 && (
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
                <AmountField value={tkAmount} onChange={setTkAmount} />
              </div>
              <div className="kb-field">
                <label className="kb-label">日付</label>
                <input className="kb-input" type="date" value={tkDate} onChange={(ev) => setTkDate(ev.target.value)} />
              </div>
              <div className="kb-field">
                <label className="kb-label">区分</label>
                <select className="kb-input" value={tkParty} onChange={(ev) => setTkParty(ev.target.value)}>
                  {/* 連動の写しは「おうち家計簿・生活費」のようにまとめて出す */}
                  {partyBoxes.map((b) => b.groups.map((gp) => {
                    const label = [b.box, gp.name].filter(Boolean).join("・");
                    const opts = gp.rows.map((r) => <option key={r.id} value={r.name}>{r.name}</option>);
                    return label
                      ? <optgroup key={b.box + "/" + gp.name} label={label}>{opts}</optgroup>
                      : opts;
                  }))}
                  {parties.indexOf(tkParty) < 0 && tkParty
                    ? <option value={tkParty}>{tkParty}</option> : null}
                </select>
              </div>
              {tkCanShop && (
                <ShopField label="店名（任意）" value={tkShop} onChange={setTkShop} options={shopOptions} />
              )}
              <div className="kb-field">
                <label className="kb-label">{tkCanShop ? "内容（任意）" : "内容（店名など・任意）"}</label>
                <input className="kb-input" value={tkMemo} onChange={(ev) => setTkMemo(ev.target.value)} placeholder={tkCanShop ? "歯ブラシ換え" : "無印良品"} />
              </div>
              {tkSupportsMethod && (
                <div className="kb-field">
                  <label className="kb-label">支払い方法</label>
                  <select className="kb-input" value={tkMethod} onChange={(ev) => setTkMethod(ev.target.value)}>
                    {withCurrent(methods, tkMethod).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
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
                <AmountField value={trAmount} onChange={setTrAmount} />
              </div>
              <div className="kb-field">
                <label className="kb-label">日付</label>
                <input className="kb-input" type="date" value={trDate} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(ev) => setTrDate(ev.target.value)} />
              </div>
              {methods.length === 0 && (
                <div className="kb-note" style={{ padding: "0 0 10px" }}>
                  支払方法がまだありません。カテゴリ編集の「支払方法」で足すと、ここで選べるようになります。
                </div>
              )}
              <div className="kb-inline">
                <div className="kb-field" style={{ flex: 1 }}>
                  <label className="kb-label">振替元</label>
                  <select className="kb-input" value={trFrom} onChange={(ev) => setTrFrom(ev.target.value)}>
                    {withCurrent(methods, trFrom).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="kb-field" style={{ flex: 1 }}>
                  <label className="kb-label">振替先</label>
                  <select className="kb-input" value={trTo} onChange={(ev) => {
                    // 内容が前の振替先のままなら一緒に付け替える。
                    // 自分で書き換えていた場合はそのまま残す
                    if (trMemo === trTo || !trMemo) setTrMemo(ev.target.value);
                    setTrTo(ev.target.value);
                  }}>
                    {withCurrent(methods, trTo).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="kb-field">
                <label className="kb-label">メモ（任意）</label>
                <input className="kb-input" value={trMemo} onChange={(ev) => setTrMemo(ev.target.value)} placeholder="PASMO" />
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

        {/* 家計簿の切り替え */}
        {booksOpen && (
          <BookSheet
            books={KakeiboAPI.books()}
            currentId={KakeiboAPI.currentBookId()}
            onPick={pickBook}
            onAdd={(n, u) => { KakeiboAPI.addBook(n, u); bumpBooks((v) => v + 1); }}
            onRename={(id, n) => { KakeiboAPI.renameBook(id, n); bumpBooks((v) => v + 1); }}
            onSetUrl={(id, u) => {
              KakeiboAPI.setBookUrl(id, u);
              bumpBooks((v) => v + 1);
              if (id === KakeiboAPI.currentBookId()) { setLoading(true); load(); }
            }}
            onRemove={(id) => {
              KakeiboAPI.removeBook(id);
              bumpBooks((v) => v + 1);
              if (id === bookId) { setLoading(true); setBookId(KakeiboAPI.currentBookId()); }
            }}
            onClose={() => setBooksOpen(false)}
          />
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
                      {groupOrder.map((g) => (
                        <button key={g} className={fGroup === g ? "on" : ""} onClick={() => pickGroup(g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="kb-field">
                    <label className="kb-label">カテゴリ名</label>
                    <input className="kb-input" value={fName} onChange={(ev) => setFName(ev.target.value)} placeholder="カテゴリ名を入力" />
                  </div>
                  {budgetPlan.live ? (
                    <div className="kb-note">金額は予算タブで設定します。</div>
                  ) : (
                    <div className="kb-field">
                      <label className="kb-label">{kindOf(fGroup) === KIND_YEAR ? "年間予算（円）" : "月予算（円）"}</label>
                      <input className="kb-input" type="number" inputMode="numeric" value={fAmount} onChange={(ev) => setFAmount(ev.target.value)} placeholder={kindOf(fGroup) === KIND_YEAR ? "100000" : "10000"} />
                    </div>
                  )}
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
                  {groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => (
                    <div key={g}>
                      <div className="kb-section-label">{g}</div>
                      <div className="kb-card" style={{ background: "#FAFAFB" }}>
                        {budgetCats.filter((c) => c.group === g).map((c, ci, arr) => (
                          <div className="kb-row" key={c.id} style={{ cursor: "default" }}>
                            <div className="kb-dot" style={{ background: colorOf(catIndex[c.id]) }}>{c.name.slice(0, 1)}</div>
                            <div className="kb-rowmain">
                              <div className="kb-rowtitle">{c.name}</div>
                              <div className="kb-rowsub">
                                {/* 持ち方に合わせて言い方を変える。年間のカテゴリに
                                    「月予算」と書くと、年額を12で割った額が月額に見える */}
                                {kindOf(c.group) === KIND_YEAR
                                  ? `年間予算 ${yenExact(budgetOf(c).annual)}`
                                  : kindOf(c.group) === KIND_NONE
                                    ? "予算外"
                                    : `月予算 ${yenExact(budgetOf(c).monthly)}`}
                                {c.tags.length > 0 ? `・内訳${c.tags.length}件` : ""}
                                {c.note ? `　${c.note}` : ""}
                              </div>
                            </div>
                            <div className="kb-rowright">
                              <MoveButtons i={ci} count={arr.length} what={c.name}
                                           onMove={(d) => moveCat(c, d)} />
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
                  {groupDefs.length === 0 ? (
                    <div className="kb-note">
                      まずグループを作ってください。カテゴリはグループの中に並びます。
                    </div>
                  ) : (
                    <button className="kb-btn" style={{ marginTop: 14 }} onClick={openCatAdd}>カテゴリを追加</button>
                  )}

                  <GroupList
                    defs={groupDefs}
                    useCount={(n) => budgetCats.filter((c) => c.group === n).length}
                    onSave={saveGroups}
                  />

                  {uses.settle && (
                  <MasterList
                    title="立替先"
                    hint="立替タブの区分になります。名前を変えると、これまでの記録もまとめて変わります。「連動」と付いているものは、おうちの家計簿のカテゴリの写しです。名前や並びはおうち側で変えてください。"
                    names={parties}
                    boxes={partyBoxes}
                    useCount={(n) => masterUseCount(PARTY_GROUP, n)}
                    onAdd={(n) => addMaster(PARTY_GROUP, n)}
                    onRename={(o, n) => renameMaster(PARTY_GROUP, o, n)}
                    onDelete={(n) => deleteMaster(PARTY_GROUP, n)}
                  />
                  )}

                  {uses.method && (
                  <MasterList
                    title="支払方法"
                    hint="明細と振替で選べるようになります。名前を変えると、これまでの記録もまとめて変わります。"
                    names={methods}
                    useCount={(n) => masterUseCount(METHOD_GROUP, n)}
                    onAdd={(n) => addMaster(METHOD_GROUP, n)}
                    onRename={(o, n) => renameMaster(METHOD_GROUP, o, n)}
                    onDelete={(n) => deleteMaster(METHOD_GROUP, n)}
                  />
                  )}

                  {/* 家計簿ごとに使う機能を決める。おうちのように立替も振替も
                      使わない家計簿では、画面から丸ごと消しておく */}
                  <div className="kb-section-label" style={{ marginTop: 22 }}>この家計簿で使うもの</div>
                  <div className="kb-card" style={{ background: "#FAFAFB" }}>
                    {FEATURES.filter((f) => f.key !== "esettle" || canSettleEntry).map((f) => (
                      <div className="kb-row" key={f.key} style={{ cursor: "default" }}>
                        <div className="kb-rowmain">
                          <div className="kb-rowtitle">{f.label}</div>
                          <div className="kb-rowsub">{f.hint}</div>
                        </div>
                        <div className="kb-rowright">
                          <button
                            className={`kb-iconbtn ${uses[f.key] ? "on" : ""}`}
                            onClick={() => toggleUse(f.key, !uses[f.key])}
                            aria-label={`${f.label}を${uses[f.key] ? "使わない" : "使う"}`}
                          >
                            {uses[f.key] ? <Check size={16} /> : <X size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="kb-note">
                    外したものは画面に出なくなります。これまでの記録は消えないので、戻せばまた見られます。
                    この設定は家計簿ごとで、同じ家計簿を開いている端末すべてに反映されます。
                  </div>

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
                    {KakeiboAPI.currentBookName()}
                    <br />
                    {KakeiboAPI.getUrl()}
                  </div>
                  <div className="kb-btn-row" style={{ marginTop: 9 }}>
                    <button className="kb-btn ghost" onClick={() => { setManageOpen(false); setBooksOpen(true); }}>家計簿の設定</button>
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

        {/* 予算の入力シート */}
        {bgTarget && (
          <div className="kb-sheet-backdrop" onClick={() => setBgTarget(null)}>
            <div className="kb-sheet" onClick={(ev) => ev.stopPropagation()}>
              <div className="kb-sheet-head">
                <span className="kb-sheet-title">
                  {bgTarget.label}
                  <span className="kb-sheet-period">
                    {" "}{year}年の{bgTarget.kind === "annual" ? "年間予算" : bgTarget.kind === "income" ? "月の収入" : "月予算"}
                  </span>
                </span>
                <button className="kb-close" onClick={() => setBgTarget(null)} aria-label="閉じる"><X size={19} /></button>
              </div>
              {bgTarget.kind === "note" ? (
                <div className="kb-note">
                  金額は収入から固定費と予定費を引いた残りなので、ここでは変えられません。
                  引き落とし先とメモだけ設定できます。
                </div>
              ) : (
                <div className="kb-field">
                  <label className="kb-label">
                    {bgTarget.kind === "annual" ? "年間予算（円）" : bgTarget.kind === "income" ? "毎月の収入（円）" : "月予算（円）"}
                  </label>
                  <AmountField value={bgAmount} onChange={setBgAmount} />
                </div>
              )}
              <div className="kb-field">
                <label className="kb-label">引き落とし先（任意）</label>
                <select className="kb-input" value={bgMethod} onChange={(ev) => setBgMethod(ev.target.value)}>
                  <option value="">選ばない</option>
                  {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="kb-field">
                <label className="kb-label">根拠メモ（任意）</label>
                <input className="kb-input" value={bgMemo} onChange={(ev) => setBgMemo(ev.target.value)} placeholder="5,000x6人+VD" />
              </div>
              {bgError && <div className="kb-err">{bgError}</div>}
              <button className="kb-btn" onClick={submitBudget}>保存する</button>
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
