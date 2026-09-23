(() => {
  // app/app.jsx
  var { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } = React;
  var MONTH_LABELS = ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708", "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"];
  var KIND_MONTH = "\u6708\u9593";
  var KIND_YEAR = "\u5E74\u9593";
  var KIND_REST = "\u6B8B\u308A";
  var KIND_NONE = "\u306A\u3057";
  var KINDS = [KIND_MONTH, KIND_YEAR, KIND_NONE, KIND_REST];
  var KIND_LABEL = { [KIND_MONTH]: "\u6708\u9593\u4E88\u7B97", [KIND_YEAR]: "\u5E74\u9593\u4E88\u7B97", [KIND_NONE]: "\u4E88\u7B97\u5916", [KIND_REST]: "\u53CE\u5165\u306E\u6B8B\u308A" };
  var LEGACY_GROUPS = [
    { name: "\u81EA\u7531\u8CBB", kind: KIND_REST },
    { name: "\u4E88\u5B9A\u8CBB", kind: KIND_YEAR },
    { name: "\u56FA\u5B9A\u8CBB", kind: KIND_MONTH }
  ];
  var GROUP_ROW = "set_groups";
  var LINK_PREFIX = "lk_";
  function isLinked(x) {
    return String(x && x.id).indexOf(LINK_PREFIX) === 0;
  }
  var CATORDER_ROW = "set_catorder";
  var SHOP_CHIPS = 12;
  var RATE_ROW = "set_rates";
  function settleAmount(amount, rate) {
    return rate >= 100 ? amount : (Number(amount) || 0) * rate / 100;
  }
  function moveItem(list, i, delta) {
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = list.slice();
    const t = next[i];
    next[i] = next[j];
    next[j] = t;
    return next;
  }
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
  function serializeGroups(defs) {
    return defs.map((g) => `${g.name}:${g.kind}`);
  }
  var PARTY_GROUP = "\u7ACB\u66FF\u5148";
  var METHOD_GROUP = "\u652F\u6255\u65B9\u6CD5";
  var FEATURE_GROUP = "\u8A2D\u5B9A";
  var FEATURE_ROW = "set_features";
  var FEATURES = [
    { key: "pending", label: "\u91D1\u984D\u306E\u78BA\u5B9A", hint: "\u3042\u3068\u304B\u3089\u30C1\u30A7\u30C3\u30AF\u3067\u78BA\u5B9A\u306B\u3057\u307E\u3059" },
    { key: "esettle", label: "\u660E\u7D30\u306E\u7CBE\u7B97", hint: "\u7ACB\u3066\u66FF\u3048\u305F\u3076\u3093\u306B\u7CBE\u7B97\u6E08\u307F\u306E\u5370\u3092\u4ED8\u3051\u307E\u3059", defaultOff: true },
    { key: "settle", label: "\u7ACB\u66FF", hint: "\u7ACB\u3066\u66FF\u3048\u305F\u3076\u3093\u3092\u533A\u5206\u3054\u3068\u306B\u96C6\u3081\u307E\u3059" },
    { key: "transfer", label: "\u632F\u66FF", hint: "\u30C1\u30E3\u30FC\u30B8\u306A\u3069\u3002\u652F\u51FA\u306B\u306F\u6570\u3048\u307E\u305B\u3093" },
    { key: "method", label: "\u652F\u6255\u3044\u65B9\u6CD5", hint: "\u8A18\u9332\u306B\u5F15\u304D\u843D\u3068\u3057\u5148\u3092\u6B8B\u3057\u307E\u3059" }
  ];
  var MASTER_GROUPS = [PARTY_GROUP, METHOD_GROUP, FEATURE_GROUP];
  var HIST_GROUP = "group:";
  var INCOME_TARGET = "income";
  function isMaster(c) {
    return MASTER_GROUPS.indexOf(c.group) >= 0;
  }
  function secs(ms) {
    return ms < 100 ? "0.1\u79D2\u672A\u6E80" : (ms / 1e3).toFixed(1) + "\u79D2";
  }
  function LoadLog({ rows, onClear }) {
    if (rows.length === 0) {
      return /* @__PURE__ */ React.createElement("div", { className: "kb-savebox" }, "\u307E\u3060\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u8AAD\u307F\u8FBC\u3080\u3068\u3053\u3053\u306B\u6B8B\u308A\u307E\u3059\u3002");
    }
    const reads = rows.filter((r) => r.how === "\u8AAD\u307F\u8FBC\u307F");
    const bad = reads.filter((r) => r.stage !== "\u6210\u529F");
    const avg = reads.length ? reads.reduce((a, r) => a + r.ms, 0) / reads.length : 0;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-savebox" }, "\u76F4\u8FD1\u306E\u8AAD\u307F\u8FBC\u307F", reads.length, "\u56DE\u306E\u3046\u3061\u3001\u5931\u6557\u306F", bad.length, "\u56DE\u3002\u304B\u304B\u3063\u305F\u6642\u9593\u306F\u5E73\u5747", secs(avg), "\u3067\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 9 } }, rows.map((r, i) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: i, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, String(r.at).slice(5, 10).replace("-", "/")), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, r.how, "\u30FB", r.stage, r.online === false ? /* @__PURE__ */ React.createElement("span", { className: "kb-formula" }, "\u570F\u5916") : null), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, String(r.at).slice(11, 16), r.size ? `\u30FB${Math.round(r.size / 1024)}KB` : "", r.message ? `\u30FB${r.message}` : "")), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: r.stage === "\u6210\u529F" ? void 0 : { color: "var(--pending)" } }, secs(r.ms))))), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: onClear }, "\u8A18\u9332\u3092\u6D88\u3059")));
  }
  function MoveButtons({ i, count, onMove, what }) {
    if (count <= 1) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn arrow",
        disabled: i === 0,
        onClick: () => onMove(-1),
        "aria-label": `${what}\u3092\u4E0A\u3078`
      },
      /* @__PURE__ */ React.createElement(ChevronUp, { size: 15 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn arrow",
        disabled: i === count - 1,
        onClick: () => onMove(1),
        "aria-label": `${what}\u3092\u4E0B\u3078`
      },
      /* @__PURE__ */ React.createElement(ChevronDown, { size: 15 })
    ));
  }
  function withCurrent(list, value) {
    return value && list.indexOf(value) < 0 ? list.concat([value]) : list;
  }
  var PALETTE = ["#9B59D0", "#E08A2E", "#3FA9A0", "#D8607A", "#5B8DD6", "#7FA83C", "#C7913A", "#6C7A99", "#B0553F", "#4FA36B"];
  var DEFAULT_TAGS = {
    \u81EA\u7531\u8CBB: ["\u4EA4\u901A\u8CBB", "\u670D\u98FE\u96D1\u8CA8", "\u7F8E\u5BB9\u30B3\u30B9\u30E1", "\u5916\u98DF", "\u305D\u306E\u4ED6", "\u53CE\u5165"]
  };
  function Svg({ size = 24, children, className, style }) {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        style,
        "aria-hidden": "true"
      },
      children
    );
  }
  var Plus = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14" }), /* @__PURE__ */ React.createElement("path", { d: "M12 5v14" }));
  var X = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M18 6 6 18" }), /* @__PURE__ */ React.createElement("path", { d: "m6 6 12 12" }));
  var Check = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M20 6 9 17l-5-5" }));
  var ChevronRight = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "m9 18 6-6-6-6" }));
  var ChevronLeft = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "m15 18-6-6 6-6" }));
  var ChevronDown = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "m6 9 6 6 6-6" }));
  var ChevronUp = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "m18 15-6-6-6 6" }));
  var RefreshCw = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }), /* @__PURE__ */ React.createElement("path", { d: "M21 3v5h-5" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }), /* @__PURE__ */ React.createElement("path", { d: "M8 16H3v5" }));
  var BookOpen = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M12 7v14" }), /* @__PURE__ */ React.createElement("path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }));
  var Trash2 = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M3 6h18" }), /* @__PURE__ */ React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }), /* @__PURE__ */ React.createElement("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }));
  var Pencil = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }), /* @__PURE__ */ React.createElement("path", { d: "m15 5 4 4" }));
  var Loader2 = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }));
  var Undo2 = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M9 14 4 9l5-5" }), /* @__PURE__ */ React.createElement("path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }));
  var PencilLine = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M12 20h9" }), /* @__PURE__ */ React.createElement("path", { d: "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" }), /* @__PURE__ */ React.createElement("path", { d: "m15 5 3 3" }));
  var ListOrdered = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M10 6h11" }), /* @__PURE__ */ React.createElement("path", { d: "M10 12h11" }), /* @__PURE__ */ React.createElement("path", { d: "M10 18h11" }), /* @__PURE__ */ React.createElement("path", { d: "M4 6h1v4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 10h2" }), /* @__PURE__ */ React.createElement("path", { d: "M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" }));
  var PieChart = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }), /* @__PURE__ */ React.createElement("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }));
  var Wallet = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }), /* @__PURE__ */ React.createElement("path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }));
  var Settings = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
  var CalendarPlus = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M8 2v4" }), /* @__PURE__ */ React.createElement("path", { d: "M16 2v4" }), /* @__PURE__ */ React.createElement("rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M3 10h18" }), /* @__PURE__ */ React.createElement("path", { d: "M10 16h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 14v4" }));
  var ArrowLeftRight = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "m16 3 4 4-4 4" }), /* @__PURE__ */ React.createElement("path", { d: "M20 7H4" }), /* @__PURE__ */ React.createElement("path", { d: "m8 21-4-4 4-4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 17h16" }));
  var Target = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "6" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "2" }));
  var CircleAlert = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("path", { d: "M12 8v4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 16h.01" }));
  var HandCoins = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "8", cy: "8", r: "5" }), /* @__PURE__ */ React.createElement("path", { d: "M10.7 16.5a5 5 0 1 0-4.2-8" }), /* @__PURE__ */ React.createElement("path", { d: "M3 18h12a2 2 0 0 1 0 4H5" }), /* @__PURE__ */ React.createElement("path", { d: "m7 22-4-4" }));
  function SortButton({ asc, onToggle }) {
    return /* @__PURE__ */ React.createElement("button", { type: "button", className: "kb-sortbtn", onClick: onToggle }, /* @__PURE__ */ React.createElement(Svg, { size: 13 }, asc ? /* @__PURE__ */ React.createElement("path", { d: "m3 8 4-4 4 4" }) : /* @__PURE__ */ React.createElement("path", { d: "m3 4 4 4 4-4" }), /* @__PURE__ */ React.createElement("path", { d: "M7 4v10" }), /* @__PURE__ */ React.createElement("path", { d: "M12 18h9" }), /* @__PURE__ */ React.createElement("path", { d: "M12 13h6" }), /* @__PURE__ */ React.createElement("path", { d: "M12 8h3" })), asc ? "\u53E4\u3044\u9806" : "\u65B0\u3057\u3044\u9806");
  }
  function CheckRow({ checked, onChange, children }) {
    return /* @__PURE__ */ React.createElement("button", { type: "button", className: `kb-check ${checked ? "on" : ""}`, onClick: () => onChange(!checked) }, /* @__PURE__ */ React.createElement("span", { className: "kb-check-box" }, checked && /* @__PURE__ */ React.createElement(Check, { size: 13 })), /* @__PURE__ */ React.createElement("span", null, children));
  }
  function timeLabel(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const today = /* @__PURE__ */ new Date();
    const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    return sameDay ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
  }
  function yen(n) {
    return `\xA5${Math.round(Number(n) || 0).toLocaleString("ja-JP")}`;
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
  function weekday(dateStr) {
    const d = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return "";
    return ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"][d.getDay()];
  }
  function isIncome(e) {
    return e.type === "income";
  }
  function signedAmount(e) {
    const a = Math.abs(Number(e.amount) || 0);
    return isIncome(e) ? -a : a;
  }
  function yenExact(n) {
    const v = Number(n) || 0;
    const r = Math.round(v * 10) / 10;
    const opts = Number.isInteger(r) ? {} : { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    return `\xA5${r.toLocaleString("ja-JP", opts)}`;
  }
  function colorOf(idx) {
    return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
  }
  function enteredFormula(src) {
    const text = String(src == null ? "" : src).trim();
    if (!KakeiboCalc.looksLikeExpression(text)) return "";
    return KakeiboCalc.evalAmount(text).ok ? text : "";
  }
  function amountValue(src) {
    const r = KakeiboCalc.evalAmount(src);
    return r.ok ? Math.round(r.value) : NaN;
  }
  function AmountField({ value, onChange, income, inputRef }) {
    const ownRef = useRef(null);
    const ref = inputRef || ownRef;
    const caretRef = useRef(null);
    useEffect(() => {
      if (caretRef.current == null) return;
      const el = ref.current;
      const at = caretRef.current;
      caretRef.current = null;
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(at, at);
      } catch (e) {
      }
    });
    const calc = KakeiboCalc.evalAmount(value);
    const showCalc = KakeiboCalc.looksLikeExpression(value);
    function insert(text) {
      const el = ref.current;
      if (!el) {
        onChange(value + text);
        return;
      }
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "input",
      {
        ref,
        className: "kb-input amount",
        type: "text",
        inputMode: "decimal",
        autoComplete: "off",
        value,
        onChange: (ev) => onChange(ev.target.value),
        placeholder: "0",
        style: income ? { color: "var(--accent)" } : void 0
      }
    ), showCalc && /* @__PURE__ */ React.createElement("div", { className: `kb-calc ${calc.ok ? "" : "ng"}` }, calc.ok ? `= ${yen(calc.value)}` : "\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"), /* @__PURE__ */ React.createElement("div", { className: "kb-keys" }, ["+", "-", "\xD7", "\xF7", "(", ")"].map((k) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: k,
        type: "button",
        className: "kb-key",
        onPointerDown: (ev) => ev.preventDefault(),
        onClick: () => insert(k)
      },
      k
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "kb-key wide",
        onPointerDown: (ev) => ev.preventDefault(),
        onClick: backspace,
        "aria-label": "1\u6587\u5B57\u6D88\u3059"
      },
      "\u232B"
    )));
  }
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
  function rowTitle(x, kind) {
    if (kind === "transfer") return x.memo || "\u632F\u66FF";
    if (kind === "settlement") return joinTitle([x.shop, x.memo]) || x.party || "";
    return entryTitle(x);
  }
  function rowSub(x, kind, noMethod) {
    if (kind === "transfer") return `\u632F\u66FF\u30FB${x.from} \u2192 ${x.to}`;
    return noMethod ? "" : x.method || "";
  }
  function RowMain({ x, kind = x.kind, sub, noMethod, ...rest }) {
    const note = sub === void 0 ? rowSub(x, kind, noMethod) : sub;
    return /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain", ...rest }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, rowTitle(x, kind), x.formula ? /* @__PURE__ */ React.createElement("span", { className: "kb-formula" }, x.formula) : null), note ? /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, note) : null);
  }
  function amountStyle(x) {
    if (x.pending) return { color: "var(--pending)" };
    if (isIncome(x)) return { color: "var(--accent)" };
    return void 0;
  }
  function MasterList({ title, hint, names, boxes, useCount, onAdd, onRename, onDelete }) {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState("");
    const [editing, setEditing] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [error, setError] = useState("");
    function reset() {
      setAdding(false);
      setEditing(null);
      setConfirming(null);
      setDraft("");
      setError("");
    }
    function submitAdd() {
      const msg = onAdd(draft);
      if (msg) {
        setError(msg);
        return;
      }
      reset();
    }
    function submitRename() {
      const msg = onRename(editing, draft);
      if (msg) {
        setError(msg);
        return;
      }
      reset();
    }
    function submitDelete(name) {
      const msg = onDelete(name);
      setConfirming(null);
      if (msg) {
        setError(msg);
        return;
      }
      reset();
    }
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 22 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, title), (boxes || [{ box: "", groups: [{ name: "", rows: names.map((n) => ({ id: n, name: n })) }] }]).map((b) => /* @__PURE__ */ React.createElement(React.Fragment, { key: b.box || "_" }, b.box && /* @__PURE__ */ React.createElement("div", { className: "kb-section-label sub" }, b.box), b.groups.map((gp) => /* @__PURE__ */ React.createElement(React.Fragment, { key: gp.name || "_" }, gp.name && /* @__PURE__ */ React.createElement("div", { className: "kb-section-label sub", style: { marginLeft: 12 } }, gp.name), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, gp.rows.map((row) => {
      const n = row.name;
      const used = useCount(n);
      const locked = isLinked(row);
      return /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: row.id, style: { cursor: "default" } }, editing === n ? /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          className: "kb-input",
          value: draft,
          onChange: (ev) => setDraft(ev.target.value),
          onKeyDown: (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              submitRename();
            }
          }
        }
      )) : /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, n), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, used > 0 ? `${used}\u4EF6\u306E\u8A18\u9332\u3067\u4F7F\u7528\u4E2D` : "\u307E\u3060\u4F7F\u308F\u308C\u3066\u3044\u307E\u305B\u3093")), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, locked ? /* @__PURE__ */ React.createElement("span", { className: "kb-rowsub", style: { marginRight: 4 } }, "\u9023\u52D5") : editing === n ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: submitRename, "aria-label": "\u540D\u524D\u3092\u4FDD\u5B58" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: reset, "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : confirming === n ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", style: { color: "var(--red)" }, onClick: () => submitDelete(n), "aria-label": "\u524A\u9664\u3092\u78BA\u5B9A" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setConfirming(null), "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => {
        reset();
        setEditing(n);
        setDraft(n);
      }, "aria-label": `${n}\u306E\u540D\u524D\u3092\u5909\u3048\u308B` }, /* @__PURE__ */ React.createElement(Pencil, { size: 14 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => {
        reset();
        setConfirming(n);
      }, "aria-label": `${n}\u3092\u524A\u9664` }, /* @__PURE__ */ React.createElement(Trash2, { size: 14 })))));
    })))))), hint && /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, hint), error && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, error), adding ? /* @__PURE__ */ React.createElement("div", { className: "kb-inline", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        value: draft,
        placeholder: `${title}\u3092\u5165\u529B`,
        onChange: (ev) => setDraft(ev.target.value),
        onKeyDown: (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            submitAdd();
          }
        }
      }
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", style: { width: "auto", padding: "0 16px" }, onClick: submitAdd }, "\u8FFD\u52A0")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn", style: { marginTop: 9 }, onClick: () => {
      reset();
      setAdding(true);
    } }, title, "\u3092\u8FFD\u52A0"));
  }
  function validUrl(v) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v);
  }
  function BookSheet({ books, currentId, onPick, onAdd, onRename, onSetUrl, onRemove, onClose }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    function reset() {
      setAdding(false);
      setEditing(null);
      setConfirming(null);
      setName("");
      setUrl("");
      setError("");
    }
    function submitAdd() {
      if (!name.trim()) {
        setError("\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      if (!validUrl(url.trim())) {
        setError("Apps Script\u306E\u30A6\u30A7\u30D6\u30A2\u30D7\u30EA\u306EURL\uFF08/exec \u3067\u7D42\u308F\u308B\u3082\u306E\uFF09\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      if (books.some((b) => b.name === name.trim())) {
        setError("\u540C\u3058\u540D\u524D\u304C\u3059\u3067\u306B\u3042\u308A\u307E\u3059\u3002");
        return;
      }
      onAdd(name.trim(), url.trim());
      reset();
    }
    function submitEdit() {
      if (!name.trim()) {
        setError("\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      const u = url.trim();
      if (u && !validUrl(u)) {
        setError("\u63A5\u7D9A\u5148\u306EURL\u306E\u5F62\u304C\u9055\u3044\u307E\u3059\u3002");
        return;
      }
      onRename(editing, name.trim());
      if (u) onSetUrl(editing, u);
      reset();
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, "\u5BB6\u8A08\u7C3F"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: onClose, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, books.map((b) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: b.id, style: { cursor: "default" } }, editing === b.id ? /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: name, onChange: (ev) => setName(ev.target.value), placeholder: "\u540D\u524D" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        style: { marginTop: 6, fontSize: 16 },
        value: url,
        onChange: (ev) => setUrl(ev.target.value),
        spellCheck: false,
        placeholder: "\u63A5\u7D9A\u5148\u3092\u5909\u3048\u308B\u3068\u304D\u3060\u3051\u5165\u308C\u308B"
      }
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: b.id === currentId ? "var(--accent)" : "#C4C8CE" } }, b.id === currentId ? /* @__PURE__ */ React.createElement(Check, { size: 15 }) : /* @__PURE__ */ React.createElement(BookOpen, { size: 14 })), /* @__PURE__ */ React.createElement("button", { className: "kb-bookpick", onClick: () => onPick(b.id) }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, b.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, b.id === currentId ? "\u3044\u307E\u958B\u3044\u3066\u3044\u307E\u3059" : "\u5207\u308A\u66FF\u3048\u308B"))), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, editing === b.id ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: submitEdit, "aria-label": "\u4FDD\u5B58" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: reset, "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : confirming === b.id ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn",
        style: { color: "var(--red)" },
        onClick: () => {
          onRemove(b.id);
          reset();
        },
        "aria-label": "\u5916\u3059\u306E\u3092\u78BA\u5B9A"
      },
      /* @__PURE__ */ React.createElement(Check, { size: 15 })
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setConfirming(null), "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn",
        onClick: () => {
          reset();
          setEditing(b.id);
          setName(b.name);
        },
        "aria-label": `${b.name}\u3092\u7DE8\u96C6`
      },
      /* @__PURE__ */ React.createElement(Pencil, { size: 14 })
    ), books.length > 1 && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn",
        onClick: () => {
          reset();
          setConfirming(b.id);
        },
        "aria-label": `${b.name}\u3092\u7AEF\u672B\u304B\u3089\u5916\u3059`
      },
      /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
    )))))), confirming && /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u3053\u306E\u7AEF\u672B\u306E\u767B\u9332\u304B\u3089\u5916\u3059\u3060\u3051\u3067\u3059\u3002\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306E\u4E2D\u8EAB\u306F\u6D88\u3048\u307E\u305B\u3093\u3002\u63A5\u7D9A\u5148\u3092\u5165\u308C\u76F4\u305B\u3070\u307E\u305F\u958B\u3051\u307E\u3059\u3002"), error && /* @__PURE__ */ React.createElement("div", { className: "kb-err", style: { marginTop: 9 } }, error), adding ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u540D\u524D"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: name, onChange: (ev) => setName(ev.target.value), placeholder: "\u5BB6\u8A08" })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u63A5\u7D9A\u5148"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        value: url,
        onChange: (ev) => setUrl(ev.target.value),
        spellCheck: false,
        placeholder: "https://script.google.com/macros/s/..../exec"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row" }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: reset }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitAdd }, "\u8FFD\u52A0"))) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn", style: { marginTop: 12 }, onClick: () => {
      reset();
      setAdding(true);
    } }, "\u5BB6\u8A08\u7C3F\u3092\u8FFD\u52A0")));
  }
  function GroupList({ defs, useCount, onSave }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [name, setName] = useState("");
    const [kind, setKind] = useState(KIND_YEAR);
    const [error, setError] = useState("");
    function reset() {
      setAdding(false);
      setEditing(null);
      setConfirming(null);
      setName("");
      setKind(KIND_YEAR);
      setError("");
    }
    function submitAdd() {
      const n = name.trim();
      if (!n) {
        setError("\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      if (defs.some((g) => g.name === n)) {
        setError("\u540C\u3058\u540D\u524D\u304C\u3059\u3067\u306B\u3042\u308A\u307E\u3059\u3002");
        return;
      }
      onSave([...defs, { name: n, kind }]);
      reset();
    }
    function submitEdit() {
      const n = name.trim();
      if (!n) {
        setError("\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      if (defs.some((g) => g.name === n && g.name !== editing)) {
        setError("\u540C\u3058\u540D\u524D\u304C\u3059\u3067\u306B\u3042\u308A\u307E\u3059\u3002");
        return;
      }
      onSave(defs.map((g) => g.name === editing ? { name: n, kind } : g), editing, n);
      reset();
    }
    function submitDelete(g) {
      if (useCount(g.name) > 0) {
        setError(`${g.name}\u306B\u306F\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308B\u305F\u3081\u6D88\u305B\u307E\u305B\u3093\u3002`);
        setConfirming(null);
        return;
      }
      onSave(defs.filter((x) => x.name !== g.name));
      reset();
    }
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 22 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u30B0\u30EB\u30FC\u30D7"), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, defs.map((g, gi) => {
      const used = useCount(g.name);
      return /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: g.name, style: { cursor: "default" } }, editing === g.name ? /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: name, onChange: (ev) => setName(ev.target.value) }), /* @__PURE__ */ React.createElement("div", { className: "kb-seg", style: { marginTop: 6 } }, KINDS.map((k) => /* @__PURE__ */ React.createElement("button", { key: k, className: kind === k ? "on" : "", onClick: () => setKind(k) }, KIND_LABEL[k])))) : /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, g.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, KIND_LABEL[g.kind], "\u30FB", used > 0 ? `\u30AB\u30C6\u30B4\u30EA${used}\u4EF6` : "\u30AB\u30C6\u30B4\u30EA\u306A\u3057")), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, editing === g.name ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: submitEdit, "aria-label": "\u4FDD\u5B58" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: reset, "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : confirming === g.name ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", style: { color: "var(--red)" }, onClick: () => submitDelete(g), "aria-label": "\u524A\u9664\u3092\u78BA\u5B9A" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setConfirming(null), "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        MoveButtons,
        {
          i: gi,
          count: defs.length,
          what: g.name,
          onMove: (d) => {
            reset();
            onSave(moveItem(defs, gi, d));
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "kb-iconbtn",
          onClick: () => {
            reset();
            setEditing(g.name);
            setName(g.name);
            setKind(g.kind);
          },
          "aria-label": `${g.name}\u3092\u7DE8\u96C6`
        },
        /* @__PURE__ */ React.createElement(Pencil, { size: 14 })
      ), defs.length > 1 && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "kb-iconbtn",
          onClick: () => {
            reset();
            setConfirming(g.name);
          },
          "aria-label": `${g.name}\u3092\u524A\u9664`
        },
        /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
      ))));
    })), /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u4E26\u3093\u3067\u3044\u308B\u9806\u306B\u753B\u9762\u3078\u51FA\u307E\u3059\u3002\u6708\u9593\u4E88\u7B97\u306F\u6708\u984D\u3001\u5E74\u9593\u4E88\u7B97\u306F\u5E74\u984D\u3067\u6301\u3061\u307E\u3059\u3002 \u4E88\u7B97\u5916\u306F\u91D1\u984D\u3092\u7F6E\u304D\u307E\u305B\u3093\u3002\u53CE\u5165\u306E\u6B8B\u308A\u306F\u3001\u53CE\u5165\u304B\u3089\u6708\u9593\u4E88\u7B97\u3068\u5E74\u9593\u4E88\u7B97\u3092\u3059\u3079\u3066\u5F15\u3044\u305F\u984D\u304C \u81EA\u52D5\u3067\u5165\u308B\u3082\u306E\u3067\u3001\u91D1\u984D\u306F\u81EA\u5206\u3067\u306F\u5909\u3048\u3089\u308C\u307E\u305B\u3093\u3002"), error && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, error), adding ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: name, onChange: (ev) => setName(ev.target.value), placeholder: "\u30B0\u30EB\u30FC\u30D7\u540D\u3092\u5165\u529B" }), /* @__PURE__ */ React.createElement("div", { className: "kb-seg", style: { marginTop: 8 } }, KINDS.map((k) => /* @__PURE__ */ React.createElement("button", { key: k, className: kind === k ? "on" : "", onClick: () => setKind(k) }, KIND_LABEL[k]))), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: reset }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitAdd }, "\u8FFD\u52A0"))) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn", style: { marginTop: 9 }, onClick: () => {
      reset();
      setAdding(true);
    } }, "\u30B0\u30EB\u30FC\u30D7\u3092\u8FFD\u52A0"));
  }
  function ShopField({ value, onChange, options, label }) {
    const hits = useMemo(() => {
      const q = value.trim().toLowerCase();
      const list = q ? options.filter((n) => n.toLowerCase().indexOf(q) >= 0 && n !== value.trim()) : options;
      return list.slice(0, SHOP_CHIPS);
    }, [value, options]);
    return /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, label), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value, onChange: (ev) => onChange(ev.target.value), placeholder: "\u7121\u5370\u826F\u54C1" }), hits.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-chips kb-shopchips" }, hits.map((n) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: n,
        className: "kb-tagchip",
        onPointerDown: (ev) => ev.preventDefault(),
        onClick: () => onChange(n)
      },
      n
    ))));
  }
  function SetupScreen({ onSave }) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");
    function submit() {
      const n = name.trim();
      const v = url.trim();
      if (!n) {
        setErr("\u5BB6\u8A08\u7C3F\u306E\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      if (!validUrl(v)) {
        setErr("Apps Script\u306E\u30A6\u30A7\u30D6\u30A2\u30D7\u30EA\u306E URL\uFF08/exec \u3067\u7D42\u308F\u308B\u3082\u306E\uFF09\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      onSave(n, v);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kb-setup" }, /* @__PURE__ */ React.createElement("h1", null, "\u5BB6\u8A08\u7C3F\u306E\u8A2D\u5B9A"), /* @__PURE__ */ React.createElement("p", null, "\u5BB6\u8A08\u7C3F\u306E\u540D\u524D\u3068\u3001\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u5148\u306B\u306A\u308BApps Script\u306E\u30A6\u30A7\u30D6\u30A2\u30D7\u30EA\u306EURL\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u7AEF\u672B\u306B\u8A18\u61B6\u3055\u308C\u3001\u6B21\u56DE\u304B\u3089\u306F\u805E\u304D\u307E\u305B\u3093\u3002\u3042\u3068\u304B\u3089\u5897\u3084\u305B\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "\u5BB6\u8A08\u7C3F\u306E\u540D\u524D" }), /* @__PURE__ */ React.createElement("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://script.google.com/macros/s/..../exec", spellCheck: false }), err && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, err), /* @__PURE__ */ React.createElement("button", { onClick: submit }, "\u4FDD\u5B58\u3057\u3066\u958B\u304F"));
  }
  function BudgetTab({ year, plan, cats, groupDefs, named, onEdit }) {
    const inGroup = (name) => cats.filter((c) => c.group === name);
    const groupsOf = (kind) => groupDefs.filter((g) => g.kind === kind);
    const catsOf = (kind) => groupsOf(kind).flatMap((g) => inGroup(g.name));
    const monthCats = catsOf(KIND_MONTH);
    const yearCats = catsOf(KIND_YEAR);
    const restCats = catsOf(KIND_REST);
    const noneCats = catsOf(KIND_NONE);
    const showHead = (kind) => named || groupsOf(kind).filter((g) => inGroup(g.name).length).length > 1;
    const Row = ({ label, amount, memo, onClick, derived, strong }) => /* @__PURE__ */ React.createElement("button", { className: "kb-row kb-bgrow", onClick, disabled: !onClick }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle", style: strong ? { fontWeight: 700 } : void 0 }, label), memo ? /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, memo) : null), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: derived ? { color: "var(--pending)" } : void 0 }, amount === null ? "\u2014" : yenExact(amount)), onClick ? /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }) : /* @__PURE__ */ React.createElement("span", { style: { width: 17 } }));
    const Section = ({ kind, amountOf, editKind, subOf }) => /* @__PURE__ */ React.createElement(React.Fragment, null, groupsOf(kind).map((g) => {
      const list = inGroup(g.name);
      if (!list.length) return null;
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: g.name }, showHead(kind) && /* @__PURE__ */ React.createElement("div", { className: "kb-section-label sub" }, g.name), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, list.map((c) => /* @__PURE__ */ React.createElement(
        Row,
        {
          key: c.id,
          label: c.name,
          amount: amountOf(c),
          memo: subOf ? subOf(c) : plan.per[c.id] ? plan.per[c.id].memo : "",
          onClick: () => onEdit({ target: c.id, label: c.name, kind: editKind })
        }
      ))));
    }));
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u53CE\u5165\uFF08\u6708\uFF09"), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement(
      Row,
      {
        label: "\u6BCE\u6708\u306E\u53CE\u5165",
        amount: plan.income.monthly,
        memo: plan.income.memo,
        strong: true,
        onClick: () => onEdit({ target: INCOME_TARGET, label: "\u6BCE\u6708\u306E\u53CE\u5165", kind: "income" })
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, plan.hasRest ? `\u3053\u306E\u91D1\u984D\u3092\u6708\u9593\u4E88\u7B97\u3068\u5E74\u9593\u4E88\u7B97\u306B\u5272\u308A\u632F\u308A\u3001\u6B8B\u308A\u304C${restCats.length ? restCats[0].name : "\u6B8B\u308A"}\u306B\u306A\u308A\u307E\u3059\u3002` : "\u3053\u306E\u91D1\u984D\u3068\u4E88\u7B97\u306E\u5408\u8A08\u3068\u306E\u5DEE\u304C\u3001\u4E0B\u306E\u4F59\u308A\u306B\u306A\u308A\u307E\u3059\u3002", "\u5E74\u9593\u3067\u306F ", yenExact(plan.income.annual), " \u3067\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u6708"), /* @__PURE__ */ React.createElement(Section, { kind: KIND_MONTH, amountOf: (c) => plan.per[c.id] ? plan.per[c.id].monthly : 0, editKind: "monthly" }), (yearCats.length > 0 || restCats.length > 0 || !plan.hasRest) && /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, restCats.map((c) => /* @__PURE__ */ React.createElement(
      Row,
      {
        key: c.id,
        label: c.name,
        amount: plan.per[c.id] ? plan.per[c.id].monthly : 0,
        memo: plan.per[c.id] && plan.per[c.id].memo || "\u53CE\u5165\u304B\u3089\u6708\u9593\u4E88\u7B97\u3068\u5E74\u9593\u4E88\u7B97\u3092\u5F15\u3044\u305F\u6B8B\u308A",
        derived: true,
        onClick: () => onEdit({ target: c.id, label: c.name, kind: "note" })
      }
    )), yearCats.length > 0 && /* @__PURE__ */ React.createElement(Row, { label: "\u5E74\u9593\u4E88\u7B97", amount: plan.yearAnnual / 12, memo: "\u4E0B\u306E\u5E74\u9593\u4E88\u7B97\u306E\u5408\u8A08\u309212\u3067\u5272\u3063\u305F\u984D", derived: true }), !plan.hasRest && /* @__PURE__ */ React.createElement(Row, { label: "\u4F59\u308A", amount: plan.restAnnual / 12, memo: "\u53CE\u5165\u304B\u3089\u4E88\u7B97\u306E\u5408\u8A08\u3092\u5F15\u3044\u305F\u984D", derived: true })), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-bgtotal" }, /* @__PURE__ */ React.createElement("span", null, "\u5408\u8A08\uFF08\u6708\uFF09"), /* @__PURE__ */ React.createElement("b", null, yenExact(plan.income.monthly))), /* @__PURE__ */ React.createElement("div", { className: "kb-bgtotal sub" }, /* @__PURE__ */ React.createElement("span", null, "\xD712"), /* @__PURE__ */ React.createElement("b", null, yenExact(plan.income.annual)))), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u5E74"), yearCats.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, "\u5E74\u9593\u4E88\u7B97\u306E\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308A\u307E\u305B\u3093")) : /* @__PURE__ */ React.createElement(
      Section,
      {
        kind: KIND_YEAR,
        amountOf: (c) => plan.per[c.id] ? plan.per[c.id].annual : 0,
        editKind: "annual",
        subOf: (c) => [
          `\u6708\u5E73\u5747 ${yenExact(plan.per[c.id] ? plan.per[c.id].annual / 12 : 0)}`,
          plan.per[c.id] ? plan.per[c.id].memo : ""
        ].filter(Boolean).join("\u3000")
      }
    ), yearCats.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-bgtotal" }, /* @__PURE__ */ React.createElement("span", null, "\u5408\u8A08\uFF08\u5E74\uFF09"), /* @__PURE__ */ React.createElement("b", null, yenExact(plan.yearAnnual))), /* @__PURE__ */ React.createElement("div", { className: "kb-bgtotal sub" }, /* @__PURE__ */ React.createElement("span", null, "\xF712"), /* @__PURE__ */ React.createElement("b", null, yenExact(plan.yearAnnual / 12)))), noneCats.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u4E88\u7B97\u5916"), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, noneCats.map((c) => /* @__PURE__ */ React.createElement(
      Row,
      {
        key: c.id,
        label: c.name,
        amount: null,
        memo: plan.per[c.id] ? plan.per[c.id].memo : "",
        onClick: () => onEdit({ target: c.id, label: c.name, kind: "note" })
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u4E88\u7B97\u3092\u7F6E\u304B\u306A\u3044\u30AB\u30C6\u30B4\u30EA\u3067\u3059\u3002\u4F7F\u3063\u305F\u984D\u306F\u5B9F\u7E3E\u30BF\u30D6\u3067\u898B\u3089\u308C\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, year, "\u5E74\u306E\u4E88\u7B97\u3067\u3059\u3002\u4E0A\u306E\u5E74\u3092\u5207\u308A\u66FF\u3048\u308B\u3068\u3001\u305D\u306E\u5E74\u306E\u4E88\u7B97\u3092\u5225\u306B\u6301\u3066\u307E\u3059\u3002 \u30AA\u30EC\u30F3\u30B8\u306E\u91D1\u984D\u306F\u8A08\u7B97\u3067\u51FA\u305F\u3082\u306E\u306A\u306E\u3067\u3001\u76F4\u63A5\u306F\u5909\u3048\u3089\u308C\u307E\u305B\u3093\u3002"));
  }
  function KakeiboApp() {
    const now = /* @__PURE__ */ new Date();
    const realYear = now.getFullYear();
    const realMonthIdx = now.getMonth();
    const realDay = now.getDate();
    const [needsSetup, setNeedsSetup] = useState(!KakeiboAPI.books().length);
    const [bookId, setBookId] = useState(() => KakeiboAPI.currentBookId());
    const [booksOpen, setBooksOpen] = useState(false);
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
    const [shownAt, setShownAt] = useState(null);
    const [sync, setSync] = useState({ pending: 0, sending: false, error: "" });
    const [toast, setToast] = useState("");
    const [anaScope, setAnaScope] = useState("year");
    const [anaMonth, setAnaMonth] = useState(realMonthIdx);
    const [histMonth, setHistMonth] = useState(null);
    const [histCat, setHistCat] = useState(null);
    const [sortAsc, setSortAsc] = useState(false);
    const [tkMonth, setTkMonth] = useState(null);
    const [detail, setDetail] = useState(null);
    const [dMonth, setDMonth] = useState(null);
    const [dTag, setDTag] = useState(null);
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
    const [enSettled, setEnSettled] = useState(false);
    const [enShop, setEnShop] = useState("");
    const [settleTag, setSettleTag] = useState(null);
    const [settleConfirm, setSettleConfirm] = useState(false);
    const [stTag, setStTag] = useState(null);
    const [stOnlyLeft, setStOnlyLeft] = useState(true);
    const [stFrom, setStFrom] = useState(0);
    const [stTo, setStTo] = useState((/* @__PURE__ */ new Date()).getMonth());
    const [stConfirm, setStConfirm] = useState(false);
    const [stOff, setStOff] = useState({});
    const [enError, setEnError] = useState("");
    const [enConfirmDel, setEnConfirmDel] = useState(false);
    const [catFormOpen, setCatFormOpen] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const [logRows, setLogRows] = useState([]);
    const [catMode, setCatMode] = useState("add");
    const [catEditId, setCatEditId] = useState(null);
    const [fName, setFName] = useState("");
    const [fGroup, setFGroup] = useState("");
    const [fAmount, setFAmount] = useState("");
    const [fTags, setFTags] = useState([]);
    const [fTagInput, setFTagInput] = useState("");
    const [fNote, setFNote] = useState("");
    const [fRate, setFRate] = useState("100");
    const [fError, setFError] = useState("");
    const [catDeleteId, setCatDeleteId] = useState(null);
    const [tkFormOpen, setTkFormOpen] = useState(false);
    const [tkEditId, setTkEditId] = useState(null);
    const [tkDate, setTkDate] = useState("");
    const [tkMemo, setTkMemo] = useState("");
    const [tkShop, setTkShop] = useState("");
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
    const applyData = useCallback((d) => {
      setCategories(d.categories || []);
      setEntries(d.entries || []);
      setTransfers(d.transfers || []);
      setSettlements(d.settlements || []);
      setBudgets(d.budgets || []);
    }, []);
    const load = useCallback((opts) => {
      const quiet = !!(opts && opts.quiet);
      if (!quiet) setLoading(true);
      setRefreshing(true);
      setLoadError("");
      return KakeiboAPI.loadAll().then((d) => {
        applyData(d);
        setShownAt(null);
        setLoading(false);
        setRefreshing(false);
        KakeiboAPI.recoverQueue();
      }).catch((err) => {
        setLoadError(err.message || String(err));
        setLoading(false);
        setRefreshing(false);
      });
    }, [applyData]);
    useEffect(() => {
      if (needsSetup) {
        setLoading(false);
        return;
      }
      setLoadError("");
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
    useEffect(() => {
      if (needsSetup || loading || loadError || refreshing) return;
      if (sync.pending > 0 || sync.sending) return;
      const t = setTimeout(() => {
        KakeiboAPI.writeSnapshot({ categories, entries, transfers, settlements, budgets });
      }, 800);
      return () => clearTimeout(t);
    }, [
      categories,
      entries,
      transfers,
      settlements,
      budgets,
      sync.pending,
      sync.sending,
      needsSetup,
      bookId,
      loading,
      loadError,
      refreshing
    ]);
    useEffect(() => KakeiboAPI.subscribe(setSync), []);
    const saveCategory = (c) => KakeiboAPI.save("categories", c);
    const saveEntry = (e) => KakeiboAPI.save("entries", e);
    const saveTransfer = (t) => KakeiboAPI.save("transfers", t);
    const saveSettlement = (s) => KakeiboAPI.save("settlements", s);
    const yearEntries = useMemo(() => entries.filter((e) => yearOf(e.date) === year), [entries, year]);
    const yearTransfers = useMemo(() => transfers.filter((t) => yearOf(t.date) === year), [transfers, year]);
    const yearSettlements = useMemo(() => settlements.filter((s) => yearOf(s.date) === year), [settlements, year]);
    const [bgTarget, setBgTarget] = useState(null);
    const [bgAmount, setBgAmount] = useState("");
    const [bgMethod, setBgMethod] = useState("");
    const [bgMemo, setBgMemo] = useState("");
    const [bgError, setBgError] = useState("");
    const groupDefs = useMemo(() => {
      const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === GROUP_ROW);
      const saved = row && parseGroups(row.tags);
      if (saved) return saved;
      const used = categories.filter((c) => !isMaster(c)).map((c) => c.group);
      return LEGACY_GROUPS.some((g) => used.indexOf(g.name) >= 0) ? LEGACY_GROUPS : [];
    }, [categories]);
    const groupOrder = useMemo(() => groupDefs.map((g) => g.name), [groupDefs]);
    const kindOf = useCallback((name) => {
      const g = groupDefs.find((x) => x.name === name);
      return g ? g.kind : KIND_NONE;
    }, [groupDefs]);
    function saveGroups(defs, oldName, newName) {
      if (oldName && newName && oldName !== newName) {
        const moved = categories.filter((c) => !isMaster(c) && c.group === oldName).map((c) => Object.assign({}, c, { group: newName }));
        if (moved.length) {
          setCategories((p) => p.map((c) => moved.find((m) => m.id === c.id) || c));
          moved.forEach(saveCategory);
        }
      }
      writeGroups(defs);
    }
    function writeGroups(defs) {
      const row = {
        id: GROUP_ROW,
        name: "\u30B0\u30EB\u30FC\u30D7",
        group: FEATURE_GROUP,
        monthlyBudget: 0,
        annualBudget: 0,
        tags: serializeGroups(defs),
        note: ""
      };
      setCategories((p) => p.some((c) => c.id === GROUP_ROW) ? p.map((c) => c.id === GROUP_ROW ? row : c) : [...p, row]);
      saveCategory(row);
    }
    const budgetPlan = useMemo(() => {
      const rows = budgets.filter((b) => b.year === year);
      const byTarget = {};
      rows.forEach((b) => {
        byTarget[b.target] = b;
      });
      const live = rows.length > 0;
      const cats = categories.filter((c) => !isMaster(c));
      const per = {};
      let monthAnnual = 0;
      let yearAnnual = 0;
      cats.forEach((c) => {
        const row = byTarget[c.id];
        const kind = kindOf(c.group);
        if (kind === KIND_MONTH) {
          const monthly = live ? row ? row.monthly : 0 : Number(c.monthlyBudget) || 0;
          per[c.id] = { monthly, annual: monthly * 12, method: row ? row.method : "", memo: row ? row.memo : "" };
          monthAnnual += monthly * 12;
        } else if (kind === KIND_YEAR) {
          const annual = live ? row ? row.annual : 0 : Number(c.annualBudget) || 0;
          per[c.id] = { monthly: annual / 12, annual, method: row ? row.method : "", memo: row ? row.memo : "" };
          yearAnnual += annual;
        } else if (kind === KIND_NONE) {
          per[c.id] = { monthly: 0, annual: 0, method: row ? row.method : "", memo: row ? row.memo : "", none: true };
        }
      });
      const restCats = cats.filter((c) => kindOf(c.group) === KIND_REST);
      const legacyRestAnnual = restCats.reduce((a, c) => a + (Number(c.monthlyBudget) || 0) * 12, 0);
      const incomeRow = byTarget[INCOME_TARGET];
      const legacyIncomeMonthly = monthAnnual / 12 + legacyRestAnnual / 12 + Math.round(yearAnnual / 12);
      const incomeMonthly = live && incomeRow ? incomeRow.monthly : legacyIncomeMonthly;
      const incomeAnnual = incomeMonthly * 12;
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
        hasRest: restCats.length > 0
      };
    }, [budgets, categories, year, kindOf]);
    function openBudget(t) {
      const row = budgetPlan.rows.find((b) => b.target === t.target);
      const cur = t.target === INCOME_TARGET ? budgetPlan.income : budgetPlan.per[t.target] || { monthly: 0, annual: 0, method: "", memo: "" };
      const amount = t.kind === "annual" ? cur.annual : cur.monthly;
      setBgTarget(t);
      setBgAmount(amount ? String(Math.round(amount)) : "");
      setBgMethod(row ? row.method : cur.method || "");
      setBgMemo(row ? row.memo : cur.memo || "");
      setBgError("");
    }
    function submitBudget() {
      const t = bgTarget;
      const amount = amountValue(bgAmount);
      if (t.kind !== "note" && (bgAmount === "" || isNaN(amount) || amount < 0)) {
        setBgError("\u91D1\u984D\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
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
        memo: bgMemo.trim()
      };
      const extra = [];
      if (!budgetPlan.live) {
        const seed = (target, kind, monthly, annual) => {
          if (target === t.target) return;
          extra.push({
            id: KakeiboAPI.newId("b_"),
            year,
            target,
            monthly: kind === "annual" ? 0 : monthly,
            annual: kind === "annual" ? annual : 0,
            method: "",
            memo: ""
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
      flash(`${t.label}\u306E\u4E88\u7B97\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F`);
    }
    const budgetOf = useCallback(
      (c) => budgetPlan.per[c.id] || { monthly: 0, annual: 0, method: "", memo: "" },
      [budgetPlan]
    );
    const budgetCats = useMemo(() => {
      const list = categories.filter((c) => !isMaster(c));
      const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === CATORDER_ROW);
      if (!row || !row.tags.length) return list;
      const at = {};
      row.tags.forEach((id, i) => {
        at[id] = i;
      });
      return list.slice().sort((a, b) => {
        const ia = at[a.id] === void 0 ? 9999 : at[a.id];
        const ib = at[b.id] === void 0 ? 9999 : at[b.id];
        return ia === ib ? 0 : ia - ib;
      });
    }, [categories]);
    const settleRates = useMemo(() => {
      const row = categories.find((c) => c.group === FEATURE_GROUP && c.id === RATE_ROW);
      const out = {};
      if (row) row.tags.forEach((t) => {
        const i = t.lastIndexOf(":");
        if (i <= 0) return;
        const n = Number(t.slice(i + 1));
        if (isFinite(n) && n >= 0 && n < 100) out[t.slice(0, i)] = n;
      });
      return out;
    }, [categories]);
    const rateOf = useCallback((catId) => {
      const r = settleRates[catId];
      return r === void 0 ? 100 : r;
    }, [settleRates]);
    function saveRate(catId, rate) {
      const next = Object.assign({}, settleRates);
      if (Number(rate) >= 100) delete next[catId];
      else next[catId] = Number(rate);
      const row = {
        id: RATE_ROW,
        name: "\u7CBE\u7B97\u306E\u5272\u5408",
        group: FEATURE_GROUP,
        monthlyBudget: 0,
        annualBudget: 0,
        tags: Object.keys(next).map((k) => `${k}:${next[k]}`),
        note: ""
      };
      setCategories((p) => p.some((c) => c.id === RATE_ROW) ? p.map((c) => c.id === RATE_ROW ? row : c) : [...p, row]);
      saveCategory(row);
    }
    function saveCatOrder(list) {
      const row = {
        id: CATORDER_ROW,
        name: "\u30AB\u30C6\u30B4\u30EA\u306E\u4E26\u3073",
        group: FEATURE_GROUP,
        monthlyBudget: 0,
        annualBudget: 0,
        tags: list.map((c) => c.id),
        note: ""
      };
      setCategories((p) => p.some((c) => c.id === CATORDER_ROW) ? p.map((c) => c.id === CATORDER_ROW ? row : c) : [...p, row]);
      saveCategory(row);
    }
    function moveCat(cat, delta) {
      const inGroup = budgetCats.filter((c) => c.group === cat.group);
      const i = inGroup.findIndex((c) => c.id === cat.id);
      const moved = moveItem(inGroup, i, delta);
      if (moved === inGroup) return;
      const out = [];
      groupOrder.forEach((g) => {
        out.push(...g === cat.group ? moved : budgetCats.filter((c) => c.group === g));
      });
      budgetCats.forEach((c) => {
        if (out.indexOf(c) < 0) out.push(c);
      });
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
    const shopOptions = useMemo(() => {
      const count = {};
      const add = (v) => {
        const t = String(v || "").trim();
        if (t) count[t] = (count[t] || 0) + 1;
      };
      entries.forEach((e) => add(e.shop));
      settlements.forEach((s) => add(s.shop));
      return Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b, "ja"));
    }, [entries, settlements]);
    const canSettleEntry = KakeiboAPI.supports("entries", "settled");
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
      const state = (f) => f.key === key ? on : uses[f.key];
      const off = FEATURES.filter((f) => f.defaultOff ? state(f) : !state(f)).map((f) => f.defaultOff ? "+" + f.key : f.key);
      const row = {
        id: FEATURE_ROW,
        name: "\u4F7F\u308F\u306A\u3044\u6A5F\u80FD",
        group: FEATURE_GROUP,
        monthlyBudget: 0,
        annualBudget: 0,
        tags: off,
        note: ""
      };
      setCategories((p) => p.some((c) => c.id === FEATURE_ROW) ? p.map((c) => c.id === FEATURE_ROW ? row : c) : [...p, row]);
      saveCategory(row);
    }
    const methodAt = useCallback(
      (i) => methods[Math.min(i, methods.length - 1)] || "",
      [methods]
    );
    const masterUseCount = useCallback((group, name) => {
      if (group === PARTY_GROUP) {
        return settlements.filter((s) => s.party === name).length;
      }
      return entries.filter((e) => e.method === name).length + transfers.filter((t) => t.from === name || t.to === name).length;
    }, [settlements, entries, transfers]);
    function makeMasterRow(group, name) {
      return {
        id: KakeiboAPI.newId(group === PARTY_GROUP ? "p_" : "m_"),
        name,
        group,
        monthlyBudget: 0,
        annualBudget: 0,
        tags: [],
        note: ""
      };
    }
    function addMaster(group, rawName) {
      const name = (rawName || "").trim();
      if (!name) return "\u540D\u524D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      if (namesOf(group).indexOf(name) >= 0) return "\u540C\u3058\u540D\u524D\u304C\u3059\u3067\u306B\u3042\u308A\u307E\u3059";
      const row = makeMasterRow(group, name);
      setCategories((p) => [...p, row]);
      saveCategory(row);
      return "";
    }
    function renameMaster(group, oldName, rawName) {
      const name = (rawName || "").trim();
      if (!name) return "\u540D\u524D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      if (name === oldName) return "";
      if (namesOf(group).indexOf(name) >= 0) return "\u540C\u3058\u540D\u524D\u304C\u3059\u3067\u306B\u3042\u308A\u307E\u3059";
      const target = masterRowsOf(group).find((r) => r.name === oldName);
      if (!target) return "\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F";
      const updated = { ...target, name };
      setCategories((p) => p.map((c) => c.id === target.id ? updated : c));
      saveCategory(updated);
      if (group === PARTY_GROUP) {
        const hit = settlements.filter((s) => s.party === oldName);
        if (hit.length) {
          setSettlements((p) => p.map((s) => s.party === oldName ? { ...s, party: name } : s));
          hit.forEach((s) => saveSettlement({ ...s, party: name }));
        }
      } else {
        const hitE = entries.filter((e) => e.method === oldName);
        if (hitE.length) {
          setEntries((p) => p.map((e) => e.method === oldName ? { ...e, method: name } : e));
          hitE.forEach((e) => saveEntry({ ...e, method: name }));
        }
        const hitT = transfers.filter((t) => t.from === oldName || t.to === oldName);
        if (hitT.length) {
          const swap = (t) => ({
            ...t,
            from: t.from === oldName ? name : t.from,
            to: t.to === oldName ? name : t.to
          });
          setTransfers((p) => p.map((t) => t.from === oldName || t.to === oldName ? swap(t) : t));
          hitT.forEach((t) => saveTransfer(swap(t)));
        }
      }
      return "";
    }
    function deleteMaster(group, name) {
      const used = masterUseCount(group, name);
      if (used > 0) return `${used}\u4EF6\u306E\u8A18\u9332\u3067\u4F7F\u308F\u308C\u3066\u3044\u308B\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093`;
      const target = masterRowsOf(group).find((r) => r.name === name);
      if (!target) return "\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F";
      setCategories((p) => p.filter((c) => c.id !== target.id));
      KakeiboAPI.remove("categories", target.id);
      return "";
    }
    const monthlyGroups = useMemo(
      () => groupDefs.filter((g) => g.kind === KIND_MONTH && budgetCats.some((c) => c.group === g.name)),
      [groupDefs, budgetCats]
    );
    const groupedCatIds = useMemo(() => {
      const m = {};
      budgetCats.forEach((c) => {
        if (kindOf(c.group) === KIND_MONTH) m[c.id] = c.group;
      });
      return m;
    }, [budgetCats, kindOf]);
    const catIndex = useMemo(() => {
      const m = {};
      budgetCats.forEach((c, i) => {
        m[c.id] = i;
      });
      return m;
    }, [budgetCats]);
    const catById = useCallback((id) => budgetCats.find((c) => c.id === id), [budgetCats]);
    const entriesByCat = useMemo(() => {
      const m = {};
      budgetCats.forEach((c) => {
        m[c.id] = [];
      });
      yearEntries.forEach((e) => {
        if (!m[e.categoryId]) m[e.categoryId] = [];
        m[e.categoryId].push(e);
      });
      return m;
    }, [budgetCats, yearEntries]);
    const monthlyTotalsOf = useCallback((c) => {
      const arr = Array(12).fill(0);
      (entriesByCat[c.id] || []).forEach((e) => {
        arr[monthIdxOf(e.date)] += signedAmount(e);
      });
      return arr;
    }, [entriesByCat]);
    function todayInYear() {
      const m = year === realYear ? realMonthIdx + 1 : 1;
      const d = year === realYear ? realDay : 1;
      return `${year}-${pad2(m)}-${pad2(d)}`;
    }
    function openDetail(type, key) {
      setDetail({ type, key });
      setDMonth(null);
      setDTag(null);
      setDetailBack(null);
    }
    function closeDetail() {
      setDetail(null);
      setDMonth(null);
      setDTag(null);
      setDetailBack(null);
    }
    function leaveDetail() {
      const el = detailSheetRef.current;
      setDetailBack({ detail, dMonth, dTag, scrollTop: el ? el.scrollTop : 0 });
      setDetail(null);
    }
    function backToDetail() {
      if (!detailBack) return;
      setDetail(detailBack.detail);
      setDMonth(detailBack.dMonth);
      setDTag(detailBack.dTag);
      detailScrollRef.current = detailBack.scrollTop;
      setDetailBack(null);
    }
    useLayoutEffect(() => {
      if (detailScrollRef.current === null) return;
      if (detail && detailSheetRef.current) detailSheetRef.current.scrollTop = detailScrollRef.current;
      detailScrollRef.current = null;
    }, [detail]);
    function openEntryNew(cat) {
      setEntryTarget({ catId: cat.id, entryId: null });
      setEnDate((d) => d && yearOf(d) === year ? d : todayInYear());
      setEnTag(cat.tags[0] || "");
      setEnMemo("");
      setEnShop("");
      setEnAmount("");
      setEnType("expense");
      setEnMethod((m) => !uses.method ? "" : methods.indexOf(m) < 0 ? methods[0] || "" : m);
      setEnPending(uses.pending);
      setEnSettled(false);
      setEnError("");
      setEnConfirmDel(false);
    }
    function openEntryEdit(cat, entry) {
      if (!cat) return;
      setEntryTarget({ catId: cat.id, entryId: entry.id });
      setEnDate(entry.date || `${year}-01-01`);
      setEnTag(entry.tag || cat.tags[0] || "");
      setEnMemo(entry.memo || "");
      setEnShop(entry.shop || "");
      setEnMethod(entry.method || methods[0]);
      setEnAmount(entry.formula || String(Math.abs(Number(entry.amount) || 0)));
      setEnType(isIncome(entry) ? "income" : "expense");
      setEnPending(!!entry.pending);
      setEnSettled(!!entry.settled);
      setEnError("");
      setEnConfirmDel(false);
    }
    function pickEntryCat(id) {
      const next = budgetCats.find((c) => c.id === id);
      if (!next) return;
      setEntryTarget((t) => ({ ...t, catId: id }));
      setEnTag((tag) => next.tags.indexOf(tag) >= 0 ? tag : next.tags[0] || "");
    }
    function closeEntry() {
      setEntryTarget(null);
      setEnError("");
      setEnConfirmDel(false);
      backToDetail();
    }
    function submitEntry() {
      const amount = amountValue(enAmount);
      if (!enDate) {
        setEnError("\u65E5\u4ED8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (!enAmount || isNaN(amount) || amount === 0) {
        setEnError("\u91D1\u984D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      const { catId, entryId } = entryTarget;
      const absAmount = Math.abs(amount);
      if (entryId) {
        const updated = {
          id: entryId,
          categoryId: catId,
          date: enDate,
          amount: absAmount,
          type: enType,
          tag: enTag,
          memo: enMemo.trim(),
          method: enMethod,
          pending: enPending
        };
        if (KakeiboAPI.supports("entries", "formula")) updated.formula = enteredFormula(enAmount);
        if (canSettleEntry) updated.settled = enSettled;
        if (canShop) updated.shop = enShop.trim();
        setEntries((prev) => prev.map((e) => e.id === entryId ? updated : e));
        saveEntry(updated);
        closeEntry();
        flash("\u8A18\u9332\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
        return;
      }
      const created = {
        id: KakeiboAPI.newId("e_"),
        categoryId: catId,
        date: enDate,
        amount: absAmount,
        type: enType,
        tag: enTag,
        memo: enMemo.trim(),
        method: enMethod,
        pending: enPending
      };
      if (KakeiboAPI.supports("entries", "formula")) created.formula = enteredFormula(enAmount);
      if (canSettleEntry) created.settled = enSettled;
      if (canShop) created.shop = enShop.trim();
      setEntries((prev) => [...prev, created]);
      saveEntry(created);
      closeEntry();
      flash(`${Number(enDate.slice(5, 7))}/${Number(enDate.slice(8, 10))}\u3000${enType === "income" ? "\u53CE\u5165 " : ""}${yen(absAmount)} \u3092\u8A18\u9332\u3057\u307E\u3057\u305F`);
    }
    function deleteEntry(entryId) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      KakeiboAPI.remove("entries", entryId);
      if (entryTarget && entryTarget.entryId === entryId) closeEntry();
      flash("\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    function fillTwelveMonths(cat) {
      const amount = Math.round(budgetOf(cat).monthly);
      if (amount <= 0) return;
      const have = new Set(
        (entriesByCat[cat.id] || []).filter((e) => e.memo === "\u6BCE\u6708\u4E00\u62EC").map((e) => monthIdxOf(e.date))
      );
      const added = [];
      for (let m = 0; m < 12; m++) {
        if (have.has(m)) continue;
        added.push({
          id: KakeiboAPI.newId("e_"),
          categoryId: cat.id,
          date: `${year}-${pad2(m + 1)}-01`,
          amount,
          type: "expense",
          tag: "",
          memo: "\u6BCE\u6708\u4E00\u62EC",
          method: "",
          pending: false
        });
      }
      if (added.length === 0) {
        flash("\u3059\u3067\u306B12\u30F6\u6708\u5206\u304C\u5165\u529B\u3055\u308C\u3066\u3044\u307E\u3059");
        return;
      }
      setEntries((prev) => [...prev, ...added]);
      added.forEach(saveEntry);
      flash(`${added.length}\u30F6\u6708\u5206\uFF08\u5404 ${yen(amount)}\uFF09\u3092\u5165\u529B\u3057\u307E\u3057\u305F`);
    }
    function openCatAdd() {
      setCatMode("add");
      setCatEditId(null);
      setFName("");
      setFGroup(groupOrder[0] || "");
      setFAmount("");
      setFTags([]);
      setFTagInput("");
      setFNote("");
      setFRate("100");
      setFError("");
      setCatFormOpen(true);
    }
    function openCatEdit(cat) {
      setCatMode("edit");
      setCatEditId(cat.id);
      setFName(cat.name);
      setFGroup(cat.group);
      setFAmount(String(kindOf(cat.group) === KIND_YEAR ? cat.annualBudget || "" : cat.monthlyBudget || ""));
      setFTags([...cat.tags]);
      setFTagInput("");
      setFNote(cat.note || "");
      setFError("");
      setFRate(String(rateOf(cat.id)));
      setCatFormOpen(true);
    }
    function pickGroup(g) {
      setFGroup(g);
      if (catMode === "add") {
        setFName("");
        setFAmount("");
        setFTags([]);
        if (DEFAULT_TAGS[g]) setFTags([...DEFAULT_TAGS[g]]);
      }
    }
    function addTag() {
      const t = fTagInput.trim();
      if (!t || fTags.includes(t)) {
        setFTagInput("");
        return;
      }
      setFTags((p) => [...p, t]);
      setFTagInput("");
    }
    function submitCat() {
      const name = fName.trim();
      const needAmount = !budgetPlan.live && kindOf(fGroup) !== KIND_NONE;
      const amount = needAmount ? Number(fAmount) : 0;
      if (!name) {
        setFError("\u30AB\u30C6\u30B4\u30EA\u540D\u3092\u9078\u629E\u307E\u305F\u306F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (needAmount && (!fAmount || isNaN(amount) || amount < 0)) {
        setFError("\u4E88\u7B97\u984D\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      const useRate = uses.esettle && canSettleEntry;
      const rate = useRate ? Number(fRate) : 100;
      if (useRate && (fRate === "" || isNaN(rate) || rate < 0 || rate > 100)) {
        setFError("\u7CBE\u7B97\u306E\u5272\u5408\u306F0\u304B\u3089100\u3067\u5165\u308C\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (catMode === "add") {
        const created = {
          id: KakeiboAPI.newId("c_"),
          name,
          group: fGroup,
          monthlyBudget: kindOf(fGroup) === KIND_YEAR ? 0 : amount,
          annualBudget: kindOf(fGroup) === KIND_YEAR ? amount : 0,
          tags: [...fTags],
          note: fNote.trim()
        };
        setCategories((p) => [...p, created]);
        saveCategory(created);
        if (useRate && rate < 100) saveRate(created.id, rate);
      } else {
        const base = catById(catEditId);
        const updated = {
          ...base,
          name,
          group: fGroup,
          monthlyBudget: kindOf(fGroup) === KIND_YEAR ? 0 : amount,
          annualBudget: kindOf(fGroup) === KIND_YEAR ? amount : 0,
          tags: [...fTags],
          note: fNote.trim()
        };
        setCategories((p) => p.map((c) => c.id === catEditId ? updated : c));
        saveCategory(updated);
        if (useRate && rate !== rateOf(catEditId)) saveRate(catEditId, rate);
        if (base && base.group !== fGroup) {
          const moved = budgets.filter((b) => b.target === catEditId).map((b) => {
            if (kindOf(fGroup) === KIND_YEAR) {
              return Object.assign({}, b, { annual: b.annual || b.monthly * 12, monthly: 0 });
            }
            if (kindOf(fGroup) === KIND_MONTH) {
              return Object.assign({}, b, { monthly: b.monthly || Math.round(b.annual / 12), annual: 0 });
            }
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
    function pickBook(id) {
      if (id === KakeiboAPI.currentBookId()) {
        setBooksOpen(false);
        return;
      }
      KakeiboAPI.switchTo(id).then(() => {
        setHistCat(null);
        setHistMonth(null);
        setDetail(null);
        setLoading(true);
        setBookId(id);
        setBooksOpen(false);
        flash(`${KakeiboAPI.currentBookName()}\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F`);
      }).catch((err) => {
        flash(`\u672A\u9001\u4FE1\u304C\u9001\u308C\u306A\u3044\u305F\u3081\u5207\u308A\u66FF\u3048\u3089\u308C\u307E\u305B\u3093\u3002${err.message || err}`);
      });
    }
    function resetAppCache() {
      if (sync.pending > 0) {
        flash("\u672A\u9001\u4FE1\u304C\u3042\u308A\u307E\u3059\u3002\u9001\u4FE1\u304C\u7D42\u308F\u3063\u3066\u304B\u3089\u306B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      const reload = () => window.location.reload();
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "kakeibo-reset" });
        }
        if (window.caches && caches.keys) {
          caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).then(reload, reload);
          return;
        }
      } catch (e) {
      }
      reload();
    }
    function deleteCategory(id) {
      const count = entries.filter((e) => e.categoryId === id).length;
      if (count > 0) {
        flash(`\u660E\u7D30\u304C${count}\u4EF6\u3042\u308B\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093`);
        setCatDeleteId(null);
        return;
      }
      setCategories((p) => p.filter((c) => c.id !== id));
      KakeiboAPI.remove("categories", id);
      budgets.filter((b) => b.target === id).forEach((b) => KakeiboAPI.remove("budgets", b.id));
      setBudgets((p) => p.filter((b) => b.target !== id));
      setCatDeleteId(null);
    }
    function openTkNew() {
      setTkEditId(null);
      setTkDate(todayInYear());
      setTkMemo("");
      setTkShop("");
      setTkParty(parties[0]);
      setTkAmount("");
      setTkConfirmDel(false);
      setTkMethod(methods[0]);
      setTkPending(true);
      setTkError("");
      setTkFormOpen(true);
    }
    function openTkEdit(t) {
      var _a;
      setTkEditId(t.id);
      setTkDate(t.date || "");
      setTkMemo(t.memo || "");
      setTkShop(t.shop || "");
      setTkParty(t.party || parties[0]);
      setTkConfirmDel(false);
      setTkMethod(t.method || methods[0]);
      setTkAmount(t.formula || String((_a = t.amount) != null ? _a : ""));
      setTkPending(!!t.pending);
      setTkError("");
      setTkFormOpen(true);
    }
    function closeTk() {
      setTkFormOpen(false);
      setTkEditId(null);
      setTkError("");
      setTkConfirmDel(false);
      backToDetail();
    }
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
      if (!tkAmount || isNaN(amount) || amount <= 0) {
        setTkError("\u91D1\u984D\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (tkEditId) {
        const base = settlements.find((s) => s.id === tkEditId);
        const updated = { ...base, memo, party: tkParty, amount, date: tkDate, pending: tkPending, ...extraTk() };
        setSettlements((p) => p.map((s) => s.id === tkEditId ? updated : s));
        saveSettlement(updated);
        flash("\u7ACB\u66FF\u306E\u8A18\u9332\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
      } else {
        const created = { id: KakeiboAPI.newId("s_"), date: tkDate, memo, party: tkParty, amount, settled: false, pending: tkPending, ...extraTk() };
        setSettlements((p) => [...p, created]);
        saveSettlement(created);
        flash(`${tkParty}\u3000${yen(amount)} \u3092\u8A18\u9332\u3057\u307E\u3057\u305F`);
      }
      closeTk();
    }
    function deleteSettlement(id) {
      setSettlements((p) => p.filter((s) => s.id !== id));
      KakeiboAPI.remove("settlements", id);
      closeTk();
      flash("\u7ACB\u66FF\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    function toggleSettled(item) {
      const updated = { ...item, settled: !item.settled };
      setSettlements((p) => p.map((s) => s.id === item.id ? updated : s));
      saveSettlement(updated);
    }
    function openTrNew() {
      const to = methodAt(6);
      setTrEditId(null);
      setTrDate(todayInYear());
      setTrFrom(methodAt(0));
      setTrTo(to);
      setTrConfirmDel(false);
      setTrAmount("");
      setTrMemo(to);
      setTrPending(true);
      setTrError("");
      setTrFormOpen(true);
    }
    function openTrEdit(t) {
      var _a;
      setTrEditId(t.id);
      setTrDate(t.date || todayInYear());
      setTrFrom(t.from || methodAt(0));
      setTrTo(t.to || methodAt(6));
      setTrConfirmDel(false);
      setTrAmount(String((_a = t.amount) != null ? _a : ""));
      setTrMemo(t.memo || "");
      setTrPending(!!t.pending);
      setTrError("");
      setTrFormOpen(true);
    }
    function submitTr() {
      const amount = amountValue(trAmount);
      if (!trDate) {
        setTrError("\u65E5\u4ED8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (!trAmount || isNaN(amount) || amount <= 0) {
        setTrError("\u91D1\u984D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (trFrom === trTo) {
        setTrError("\u632F\u66FF\u5143\u3068\u632F\u66FF\u5148\u304C\u540C\u3058\u3067\u3059");
        return;
      }
      if (trEditId) {
        const updated = { id: trEditId, date: trDate, amount, from: trFrom, to: trTo, memo: trMemo.trim(), pending: trPending };
        setTransfers((p) => p.map((t) => t.id === trEditId ? updated : t));
        saveTransfer(updated);
        flash("\u632F\u66FF\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
      } else {
        const created = { id: KakeiboAPI.newId("t_"), date: trDate, amount, from: trFrom, to: trTo, memo: trMemo.trim(), pending: trPending };
        setTransfers((p) => [...p, created]);
        saveTransfer(created);
        flash(`${trFrom} \u2192 ${trTo}\u3000${yen(amount)} \u3092\u8A18\u9332\u3057\u307E\u3057\u305F`);
      }
      setTrEditId(null);
      setTrFormOpen(false);
    }
    function deleteTransfer(id) {
      setTransfers((p) => p.filter((t) => t.id !== id));
      KakeiboAPI.remove("transfers", id);
      setTrFormOpen(false);
      setTrEditId(null);
      setTrConfirmDel(false);
      flash("\u632F\u66FF\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    const allRows = useMemo(() => {
      const rows = [];
      yearEntries.forEach((e) => {
        const c = budgetCats.find((x) => x.id === e.categoryId);
        rows.push({
          ...e,
          kind: "expense",
          catId: e.categoryId,
          catName: c ? c.name : "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09",
          color: colorOf(catIndex[e.categoryId])
        });
      });
      yearTransfers.forEach((t) => rows.push({ ...t, kind: "transfer" }));
      if (uses.settle) yearSettlements.forEach((s) => rows.push({ ...s, kind: "settlement" }));
      rows.sort((a, b) => {
        const d = a.date === b.date ? String(a.id).localeCompare(String(b.id)) : a.date.localeCompare(b.date);
        return sortAsc ? d : -d;
      });
      return rows;
    }, [yearEntries, yearTransfers, yearSettlements, uses.settle, budgetCats, catIndex, sortAsc]);
    const pendingRows = useMemo(() => {
      const rows = [];
      yearEntries.forEach((e) => {
        if (!e.pending) return;
        const c = budgetCats.find((x) => x.id === e.categoryId);
        rows.push({
          ...e,
          kind: "expense",
          catId: e.categoryId,
          catName: c ? c.name : "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09",
          color: colorOf(catIndex[e.categoryId])
        });
      });
      yearTransfers.forEach((t) => {
        if (t.pending) rows.push({ ...t, kind: "transfer" });
      });
      yearSettlements.forEach((s) => {
        if (s.pending) rows.push({ ...s, kind: "settlement" });
      });
      rows.sort((a, b) => {
        const d = a.date === b.date ? String(a.id).localeCompare(String(b.id)) : a.date.localeCompare(b.date);
        return sortAsc ? d : -d;
      });
      return rows;
    }, [yearEntries, yearTransfers, yearSettlements, budgetCats, catIndex, sortAsc]);
    function confirmPending(row) {
      if (row.kind === "transfer") {
        const base = transfers.find((t) => t.id === row.id);
        const updated = { ...base, pending: false };
        setTransfers((p) => p.map((t) => t.id === row.id ? updated : t));
        saveTransfer(updated);
      } else if (row.kind === "settlement") {
        const base = settlements.find((s) => s.id === row.id);
        const updated = { ...base, pending: false };
        setSettlements((p) => p.map((s) => s.id === row.id ? updated : s));
        saveSettlement(updated);
      } else {
        const base = entries.find((e) => e.id === row.id);
        const updated = { ...base, pending: false };
        setEntries((p) => p.map((e) => e.id === row.id ? updated : e));
        saveEntry(updated);
      }
      flash(`${yen(row.amount)} \u3092\u78BA\u5B9A\u3057\u307E\u3057\u305F`);
    }
    const unsettledRows = useMemo(() => {
      if (!canSettleEntry) return [];
      const rows = yearEntries.filter((e) => !e.settled && !isIncome(e)).map((e) => {
        const c = budgetCats.find((x) => x.id === e.categoryId);
        return {
          ...e,
          kind: "expense",
          catId: e.categoryId,
          catName: c ? c.name : "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09",
          color: colorOf(catIndex[e.categoryId])
        };
      });
      rows.sort((a, b) => {
        const d = a.date === b.date ? String(a.id).localeCompare(String(b.id)) : a.date.localeCompare(b.date);
        return sortAsc ? d : -d;
      });
      return rows;
    }, [canSettleEntry, yearEntries, budgetCats, catIndex, sortAsc]);
    const unsettledTags = useMemo(() => {
      const seen = [];
      unsettledRows.forEach((r) => {
        if (r.tag && seen.indexOf(r.tag) < 0) seen.push(r.tag);
      });
      return seen;
    }, [unsettledRows]);
    const settleTagNow = settleTag && unsettledTags.indexOf(settleTag) >= 0 ? settleTag : null;
    const shownUnsettled = useMemo(
      () => settleTagNow ? unsettledRows.filter((r) => r.tag === settleTagNow) : unsettledRows,
      [unsettledRows, settleTagNow]
    );
    const settleItems = useMemo(() => {
      if (!canSettleEntry) return [];
      return yearEntries.filter((e) => !isIncome(e)).map((e) => ({
        id: e.id,
        catId: e.categoryId,
        tag: e.tag || "",
        settled: !!e.settled,
        month: monthIdxOf(e.date),
        spent: Number(e.amount) || 0,
        pay: settleAmount(e.amount, rateOf(e.categoryId))
      }));
    }, [canSettleEntry, yearEntries, rateOf]);
    const settleTags = useMemo(() => {
      const seen = [];
      settleItems.forEach((r) => {
        if (r.tag && seen.indexOf(r.tag) < 0) seen.push(r.tag);
      });
      return seen.sort();
    }, [settleItems]);
    const stTagNow = stTag && settleTags.indexOf(stTag) >= 0 ? stTag : null;
    const stScoped = useMemo(() => settleItems.filter((r) => {
      if (stTagNow && r.tag !== stTagNow) return false;
      if (stOnlyLeft && r.settled) return false;
      return true;
    }), [settleItems, stTagNow, stOnlyLeft]);
    const stMatrix = useMemo(() => {
      const byCat = {};
      stScoped.forEach((r) => {
        const row = byCat[r.catId] || (byCat[r.catId] = { months: Array(12).fill(0), total: 0 });
        row.months[r.month] += r.spent;
        row.total += r.spent;
      });
      const rows = budgetCats.filter((c) => byCat[c.id]).map((c) => ({ cat: c, rate: rateOf(c.id), ...byCat[c.id] }));
      Object.keys(byCat).forEach((id) => {
        if (budgetCats.some((c) => c.id === id)) return;
        rows.push({ cat: { id, name: "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09" }, rate: 100, ...byCat[id] });
      });
      const months = Array(12).fill(0);
      rows.forEach((r) => r.months.forEach((v, i) => {
        months[i] += v;
      }));
      return { rows, months, total: months.reduce((a, b) => a + b, 0) };
    }, [stScoped, budgetCats, rateOf]);
    const stBatch = useMemo(() => {
      const from = Math.min(stFrom, stTo), to = Math.max(stFrom, stTo);
      const target = settleItems.filter((r) => !r.settled && (!stTagNow || r.tag === stTagNow) && r.month >= from && r.month <= to);
      const byCat = {};
      target.forEach((r) => {
        const row = byCat[r.catId] || (byCat[r.catId] = { pay: 0, spent: 0, count: 0 });
        row.pay += r.pay;
        row.spent += r.spent;
        row.count += 1;
      });
      const rows = budgetCats.filter((c) => byCat[c.id]).map((c) => ({ cat: c, rate: rateOf(c.id), ...byCat[c.id] }));
      Object.keys(byCat).forEach((id) => {
        if (budgetCats.some((c) => c.id === id)) return;
        rows.push({ cat: { id, name: "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09" }, rate: 100, ...byCat[id] });
      });
      rows.forEach((r) => {
        r.on = !stOff[r.cat.id];
        r.payExact = r.pay;
        r.pay = Math.ceil(r.pay);
      });
      const on = rows.filter((r) => r.on);
      return {
        from,
        to,
        rows,
        ids: target.filter((r) => !stOff[r.catId]).map((r) => r.id),
        pay: on.reduce((a, r) => a + r.pay, 0),
        count: on.reduce((a, r) => a + r.count, 0),
        all: target.length
      };
    }, [settleItems, stTagNow, stFrom, stTo, budgetCats, rateOf, stOff]);
    function settleBatch() {
      const ids = {};
      stBatch.ids.forEach((id) => {
        ids[id] = true;
      });
      const updated = entries.filter((e) => ids[e.id]).map((e) => ({ ...e, settled: true }));
      if (!updated.length) return;
      setEntries((p) => p.map((e) => ids[e.id] ? { ...e, settled: true } : e));
      updated.forEach(saveEntry);
      setStConfirm(false);
      flash(`${updated.length}\u4EF6\u3092\u7CBE\u7B97\u6E08\u307F\u306B\u3057\u307E\u3057\u305F`);
    }
    function markSettled(row, settled) {
      const base = entries.find((e) => e.id === row.id);
      if (!base) return;
      const updated = { ...base, settled };
      setEntries((p) => p.map((e) => e.id === row.id ? updated : e));
      saveEntry(updated);
    }
    function settleShown() {
      const list = shownUnsettled;
      if (!list.length) return;
      const ids = {};
      list.forEach((r) => {
        ids[r.id] = true;
      });
      const updated = entries.filter((e) => ids[e.id]).map((e) => ({ ...e, settled: true }));
      setEntries((p) => p.map((e) => ids[e.id] ? { ...e, settled: true } : e));
      updated.forEach(saveEntry);
      setSettleConfirm(false);
      flash(`${updated.length}\u4EF6\u3092\u7CBE\u7B97\u6E08\u307F\u306B\u3057\u307E\u3057\u305F`);
    }
    const matchesHistCat = useCallback((row) => {
      if (histCat === null) return true;
      if (histCat === "transfer") return row.kind === "transfer";
      if (histCat === "settlement") return row.kind === "settlement";
      if (String(histCat).startsWith(HIST_GROUP)) {
        return row.kind === "expense" && groupedCatIds[row.catId] === histCat.slice(HIST_GROUP.length);
      }
      return row.kind === "expense" && row.catId === histCat;
    }, [histCat, groupedCatIds]);
    const histMonthTotals = useMemo(() => {
      const arr = Array(12).fill(0);
      yearEntries.forEach((e) => {
        if (histCat === "transfer" || histCat === "settlement") return;
        if (String(histCat).startsWith(HIST_GROUP)) {
          if (groupedCatIds[e.categoryId] !== histCat.slice(HIST_GROUP.length)) return;
        } else if (histCat !== null && e.categoryId !== histCat) {
          return;
        }
        arr[monthIdxOf(e.date)] += signedAmount(e);
      });
      return arr;
    }, [yearEntries, histCat, groupedCatIds]);
    const histCatCounts = useMemo(() => {
      const m = { transfer: 0, settlement: 0 };
      monthlyGroups.forEach((g) => {
        m[HIST_GROUP + g.name] = 0;
      });
      allRows.forEach((r) => {
        if (typeof histMonth === "number" && monthIdxOf(r.date) !== histMonth) return;
        if (r.kind === "transfer") {
          m.transfer += 1;
          return;
        }
        if (r.kind === "settlement") {
          m.settlement += 1;
          return;
        }
        m[r.catId] = (m[r.catId] || 0) + 1;
        if (groupedCatIds[r.catId]) m[HIST_GROUP + groupedCatIds[r.catId]] += 1;
      });
      return m;
    }, [allRows, histMonth, groupedCatIds, monthlyGroups]);
    const histRows = allRows.filter((e) => typeof histMonth !== "number" || monthIdxOf(e.date) === histMonth).filter(matchesHistCat);
    const histTotal = histRows.filter((e) => e.kind === "expense").reduce((a, e) => a + signedAmount(e), 0);
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
    const anaRows = useMemo(() => budgetCats.map((c) => {
      const totals = monthlyTotalsOf(c);
      const spent = anaScope === "year" ? totals.reduce((s, v) => s + v, 0) : totals[anaMonth];
      const b = budgetOf(c);
      const budget = anaScope === "year" ? b.annual : b.monthly;
      return { cat: c, spent, budget, color: colorOf(catIndex[c.id]), noBudget: kindOf(c.group) === KIND_NONE };
    }).sort((a, b) => {
      const ga = groupOrder.indexOf(a.cat.group), gb = groupOrder.indexOf(b.cat.group);
      if (ga !== gb) return ga - gb;
      return catIndex[a.cat.id] - catIndex[b.cat.id];
    }), [budgetCats, monthlyTotalsOf, anaScope, anaMonth, catIndex]);
    const anaTotal = anaRows.filter((r) => !r.noBudget).reduce((a, r) => ({ spent: a.spent + r.spent, budget: a.budget + r.budget }), { spent: 0, budget: 0 });
    const anaOutside = anaRows.filter((r) => r.noBudget).reduce((a, r) => a + r.spent, 0);
    const anaMonths = year < realYear ? 12 : year > realYear ? 12 : realMonthIdx + 1;
    const perMonth = useCallback((v) => Math.round(v / anaMonths), [anaMonths]);
    const anaGroups = groupOrder.map((g) => {
      const rows = anaRows.filter((r) => r.cat.group === g);
      return {
        group: g,
        count: rows.length,
        spent: rows.reduce((a, r) => a + r.spent, 0),
        budget: rows.reduce((a, r) => a + r.budget, 0)
      };
    }).filter((g) => g.count > 0);
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
      const d = a.date === b.date ? String(a.id).localeCompare(String(b.id)) : a.date.localeCompare(b.date);
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
    const tkMonthTotals = useMemo(() => {
      const arr = Array(12).fill(0);
      yearSettlements.forEach((s) => {
        arr[monthIdxOf(s.date)] += Number(s.amount) || 0;
      });
      return arr;
    }, [yearSettlements]);
    const scopedSettlements = useMemo(
      () => tkMonth === null ? yearSettlements : yearSettlements.filter((s) => monthIdxOf(s.date) === tkMonth),
      [yearSettlements, tkMonth]
    );
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
        party: p,
        items,
        unsettled: items.filter((t) => !t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
        settled: items.filter((t) => t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
        count: items.length
      };
    }), [partyNames, scopedSettlements]);
    const linkedParty = useCallback(
      (name) => partyRows.some((r) => isLinked(r) && r.name === name),
      [partyRows]
    );
    const summaryOf = useCallback(
      (name) => partySummary.find((p) => p.party === name) || { party: name, items: [], unsettled: 0, settled: 0, count: 0 },
      [partySummary]
    );
    const partyBoxes = useMemo(() => {
      const out = [];
      const extra = [];
      scopedSettlements.forEach((t) => {
        if (t.party && !partyRows.some((r) => r.name === t.party) && !extra.some((r) => r.name === t.party)) {
          extra.push({ id: "x_" + t.party, name: t.party, note: "" });
        }
      });
      partyRows.concat(extra).forEach((r) => {
        const parts = String(r.note || "").split("/");
        const box = (parts[0] || "").trim();
        const grp = (parts[1] || "").trim();
        let b = out.find((x) => x.box === box);
        if (!b) {
          b = { box, groups: [] };
          out.push(b);
        }
        let g = b.groups.find((x) => x.name === grp);
        if (!g) {
          g = { name: grp, rows: [] };
          b.groups.push(g);
        }
        g.rows.push(r);
      });
      return out.sort((a, b) => (a.box ? 0 : 1) - (b.box ? 0 : 1));
    }, [partyRows, scopedSettlements]);
    const maxParty = Math.max(...partySummary.map((p) => p.unsettled + p.settled), 1);
    const dPartyItems = detail && detail.type === "party" ? scopedSettlements.filter((t) => t.party === detail.key).sort((a, b) => (sortAsc ? 1 : -1) * (a.date || "").localeCompare(b.date || "")) : [];
    const tkSupportsMethod = KakeiboAPI.supports("settlements", "method");
    const hasData = categories.length > 0 || entries.length > 0 || transfers.length > 0 || settlements.length > 0;
    const entryCat = entryTarget ? catById(entryTarget.catId) : null;
    const TABS = [
      // 予算は budgets シートを増やしてからでないと保存できないので、
      // 貼り替え前は出さない（入れたのに消えるのを防ぐ）
      ...KakeiboAPI.supportsTable("budgets") ? [{ key: "budget", label: "\u4E88\u7B97", icon: Target }] : [],
      { key: "record", label: "\u8A18\u9332", icon: PencilLine },
      { key: "history", label: "\u5C65\u6B74", icon: ListOrdered },
      { key: "analysis", label: "\u5B9F\u7E3E", icon: PieChart },
      ...uses.settle ? [{ key: "settle", label: "\u7ACB\u66FF", icon: Wallet }] : [],
      // 明細の精算を使う家計簿だけ。立て替えたぶんを人ごと・月ごとに片付けるところ
      ...uses.esettle && canSettleEntry ? [{ key: "esettle", label: "\u7CBE\u7B97", icon: HandCoins }] : []
    ];
    useEffect(() => {
      if (!uses.settle && tab === "settle") setTab("record");
      if ((!uses.esettle || !canSettleEntry) && tab === "esettle") setTab("record");
    }, [uses.settle, uses.esettle, canSettleEntry, tab]);
    if (needsSetup) {
      return /* @__PURE__ */ React.createElement(SetupScreen, { onSave: (n, u) => {
        const b = KakeiboAPI.addBook(n, u);
        setBookId(b.id);
        setNeedsSetup(false);
      } });
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kb" }, /* @__PURE__ */ React.createElement("div", { className: "kb-stickytop" }, /* @__PURE__ */ React.createElement("div", { className: "kb-topbar" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement("button", { className: "kb-booktitle", onClick: () => setBooksOpen(true) }, /* @__PURE__ */ React.createElement("span", null, KakeiboAPI.currentBookName() || "\u5BB6\u8A08\u7C3F"), /* @__PURE__ */ React.createElement(ChevronDown, { size: 15 })), /* @__PURE__ */ React.createElement("div", { className: "kb-yearpick" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-yearbtn",
        onClick: () => load({ quiet: true }),
        disabled: refreshing,
        "aria-label": "\u6700\u65B0\u3092\u8AAD\u307F\u8FBC\u3080"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 15, className: refreshing ? "kb-spin" : void 0 })
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-yearbtn", onClick: () => setYear((y) => y - 1), "aria-label": "\u524D\u306E\u5E74" }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 16 })), /* @__PURE__ */ React.createElement("span", { className: "kb-yearlabel" }, year, "\u5E74"), /* @__PURE__ */ React.createElement("button", { className: "kb-yearbtn", onClick: () => setYear((y) => y + 1), "aria-label": "\u6B21\u306E\u5E74" }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 16 }))))), sync.error ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar error" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "\u672A\u9001\u4FE1\u304C", sync.pending, "\u4EF6\u3042\u308A\u307E\u3059\u3002"), sync.error), /* @__PURE__ */ React.createElement("button", { className: "kb-syncbtn", onClick: () => KakeiboAPI.retry() }, "\u518D\u9001"))) : sync.pending > 0 && !sync.sending ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar error" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "\u672A\u9001\u4FE1\u304C", sync.pending, "\u4EF6\u3042\u308A\u307E\u3059\u3002"), "\u3053\u306E\u307E\u307E\u9589\u3058\u308B\u3068\u5931\u308F\u308C\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("button", { className: "kb-syncbtn", onClick: () => KakeiboAPI.retry() }, "\u9001\u4FE1"))) : sync.pending > 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar pending" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "kb-spin" }), /* @__PURE__ */ React.createElement("span", null, "\u4FDD\u5B58\u4E2D\u2026\uFF08\u6B8B\u308A", sync.pending, "\u4EF6\uFF09"))) : loadError && hasData ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar error" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement("span", null, "\u6700\u65B0\u3092\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u8868\u793A\u306F", shownAt ? timeLabel(shownAt) + "\u6642\u70B9\u306E" : "", "\u63A7\u3048\u3067\u3059\u3002"), /* @__PURE__ */ React.createElement("button", { className: "kb-syncbtn", onClick: () => load({ quiet: true }) }, "\u518D\u8AAD\u307F\u8FBC\u307F"))) : shownAt ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar stale" }, /* @__PURE__ */ React.createElement("div", { className: "kb-bar-inner" }, /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "kb-spin" }), /* @__PURE__ */ React.createElement("span", null, timeLabel(shownAt), "\u6642\u70B9\u306E\u5185\u5BB9\u3067\u3059\u3002\u6700\u65B0\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026"))) : null), /* @__PURE__ */ React.createElement("div", { className: "kb-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "kb-body" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "kb-loading" }, /* @__PURE__ */ React.createElement(Loader2, { size: 16, className: "kb-spin" }), " \u8AAD\u307F\u8FBC\u307F\u4E2D\u2026") : loadError && !hasData ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F"), loadError), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 16px" } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: load }, "\u3082\u3046\u4E00\u5EA6\u8AAD\u307F\u8FBC\u3080"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setBooksOpen(true) }, "\u5BB6\u8A08\u7C3F\u306E\u8A2D\u5B9A\u3092\u898B\u308B")))) : tab === "budget" ? /* @__PURE__ */ React.createElement(
      BudgetTab,
      {
        year,
        plan: budgetPlan,
        cats: budgetCats,
        groupDefs,
        named: groupDefs !== LEGACY_GROUPS,
        onEdit: openBudget
      }
    ) : tab === "record" ? /* @__PURE__ */ React.createElement(React.Fragment, null, budgetCats.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308A\u307E\u305B\u3093"), "\u4E0B\u306E\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6\u304B\u3089\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002")) : groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => /* @__PURE__ */ React.createElement("div", { key: g }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, g), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, budgetCats.filter((c) => c.group === g).map((c) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: c.id, onClick: () => openEntryNew(c) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: colorOf(catIndex[c.id]) } }, c.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, [
      c.tags.length > 0 ? c.tags.join("\u30FB") : kindOf(c.group) === KIND_YEAR ? `\u5E74\u9593\u4E88\u7B97 ${yenExact(budgetOf(c).annual)}` : kindOf(c.group) === KIND_NONE ? "\u4E88\u7B97\u5916" : `\u6708\u4E88\u7B97 ${yenExact(budgetOf(c).monthly)}`,
      c.note
    ].filter(Boolean).join("\u3000"))), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))))), uses.transfer && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u305D\u306E\u4ED6"), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("button", { className: "kb-row", onClick: openTrNew }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: "#AEB4BC" } }, /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 15 })), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, "\u632F\u66FF"), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, "PASMO\u3078\u306E\u30C1\u30E3\u30FC\u30B8\u306A\u3069\u30FB\u652F\u51FA\u306B\u306F\u542B\u3081\u307E\u305B\u3093")), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))), /* @__PURE__ */ React.createElement("button", { className: "kb-hint", onClick: () => {
      setManageOpen(true);
      setCatFormOpen(false);
      setLogOpen(false);
    } }, /* @__PURE__ */ React.createElement(Settings, { size: 15 }), "\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6")) : tab === "history" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-histfilter" }, /* @__PURE__ */ React.createElement("button", { className: `kb-monthchip ${histMonth === null ? "on" : ""}`, onClick: () => setHistMonth(null) }, /* @__PURE__ */ React.createElement("span", null, "\u5E74\u9593"), /* @__PURE__ */ React.createElement("b", null, allRows.length === 0 ? "\u2014" : histMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP"))), MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        className: `kb-monthchip ${histMonth === i ? "on" : ""} ${histMonthTotals[i] === 0 ? "empty" : ""}`,
        onClick: () => setHistMonth(histMonth === i ? null : i)
      },
      /* @__PURE__ */ React.createElement("span", null, l),
      /* @__PURE__ */ React.createElement("b", null, histMonthTotals[i] === 0 ? "\u2014" : histMonthTotals[i].toLocaleString("ja-JP"))
    ))), histMonth !== "pending" && histMonth !== "unsettled" && /* @__PURE__ */ React.createElement("div", { className: "kb-chips", style: { marginTop: 8, marginBottom: 0 } }, /* @__PURE__ */ React.createElement("button", { className: `kb-tagchip ${histCat === null ? "on" : ""}`, onClick: () => setHistCat(null) }, "\u3059\u3079\u3066"), budgetCats.filter((c) => !groupedCatIds[c.id]).map((c) => {
      const n = histCatCounts[c.id] || 0;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          className: `kb-tagchip ${histCat === c.id ? "on" : ""} ${n === 0 ? "empty" : ""}`,
          onClick: () => setHistCat(histCat === c.id ? null : c.id)
        },
        c.name,
        n > 0 ? ` ${n}` : ""
      );
    }), monthlyGroups.map((g) => {
      const key = HIST_GROUP + g.name;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key,
          className: `kb-tagchip ${histCat === key ? "on" : ""} ${!histCatCounts[key] ? "empty" : ""}`,
          onClick: () => setHistCat(histCat === key ? null : key)
        },
        g.name,
        histCatCounts[key] ? ` ${histCatCounts[key]}` : ""
      );
    }), uses.transfer && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-tagchip ${histCat === "transfer" ? "on" : ""} ${!histCatCounts.transfer ? "empty" : ""}`,
        onClick: () => setHistCat(histCat === "transfer" ? null : "transfer")
      },
      "\u632F\u66FF",
      histCatCounts.transfer ? ` ${histCatCounts.transfer}` : ""
    ), uses.settle && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-tagchip ${histCat === "settlement" ? "on" : ""} ${!histCatCounts.settlement ? "empty" : ""}`,
        onClick: () => setHistCat(histCat === "settlement" ? null : "settlement")
      },
      "\u7ACB\u66FF",
      histCatCounts.settlement ? ` ${histCatCounts.settlement}` : ""
    )), (uses.pending || pendingRows.length > 0) && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-pendingchip ${histMonth === "pending" ? "on" : ""} ${pendingRows.length === 0 ? "empty" : ""}`,
        onClick: () => setHistMonth(histMonth === "pending" ? null : "pending")
      },
      /* @__PURE__ */ React.createElement(CircleAlert, { size: 15 }),
      /* @__PURE__ */ React.createElement("span", null, "\u91D1\u984D\u304C\u672A\u78BA\u5B9A"),
      /* @__PURE__ */ React.createElement("b", null, pendingRows.length, "\u4EF6"),
      /* @__PURE__ */ React.createElement(ChevronRight, { size: 16, className: "kb-chev" })
    ), uses.esettle && canSettleEntry && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-pendingchip settle ${histMonth === "unsettled" ? "on" : ""} ${unsettledRows.length === 0 ? "empty" : ""}`,
        onClick: () => {
          setHistMonth(histMonth === "unsettled" ? null : "unsettled");
          setSettleConfirm(false);
        }
      },
      /* @__PURE__ */ React.createElement(Wallet, { size: 15 }),
      /* @__PURE__ */ React.createElement("span", null, "\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044"),
      /* @__PURE__ */ React.createElement("b", null, unsettledRows.length, "\u4EF6"),
      /* @__PURE__ */ React.createElement(ChevronRight, { size: 16, className: "kb-chev" })
    ), histMonth === "unsettled" ? /* @__PURE__ */ React.createElement(React.Fragment, null, unsettledTags.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "kb-chips", style: { marginTop: 8, marginBottom: 0 } }, /* @__PURE__ */ React.createElement("button", { className: `kb-tagchip ${settleTagNow === null ? "on" : ""}`, onClick: () => {
      setSettleTag(null);
      setSettleConfirm(false);
    } }, "\u3059\u3079\u3066"), unsettledTags.map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t,
        className: `kb-tagchip ${settleTagNow === t ? "on" : ""}`,
        onClick: () => {
          setSettleTag(settleTagNow === t ? null : t);
          setSettleConfirm(false);
        }
      },
      t,
      " ",
      unsettledRows.filter((r) => r.tag === t).length
    ))), /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u672A\u7CBE\u7B97 ", yen(shownUnsettled.reduce((a, r) => a + r.amount, 0))), /* @__PURE__ */ React.createElement("div", { className: "kb-sortwrap" }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, shownUnsettled.length, "\u4EF6"), /* @__PURE__ */ React.createElement(SortButton, { asc: sortAsc, onToggle: () => setSortAsc((v) => !v) }))), shownUnsettled.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093"), "\u7ACB\u3066\u66FF\u3048\u305F\u3076\u3093\u306F\u3053\u3053\u306B\u96C6\u307E\u308A\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginBottom: 10 } }, settleConfirm ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setSettleConfirm(false) }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: settleShown }, shownUnsettled.length, "\u4EF6\u3092\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setSettleConfirm(true) }, /* @__PURE__ */ React.createElement(Check, { size: 14, style: { verticalAlign: "-2px", marginRight: 5 } }), "\u3053\u306E\u4E00\u89A7\u306E", shownUnsettled.length, "\u4EF6\u3092\u307E\u3068\u3081\u3066\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B")), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, shownUnsettled.map((r) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: r.id, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, Number(r.date.slice(5, 7)), "/", Number(r.date.slice(8, 10))), /* @__PURE__ */ React.createElement(
      RowMain,
      {
        x: r,
        style: { cursor: "pointer" },
        onClick: () => openEntryEdit(catById(r.catId), r),
        sub: [r.catName, uses.method ? r.method : ""].filter(Boolean).join("\u30FB")
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: amountStyle(r) }, yen(r.amount)), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn confirm", onClick: () => markSettled(r, true), "aria-label": "\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B" }, /* @__PURE__ */ React.createElement(Check, { size: 16 }))))), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub", style: { padding: "10px 4px 0", whiteSpace: "normal" } }, "\u7CBE\u7B97\u3057\u305F\u3082\u306E\u304B\u3089\u30C1\u30A7\u30C3\u30AF\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u62BC\u3059\u3068\u3053\u306E\u4E00\u89A7\u304B\u3089\u6D88\u3048\u307E\u3059\u3002 \u5185\u8A33\u3067\u7D5E\u3063\u3066\u304B\u3089\u307E\u3068\u3081\u3066\u62BC\u3059\u3068\u3001\u7ACB\u3066\u66FF\u3048\u305F\u4EBA\u3054\u3068\u306B\u7247\u4ED8\u3051\u3089\u308C\u307E\u3059\u3002"))) : histMonth === "pending" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u672A\u78BA\u5B9A ", yen(pendingRows.reduce((a, r) => a + r.amount, 0))), /* @__PURE__ */ React.createElement("div", { className: "kb-sortwrap" }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, pendingRows.length, "\u4EF6"), /* @__PURE__ */ React.createElement(SortButton, { asc: sortAsc, onToggle: () => setSortAsc((v) => !v) }))), pendingRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u672A\u78BA\u5B9A\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093"), "\u91D1\u984D\u304C\u78BA\u5B9A\u3057\u3066\u3044\u306A\u3044\u8A18\u9332\u306F\u3053\u3053\u306B\u96C6\u307E\u308A\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, pendingRows.map((r) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: `${r.kind}-${r.id}`, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, Number(r.date.slice(5, 7)), "/", Number(r.date.slice(8, 10))), /* @__PURE__ */ React.createElement(
      RowMain,
      {
        x: r,
        style: { cursor: "pointer" },
        onClick: () => {
          if (r.kind === "transfer") openTrEdit(r);
          else if (r.kind === "settlement") openTkEdit(r);
          else openEntryEdit(catById(r.catId), r);
        },
        sub: r.kind === "transfer" ? `\u632F\u66FF\u30FB${r.from} \u2192 ${r.to}` : r.kind === "settlement" ? [`\u7ACB\u66FF\u30FB${r.party}`, uses.method ? r.method : ""].filter(Boolean).join("\u30FB") : [isIncome(r) ? "\u53CE\u5165" : null, r.catName, uses.method ? r.method : ""].filter(Boolean).join("\u30FB")
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: "var(--pending)" } }, isIncome(r) ? "+" : "", yen(r.amount)), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn confirm", onClick: () => confirmPending(r), "aria-label": "\u91D1\u984D\u3092\u78BA\u5B9A\u3059\u308B" }, /* @__PURE__ */ React.createElement(Check, { size: 16 }))))), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub", style: { padding: "10px 4px 0", whiteSpace: "normal" } }, "\u30AB\u30FC\u30C9\u306E\u660E\u7D30\u306B\u8F09\u3063\u305F\u3082\u306E\u304B\u3089\u30C1\u30A7\u30C3\u30AF\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u62BC\u3059\u3068\u78BA\u5B9A\u306B\u306A\u308A\u3001\u3053\u306E\u4E00\u89A7\u304B\u3089\u6D88\u3048\u307E\u3059\u3002"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 8 } }, /* @__PURE__ */ React.createElement("span", null, histMonth === null ? "\u5E74\u9593" : MONTH_LABELS[histMonth], "\u306E\u652F\u51FA ", yen(histTotal)), /* @__PURE__ */ React.createElement("div", { className: "kb-sortwrap" }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, histRows.length, "\u4EF6"), /* @__PURE__ */ React.createElement(SortButton, { asc: sortAsc, onToggle: () => setSortAsc((v) => !v) }))), historyByDate.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, histMonth === null ? "\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093" : `${MONTH_LABELS[histMonth]}\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093`), histMonth === null ? "\u8A18\u9332\u30BF\u30D6\u304B\u3089\u30AB\u30C6\u30B4\u30EA\u3092\u9078\u3093\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : "\u4E0A\u306E\u5E74\u9593\u3092\u62BC\u3059\u3068\u5168\u671F\u9593\u306B\u623B\u308A\u307E\u3059\u3002")) : historyByDate.map((day) => {
      const dayTotal = day.rows.filter((e) => e.kind === "expense").reduce((s, e) => s + signedAmount(e), 0);
      return /* @__PURE__ */ React.createElement("div", { key: day.date }, /* @__PURE__ */ React.createElement("div", { className: "kb-datehead" }, /* @__PURE__ */ React.createElement("span", { className: "d" }, Number(day.date.slice(5, 7)), "/", Number(day.date.slice(8, 10)), "\uFF08", weekday(day.date), "\uFF09"), /* @__PURE__ */ React.createElement("span", { className: "t" }, "\u652F\u51FA ", yen(dayTotal))), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, day.rows.map((e) => e.kind === "transfer" ? /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => openTrEdit(e) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: "#AEB4BC" } }, /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 15 })), /* @__PURE__ */ React.createElement(RowMain, { x: e }), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: e.pending ? "var(--pending)" : "var(--sub)" } }, yen(e.amount)), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })) : e.kind === "settlement" ? (
        /* 立替は支出に数えないので、振替と同じ灰色の丸で出す。
           立替先は上段に出ないぶん、下段で補う */
        /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => openTkEdit(e) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: "#AEB4BC" } }, /* @__PURE__ */ React.createElement(Wallet, { size: 15 })), /* @__PURE__ */ React.createElement(
          RowMain,
          {
            x: e,
            sub: [`\u7ACB\u66FF\u30FB${e.party}`, uses.method ? e.method : ""].filter(Boolean).join("\u30FB")
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: e.pending ? "var(--pending)" : "var(--sub)" } }, yen(e.amount)), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }))
      ) : /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => openEntryEdit(catById(e.catId), e) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: e.color } }, e.catName.slice(0, 1)), /* @__PURE__ */ React.createElement(RowMain, { x: e, noMethod: !uses.method }), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: amountStyle(e) }, isIncome(e) ? "+" : "", yen(Math.abs(Number(e.amount) || 0))), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))));
    }))) : tab === "analysis" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-seg", style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("button", { className: anaScope === "month" ? "on" : "", onClick: () => setAnaScope("month") }, "\u6708\u5225"), /* @__PURE__ */ React.createElement("button", { className: anaScope === "year" ? "on" : "", onClick: () => setAnaScope("year") }, "\u5E74\u5225")), anaScope === "month" && /* @__PURE__ */ React.createElement("div", { className: "kb-monthbar" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setAnaMonth((m) => (m + 11) % 12), "aria-label": "\u524D\u306E\u6708" }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 17 })), /* @__PURE__ */ React.createElement("span", null, year, "\u5E74 ", MONTH_LABELS[anaMonth]), /* @__PURE__ */ React.createElement("button", { onClick: () => setAnaMonth((m) => (m + 1) % 12), "aria-label": "\u6B21\u306E\u6708" }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 17 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-total-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-total-row" }, /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, "\u4E88\u7B97 ", yen(anaTotal.budget)), /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, anaTotal.spent > anaTotal.budget ? "\u8D85\u904E" : "\u6B8B", " ", yen(Math.abs(anaTotal.budget - anaTotal.spent)))), /* @__PURE__ */ React.createElement("div", { className: "kb-total-row", style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "kb-total-big", style: { color: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--ink)" } }, yen(anaTotal.spent)), anaScope === "year" && /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, "\u6708\u5E73\u5747 ", yen(perMonth(anaTotal.spent)))), /* @__PURE__ */ React.createElement("div", { className: "kb-bar" }, /* @__PURE__ */ React.createElement("span", { style: {
      width: `${anaTotal.budget > 0 ? Math.min(anaTotal.spent / anaTotal.budget * 100, 100) : 0}%`,
      background: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--accent)"
    } })), anaOutside > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-total-row", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, "\u4E88\u7B97\u5916 ", yen(anaOutside)), /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, "\u3042\u308F\u305B\u3066 ", yen(anaTotal.spent + anaOutside)))), anaRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, "\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308A\u307E\u305B\u3093")) : anaGroups.map(({ group, spent }) => /* @__PURE__ */ React.createElement("div", { key: group }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label kb-grouphead" }, /* @__PURE__ */ React.createElement("span", null, group), /* @__PURE__ */ React.createElement("b", null, yen(spent))), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, anaRows.filter((r) => r.cat.group === group).map(({ cat, spent: spent2, budget, color }) => {
      const k = kindOf(cat.group);
      const showBudget = k !== KIND_NONE && (anaScope === "year" || k === KIND_MONTH || k === KIND_REST || !budgetPlan.hasRest);
      const over = showBudget && spent2 > budget;
      const pct = budget > 0 ? Math.min(spent2 / budget * 100, 100) : spent2 > 0 ? 100 : 0;
      return /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: cat.id, onClick: () => openDetail("category", cat.id) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: color } }, cat.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, cat.name, cat.note && /* @__PURE__ */ React.createElement("span", { className: "kb-titlenote" }, cat.note)), showBudget && /* @__PURE__ */ React.createElement("div", { className: "kb-bar thin" }, /* @__PURE__ */ React.createElement("span", { style: { width: `${pct}%`, background: over ? "var(--red)" : color } })), anaScope === "year" && /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, "\u6708\u5E73\u5747 ", yen(perMonth(spent2)))), /* @__PURE__ */ React.createElement("div", { className: "kb-ana-vals" }, /* @__PURE__ */ React.createElement("div", { className: "kb-ana-spent", style: { color: over ? "var(--red)" : "var(--ink)" } }, yen(spent2)), showBudget && /* @__PURE__ */ React.createElement("div", { className: "kb-ana-rest" }, over ? "\u8D85\u904E" : "\u6B8B", " ", yen(Math.abs(budget - spent2)))), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }));
    }))))) : tab === "esettle" ? /* @__PURE__ */ React.createElement(React.Fragment, null, settleTags.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "kb-chips", style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-tagchip ${stTagNow === null ? "on" : ""}`,
        onClick: () => {
          setStTag(null);
          setStConfirm(false);
        }
      },
      "\u3059\u3079\u3066"
    ), settleTags.map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t,
        className: `kb-tagchip ${stTagNow === t ? "on" : ""}`,
        onClick: () => {
          setStTag(stTagNow === t ? null : t);
          setStConfirm(false);
        }
      },
      t
    ))), /* @__PURE__ */ React.createElement("div", { className: "kb-seg", style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("button", { className: stOnlyLeft ? "on" : "", onClick: () => setStOnlyLeft(true) }, "\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044"), /* @__PURE__ */ React.createElement("button", { className: !stOnlyLeft ? "on" : "", onClick: () => setStOnlyLeft(false) }, "\u3059\u3079\u3066")), stMatrix.rows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, stOnlyLeft ? "\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093" : "\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093"), "\u7ACB\u3066\u66FF\u3048\u305F\u3076\u3093\u304C\u3053\u3053\u306B\u96C6\u307E\u308A\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u6708\u5225\uFF08", stOnlyLeft ? "\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u3076\u3093" : "\u3059\u3079\u3066", "\uFF09"), /* @__PURE__ */ React.createElement("div", { className: "kb-matrix-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "kb-matrix" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "kb-mx-head" }, "\u30AB\u30C6\u30B4\u30EA"), MONTH_LABELS.map((l) => /* @__PURE__ */ React.createElement("th", { key: l }, l)), /* @__PURE__ */ React.createElement("th", { className: "kb-mx-total" }, "\u5408\u8A08"))), /* @__PURE__ */ React.createElement("tbody", null, stMatrix.rows.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.cat.id }, /* @__PURE__ */ React.createElement("th", { className: "kb-mx-head" }, r.cat.name, r.rate < 100 ? /* @__PURE__ */ React.createElement("span", { className: "kb-mx-rate" }, r.rate, "%") : null), r.months.map((v, i) => /* @__PURE__ */ React.createElement("td", { key: i, className: v === 0 ? "empty" : "" }, v === 0 ? "\u2014" : v.toLocaleString("ja-JP"))), /* @__PURE__ */ React.createElement("td", { className: "kb-mx-total" }, r.total.toLocaleString("ja-JP")))), /* @__PURE__ */ React.createElement("tr", { className: "kb-mx-sum" }, /* @__PURE__ */ React.createElement("th", { className: "kb-mx-head" }, "\u5408\u8A08"), stMatrix.months.map((v, i) => /* @__PURE__ */ React.createElement("td", { key: i, className: v === 0 ? "empty" : "" }, v === 0 ? "\u2014" : v.toLocaleString("ja-JP"))), /* @__PURE__ */ React.createElement("td", { className: "kb-mx-total" }, stMatrix.total.toLocaleString("ja-JP")))))), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub", style: { padding: "8px 4px 0", whiteSpace: "normal" } }, "\u4F7F\u3063\u305F\u984D\u3067\u3059\u3002\u7CBE\u7B97\u306E\u5272\u5408\u3092\u6C7A\u3081\u305F\u30AB\u30C6\u30B4\u30EA\u306F\u3001 \u4E0B\u306E\u300C\u307E\u3068\u3081\u3066\u7CBE\u7B97\u3059\u308B\u300D\u3067\u5272\u5408\u3092\u5F53\u3066\u305F\u984D\u306B\u306A\u308A\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u307E\u3068\u3081\u3066\u7CBE\u7B97\u3059\u308B"), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { padding: "10px 14px" } }, /* @__PURE__ */ React.createElement("div", { className: "kb-inline" }, /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: stFrom, onChange: (ev) => {
      setStFrom(Number(ev.target.value));
      setStConfirm(false);
    } }, MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, l))), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--sub)", fontSize: 13 } }, "\u304B\u3089"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: stTo, onChange: (ev) => {
      setStTo(Number(ev.target.value));
      setStConfirm(false);
    } }, MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, l))), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--sub)", fontSize: 13 } }, "\u307E\u3067"))), stBatch.count === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u3053\u306E\u7BC4\u56F2\u306B\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093"), "\u6708\u3092\u9078\u3073\u76F4\u3059\u304B\u3001\u4E0A\u306E\u5185\u8A33\u306E\u7D5E\u308A\u8FBC\u307F\u3092\u78BA\u304B\u3081\u3066\u304F\u3060\u3055\u3044\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-card kb-stbatch", style: { marginTop: 10 } }, stBatch.rows.map((r) => /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-row kb-stpick ${r.on ? "" : "off"}`,
        key: r.cat.id,
        "aria-pressed": r.on,
        onClick: () => {
          setStOff((p) => Object.assign({}, p, { [r.cat.id]: r.on }));
          setStConfirm(false);
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: `kb-tick ${r.on ? "on" : ""}` }, r.on ? /* @__PURE__ */ React.createElement(Check, { size: 13 }) : null),
      /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, r.cat.name, r.rate < 100 ? /* @__PURE__ */ React.createElement("span", { className: "kb-formula" }, r.rate, "% / ", yen(r.spent)) : null), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, r.count, "\u4EF6", r.pay !== r.payExact ? `\u30FB${yenExact(r.payExact)} \u3092\u5207\u308A\u4E0A\u3052` : "")),
      /* @__PURE__ */ React.createElement("span", { className: "kb-amount" }, yen(r.pay))
    ))), /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 10 } }, /* @__PURE__ */ React.createElement("span", null, stTagNow ? `${stTagNow}\u3078 ` : "", MONTH_LABELS[stBatch.from], "\u301C", MONTH_LABELS[stBatch.to], "\u5206 ", yen(stBatch.pay)), /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, stBatch.count, "\u4EF6")), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 10 } }, stBatch.count === 0 ? /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", disabled: true }, "\u30AB\u30C6\u30B4\u30EA\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044") : stConfirm ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setStConfirm(false) }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: settleBatch }, stBatch.count, "\u4EF6\u3092\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setStConfirm(true) }, /* @__PURE__ */ React.createElement(Check, { size: 14, style: { verticalAlign: "-2px", marginRight: 5 } }), stBatch.count === stBatch.all ? "\u3053\u306E\u7BC4\u56F2\u3092\u307E\u3068\u3081\u3066\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B" : `\u9078\u3093\u3060${stBatch.rows.filter((r) => r.on).length}\u3064\u306E\u30AB\u30C6\u30B4\u30EA\u3092\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B`)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub", style: { padding: "10px 4px 0", whiteSpace: "normal" } }, "\u632F\u308A\u8FBC\u3093\u3060\u3042\u3068\u306B\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u62BC\u3059\u3068\u7CBE\u7B97\u6E08\u307F\u306B\u306A\u308A\u3001\u4E0A\u306E\u8868\u304B\u3089\u6D88\u3048\u307E\u3059\u3002 \u30AB\u30C6\u30B4\u30EA\u3092\u62BC\u3059\u3068\u3001\u305D\u306E\u884C\u3092\u4ECA\u56DE\u306E\u7CBE\u7B97\u304B\u3089\u5916\u305B\u307E\u3059\u3002 1\u4EF6\u305A\u3064\u76F4\u3057\u305F\u3044\u3068\u304D\u306F\u3001\u5C65\u6B74\u306E\u300C\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u300D\u304B\u3089\u62BC\u305B\u307E\u3059\u3002"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-histfilter" }, /* @__PURE__ */ React.createElement("button", { className: `kb-monthchip ${tkMonth === null ? "on" : ""}`, onClick: () => setTkMonth(null) }, /* @__PURE__ */ React.createElement("span", null, "\u5E74\u9593"), /* @__PURE__ */ React.createElement("b", null, tkMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP"))), MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        className: `kb-monthchip ${tkMonth === i ? "on" : ""} ${tkMonthTotals[i] === 0 ? "empty" : ""}`,
        onClick: () => setTkMonth(tkMonth === i ? null : i)
      },
      /* @__PURE__ */ React.createElement("span", null, l),
      /* @__PURE__ */ React.createElement("b", null, tkMonthTotals[i] === 0 ? "\u2014" : tkMonthTotals[i].toLocaleString("ja-JP"))
    ))), partyBoxes.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u7ACB\u66FF\u5148\u304C\u3042\u308A\u307E\u305B\u3093"), "\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6\u304B\u3089\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, tkMonth === null ? "\u533A\u5206\u3054\u3068" : `${MONTH_LABELS[tkMonth]}\u306E\u533A\u5206\u3054\u3068`), partyBoxes.map((b) => /* @__PURE__ */ React.createElement(React.Fragment, { key: b.box || "_" }, b.box ? /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, b.box) : partyBoxes.length > 1 ? /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u3053\u306E\u307B\u304B") : null, b.groups.map((gp) => {
      const list = b.box ? gp.rows : gp.rows.filter((r) => summaryOf(r.name).count > 0);
      if (!list.length) return null;
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: gp.name || "_" }, gp.name && /* @__PURE__ */ React.createElement("div", { className: "kb-section-label sub" }, gp.name), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, list.map((r) => summaryOf(r.name)).map((p) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: p.party, onClick: () => openDetail("party", p.party) }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-partytop" }, /* @__PURE__ */ React.createElement("span", { className: "kb-rowtitle" }, p.party), /* @__PURE__ */ React.createElement("span", { className: "kb-partyamt", style: {
        color: linkedParty(p.party) ? p.count > 0 ? "var(--ink)" : "var(--sub)" : p.unsettled > 0 ? "var(--red)" : "var(--sub)"
      } }, yen(linkedParty(p.party) ? p.unsettled + p.settled : p.unsettled))), /* @__PURE__ */ React.createElement("div", { className: "kb-stackbar" }, /* @__PURE__ */ React.createElement("span", { className: "all", style: { width: `${(p.unsettled + p.settled) / maxParty * 100}%` } }), !linkedParty(p.party) && /* @__PURE__ */ React.createElement("span", { className: "un", style: { width: `${p.unsettled / maxParty * 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, linkedParty(p.party) ? `${p.count}\u4EF6\u30FB\u304A\u3046\u3061\u3078\u9023\u52D5` : `${p.items.filter((t) => !t.settled).length}\u4EF6\u672A\u7533\u8ACB${p.settled > 0 ? `\u30FB\u7533\u8ACB\u6E08\u307F ${yen(p.settled)}` : ""}`)), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))));
    })))))), tab === "settle" && !tkFormOpen && !detail && /* @__PURE__ */ React.createElement("button", { className: "kb-fab", onClick: openTkNew, "aria-label": "\u7ACB\u66FF\u3092\u8A18\u9332" }, /* @__PURE__ */ React.createElement(Plus, { size: 26 })), detail && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: closeDetail }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", ref: detailSheetRef, onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, detail.type === "party" ? `\u7ACB\u66FF\u30FB${detail.key}${tkMonth === null ? "" : ` ${MONTH_LABELS[tkMonth]}`}` : `${detail.type === "group" ? detail.key : dCats[0] ? dCats[0].name : ""}${dTag ? `\u30FB${dTag}` : ""}`, detail.type !== "party" && /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-period" }, anaScope === "month" ? ` ${MONTH_LABELS[anaMonth]}` : dMonth !== null ? ` ${MONTH_LABELS[dMonth]}` : " \u5E74\u9593")), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: closeDetail, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), detail.type === "party" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total" }, /* @__PURE__ */ React.createElement("span", null, linkedParty(detail.key) ? `\u5408\u8A08 ${yen(dPartyItems.reduce((a, t) => a + t.amount, 0))}` : `\u672A\u7533\u8ACB ${yen(dPartyItems.filter((t) => !t.settled).reduce((a, t) => a + t.amount, 0))}`), /* @__PURE__ */ React.createElement("div", { className: "kb-sortwrap" }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, dPartyItems.length, "\u4EF6"), /* @__PURE__ */ React.createElement(SortButton, { asc: sortAsc, onToggle: () => setSortAsc((v) => !v) }))), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, dPartyItems.map((t) => {
      const linked = linkedParty(t.party);
      return /* @__PURE__ */ React.createElement("div", { className: `kb-row ${!linked && t.settled ? "kb-settled" : ""}`, key: t.id, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, t.date ? `${Number(t.date.slice(5, 7))}/${Number(t.date.slice(8, 10))}` : "\u2014"), /* @__PURE__ */ React.createElement(RowMain, { x: t, kind: "settlement", noMethod: !uses.method, onClick: () => {
        leaveDetail();
        openTkEdit(t);
      }, style: { cursor: "pointer" } }), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: {
        color: t.pending ? "var(--pending)" : linked ? void 0 : t.settled ? "var(--sub)" : "var(--red)"
      } }, yen(t.amount)), linked ? /* @__PURE__ */ React.createElement("span", { style: { width: 30 } }) : /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "kb-iconbtn",
          onClick: () => toggleSettled(t),
          "aria-label": t.settled ? "\u672A\u7533\u8ACB\u306B\u623B\u3059" : "\u7533\u8ACB\u6E08\u307F\u306B\u3059\u308B"
        },
        t.settled ? /* @__PURE__ */ React.createElement(Undo2, { size: 15 }) : /* @__PURE__ */ React.createElement(Check, { size: 16 })
      ));
    })), linkedParty(detail.key) && /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u304A\u3046\u3061\u306E\u5BB6\u8A08\u7C3F\u306B\u9023\u52D5\u3057\u3066\u3044\u307E\u3059\u3002\u5B9F\u969B\u306B\u304A\u91D1\u3092\u53D7\u3051\u53D6\u308B\u7CBE\u7B97\u306F\u3001\u304A\u3046\u3061\u306E\u5C65\u6B74\u306B\u3042\u308B\u300C\u7CBE\u7B97\u3057\u3066\u3044\u306A\u3044\u300D\u3067\u7BA1\u7406\u3057\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, anaScope === "year" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-label", style: { marginTop: 2 } }, "\u6708\u3092\u30BF\u30C3\u30D7\u3067\u7D5E\u308A\u8FBC\u307F"), /* @__PURE__ */ React.createElement("div", { className: "kb-monthchips" }, MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        className: `kb-monthchip ${dMonth === i ? "on" : ""} ${dMonthTotals[i] === 0 ? "empty" : ""}`,
        onClick: () => setDMonth(dMonth === i ? null : i)
      },
      /* @__PURE__ */ React.createElement("span", null, l),
      /* @__PURE__ */ React.createElement("b", null, dMonthTotals[i] === 0 ? "\u2014" : dMonthTotals[i].toLocaleString("ja-JP"))
    )))), dTagOptions.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-label", style: { marginTop: 12 } }, "\u5185\u8A33\u3092\u30BF\u30C3\u30D7\u3067\u7D5E\u308A\u8FBC\u307F"), /* @__PURE__ */ React.createElement("div", { className: "kb-chips" }, /* @__PURE__ */ React.createElement("button", { className: `kb-tagchip ${dTag === null ? "on" : ""}`, onClick: () => setDTag(null) }, "\u3059\u3079\u3066"), dTagOptions.map((t) => {
      const tot = dAllEntries.filter((e) => e.tag === t && (anaScope === "year" ? dMonth === null || monthIdxOf(e.date) === dMonth : monthIdxOf(e.date) === anaMonth)).reduce((a, e) => a + signedAmount(e), 0);
      return /* @__PURE__ */ React.createElement("button", { key: t, className: `kb-tagchip ${dTag === t ? "on" : ""} ${tot === 0 ? "empty" : ""}`, onClick: () => setDTag(dTag === t ? null : t) }, t, " ", tot === 0 ? "" : yen(tot));
    }))), /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total" }, /* @__PURE__ */ React.createElement("span", null, "\u5408\u8A08 ", yen(dTotal)), /* @__PURE__ */ React.createElement("div", { className: "kb-sortwrap" }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, dEntries.length, "\u4EF6"), /* @__PURE__ */ React.createElement(SortButton, { asc: sortAsc, onToggle: () => setSortAsc((v) => !v) }))), dEntries.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, "\u8A72\u5F53\u3059\u308B\u660E\u7D30\u304C\u3042\u308A\u307E\u305B\u3093") : /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, dEntries.map((e) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => {
      const c = catById(e.catId);
      leaveDetail();
      openEntryEdit(c, e);
    } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, e.date ? `${Number(e.date.slice(5, 7))}/${Number(e.date.slice(8, 10))}` : "\u2014"), /* @__PURE__ */ React.createElement(RowMain, { x: e, noMethod: !uses.method }), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: amountStyle(e) }, isIncome(e) ? "+" : "", yen(Math.abs(Number(e.amount) || 0))))))))), entryTarget && entryCat && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: closeEntry }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, entryTarget.entryId ? "\u8A18\u9332\u3092\u7DE8\u96C6" : "\u8A18\u9332\u3059\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: closeEntry, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30AB\u30C6\u30B4\u30EA"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "kb-input",
        value: entryTarget.catId,
        onChange: (ev) => pickEntryCat(ev.target.value)
      },
      groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => /* @__PURE__ */ React.createElement("optgroup", { key: g, label: g }, budgetCats.filter((c) => c.group === g).map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name))))
    )), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("div", { className: "kb-seg" }, /* @__PURE__ */ React.createElement("button", { className: enType === "expense" ? "on" : "", onClick: () => setEnType("expense") }, "\u652F\u51FA"), /* @__PURE__ */ React.createElement("button", { className: enType === "income" ? "on" : "", onClick: () => setEnType("income") }, "\u53CE\u5165"))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement(
      AmountField,
      {
        value: enAmount,
        onChange: setEnAmount,
        income: enType === "income",
        inputRef: amountRef
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u65E5\u4ED8"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        type: "date",
        value: enDate,
        min: `${year}-01-01`,
        max: `${year}-12-31`,
        onChange: (ev) => setEnDate(ev.target.value)
      }
    )), entryCat.tags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u8A33"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: enTag, onChange: (ev) => setEnTag(ev.target.value) }, entryCat.tags.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t)))), canShop && /* @__PURE__ */ React.createElement(ShopField, { label: "\u5E97\u540D\uFF08\u4EFB\u610F\uFF09", value: enShop, onChange: setEnShop, options: shopOptions }), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, canShop ? "\u5185\u5BB9\uFF08\u4EFB\u610F\uFF09" : "\u5185\u5BB9\uFF08\u5E97\u540D\u306A\u3069\u30FB\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: enMemo, onChange: (ev) => setEnMemo(ev.target.value), placeholder: canShop ? "\u6B6F\u30D6\u30E9\u30B7\u63DB\u3048" : "\u7121\u5370\u826F\u54C1" })), uses.method && /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u652F\u6255\u3044\u65B9\u6CD5"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: enMethod, onChange: (ev) => setEnMethod(ev.target.value) }, withCurrent(methods, enMethod).map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), uses.pending && /* @__PURE__ */ React.createElement(CheckRow, { checked: !enPending, onChange: (v) => setEnPending(!v) }, "\u78BA\u5B9A"), uses.esettle && canSettleEntry && /* @__PURE__ */ React.createElement(CheckRow, { checked: enSettled, onChange: setEnSettled }, "\u7CBE\u7B97\u6E08\u307F"), enError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, enError), isLinked({ id: entryTarget.entryId }) ? /* @__PURE__ */ React.createElement("div", { className: "kb-note", style: { padding: "0 0 4px" } }, "\u3053\u306E\u8A18\u9332\u306F\u500B\u4EBA\u306E\u5BB6\u8A08\u7C3F\u306E\u7ACB\u66FF\u304B\u3089\u5165\u3063\u305F\u3082\u306E\u3067\u3059\u3002\u76F4\u3059\u3068\u304D\u306F\u3001\u305D\u3061\u3089\u306E\u7ACB\u66FF\u3092\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002") : /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitEntry }, entryTarget.entryId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), entryTarget.entryId && !isLinked({ id: entryTarget.entryId }) ? /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, enConfirmDel ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteEntry(entryTarget.entryId) }, "\u672C\u5F53\u306B\u524A\u9664\u3059\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setEnConfirmDel(false) }, "\u3084\u3081\u308B")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => setEnConfirmDel(true) }, "\u3053\u306E\u8A18\u9332\u3092\u524A\u9664")) : kindOf(entryCat.group) === KIND_MONTH && budgetOf(entryCat).monthly > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => fillTwelveMonths(entryCat) }, /* @__PURE__ */ React.createElement(CalendarPlus, { size: 14, style: { verticalAlign: "-2px", marginRight: 5 } }), "\u6BCE\u6708\u540C\u984D\u306712\u30F6\u6708\u5206\u3092\u5165\u529B")))), tkFormOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: closeTk }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, tkEditId ? "\u7ACB\u66FF\u3092\u7DE8\u96C6" : "\u7ACB\u66FF\u3092\u8A18\u9332"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: closeTk, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement(AmountField, { value: tkAmount, onChange: setTkAmount })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u65E5\u4ED8"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "date", value: tkDate, onChange: (ev) => setTkDate(ev.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u533A\u5206"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: tkParty, onChange: (ev) => setTkParty(ev.target.value) }, partyBoxes.map((b) => b.groups.map((gp) => {
      const label = [b.box, gp.name].filter(Boolean).join("\u30FB");
      const opts = gp.rows.map((r) => /* @__PURE__ */ React.createElement("option", { key: r.id, value: r.name }, r.name));
      return label ? /* @__PURE__ */ React.createElement("optgroup", { key: b.box + "/" + gp.name, label }, opts) : opts;
    })), parties.indexOf(tkParty) < 0 && tkParty ? /* @__PURE__ */ React.createElement("option", { value: tkParty }, tkParty) : null)), tkCanShop && /* @__PURE__ */ React.createElement(ShopField, { label: "\u5E97\u540D\uFF08\u4EFB\u610F\uFF09", value: tkShop, onChange: setTkShop, options: shopOptions }), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, tkCanShop ? "\u5185\u5BB9\uFF08\u4EFB\u610F\uFF09" : "\u5185\u5BB9\uFF08\u5E97\u540D\u306A\u3069\u30FB\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: tkMemo, onChange: (ev) => setTkMemo(ev.target.value), placeholder: tkCanShop ? "\u6B6F\u30D6\u30E9\u30B7\u63DB\u3048" : "\u7121\u5370\u826F\u54C1" })), tkSupportsMethod && /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u652F\u6255\u3044\u65B9\u6CD5"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: tkMethod, onChange: (ev) => setTkMethod(ev.target.value) }, withCurrent(methods, tkMethod).map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), /* @__PURE__ */ React.createElement(CheckRow, { checked: !tkPending, onChange: (v) => setTkPending(!v) }, "\u78BA\u5B9A"), tkError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, tkError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitTk }, tkEditId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), tkEditId && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, tkConfirmDel ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteSettlement(tkEditId) }, "\u672C\u5F53\u306B\u524A\u9664\u3059\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setTkConfirmDel(false) }, "\u3084\u3081\u308B")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => setTkConfirmDel(true) }, "\u3053\u306E\u7ACB\u66FF\u3092\u524A\u9664")))), trFormOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => {
      setTrFormOpen(false);
      setTrEditId(null);
    } }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, trEditId ? "\u632F\u66FF\u3092\u7DE8\u96C6" : "\u632F\u66FF\u3092\u8A18\u9332"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => {
      setTrFormOpen(false);
      setTrEditId(null);
    }, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement(AmountField, { value: trAmount, onChange: setTrAmount })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u65E5\u4ED8"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "date", value: trDate, min: `${year}-01-01`, max: `${year}-12-31`, onChange: (ev) => setTrDate(ev.target.value) })), methods.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-note", style: { padding: "0 0 10px" } }, "\u652F\u6255\u65B9\u6CD5\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6\u306E\u300C\u652F\u6255\u65B9\u6CD5\u300D\u3067\u8DB3\u3059\u3068\u3001\u3053\u3053\u3067\u9078\u3079\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-inline" }, /* @__PURE__ */ React.createElement("div", { className: "kb-field", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u632F\u66FF\u5143"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: trFrom, onChange: (ev) => setTrFrom(ev.target.value) }, withCurrent(methods, trFrom).map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u632F\u66FF\u5148"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: trTo, onChange: (ev) => {
      if (trMemo === trTo || !trMemo) setTrMemo(ev.target.value);
      setTrTo(ev.target.value);
    } }, withCurrent(methods, trTo).map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m))))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: trMemo, onChange: (ev) => setTrMemo(ev.target.value), placeholder: "PASMO" })), /* @__PURE__ */ React.createElement(CheckRow, { checked: !trPending, onChange: (v) => setTrPending(!v) }, "\u78BA\u5B9A"), trError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, trError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitTr }, trEditId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), trEditId && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, trConfirmDel ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteTransfer(trEditId) }, "\u672C\u5F53\u306B\u524A\u9664\u3059\u308B"), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setTrConfirmDel(false) }, "\u3084\u3081\u308B")) : /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => setTrConfirmDel(true) }, "\u3053\u306E\u632F\u66FF\u3092\u524A\u9664")))), booksOpen && /* @__PURE__ */ React.createElement(
      BookSheet,
      {
        books: KakeiboAPI.books(),
        currentId: KakeiboAPI.currentBookId(),
        onPick: pickBook,
        onAdd: (n, u) => {
          KakeiboAPI.addBook(n, u);
          bumpBooks((v) => v + 1);
        },
        onRename: (id, n) => {
          KakeiboAPI.renameBook(id, n);
          bumpBooks((v) => v + 1);
        },
        onSetUrl: (id, u) => {
          KakeiboAPI.setBookUrl(id, u);
          bumpBooks((v) => v + 1);
          if (id === KakeiboAPI.currentBookId()) {
            setLoading(true);
            load();
          }
        },
        onRemove: (id) => {
          KakeiboAPI.removeBook(id);
          bumpBooks((v) => v + 1);
          if (id === bookId) {
            setLoading(true);
            setBookId(KakeiboAPI.currentBookId());
          }
        },
        onClose: () => setBooksOpen(false)
      }
    ), manageOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => {
      setManageOpen(false);
      setCatFormOpen(false);
    } }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, "\u30AB\u30C6\u30B4\u30EA\u306E\u7DE8\u96C6"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => {
      setManageOpen(false);
      setCatFormOpen(false);
    }, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), catFormOpen ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30B0\u30EB\u30FC\u30D7"), /* @__PURE__ */ React.createElement("div", { className: "kb-seg" }, groupOrder.map((g) => /* @__PURE__ */ React.createElement("button", { key: g, className: fGroup === g ? "on" : "", onClick: () => pickGroup(g) }, g)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30AB\u30C6\u30B4\u30EA\u540D"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: fName, onChange: (ev) => setFName(ev.target.value), placeholder: "\u30AB\u30C6\u30B4\u30EA\u540D\u3092\u5165\u529B" })), kindOf(fGroup) === KIND_NONE ? /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u4E88\u7B97\u5916\u306E\u30B0\u30EB\u30FC\u30D7\u306A\u306E\u3067\u3001\u91D1\u984D\u306F\u7F6E\u304D\u307E\u305B\u3093\u3002") : budgetPlan.live ? /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u91D1\u984D\u306F\u4E88\u7B97\u30BF\u30D6\u3067\u8A2D\u5B9A\u3057\u307E\u3059\u3002") : /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, kindOf(fGroup) === KIND_YEAR ? "\u5E74\u9593\u4E88\u7B97\uFF08\u5186\uFF09" : "\u6708\u4E88\u7B97\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "number", inputMode: "numeric", value: fAmount, onChange: (ev) => setFAmount(ev.target.value), placeholder: kindOf(fGroup) === KIND_YEAR ? "100000" : "10000" })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u8A33\uFF08\u8A18\u9332\u6642\u306E\u9078\u629E\u80A2\u306B\u306A\u308A\u307E\u3059\uFF09"), fTags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-chips" }, fTags.map((t) => /* @__PURE__ */ React.createElement("span", { className: "kb-chip", key: t }, t, /* @__PURE__ */ React.createElement("button", { onClick: () => setFTags((p) => p.filter((x) => x !== t)), "aria-label": `${t}\u3092\u524A\u9664` }, /* @__PURE__ */ React.createElement(X, { size: 11 }))))), /* @__PURE__ */ React.createElement("div", { className: "kb-inline" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        value: fTagInput,
        onChange: (ev) => setFTagInput(ev.target.value),
        onKeyDown: (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            addTag();
          }
        },
        placeholder: "\u5185\u8A33\u540D\u3092\u5165\u529B"
      }
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", style: { width: "auto", padding: "0 16px" }, onClick: addTag }, "\u8FFD\u52A0"))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u88DC\u8DB3\uFF08\u4EFB\u610F\u30FB\u4E00\u89A7\u306B\u8868\u793A\u3055\u308C\u307E\u3059\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: fNote, onChange: (ev) => setFNote(ev.target.value), placeholder: "2026/6\u301C\u958B\u59CB" })), uses.esettle && canSettleEntry && /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u7CBE\u7B97\u306E\u5272\u5408\uFF08\uFF05\uFF09"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kb-input",
        type: "number",
        inputMode: "numeric",
        min: "0",
        max: "100",
        value: fRate,
        onChange: (ev) => setFRate(ev.target.value),
        placeholder: "100"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "kb-note", style: { marginTop: 6 } }, "\u7ACB\u3066\u66FF\u3048\u305F\u4EBA\u3078\u8FD4\u3059\u5272\u5408\u3067\u3059\u3002100\u306E\u307E\u307E\u306A\u3089\u5168\u984D\u3002 \u5B9F\u7E3E\u30BF\u30D6\u306E\u652F\u51FA\u306F\u3001\u3053\u3053\u3092\u5909\u3048\u3066\u3082\u5168\u984D\u306E\u307E\u307E\u3067\u3059\u3002")), fError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, fError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitCat }, catMode === "add" ? "\u8FFD\u52A0\u3059\u308B" : "\u4FDD\u5B58\u3059\u308B"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setCatFormOpen(false) }, "\u30AD\u30E3\u30F3\u30BB\u30EB"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, groupOrder.filter((g) => budgetCats.some((c) => c.group === g)).map((g) => /* @__PURE__ */ React.createElement("div", { key: g }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, g), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, budgetCats.filter((c) => c.group === g).map((c, ci, arr) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: c.id, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: colorOf(catIndex[c.id]) } }, c.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, kindOf(c.group) === KIND_YEAR ? `\u5E74\u9593\u4E88\u7B97 ${yenExact(budgetOf(c).annual)}` : kindOf(c.group) === KIND_NONE ? "\u4E88\u7B97\u5916" : `\u6708\u4E88\u7B97 ${yenExact(budgetOf(c).monthly)}`, c.tags.length > 0 ? `\u30FB\u5185\u8A33${c.tags.length}\u4EF6` : "", c.note ? `\u3000${c.note}` : "")), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, /* @__PURE__ */ React.createElement(
      MoveButtons,
      {
        i: ci,
        count: arr.length,
        what: c.name,
        onMove: (d) => moveCat(c, d)
      }
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => openCatEdit(c), "aria-label": "\u7DE8\u96C6" }, /* @__PURE__ */ React.createElement(Pencil, { size: 14 })), catDeleteId === c.id ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", style: { color: "var(--red)" }, onClick: () => deleteCategory(c.id), "aria-label": "\u524A\u9664\u3092\u78BA\u5B9A" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setCatDeleteId(null), "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setCatDeleteId(c.id), "aria-label": "\u524A\u9664" }, /* @__PURE__ */ React.createElement(Trash2, { size: 14 })))))))), groupDefs.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u307E\u305A\u30B0\u30EB\u30FC\u30D7\u3092\u4F5C\u3063\u3066\u304F\u3060\u3055\u3044\u3002\u30AB\u30C6\u30B4\u30EA\u306F\u30B0\u30EB\u30FC\u30D7\u306E\u4E2D\u306B\u4E26\u3073\u307E\u3059\u3002") : /* @__PURE__ */ React.createElement("button", { className: "kb-btn", style: { marginTop: 14 }, onClick: openCatAdd }, "\u30AB\u30C6\u30B4\u30EA\u3092\u8FFD\u52A0"), /* @__PURE__ */ React.createElement(
      GroupList,
      {
        defs: groupDefs,
        useCount: (n) => budgetCats.filter((c) => c.group === n).length,
        onSave: saveGroups
      }
    ), uses.settle && /* @__PURE__ */ React.createElement(
      MasterList,
      {
        title: "\u7ACB\u66FF\u5148",
        hint: "\u7ACB\u66FF\u30BF\u30D6\u306E\u533A\u5206\u306B\u306A\u308A\u307E\u3059\u3002\u540D\u524D\u3092\u5909\u3048\u308B\u3068\u3001\u3053\u308C\u307E\u3067\u306E\u8A18\u9332\u3082\u307E\u3068\u3081\u3066\u5909\u308F\u308A\u307E\u3059\u3002\u300C\u9023\u52D5\u300D\u3068\u4ED8\u3044\u3066\u3044\u308B\u3082\u306E\u306F\u3001\u304A\u3046\u3061\u306E\u5BB6\u8A08\u7C3F\u306E\u30AB\u30C6\u30B4\u30EA\u306E\u5199\u3057\u3067\u3059\u3002\u540D\u524D\u3084\u4E26\u3073\u306F\u304A\u3046\u3061\u5074\u3067\u5909\u3048\u3066\u304F\u3060\u3055\u3044\u3002",
        names: parties,
        boxes: partyBoxes,
        useCount: (n) => masterUseCount(PARTY_GROUP, n),
        onAdd: (n) => addMaster(PARTY_GROUP, n),
        onRename: (o, n) => renameMaster(PARTY_GROUP, o, n),
        onDelete: (n) => deleteMaster(PARTY_GROUP, n)
      }
    ), uses.method && /* @__PURE__ */ React.createElement(
      MasterList,
      {
        title: "\u652F\u6255\u65B9\u6CD5",
        hint: "\u660E\u7D30\u3068\u632F\u66FF\u3067\u9078\u3079\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002\u540D\u524D\u3092\u5909\u3048\u308B\u3068\u3001\u3053\u308C\u307E\u3067\u306E\u8A18\u9332\u3082\u307E\u3068\u3081\u3066\u5909\u308F\u308A\u307E\u3059\u3002",
        names: methods,
        useCount: (n) => masterUseCount(METHOD_GROUP, n),
        onAdd: (n) => addMaster(METHOD_GROUP, n),
        onRename: (o, n) => renameMaster(METHOD_GROUP, o, n),
        onDelete: (n) => deleteMaster(METHOD_GROUP, n)
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u3053\u306E\u5BB6\u8A08\u7C3F\u3067\u4F7F\u3046\u3082\u306E"), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, FEATURES.filter((f) => f.key !== "esettle" || canSettleEntry).map((f) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: f.key, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, f.label), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, f.hint)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-iconbtn ${uses[f.key] ? "on" : ""}`,
        onClick: () => toggleUse(f.key, !uses[f.key]),
        "aria-label": `${f.label}\u3092${uses[f.key] ? "\u4F7F\u308F\u306A\u3044" : "\u4F7F\u3046"}`
      },
      uses[f.key] ? /* @__PURE__ */ React.createElement(Check, { size: 16 }) : /* @__PURE__ */ React.createElement(X, { size: 14 })
    ))))), /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u5916\u3057\u305F\u3082\u306E\u306F\u753B\u9762\u306B\u51FA\u306A\u304F\u306A\u308A\u307E\u3059\u3002\u3053\u308C\u307E\u3067\u306E\u8A18\u9332\u306F\u6D88\u3048\u306A\u3044\u306E\u3067\u3001\u623B\u305B\u3070\u307E\u305F\u898B\u3089\u308C\u307E\u3059\u3002 \u3053\u306E\u8A2D\u5B9A\u306F\u5BB6\u8A08\u7C3F\u3054\u3068\u3067\u3001\u540C\u3058\u5BB6\u8A08\u7C3F\u3092\u958B\u3044\u3066\u3044\u308B\u7AEF\u672B\u3059\u3079\u3066\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u4FDD\u5B58\u306E\u72B6\u614B"), /* @__PURE__ */ React.createElement("div", { className: `kb-savebox ${sync.error ? "error" : sync.pending > 0 ? "" : "ok"}` }, sync.error ? `\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u305B\u3093\uFF08\u672A\u9001\u4FE1${sync.pending}\u4EF6\uFF09\uFF1A${sync.error}` : sync.pending > 0 ? `\u4FDD\u5B58\u4E2D\u3067\u3059\uFF08\u6B8B\u308A${sync.pending}\u4EF6\uFF09` : "\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306B\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      setManageOpen(false);
      load();
    } }, "\u8AAD\u307F\u8FBC\u307F\u76F4\u3059")), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u8AAD\u307F\u8FBC\u307F\u306E\u8A18\u9332"), logOpen ? /* @__PURE__ */ React.createElement(LoadLog, { rows: logRows, onClear: () => {
      KakeiboAPI.clearLog();
      setLogRows([]);
    } }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-savebox" }, "\u958B\u304F\u306E\u306B\u6642\u9593\u304C\u304B\u304B\u308B\u3068\u304D\u3084\u3001\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u305F\u3068\u304D\u306E\u8A18\u9332\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002 \u4F55\u79D2\u304B\u304B\u3063\u305F\u304B\u3001\u3069\u3053\u3067\u6B62\u307E\u3063\u305F\u304B\u304C\u5206\u304B\u308A\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      setLogRows(KakeiboAPI.loadLog());
      setLogOpen(true);
    } }, "\u8A18\u9332\u3092\u898B\u308B"))), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u63A5\u7D9A\u5148"), /* @__PURE__ */ React.createElement("div", { className: "kb-savebox", style: { wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: 10.5 } }, KakeiboAPI.currentBookName(), /* @__PURE__ */ React.createElement("br", null), KakeiboAPI.getUrl()), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      setManageOpen(false);
      setBooksOpen(true);
    } }, "\u5BB6\u8A08\u7C3F\u306E\u8A2D\u5B9A")), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u30A2\u30D7\u30EA\u306E\u66F4\u65B0"), /* @__PURE__ */ React.createElement("div", { className: "kb-savebox" }, "2\u56DE\u76EE\u304B\u3089\u306F\u901A\u4FE1\u3092\u5F85\u305F\u305A\u306B\u958B\u3051\u308B\u3088\u3046\u3001\u30A2\u30D7\u30EA\u672C\u4F53\u3092\u7AEF\u672B\u306B\u63A7\u3048\u3066\u3044\u307E\u3059\u3002 \u753B\u9762\u304C\u53E4\u3044\u307E\u307E\u5909\u308F\u3089\u306A\u3044\u3068\u304D\u306F\u3001\u305D\u306E\u63A7\u3048\u3092\u6D88\u3057\u3066\u958B\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8A18\u9332\u306B\u306F\u5F71\u97FF\u3057\u307E\u305B\u3093\u3002"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: resetAppCache }, "\u63A7\u3048\u3092\u6D88\u3057\u3066\u958B\u304D\u76F4\u3059"))))), bgTarget && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => setBgTarget(null) }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, bgTarget.label, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-period" }, " ", year, "\u5E74\u306E", bgTarget.kind === "annual" ? "\u5E74\u9593\u4E88\u7B97" : bgTarget.kind === "income" ? "\u6708\u306E\u53CE\u5165" : "\u6708\u4E88\u7B97")), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => setBgTarget(null), "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), bgTarget.kind === "note" ? /* @__PURE__ */ React.createElement("div", { className: "kb-note" }, "\u91D1\u984D\u306F\u53CE\u5165\u304B\u3089\u56FA\u5B9A\u8CBB\u3068\u4E88\u5B9A\u8CBB\u3092\u5F15\u3044\u305F\u6B8B\u308A\u306A\u306E\u3067\u3001\u3053\u3053\u3067\u306F\u5909\u3048\u3089\u308C\u307E\u305B\u3093\u3002 \u5F15\u304D\u843D\u3068\u3057\u5148\u3068\u30E1\u30E2\u3060\u3051\u8A2D\u5B9A\u3067\u304D\u307E\u3059\u3002") : /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, bgTarget.kind === "annual" ? "\u5E74\u9593\u4E88\u7B97\uFF08\u5186\uFF09" : bgTarget.kind === "income" ? "\u6BCE\u6708\u306E\u53CE\u5165\uFF08\u5186\uFF09" : "\u6708\u4E88\u7B97\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement(AmountField, { value: bgAmount, onChange: setBgAmount })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5F15\u304D\u843D\u3068\u3057\u5148\uFF08\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: bgMethod, onChange: (ev) => setBgMethod(ev.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u9078\u3070\u306A\u3044"), methods.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u6839\u62E0\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: bgMemo, onChange: (ev) => setBgMemo(ev.target.value), placeholder: "5,000x6\u4EBA+VD" })), bgError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, bgError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitBudget }, "\u4FDD\u5B58\u3059\u308B"))), toast && /* @__PURE__ */ React.createElement("div", { className: "kb-toast" }, toast)), /* @__PURE__ */ React.createElement("nav", { className: "kb-nav" }, /* @__PURE__ */ React.createElement("div", { className: "kb-nav-inner" }, TABS.map(({ key, label, icon: Icon }) => /* @__PURE__ */ React.createElement("button", { key, className: tab === key ? "on" : "", onClick: () => setTab(key) }, /* @__PURE__ */ React.createElement(Icon, { size: 20 }), /* @__PURE__ */ React.createElement("span", null, label))))));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(KakeiboApp, null));
})();
