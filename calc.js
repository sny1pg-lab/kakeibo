/**
 * 金額欄に打った式を計算する。
 *
 * 「1634+1090+460」のように、レシートの金額をそのまま足せるようにするためのもの。
 * 四則演算とカッコだけを解釈する。
 *
 * 文字列をそのまま実行する方法（eval や new Function）は使わない。
 * 打ち間違いがそのままプログラムとして走ってしまうため。
 * ここでは数と記号に分けたうえで、自前で構文を追って計算する。
 */
(function (global) {
  'use strict';

  // 日本語入力で混ざりやすい全角の記号を半角に直す
  var WIDE = {
    '＋': '+', 'ー': '-', '－': '-', '−': '-', '‐': '-', '―': '-',
    '×': '*', '＊': '*', '✕': '*', 'x': '*', 'X': '*',
    '÷': '/', '／': '/', '⁄': '/',
    '（': '(', '）': ')', '．': '.', '，': ',', '　': ' ',
  };
  for (var i = 0; i < 10; i++) WIDE[String.fromCharCode(0xFF10 + i)] = String(i);

  function normalize(src) {
    var out = '';
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      out += Object.prototype.hasOwnProperty.call(WIDE, c) ? WIDE[c] : c;
    }
    // 桁区切りのカンマは取り除く。空白も意味を持たない
    return out.replace(/,/g, '').replace(/\s+/g, '');
  }

  /** 数と記号に切り分ける。読めない文字が混ざっていたら null。 */
  function tokenize(src) {
    var tokens = [];
    var i = 0;
    while (i < src.length) {
      var c = src[i];
      if (c >= '0' && c <= '9' || c === '.') {
        var j = i;
        var dots = 0;
        while (j < src.length && (src[j] >= '0' && src[j] <= '9' || src[j] === '.')) {
          if (src[j] === '.') dots++;
          j++;
        }
        if (dots > 1) return null;            // 1.2.3 のような書き方
        var n = Number(src.slice(i, j));
        if (isNaN(n)) return null;
        tokens.push({ t: 'num', v: n });
        i = j;
        continue;
      }
      if ('+-*/()'.indexOf(c) >= 0) {
        tokens.push({ t: c });
        i++;
        continue;
      }
      return null;                            // 文字や記号が混ざっている
    }
    return tokens;
  }

  /**
   * 再帰下降で読む。
   *   expr   = term (('+' | '-') term)*
   *   term   = unary (('*' | '/') unary)*
   *   unary  = ('+' | '-')* factor
   *   factor = number | '(' expr ')'
   */
  function parse(tokens) {
    var pos = 0;
    var failed = false;

    function peek() { return tokens[pos]; }
    function eat(t) {
      if (peek() && peek().t === t) { pos++; return true; }
      return false;
    }

    function factor() {
      var tk = peek();
      if (!tk) { failed = true; return 0; }
      if (tk.t === 'num') { pos++; return tk.v; }
      if (eat('(')) {
        var v = expr();
        if (!eat(')')) failed = true;
        return v;
      }
      failed = true;
      return 0;
    }

    function unary() {
      if (eat('+')) return unary();
      if (eat('-')) return -unary();
      return factor();
    }

    function term() {
      var v = unary();
      for (;;) {
        if (eat('*')) { v = v * unary(); continue; }
        if (eat('/')) {
          var d = unary();
          if (d === 0) { failed = true; return 0; }   // 0では割らない
          v = v / d;
          continue;
        }
        return v;
      }
    }

    function expr() {
      var v = term();
      for (;;) {
        if (eat('+')) { v = v + term(); continue; }
        if (eat('-')) { v = v - term(); continue; }
        return v;
      }
    }

    var value = expr();
    if (failed || pos !== tokens.length) return null;
    return value;
  }

  /**
   * 式を計算する。
   * 計算できたら { ok: true, value } を、できなければ { ok: false } を返す。
   */
  function evalAmount(src) {
    var text = normalize(String(src == null ? '' : src));
    if (!text) return { ok: false, empty: true };
    var tokens = tokenize(text);
    if (!tokens || !tokens.length) return { ok: false };
    var v = parse(tokens);
    if (v === null || !isFinite(v)) return { ok: false };
    return { ok: true, value: v };
  }

  /** 式らしい記号が含まれているか。計算結果を出すかどうかの判断に使う。 */
  function looksLikeExpression(src) {
    return /[+\-*/()＋ー－−×÷（）]/.test(String(src == null ? '' : src));
  }

  var api = { evalAmount: evalAmount, looksLikeExpression: looksLikeExpression, normalize: normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.KakeiboCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
