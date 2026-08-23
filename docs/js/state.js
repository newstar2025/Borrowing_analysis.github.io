window.AppState = (function () {
  const CROSS_KEYS = [
    "gender",
    "ageBand",
    "clc",
    "itemType",
    "dow",
    "hour",
    "author",
    "publisher",
    "title",
    "pubYear",
  ];

  const LABELS = {
    gender: "性别",
    ageBand: "年龄",
    clc: "类别",
    itemType: "馆藏类型",
    dow: "星期",
    hour: "时段",
    author: "作者",
    publisher: "出版社",
    title: "书名",
    pubYear: "出版年",
  };

  let state = {
    libType: null,
    library: null,
    month: null,
    date: null,
    excludePeri: true,
    gender: null,
    ageBand: null,
    clc: null,
    itemType: null,
    dow: null,
    hour: null,
    author: null,
    publisher: null,
    title: null,
    pubYear: null,
  };

  const listeners = [];

  function get() {
    return Object.assign({}, state);
  }

  function set(partial) {
    state = Object.assign({}, state, partial);
    if (partial.date) {
      const m = Number(String(partial.date).slice(5, 7));
      state.month = m;
    }
    listeners.forEach((fn) => fn(state));
  }

  function reset() {
    state = {
      libType: null,
      library: null,
      month: null,
      date: null,
      excludePeri: true,
      gender: null,
      ageBand: null,
      clc: null,
      itemType: null,
      dow: null,
      hour: null,
      author: null,
      publisher: null,
      title: null,
      pubYear: null,
    };
    listeners.forEach((fn) => fn(state));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function toggle(key, value) {
    if (state[key] === value) set({ [key]: null });
    else set({ [key]: value });
  }

  function formatValue(key, value) {
    if (value == null) return "";
    if (key === "dow") return window.LoanData.DOW[value] || String(value);
    if (key === "hour") return value + ":00";
    if (key === "pubYear") return String(value) + "年";
    return String(value);
  }

  function applyRow(r, skip) {
    const sk = skip || [];
    if (state.excludePeri && r.peri) return false;
    if (state.libType && r.libType !== state.libType) return false;
    if (state.library && r.lib !== state.library) return false;

    if (!sk.includes("gender") && state.gender) {
      const g = r.gender === "男" || r.gender === "女" ? r.gender : "未知";
      if (g !== state.gender) return false;
    }
    if (!sk.includes("ageBand") && state.ageBand && r.ageBand !== state.ageBand) return false;
    if (!sk.includes("clc") && state.clc && r.clc !== state.clc) return false;
    if (!sk.includes("itemType") && state.itemType && r.itemType !== state.itemType) return false;
    if (!sk.includes("dow") && state.dow != null && r.dow !== state.dow) return false;
    if (!sk.includes("hour") && state.hour != null && r.hour !== state.hour) return false;
    if (!sk.includes("author") && state.author && r.author !== state.author) return false;
    if (!sk.includes("publisher") && state.publisher && r.publisher !== state.publisher) return false;
    if (!sk.includes("title") && state.title && r.title !== state.title) return false;
    if (!sk.includes("pubYear") && state.pubYear != null && r.pubYear !== state.pubYear) return false;

    return true;
  }

  function filter(rows, opts) {
    const skip = opts && opts.skip ? opts.skip : [];
    const includeTime = !(opts && opts.includeTime === false);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!applyRow(r, skip)) continue;
      if (includeTime) {
        if (state.date) {
          if (r.date !== state.date) continue;
        } else if (state.month && r.month !== state.month) {
          continue;
        }
      }
      out.push(r);
    }
    return out;
  }

  /** 热力图 / 时段 / 河流：馆点 + 人群画像等，不含月日 */
  function filterForCalendar(rows) {
    return filter(rows, { includeTime: false });
  }

  function chips() {
    const list = [];
    CROSS_KEYS.forEach((key) => {
      const v = state[key];
      if (v == null) return;
      list.push({
        key,
        label: LABELS[key] + "：" + formatValue(key, v),
        clear: () => set({ [key]: null }),
      });
    });
    return list;
  }

  function crumb() {
    const parts = [];
    if (state.library) parts.push(state.library);
    else if (state.libType) parts.push(state.libType + "（全部二级）");
    else parts.push("全部馆点");

    chips().forEach((c) => parts.push(c.label));

    if (state.date) parts.push(state.date);
    else if (state.month) parts.push(state.month + "月");
    else if (!chips().length) parts.push("全年");
    return parts.join(" · ");
  }

  function renderFilterBar(el) {
    if (!el) return;
    el.innerHTML = "";
    const chipsList = chips();
    if (!chipsList.length) {
      el.classList.add("hidden");
      return;
    }
    el.classList.remove("hidden");
    const label = document.createElement("span");
    label.className = "filter-bar-label";
    label.textContent = "图表联动筛选";
    el.appendChild(label);
    chipsList.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip";
      btn.textContent = c.label + " ×";
      btn.onclick = () => c.clear();
      el.appendChild(btn);
    });
  }

  return {
    get,
    set,
    reset,
    toggle,
    onChange,
    crumb,
    filter,
    filterForCalendar,
    chips,
    renderFilterBar,
    formatValue,
    LABELS,
  };
})();
