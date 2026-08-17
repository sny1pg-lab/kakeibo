(() => {
  // app/app.jsx
  var { useState, useEffect, useRef, useMemo, useCallback } = React;
  var MONTH_LABELS = ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708", "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"];
  var GROUP_ORDER = ["\u81EA\u7531\u8CBB", "\u4E88\u5B9A\u8CBB", "\u56FA\u5B9A\u8CBB"];
  var PARTIES = ["\u751F\u6D3B\u8CBB", "\u304A\u3044\u306C", "\u5A2F\u697D\u8CBB", "\u5BB6\u5177\u5BB6\u96FB", "\u305D\u306E\u4ED6", "KITI", "\u30A6\u30A7\u30EB\u30DC\u30F3"];
  var METHODS = ["\u697D\u5929\u30AB\u30FC\u30C9", "\u697D\u5929\u30DA\u30A4", "\u697D\u5929\u30AD\u30E3\u30C3\u30B7\u30E5", "\u697D\u5929\u9280\u884C", "PayPay\u30AB\u30FC\u30C9", "PayPay\u6B8B\u9AD8", "PASMO", "\u30B9\u30BF\u30D0\u30AB\u30FC\u30C9", "NL\u30AB\u30FC\u30C9", "\u73FE\u91D1", "\u305D\u306E\u4ED6"];
  var PALETTE = ["#9B59D0", "#E08A2E", "#3FA9A0", "#D8607A", "#5B8DD6", "#7FA83C", "#C7913A", "#6C7A99", "#B0553F", "#4FA36B"];
  var NAME_OPTIONS = {
    \u56FA\u5B9A\u8CBB: ["\u3042\u3093\u3057\u3093\u751F\u547D", "NISA", "iDeCo"],
    \u81EA\u7531\u8CBB: ["\u81EA\u7531\u8CBB"],
    \u4E88\u5B9A\u8CBB: ["\u4EA4\u969B\u8CBB", "\u30B3\u30F3\u30BF\u30AF\u30C8", "\u7F8E\u5BB9\u9662", "PG", "\u533B\u7642\u8CBB"]
  };
  var CUSTOM_NAME = "__custom__";
  var DEFAULT_TAGS = {
    \u81EA\u7531\u8CBB: ["\u4EA4\u901A\u8CBB", "\u670D\u98FE\u96D1\u8CA8", "\u7F8E\u5BB9\u30B3\u30B9\u30E1", "\u5916\u98DF", "\u305D\u306E\u4ED6"]
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
  var CircleAlert = (p) => /* @__PURE__ */ React.createElement(Svg, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("path", { d: "M12 8v4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 16h.01" }));
  function CheckRow({ checked, onChange, children }) {
    return /* @__PURE__ */ React.createElement("button", { type: "button", className: `kb-check ${checked ? "on" : ""}`, onClick: () => onChange(!checked) }, /* @__PURE__ */ React.createElement("span", { className: "kb-check-box" }, checked && /* @__PURE__ */ React.createElement(Check, { size: 13 })), /* @__PURE__ */ React.createElement("span", null, children));
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
  function dayOf(dateStr) {
    return Number(String(dateStr || "").slice(8, 10)) || 0;
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
  function annualBudgetOf(c) {
    return c.group === "\u4E88\u5B9A\u8CBB" ? Number(c.annualBudget) || 0 : (Number(c.monthlyBudget) || 0) * 12;
  }
  function monthBudgetOf(c) {
    return c.group === "\u4E88\u5B9A\u8CBB" ? (Number(c.annualBudget) || 0) / 12 : Number(c.monthlyBudget) || 0;
  }
  function colorOf(idx) {
    return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
  }
  function amountStyle(x) {
    if (x.pending) return { color: "var(--pending)" };
    if (isIncome(x)) return { color: "var(--accent)" };
    return void 0;
  }
  function SetupScreen({ onSave }) {
    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");
    function submit() {
      const v = url.trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) {
        setErr("Apps Script\u306E\u30A6\u30A7\u30D6\u30A2\u30D7\u30EA\u306E URL\uFF08/exec \u3067\u7D42\u308F\u308B\u3082\u306E\uFF09\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      onSave(v);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kb-setup" }, /* @__PURE__ */ React.createElement("h1", null, "\u63A5\u7D9A\u5148\u306E\u8A2D\u5B9A"), /* @__PURE__ */ React.createElement("p", null, "\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u5148\u306B\u306A\u308BApps Script\u306E\u30A6\u30A7\u30D6\u30A2\u30D7\u30EA\u306EURL\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u7AEF\u672B\u306B\u8A18\u61B6\u3055\u308C\u3001\u6B21\u56DE\u304B\u3089\u306F\u805E\u304D\u307E\u305B\u3093\u3002"), /* @__PURE__ */ React.createElement("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://script.google.com/macros/s/..../exec", spellCheck: false }), err && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, err), /* @__PURE__ */ React.createElement("button", { onClick: submit }, "\u4FDD\u5B58\u3057\u3066\u958B\u304F"));
  }
  function KakeiboApp() {
    const now = /* @__PURE__ */ new Date();
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
    const [sync, setSync] = useState({ pending: 0, sending: false, error: "" });
    const [toast, setToast] = useState("");
    const [anaScope, setAnaScope] = useState("year");
    const [anaMonth, setAnaMonth] = useState(realMonthIdx);
    const [histMonth, setHistMonth] = useState(null);
    const [histCat, setHistCat] = useState(null);
    const [tkMonth, setTkMonth] = useState(null);
    const [detail, setDetail] = useState(null);
    const [dMonth, setDMonth] = useState(null);
    const [dTag, setDTag] = useState(null);
    const [manageOpen, setManageOpen] = useState(false);
    const [entryTarget, setEntryTarget] = useState(null);
    const [enDate, setEnDate] = useState("");
    const [enTag, setEnTag] = useState("");
    const [enMemo, setEnMemo] = useState("");
    const [enMethod, setEnMethod] = useState(METHODS[0]);
    const [enAmount, setEnAmount] = useState("");
    const [enType, setEnType] = useState("expense");
    const [enPending, setEnPending] = useState(true);
    const [enError, setEnError] = useState("");
    const [catFormOpen, setCatFormOpen] = useState(false);
    const [catMode, setCatMode] = useState("add");
    const [catEditId, setCatEditId] = useState(null);
    const [fName, setFName] = useState("");
    const [fNameChoice, setFNameChoice] = useState("");
    const [fGroup, setFGroup] = useState("\u81EA\u7531\u8CBB");
    const [fAmount, setFAmount] = useState("");
    const [fTags, setFTags] = useState([]);
    const [fTagInput, setFTagInput] = useState("");
    const [fError, setFError] = useState("");
    const [catDeleteId, setCatDeleteId] = useState(null);
    const [tkFormOpen, setTkFormOpen] = useState(false);
    const [tkEditId, setTkEditId] = useState(null);
    const [tkDate, setTkDate] = useState("");
    const [tkMemo, setTkMemo] = useState("");
    const [tkParty, setTkParty] = useState(PARTIES[0]);
    const [tkAmount, setTkAmount] = useState("");
    const [tkPending, setTkPending] = useState(true);
    const [tkError, setTkError] = useState("");
    const [trFormOpen, setTrFormOpen] = useState(false);
    const [trEditId, setTrEditId] = useState(null);
    const [trDate, setTrDate] = useState("");
    const [trFrom, setTrFrom] = useState(METHODS[0]);
    const [trTo, setTrTo] = useState(METHODS[6]);
    const [trAmount, setTrAmount] = useState("");
    const [trMemo, setTrMemo] = useState("");
    const [trPending, setTrPending] = useState(true);
    const [trError, setTrError] = useState("");
    const toastTimerRef = useRef(null);
    const amountRef = useRef(null);
    function flash(m) {
      setToast(m);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(""), 2200);
    }
    const load = useCallback(() => {
      setLoading(true);
      setLoadError("");
      return KakeiboAPI.loadAll().then((d) => {
        setCategories(d.categories);
        setEntries(d.entries);
        setTransfers(d.transfers);
        setSettlements(d.settlements);
        setLoading(false);
        KakeiboAPI.recoverQueue();
      }).catch((err) => {
        setLoadError(err.message || String(err));
        setLoading(false);
      });
    }, []);
    useEffect(() => {
      if (needsSetup) {
        setLoading(false);
        return;
      }
      load();
    }, [needsSetup, load]);
    useEffect(() => KakeiboAPI.subscribe(setSync), []);
    const saveCategory = (c) => KakeiboAPI.save("categories", c);
    const saveEntry = (e) => KakeiboAPI.save("entries", e);
    const saveTransfer = (t) => KakeiboAPI.save("transfers", t);
    const saveSettlement = (s) => KakeiboAPI.save("settlements", s);
    const yearEntries = useMemo(() => entries.filter((e) => yearOf(e.date) === year), [entries, year]);
    const yearTransfers = useMemo(() => transfers.filter((t) => yearOf(t.date) === year), [transfers, year]);
    const yearSettlements = useMemo(() => settlements.filter((s) => yearOf(s.date) === year), [settlements, year]);
    const catIndex = useMemo(() => {
      const m = {};
      categories.forEach((c, i) => {
        m[c.id] = i;
      });
      return m;
    }, [categories]);
    const catById = useCallback((id) => categories.find((c) => c.id === id), [categories]);
    const entriesByCat = useMemo(() => {
      const m = {};
      categories.forEach((c) => {
        m[c.id] = [];
      });
      yearEntries.forEach((e) => {
        if (!m[e.categoryId]) m[e.categoryId] = [];
        m[e.categoryId].push(e);
      });
      return m;
    }, [categories, yearEntries]);
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
    }
    function closeDetail() {
      setDetail(null);
      setDMonth(null);
      setDTag(null);
    }
    function openEntryNew(cat) {
      setEntryTarget({ catId: cat.id, entryId: null });
      setEnDate((d) => d && yearOf(d) === year ? d : todayInYear());
      setEnTag(cat.tags[0] || "");
      setEnMemo("");
      setEnAmount("");
      setEnType("expense");
      setEnPending(true);
      setEnError("");
    }
    function openEntryEdit(cat, entry) {
      if (!cat) return;
      setEntryTarget({ catId: cat.id, entryId: entry.id });
      setEnDate(entry.date || `${year}-01-01`);
      setEnTag(entry.tag || cat.tags[0] || "");
      setEnMemo(entry.memo || "");
      setEnMethod(entry.method || METHODS[0]);
      setEnAmount(String(Math.abs(Number(entry.amount) || 0)));
      setEnType(isIncome(entry) ? "income" : "expense");
      setEnPending(!!entry.pending);
      setEnError("");
    }
    function closeEntry() {
      setEntryTarget(null);
      setEnError("");
    }
    function submitEntry() {
      const amount = Number(enAmount);
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
      setEntries((prev) => [...prev, created]);
      saveEntry(created);
      setEnMemo("");
      setEnAmount("");
      setEnError("");
      if (amountRef.current) amountRef.current.focus();
      flash(`${Number(enDate.slice(5, 7))}/${Number(enDate.slice(8, 10))}\u3000${enType === "income" ? "\u53CE\u5165 " : ""}${yen(absAmount)} \u3092\u8A18\u9332\u3057\u307E\u3057\u305F`);
    }
    function deleteEntry(entryId) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      KakeiboAPI.remove("entries", entryId);
      if (entryTarget && entryTarget.entryId === entryId) closeEntry();
      flash("\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    function fillTwelveMonths(cat) {
      const amount = Number(cat.monthlyBudget) || 0;
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
      setFNameChoice("");
      setFGroup(GROUP_ORDER[0]);
      setFAmount("");
      setFTags([]);
      setFTagInput("");
      setFError("");
      setCatFormOpen(true);
    }
    function openCatEdit(cat) {
      setCatMode("edit");
      setCatEditId(cat.id);
      setFName(cat.name);
      setFNameChoice(CUSTOM_NAME);
      setFGroup(cat.group);
      setFAmount(String(cat.group === "\u4E88\u5B9A\u8CBB" ? cat.annualBudget || "" : cat.monthlyBudget || ""));
      setFTags([...cat.tags]);
      setFTagInput("");
      setFError("");
      setCatFormOpen(true);
    }
    function pickGroup(g) {
      setFGroup(g);
      if (catMode === "add") {
        setFNameChoice("");
        setFName("");
        setFAmount("");
        setFTags([]);
      }
    }
    function pickName(v) {
      setFNameChoice(v);
      if (v === CUSTOM_NAME) {
        setFName("");
        return;
      }
      setFName(v);
      if (DEFAULT_TAGS[v]) setFTags([...DEFAULT_TAGS[v]]);
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
      const amount = Number(fAmount);
      if (!name) {
        setFError("\u30AB\u30C6\u30B4\u30EA\u540D\u3092\u9078\u629E\u307E\u305F\u306F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (!fAmount || isNaN(amount) || amount < 0) {
        setFError("\u4E88\u7B97\u984D\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (catMode === "add") {
        const created = {
          id: KakeiboAPI.newId("c_"),
          name,
          group: fGroup,
          monthlyBudget: fGroup === "\u4E88\u5B9A\u8CBB" ? 0 : amount,
          annualBudget: fGroup === "\u4E88\u5B9A\u8CBB" ? amount : 0,
          tags: [...fTags],
          note: ""
        };
        setCategories((p) => [...p, created]);
        saveCategory(created);
      } else {
        const base = catById(catEditId);
        const updated = {
          ...base,
          name,
          group: fGroup,
          monthlyBudget: fGroup === "\u4E88\u5B9A\u8CBB" ? 0 : amount,
          annualBudget: fGroup === "\u4E88\u5B9A\u8CBB" ? amount : 0,
          tags: [...fTags]
        };
        setCategories((p) => p.map((c) => c.id === catEditId ? updated : c));
        saveCategory(updated);
      }
      setCatFormOpen(false);
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
      setCatDeleteId(null);
    }
    function openTkNew() {
      setTkEditId(null);
      setTkDate(todayInYear());
      setTkMemo("");
      setTkParty(PARTIES[0]);
      setTkAmount("");
      setTkPending(true);
      setTkError("");
      setTkFormOpen(true);
    }
    function openTkEdit(t) {
      var _a;
      setTkEditId(t.id);
      setTkDate(t.date || "");
      setTkMemo(t.memo || "");
      setTkParty(PARTIES.includes(t.party) ? t.party : PARTIES[0]);
      setTkAmount(String((_a = t.amount) != null ? _a : ""));
      setTkPending(!!t.pending);
      setTkError("");
      setTkFormOpen(true);
    }
    function submitTk() {
      const memo = tkMemo.trim();
      const amount = Number(tkAmount);
      if (!memo) {
        setTkError("\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (!tkAmount || isNaN(amount) || amount <= 0) {
        setTkError("\u91D1\u984D\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      if (tkEditId) {
        const base = settlements.find((s) => s.id === tkEditId);
        const updated = { ...base, memo, party: tkParty, amount, date: tkDate, pending: tkPending };
        setSettlements((p) => p.map((s) => s.id === tkEditId ? updated : s));
        saveSettlement(updated);
        flash("\u7ACB\u66FF\u306E\u8A18\u9332\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
      } else {
        const created = { id: KakeiboAPI.newId("s_"), date: tkDate, memo, party: tkParty, amount, settled: false, pending: tkPending };
        setSettlements((p) => [...p, created]);
        saveSettlement(created);
        flash(`${tkParty}\u3000${yen(amount)} \u3092\u8A18\u9332\u3057\u307E\u3057\u305F`);
      }
      setTkEditId(null);
      setTkFormOpen(false);
    }
    function deleteSettlement(id) {
      setSettlements((p) => p.filter((s) => s.id !== id));
      KakeiboAPI.remove("settlements", id);
      setTkFormOpen(false);
      setTkEditId(null);
      flash("\u7ACB\u66FF\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    function toggleSettled(item) {
      const updated = { ...item, settled: !item.settled };
      setSettlements((p) => p.map((s) => s.id === item.id ? updated : s));
      saveSettlement(updated);
    }
    function openTrNew() {
      setTrEditId(null);
      setTrDate(todayInYear());
      setTrFrom(METHODS[0]);
      setTrTo(METHODS[6]);
      setTrAmount("");
      setTrMemo("");
      setTrPending(true);
      setTrError("");
      setTrFormOpen(true);
    }
    function openTrEdit(t) {
      var _a;
      setTrEditId(t.id);
      setTrDate(t.date || todayInYear());
      setTrFrom(t.from || METHODS[0]);
      setTrTo(t.to || METHODS[6]);
      setTrAmount(String((_a = t.amount) != null ? _a : ""));
      setTrMemo(t.memo || "");
      setTrPending(!!t.pending);
      setTrError("");
      setTrFormOpen(true);
    }
    function submitTr() {
      const amount = Number(trAmount);
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
      flash("\u632F\u66FF\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
    }
    const allRows = useMemo(() => {
      const rows = [];
      yearEntries.forEach((e) => {
        const c = categories.find((x) => x.id === e.categoryId);
        rows.push({
          ...e,
          kind: "expense",
          catId: e.categoryId,
          catName: c ? c.name : "\uFF08\u30AB\u30C6\u30B4\u30EA\u306A\u3057\uFF09",
          color: colorOf(catIndex[e.categoryId])
        });
      });
      yearTransfers.forEach((t) => rows.push({ ...t, kind: "transfer" }));
      rows.sort((a, b) => {
        const ma = monthIdxOf(a.date), mb = monthIdxOf(b.date);
        if (ma !== mb) return mb - ma;
        const da = dayOf(a.date), db = dayOf(b.date);
        if (da !== db) return db - da;
        return String(a.id).localeCompare(String(b.id));
      });
      return rows;
    }, [yearEntries, yearTransfers, categories, catIndex]);
    const pendingRows = useMemo(() => {
      const rows = [];
      yearEntries.forEach((e) => {
        if (!e.pending) return;
        const c = categories.find((x) => x.id === e.categoryId);
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
      rows.sort((a, b) => a.date === b.date ? String(a.id).localeCompare(String(b.id)) : b.date.localeCompare(a.date));
      return rows;
    }, [yearEntries, yearTransfers, yearSettlements, categories, catIndex]);
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
    const histCatCounts = useMemo(() => {
      const m = { transfer: 0 };
      allRows.forEach((r) => {
        if (histMonth !== null && histMonth !== "pending" && monthIdxOf(r.date) !== histMonth) return;
        if (r.kind === "transfer") m.transfer += 1;
        else m[r.catId] = (m[r.catId] || 0) + 1;
      });
      return m;
    }, [allRows, histMonth]);
    const histRows = allRows.filter((e) => histMonth === null || histMonth === "pending" || monthIdxOf(e.date) === histMonth).filter(matchesHistCat);
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
    const anaRows = useMemo(() => categories.map((c) => {
      const totals = monthlyTotalsOf(c);
      const spent = anaScope === "year" ? totals.reduce((s, v) => s + v, 0) : totals[anaMonth];
      const budget = anaScope === "year" ? annualBudgetOf(c) : monthBudgetOf(c);
      return { cat: c, spent, budget, color: colorOf(catIndex[c.id]) };
    }).sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.cat.group), gb = GROUP_ORDER.indexOf(b.cat.group);
      if (ga !== gb) return ga - gb;
      return catIndex[a.cat.id] - catIndex[b.cat.id];
    }), [categories, monthlyTotalsOf, anaScope, anaMonth, catIndex]);
    const anaTotal = anaRows.reduce((a, r) => ({ spent: a.spent + r.spent, budget: a.budget + r.budget }), { spent: 0, budget: 0 });
    const anaGroups = GROUP_ORDER.map((g) => {
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
      if (detail.type === "category") return categories.filter((c) => c.id === detail.key);
      if (detail.type === "group") return categories.filter((c) => c.group === detail.key);
      return [];
    }, [detail, categories]);
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
      const ma = monthIdxOf(a.date), mb = monthIdxOf(b.date);
      if (ma !== mb) return ma - mb;
      return dayOf(a.date) - dayOf(b.date);
    }), [dAllEntries, anaScope, anaMonth, dMonth, dTag]);
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
    const partySummary = useMemo(() => PARTIES.map((p) => {
      const items = scopedSettlements.filter((t) => t.party === p);
      return {
        party: p,
        items,
        unsettled: items.filter((t) => !t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
        settled: items.filter((t) => t.settled).reduce((a, t) => a + (Number(t.amount) || 0), 0),
        count: items.length
      };
    }).filter((p) => p.count > 0).sort((a, b) => b.unsettled - a.unsettled), [scopedSettlements]);
    const maxParty = Math.max(...partySummary.map((p) => p.unsettled + p.settled), 1);
    const dPartyItems = detail && detail.type === "party" ? scopedSettlements.filter((t) => t.party === detail.key).sort((a, b) => (a.date || "").localeCompare(b.date || "")) : [];
    const entryCat = entryTarget ? catById(entryTarget.catId) : null;
    const TABS = [
      { key: "record", label: "\u8A18\u9332", icon: PencilLine },
      { key: "history", label: "\u5C65\u6B74", icon: ListOrdered },
      { key: "analysis", label: "\u5206\u6790", icon: PieChart },
      { key: "settle", label: "\u7ACB\u66FF", icon: Wallet }
    ];
    if (needsSetup) {
      return /* @__PURE__ */ React.createElement(SetupScreen, { onSave: (u) => {
        KakeiboAPI.setUrl(u);
        setNeedsSetup(false);
      } });
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kb" }, /* @__PURE__ */ React.createElement("div", { className: "kb-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "kb-topbar" }, /* @__PURE__ */ React.createElement("span", { className: "kb-title" }, tab === "record" ? "\u8A18\u9332" : tab === "history" ? "\u5C65\u6B74" : tab === "analysis" ? "\u5206\u6790" : "\u7ACB\u66FF\u7CBE\u7B97"), /* @__PURE__ */ React.createElement("div", { className: "kb-yearpick" }, /* @__PURE__ */ React.createElement("button", { className: "kb-yearbtn", onClick: () => setYear((y) => y - 1), "aria-label": "\u524D\u306E\u5E74" }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 16 })), /* @__PURE__ */ React.createElement("span", { className: "kb-yearlabel" }, year, "\u5E74"), /* @__PURE__ */ React.createElement("button", { className: "kb-yearbtn", onClick: () => setYear((y) => y + 1), "aria-label": "\u6B21\u306E\u5E74" }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 16 })))), sync.error ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar error" }, /* @__PURE__ */ React.createElement("span", null, "\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u305B\u3093\uFF08\u672A\u9001\u4FE1", sync.pending, "\u4EF6\uFF09\u3002", sync.error), /* @__PURE__ */ React.createElement("button", { className: "kb-syncbtn", onClick: () => KakeiboAPI.retry() }, "\u518D\u9001")) : sync.pending > 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-syncbar pending" }, /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "kb-spin" }), /* @__PURE__ */ React.createElement("span", null, "\u4FDD\u5B58\u4E2D\u2026\uFF08", sync.pending, "\u4EF6\uFF09")) : null, /* @__PURE__ */ React.createElement("div", { className: "kb-body" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "kb-loading" }, /* @__PURE__ */ React.createElement(Loader2, { size: 16, className: "kb-spin" }), " \u8AAD\u307F\u8FBC\u307F\u4E2D\u2026") : loadError ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F"), loadError), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 16px" } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: load }, "\u3082\u3046\u4E00\u5EA6\u8AAD\u307F\u8FBC\u3080"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      KakeiboAPI.setUrl("");
      setNeedsSetup(true);
    } }, "\u63A5\u7D9A\u5148\u3092\u8A2D\u5B9A\u3057\u76F4\u3059")))) : tab === "record" ? /* @__PURE__ */ React.createElement(React.Fragment, null, categories.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308A\u307E\u305B\u3093"), "\u4E0B\u306E\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6\u304B\u3089\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002")) : GROUP_ORDER.filter((g) => categories.some((c) => c.group === g)).map((g) => /* @__PURE__ */ React.createElement("div", { key: g }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, g), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, categories.filter((c) => c.group === g).map((c) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: c.id, onClick: () => openEntryNew(c) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: colorOf(catIndex[c.id]) } }, c.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, c.tags.length > 0 ? c.tags.join("\u30FB") : `${c.group === "\u4E88\u5B9A\u8CBB" ? "\u5E74\u9593" : "\u6708"}\u4E88\u7B97 ${yen(c.group === "\u4E88\u5B9A\u8CBB" ? c.annualBudget : c.monthlyBudget)}`)), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))))), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, "\u305D\u306E\u4ED6"), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("button", { className: "kb-row", onClick: openTrNew }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: "#AEB4BC" } }, /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 15 })), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, "\u632F\u66FF"), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, "PASMO\u3078\u306E\u30C1\u30E3\u30FC\u30B8\u306A\u3069\u30FB\u652F\u51FA\u306B\u306F\u542B\u3081\u307E\u305B\u3093")), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }))), /* @__PURE__ */ React.createElement("button", { className: "kb-hint", onClick: () => {
      setManageOpen(true);
      setCatFormOpen(false);
    } }, /* @__PURE__ */ React.createElement(Settings, { size: 15 }), "\u30AB\u30C6\u30B4\u30EA\u7DE8\u96C6")) : tab === "history" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-histfilter" }, /* @__PURE__ */ React.createElement("button", { className: `kb-monthchip ${histMonth === null ? "on" : ""}`, onClick: () => setHistMonth(null) }, /* @__PURE__ */ React.createElement("span", null, "\u5E74\u9593"), /* @__PURE__ */ React.createElement("b", null, allRows.length === 0 ? "\u2014" : histMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP"))), MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        className: `kb-monthchip ${histMonth === i ? "on" : ""} ${histMonthTotals[i] === 0 ? "empty" : ""}`,
        onClick: () => setHistMonth(histMonth === i ? null : i)
      },
      /* @__PURE__ */ React.createElement("span", null, l),
      /* @__PURE__ */ React.createElement("b", null, histMonthTotals[i] === 0 ? "\u2014" : histMonthTotals[i].toLocaleString("ja-JP"))
    ))), histMonth !== "pending" && /* @__PURE__ */ React.createElement("div", { className: "kb-chips", style: { marginTop: 8, marginBottom: 0 } }, /* @__PURE__ */ React.createElement("button", { className: `kb-tagchip ${histCat === null ? "on" : ""}`, onClick: () => setHistCat(null) }, "\u3059\u3079\u3066"), categories.map((c) => {
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
    }), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-tagchip ${histCat === "transfer" ? "on" : ""} ${!histCatCounts.transfer ? "empty" : ""}`,
        onClick: () => setHistCat(histCat === "transfer" ? null : "transfer")
      },
      "\u632F\u66FF",
      histCatCounts.transfer ? ` ${histCatCounts.transfer}` : ""
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `kb-pendingchip ${histMonth === "pending" ? "on" : ""} ${pendingRows.length === 0 ? "empty" : ""}`,
        onClick: () => setHistMonth(histMonth === "pending" ? null : "pending")
      },
      /* @__PURE__ */ React.createElement(CircleAlert, { size: 15 }),
      /* @__PURE__ */ React.createElement("span", null, "\u91D1\u984D\u304C\u672A\u78BA\u5B9A"),
      /* @__PURE__ */ React.createElement("b", null, pendingRows.length, "\u4EF6"),
      /* @__PURE__ */ React.createElement(ChevronRight, { size: 16, className: "kb-chev" })
    ), histMonth === "pending" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u672A\u78BA\u5B9A ", yen(pendingRows.reduce((a, r) => a + r.amount, 0))), /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, pendingRows.length, "\u4EF6")), pendingRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, "\u672A\u78BA\u5B9A\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093"), "\u91D1\u984D\u304C\u78BA\u5B9A\u3057\u3066\u3044\u306A\u3044\u8A18\u9332\u306F\u3053\u3053\u306B\u96C6\u307E\u308A\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, pendingRows.map((r) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: `${r.kind}-${r.id}`, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, Number(r.date.slice(5, 7)), "/", Number(r.date.slice(8, 10))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kb-rowmain",
        style: { cursor: "pointer" },
        onClick: () => {
          if (r.kind === "transfer") openTrEdit(r);
          else if (r.kind === "settlement") openTkEdit(r);
          else openEntryEdit(catById(r.catId), r);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, r.memo || r.tag || r.catName || "\uFF08\u5185\u5BB9\u306A\u3057\uFF09"),
      /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, r.kind === "transfer" ? `\u632F\u66FF\u30FB${r.from} \u2192 ${r.to}` : r.kind === "settlement" ? `\u7ACB\u66FF\u30FB${r.party}` : [isIncome(r) ? "\u53CE\u5165" : null, r.catName, r.tag, r.method].filter(Boolean).join("\u30FB"))
    ), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: "var(--pending)" } }, isIncome(r) ? "+" : "", yen(r.amount)), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn confirm", onClick: () => confirmPending(r), "aria-label": "\u91D1\u984D\u3092\u78BA\u5B9A\u3059\u308B" }, /* @__PURE__ */ React.createElement(Check, { size: 16 }))))), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub", style: { padding: "10px 4px 0", whiteSpace: "normal" } }, "\u30AB\u30FC\u30C9\u306E\u660E\u7D30\u306B\u8F09\u3063\u305F\u3082\u306E\u304B\u3089\u30C1\u30A7\u30C3\u30AF\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u62BC\u3059\u3068\u78BA\u5B9A\u306B\u306A\u308A\u3001\u3053\u306E\u4E00\u89A7\u304B\u3089\u6D88\u3048\u307E\u3059\u3002"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total", style: { paddingTop: 8 } }, /* @__PURE__ */ React.createElement("span", null, histMonth === null ? "\u5E74\u9593" : MONTH_LABELS[histMonth], "\u306E\u652F\u51FA ", yen(histTotal)), /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, histRows.length, "\u4EF6")), historyByDate.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, histMonth === null ? "\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093" : `${MONTH_LABELS[histMonth]}\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093`), histMonth === null ? "\u8A18\u9332\u30BF\u30D6\u304B\u3089\u30AB\u30C6\u30B4\u30EA\u3092\u9078\u3093\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : "\u4E0A\u306E\u5E74\u9593\u3092\u62BC\u3059\u3068\u5168\u671F\u9593\u306B\u623B\u308A\u307E\u3059\u3002")) : historyByDate.map((day) => {
      const dayTotal = day.rows.filter((e) => e.kind !== "transfer").reduce((s, e) => s + signedAmount(e), 0);
      return /* @__PURE__ */ React.createElement("div", { key: day.date }, /* @__PURE__ */ React.createElement("div", { className: "kb-datehead" }, /* @__PURE__ */ React.createElement("span", { className: "d" }, Number(day.date.slice(5, 7)), "/", Number(day.date.slice(8, 10)), "\uFF08", weekday(day.date), "\uFF09"), /* @__PURE__ */ React.createElement("span", { className: "t" }, "\u652F\u51FA ", yen(dayTotal))), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, day.rows.map((e) => e.kind === "transfer" ? /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => openTrEdit(e) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: "#AEB4BC" } }, /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 15 })), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, e.memo || "\u632F\u66FF"), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, "\u632F\u66FF\u30FB", e.from, " \u2192 ", e.to)), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: e.pending ? "var(--pending)" : "var(--sub)" } }, yen(e.amount)), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })) : /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => openEntryEdit(catById(e.catId), e) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: e.color } }, e.catName.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, e.memo || e.tag || e.catName), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, [e.pending ? "\u672A\u78BA\u5B9A" : null, isIncome(e) ? "\u53CE\u5165" : null, e.catName, e.tag, e.method].filter(Boolean).join("\u30FB"))), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: amountStyle(e) }, isIncome(e) ? "+" : "", yen(Math.abs(Number(e.amount) || 0))), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" })))));
    }))) : tab === "analysis" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-seg", style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("button", { className: anaScope === "month" ? "on" : "", onClick: () => setAnaScope("month") }, "\u6708\u5225"), /* @__PURE__ */ React.createElement("button", { className: anaScope === "year" ? "on" : "", onClick: () => setAnaScope("year") }, "\u5E74\u5225")), anaScope === "month" && /* @__PURE__ */ React.createElement("div", { className: "kb-monthbar" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setAnaMonth((m) => (m + 11) % 12), "aria-label": "\u524D\u306E\u6708" }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 17 })), /* @__PURE__ */ React.createElement("span", null, year, "\u5E74 ", MONTH_LABELS[anaMonth]), /* @__PURE__ */ React.createElement("button", { onClick: () => setAnaMonth((m) => (m + 1) % 12), "aria-label": "\u6B21\u306E\u6708" }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 17 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-total-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-total-row" }, /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, "\u4E88\u7B97 ", yen(anaTotal.budget)), /* @__PURE__ */ React.createElement("span", { className: "kb-total-label" }, anaTotal.spent > anaTotal.budget ? "\u8D85\u904E" : "\u6B8B", " ", yen(Math.abs(anaTotal.budget - anaTotal.spent)))), /* @__PURE__ */ React.createElement("div", { className: "kb-total-row", style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "kb-total-big", style: { color: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--ink)" } }, yen(anaTotal.spent))), /* @__PURE__ */ React.createElement("div", { className: "kb-bar" }, /* @__PURE__ */ React.createElement("span", { style: {
      width: `${anaTotal.budget > 0 ? Math.min(anaTotal.spent / anaTotal.budget * 100, 100) : 0}%`,
      background: anaTotal.spent > anaTotal.budget ? "var(--red)" : "var(--accent)"
    } }))), anaRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, "\u30AB\u30C6\u30B4\u30EA\u304C\u3042\u308A\u307E\u305B\u3093")) : anaGroups.map(({ group, spent }) => /* @__PURE__ */ React.createElement("div", { key: group }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label kb-grouphead" }, /* @__PURE__ */ React.createElement("span", null, group), /* @__PURE__ */ React.createElement("b", null, yen(spent))), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, anaRows.filter((r) => r.cat.group === group).map(({ cat, spent: spent2, budget, color }) => {
      const showBudget = anaScope === "year" || cat.group === "\u81EA\u7531\u8CBB";
      const over = showBudget && budget > 0 && spent2 > budget;
      const pct = budget > 0 ? Math.min(spent2 / budget * 100, 100) : 0;
      return /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: cat.id, onClick: () => openDetail("category", cat.id) }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: color } }, cat.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, cat.name), showBudget && /* @__PURE__ */ React.createElement("div", { className: "kb-bar thin" }, /* @__PURE__ */ React.createElement("span", { style: { width: `${pct}%`, background: over ? "var(--red)" : color } }))), /* @__PURE__ */ React.createElement("div", { className: "kb-ana-vals" }, /* @__PURE__ */ React.createElement("div", { className: "kb-ana-spent", style: { color: over ? "var(--red)" : "var(--ink)" } }, yen(spent2)), showBudget && /* @__PURE__ */ React.createElement("div", { className: "kb-ana-rest" }, over ? "\u8D85\u904E" : "\u6B8B", " ", yen(Math.abs(budget - spent2)))), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }));
    }))))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-histfilter" }, /* @__PURE__ */ React.createElement("button", { className: `kb-monthchip ${tkMonth === null ? "on" : ""}`, onClick: () => setTkMonth(null) }, /* @__PURE__ */ React.createElement("span", null, "\u5E74\u9593"), /* @__PURE__ */ React.createElement("b", null, tkMonthTotals.reduce((a, b) => a + b, 0).toLocaleString("ja-JP"))), MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        className: `kb-monthchip ${tkMonth === i ? "on" : ""} ${tkMonthTotals[i] === 0 ? "empty" : ""}`,
        onClick: () => setTkMonth(tkMonth === i ? null : i)
      },
      /* @__PURE__ */ React.createElement("span", null, l),
      /* @__PURE__ */ React.createElement("b", null, tkMonthTotals[i] === 0 ? "\u2014" : tkMonthTotals[i].toLocaleString("ja-JP"))
    ))), partySummary.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, /* @__PURE__ */ React.createElement("strong", null, tkMonth === null ? "\u7ACB\u66FF\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093" : `${MONTH_LABELS[tkMonth]}\u306E\u7ACB\u66FF\u306F\u3042\u308A\u307E\u305B\u3093`), tkMonth === null ? "\u53F3\u4E0B\u306E\u30DC\u30BF\u30F3\u304B\u3089\u8A18\u9332\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : "\u4E0A\u306E\u5E74\u9593\u3092\u62BC\u3059\u3068\u5168\u671F\u9593\u306B\u623B\u308A\u307E\u3059\u3002")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, tkMonth === null ? "\u533A\u5206\u3054\u3068\u306E\u672A\u7CBE\u7B97" : `${MONTH_LABELS[tkMonth]}\u306E\u533A\u5206\u3054\u3068\u306E\u672A\u7CBE\u7B97`), /* @__PURE__ */ React.createElement("div", { className: "kb-card" }, partySummary.map((p) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: p.party, onClick: () => openDetail("party", p.party) }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-partytop" }, /* @__PURE__ */ React.createElement("span", { className: "kb-rowtitle" }, p.party), /* @__PURE__ */ React.createElement("span", { className: "kb-partyamt", style: { color: p.unsettled > 0 ? "var(--red)" : "var(--sub)" } }, yen(p.unsettled))), /* @__PURE__ */ React.createElement("div", { className: "kb-stackbar" }, /* @__PURE__ */ React.createElement("span", { className: "all", style: { width: `${(p.unsettled + p.settled) / maxParty * 100}%` } }), /* @__PURE__ */ React.createElement("span", { className: "un", style: { width: `${p.unsettled / maxParty * 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, p.items.filter((t) => !t.settled).length, "\u4EF6\u672A\u7CBE\u7B97", p.settled > 0 ? `\u30FB\u7CBE\u7B97\u6E08\u307F ${yen(p.settled)}` : "")), /* @__PURE__ */ React.createElement(ChevronRight, { size: 17, className: "kb-chev" }))))))), tab === "settle" && !tkFormOpen && !detail && /* @__PURE__ */ React.createElement("button", { className: "kb-fab", onClick: openTkNew, "aria-label": "\u7ACB\u66FF\u3092\u8A18\u9332" }, /* @__PURE__ */ React.createElement(Plus, { size: 26 })), detail && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: closeDetail }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, detail.type === "party" ? `\u7ACB\u66FF\u30FB${detail.key}${tkMonth === null ? "" : ` ${MONTH_LABELS[tkMonth]}`}` : `${detail.type === "group" ? detail.key : dCats[0] ? dCats[0].name : ""}${dTag ? `\u30FB${dTag}` : ""}`, detail.type !== "party" && /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-period" }, anaScope === "month" ? ` ${MONTH_LABELS[anaMonth]}` : dMonth !== null ? ` ${MONTH_LABELS[dMonth]}` : " \u5E74\u9593")), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: closeDetail, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), detail.type === "party" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total" }, /* @__PURE__ */ React.createElement("span", null, "\u672A\u7CBE\u7B97 ", yen(dPartyItems.filter((t) => !t.settled).reduce((a, t) => a + t.amount, 0))), /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, dPartyItems.length, "\u4EF6")), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, dPartyItems.map((t) => /* @__PURE__ */ React.createElement("div", { className: `kb-row ${t.settled ? "kb-settled" : ""}`, key: t.id, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, t.date ? `${Number(t.date.slice(5, 7))}/${Number(t.date.slice(8, 10))}` : "\u2014"), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain", onClick: () => {
      closeDetail();
      openTkEdit(t);
    }, style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, t.memo)), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: { color: t.pending ? "var(--pending)" : t.settled ? "var(--sub)" : "var(--red)" } }, yen(t.amount)), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kb-iconbtn",
        onClick: () => toggleSettled(t),
        "aria-label": t.settled ? "\u672A\u7CBE\u7B97\u306B\u623B\u3059" : "\u7CBE\u7B97\u6E08\u307F\u306B\u3059\u308B"
      },
      t.settled ? /* @__PURE__ */ React.createElement(Undo2, { size: 15 }) : /* @__PURE__ */ React.createElement(Check, { size: 16 })
    ))))) : /* @__PURE__ */ React.createElement(React.Fragment, null, anaScope === "year" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-label", style: { marginTop: 2 } }, "\u6708\u3092\u30BF\u30C3\u30D7\u3067\u7D5E\u308A\u8FBC\u307F"), /* @__PURE__ */ React.createElement("div", { className: "kb-monthchips" }, MONTH_LABELS.map((l, i) => /* @__PURE__ */ React.createElement(
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
    }))), /* @__PURE__ */ React.createElement("div", { className: "kb-detail-total" }, /* @__PURE__ */ React.createElement("span", null, "\u5408\u8A08 ", yen(dTotal)), /* @__PURE__ */ React.createElement("span", { className: "kb-detail-count" }, dEntries.length, "\u4EF6")), dEntries.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kb-empty" }, "\u8A72\u5F53\u3059\u308B\u660E\u7D30\u304C\u3042\u308A\u307E\u305B\u3093") : /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, dEntries.map((e) => /* @__PURE__ */ React.createElement("button", { className: "kb-row", key: e.id, onClick: () => {
      const c = catById(e.catId);
      closeDetail();
      openEntryEdit(c, e);
    } }, /* @__PURE__ */ React.createElement("span", { className: "kb-detail-date" }, e.date ? `${Number(e.date.slice(5, 7))}/${Number(e.date.slice(8, 10))}` : "\u2014"), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, e.memo || e.tag || e.catName), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, [isIncome(e) ? "\u53CE\u5165" : null, detail.type === "group" ? e.catName : null, e.tag, e.method].filter(Boolean).join("\u30FB"))), /* @__PURE__ */ React.createElement("span", { className: "kb-amount", style: amountStyle(e) }, isIncome(e) ? "+" : "", yen(Math.abs(Number(e.amount) || 0))))))))), entryTarget && entryCat && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: closeEntry }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, entryCat.name, "\u3000", entryTarget.entryId ? "\u306E\u8A18\u9332\u3092\u7DE8\u96C6" : "\u3092\u8A18\u9332"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: closeEntry, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("div", { className: "kb-seg" }, /* @__PURE__ */ React.createElement("button", { className: enType === "expense" ? "on" : "", onClick: () => setEnType("expense") }, "\u652F\u51FA"), /* @__PURE__ */ React.createElement("button", { className: enType === "income" ? "on" : "", onClick: () => setEnType("income") }, "\u53CE\u5165"))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: amountRef,
        className: "kb-input amount",
        type: "number",
        inputMode: "numeric",
        value: enAmount,
        onChange: (ev) => setEnAmount(ev.target.value),
        placeholder: "0",
        style: enType === "income" ? { color: "var(--accent)" } : void 0,
        autoFocus: true
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
    )), entryCat.tags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u8A33"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: enTag, onChange: (ev) => setEnTag(ev.target.value) }, entryCat.tags.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u5BB9\uFF08\u5E97\u540D\u306A\u3069\u30FB\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: enMemo, onChange: (ev) => setEnMemo(ev.target.value), placeholder: "\u7121\u5370\u826F\u54C1" })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u652F\u6255\u3044\u65B9\u6CD5"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: enMethod, onChange: (ev) => setEnMethod(ev.target.value) }, METHODS.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), /* @__PURE__ */ React.createElement(CheckRow, { checked: !enPending, onChange: (v) => setEnPending(!v) }, "\u91D1\u984D\u304C\u78BA\u5B9A\u3057\u3066\u3044\u308B\uFF08\u30AB\u30FC\u30C9\u306E\u660E\u7D30\u306B\u8F09\u3063\u305F\uFF09"), enError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, enError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitEntry }, entryTarget.entryId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), entryTarget.entryId ? /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteEntry(entryTarget.entryId) }, "\u3053\u306E\u8A18\u9332\u3092\u524A\u9664")) : entryCat.group === "\u56FA\u5B9A\u8CBB" && entryCat.monthlyBudget > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => fillTwelveMonths(entryCat) }, /* @__PURE__ */ React.createElement(CalendarPlus, { size: 14, style: { verticalAlign: "-2px", marginRight: 5 } }), "\u6BCE\u6708\u540C\u984D\u306712\u30F6\u6708\u5206\u3092\u5165\u529B")))), tkFormOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => {
      setTkFormOpen(false);
      setTkEditId(null);
    } }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, tkEditId ? "\u7ACB\u66FF\u3092\u7DE8\u96C6" : "\u7ACB\u66FF\u3092\u8A18\u9332"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => {
      setTkFormOpen(false);
      setTkEditId(null);
    }, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input amount", type: "number", inputMode: "numeric", value: tkAmount, onChange: (ev) => setTkAmount(ev.target.value), placeholder: "0", autoFocus: true })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u65E5\u4ED8"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "date", value: tkDate, onChange: (ev) => setTkDate(ev.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u533A\u5206"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: tkParty, onChange: (ev) => setTkParty(ev.target.value) }, PARTIES.map((p) => /* @__PURE__ */ React.createElement("option", { key: p, value: p }, p)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u5BB9"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: tkMemo, onChange: (ev) => setTkMemo(ev.target.value), placeholder: "\u7121\u5370\u826F\u54C1" })), /* @__PURE__ */ React.createElement(CheckRow, { checked: !tkPending, onChange: (v) => setTkPending(!v) }, "\u91D1\u984D\u304C\u78BA\u5B9A\u3057\u3066\u3044\u308B\uFF08\u30AB\u30FC\u30C9\u306E\u660E\u7D30\u306B\u8F09\u3063\u305F\uFF09"), tkError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, tkError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitTk }, tkEditId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), tkEditId && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteSettlement(tkEditId) }, "\u3053\u306E\u7ACB\u66FF\u3092\u524A\u9664")))), trFormOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => {
      setTrFormOpen(false);
      setTrEditId(null);
    } }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, trEditId ? "\u632F\u66FF\u3092\u7DE8\u96C6" : "\u632F\u66FF\u3092\u8A18\u9332"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => {
      setTrFormOpen(false);
      setTrEditId(null);
    }, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u91D1\u984D\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input amount", type: "number", inputMode: "numeric", value: trAmount, onChange: (ev) => setTrAmount(ev.target.value), placeholder: "0", autoFocus: true })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u65E5\u4ED8"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "date", value: trDate, min: `${year}-01-01`, max: `${year}-12-31`, onChange: (ev) => setTrDate(ev.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "kb-inline" }, /* @__PURE__ */ React.createElement("div", { className: "kb-field", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u632F\u66FF\u5143"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: trFrom, onChange: (ev) => setTrFrom(ev.target.value) }, METHODS.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u632F\u66FF\u5148"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: trTo, onChange: (ev) => setTrTo(ev.target.value) }, METHODS.map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m))))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", value: trMemo, onChange: (ev) => setTrMemo(ev.target.value), placeholder: "PASMO\u30C1\u30E3\u30FC\u30B8" })), /* @__PURE__ */ React.createElement(CheckRow, { checked: !trPending, onChange: (v) => setTrPending(!v) }, "\u91D1\u984D\u304C\u78BA\u5B9A\u3057\u3066\u3044\u308B\uFF08\u30AB\u30FC\u30C9\u306E\u660E\u7D30\u306B\u8F09\u3063\u305F\uFF09"), trError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, trError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitTr }, trEditId ? "\u4FDD\u5B58\u3059\u308B" : "\u8A18\u9332\u3059\u308B"), trEditId && /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn danger", onClick: () => deleteTransfer(trEditId) }, "\u3053\u306E\u632F\u66FF\u3092\u524A\u9664")))), manageOpen && /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-backdrop", onClick: () => {
      setManageOpen(false);
      setCatFormOpen(false);
    } }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet", onClick: (ev) => ev.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kb-sheet-head" }, /* @__PURE__ */ React.createElement("span", { className: "kb-sheet-title" }, "\u30AB\u30C6\u30B4\u30EA\u306E\u7DE8\u96C6"), /* @__PURE__ */ React.createElement("button", { className: "kb-close", onClick: () => {
      setManageOpen(false);
      setCatFormOpen(false);
    }, "aria-label": "\u9589\u3058\u308B" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), catFormOpen ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30B0\u30EB\u30FC\u30D7"), /* @__PURE__ */ React.createElement("div", { className: "kb-seg" }, GROUP_ORDER.map((g) => /* @__PURE__ */ React.createElement("button", { key: g, className: fGroup === g ? "on" : "", onClick: () => pickGroup(g) }, g)))), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u30AB\u30C6\u30B4\u30EA\u540D"), /* @__PURE__ */ React.createElement("select", { className: "kb-input", value: fNameChoice, onChange: (ev) => pickName(ev.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"), (NAME_OPTIONS[fGroup] || []).map((n) => {
      const taken = catMode === "add" && categories.some((c) => c.name === n);
      return /* @__PURE__ */ React.createElement("option", { key: n, value: n, disabled: taken }, taken ? `${n}\uFF08\u767B\u9332\u6E08\u307F\uFF09` : n);
    }), /* @__PURE__ */ React.createElement("option", { value: CUSTOM_NAME }, "\u305D\u306E\u4ED6\uFF08\u624B\u5165\u529B\uFF09")), fNameChoice === CUSTOM_NAME && /* @__PURE__ */ React.createElement("input", { className: "kb-input", style: { marginTop: 8 }, value: fName, onChange: (ev) => setFName(ev.target.value), placeholder: "\u30AB\u30C6\u30B4\u30EA\u540D\u3092\u5165\u529B" })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, fGroup === "\u4E88\u5B9A\u8CBB" ? "\u5E74\u9593\u4E88\u7B97\uFF08\u5186\uFF09" : "\u6708\u4E88\u7B97\uFF08\u5186\uFF09"), /* @__PURE__ */ React.createElement("input", { className: "kb-input", type: "number", inputMode: "numeric", value: fAmount, onChange: (ev) => setFAmount(ev.target.value), placeholder: fGroup === "\u4E88\u5B9A\u8CBB" ? "100000" : "10000" })), /* @__PURE__ */ React.createElement("div", { className: "kb-field" }, /* @__PURE__ */ React.createElement("label", { className: "kb-label" }, "\u5185\u8A33\uFF08\u8A18\u9332\u6642\u306E\u9078\u629E\u80A2\u306B\u306A\u308A\u307E\u3059\uFF09"), fTags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kb-chips" }, fTags.map((t) => /* @__PURE__ */ React.createElement("span", { className: "kb-chip", key: t }, t, /* @__PURE__ */ React.createElement("button", { onClick: () => setFTags((p) => p.filter((x) => x !== t)), "aria-label": `${t}\u3092\u524A\u9664` }, /* @__PURE__ */ React.createElement(X, { size: 11 }))))), /* @__PURE__ */ React.createElement("div", { className: "kb-inline" }, /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", style: { width: "auto", padding: "0 16px" }, onClick: addTag }, "\u8FFD\u52A0"))), fError && /* @__PURE__ */ React.createElement("div", { className: "kb-err" }, fError), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", onClick: submitCat }, catMode === "add" ? "\u8FFD\u52A0\u3059\u308B" : "\u4FDD\u5B58\u3059\u308B"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => setCatFormOpen(false) }, "\u30AD\u30E3\u30F3\u30BB\u30EB"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, GROUP_ORDER.filter((g) => categories.some((c) => c.group === g)).map((g) => /* @__PURE__ */ React.createElement("div", { key: g }, /* @__PURE__ */ React.createElement("div", { className: "kb-section-label" }, g), /* @__PURE__ */ React.createElement("div", { className: "kb-card", style: { background: "#FAFAFB" } }, categories.filter((c) => c.group === g).map((c) => /* @__PURE__ */ React.createElement("div", { className: "kb-row", key: c.id, style: { cursor: "default" } }, /* @__PURE__ */ React.createElement("div", { className: "kb-dot", style: { background: colorOf(catIndex[c.id]) } }, c.name.slice(0, 1)), /* @__PURE__ */ React.createElement("div", { className: "kb-rowmain" }, /* @__PURE__ */ React.createElement("div", { className: "kb-rowtitle" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "kb-rowsub" }, c.group === "\u4E88\u5B9A\u8CBB" ? "\u5E74\u9593" : "\u6708", "\u4E88\u7B97 ", yen(c.group === "\u4E88\u5B9A\u8CBB" ? c.annualBudget : c.monthlyBudget), c.tags.length > 0 ? `\u30FB\u5185\u8A33${c.tags.length}\u4EF6` : "")), /* @__PURE__ */ React.createElement("div", { className: "kb-rowright" }, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => openCatEdit(c), "aria-label": "\u7DE8\u96C6" }, /* @__PURE__ */ React.createElement(Pencil, { size: 14 })), catDeleteId === c.id ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", style: { color: "var(--red)" }, onClick: () => deleteCategory(c.id), "aria-label": "\u524A\u9664\u3092\u78BA\u5B9A" }, /* @__PURE__ */ React.createElement(Check, { size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setCatDeleteId(null), "aria-label": "\u53D6\u6D88" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement("button", { className: "kb-iconbtn", onClick: () => setCatDeleteId(c.id), "aria-label": "\u524A\u9664" }, /* @__PURE__ */ React.createElement(Trash2, { size: 14 })))))))), /* @__PURE__ */ React.createElement("button", { className: "kb-btn", style: { marginTop: 14 }, onClick: openCatAdd }, "\u30AB\u30C6\u30B4\u30EA\u3092\u8FFD\u52A0"), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u4FDD\u5B58\u306E\u72B6\u614B"), /* @__PURE__ */ React.createElement("div", { className: `kb-savebox ${sync.error ? "error" : sync.pending > 0 ? "" : "ok"}` }, sync.error ? `\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u305B\u3093\uFF08\u672A\u9001\u4FE1${sync.pending}\u4EF6\uFF09\uFF1A${sync.error}` : sync.pending > 0 ? `\u4FDD\u5B58\u4E2D\u3067\u3059\uFF08\u6B8B\u308A${sync.pending}\u4EF6\uFF09` : "\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306B\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      setManageOpen(false);
      load();
    } }, "\u8AAD\u307F\u8FBC\u307F\u76F4\u3059")), /* @__PURE__ */ React.createElement("div", { className: "kb-section-label", style: { marginTop: 22 } }, "\u63A5\u7D9A\u5148"), /* @__PURE__ */ React.createElement("div", { className: "kb-savebox", style: { wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: 10.5 } }, KakeiboAPI.getUrl()), /* @__PURE__ */ React.createElement("div", { className: "kb-btn-row", style: { marginTop: 9 } }, /* @__PURE__ */ React.createElement("button", { className: "kb-btn ghost", onClick: () => {
      KakeiboAPI.setUrl("");
      setNeedsSetup(true);
    } }, "\u8A2D\u5B9A\u3057\u76F4\u3059"))))), toast && /* @__PURE__ */ React.createElement("div", { className: "kb-toast" }, toast)), /* @__PURE__ */ React.createElement("nav", { className: "kb-nav" }, /* @__PURE__ */ React.createElement("div", { className: "kb-nav-inner" }, TABS.map(({ key, label, icon: Icon }) => /* @__PURE__ */ React.createElement("button", { key, className: tab === key ? "on" : "", onClick: () => setTab(key) }, /* @__PURE__ */ React.createElement(Icon, { size: 20 }), /* @__PURE__ */ React.createElement("span", null, label))))));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(KakeiboApp, null));
})();
