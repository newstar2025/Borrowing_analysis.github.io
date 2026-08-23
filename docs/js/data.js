window.LoanData = (function () {
  const DOW = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const TYPE_COLORS = {
    "中心馆": "#38bdf8",
    "区级分馆": "#34d399",
    "街镇馆": "#f59e0b",
    "其他网点": "#a78bfa",
  };
  const PALETTE = [
    "#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa",
    "#2dd4bf", "#f472b6", "#60a5fa", "#fbbf24", "#4ade80",
  ];

  function decode(field, i) {
    const c = field.codes[i];
    return c < 0 ? null : field.dict[c];
  }

  function expand(raw) {
    const n = raw.n;
    const rows = new Array(n);
    for (let i = 0; i < n; i++) {
      rows[i] = {
        date: raw.date[i],
        hour: raw.hour[i],
        dow: raw.dow[i],
        month: raw.month[i],
        lib: decode(raw.lib, i),
        region: decode(raw.region, i),
        libType: decode(raw.lib_type, i),
        itemType: decode(raw.item_type, i),
        clc: decode(raw.clc, i),
        title: decode(raw.title, i),
        author: decode(raw.author, i),
        publisher: decode(raw.publisher, i),
        pubYear: raw.pub_year[i] > 0 ? raw.pub_year[i] : null,
        peri: !!raw.peri[i],
        rid: raw.rid[i],
        ageBand: decode(raw.age_band, i),
        gender: decode(raw.gender, i),
        ageOutlier: !!raw.age_outlier[i],
      };
    }
    return rows;
  }

  async function load() {
    const url = new URL("data/fact_slim.json", document.baseURI).href;
    const raw = await fetch(url).then((r) => {
      if (!r.ok) throw new Error("无法加载 fact_slim.json");
      return r.json();
    });
    return { rows: expand(raw), n: raw.n };
  }

  function colorOfType(t) {
    return TYPE_COLORS[t] || "#94a3b8";
  }

  function colorAt(i) {
    return PALETTE[i % PALETTE.length];
  }

  return { DOW, TYPE_COLORS, load, colorOfType, colorAt };
})();
