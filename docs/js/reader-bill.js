window.ReaderBill = (function () {
  const DOW = window.LoanData.DOW;

  function bump(map, key, n) {
    if (!key) return;
    map[key] = (map[key] || 0) + (n || 1);
  }

  function topEntry(map, minKey) {
    let best = null;
    let bestV = 0;
    for (const k in map) {
      if (map[k] > bestV) {
        bestV = map[k];
        best = k;
      }
    }
    if (!best || bestV < (minKey || 1)) return { name: "—", value: 0 };
    return { name: best, value: bestV };
  }

  function topList(map, n) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, value]) => ({ name, value }));
  }

  function pct(v, total) {
    return total ? ((v / total) * 100).toFixed(1) + "%" : "0%";
  }

  function buildIndex(rows) {
    const readers = new Map();
    const loanCounts = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rid = r.rid;
      let rec = readers.get(rid);
      if (!rec) {
        rec = {
          rid,
          gender: r.gender,
          ageBand: r.ageBand,
          loans: 0,
          libs: {},
          clcs: {},
          authors: {},
          titles: {},
          months: new Array(13).fill(0),
          hours: new Array(24).fill(0),
          dows: new Array(7).fill(0),
          itemTypes: {},
          firstDate: r.date,
          lastDate: r.date,
          periCount: 0,
        };
        readers.set(rid, rec);
      }
      rec.loans += 1;
      if (r.lib) bump(rec.libs, r.lib);
      if (r.clc) bump(rec.clcs, r.clc);
      if (r.author) bump(rec.authors, r.author);
      if (r.title) bump(rec.titles, r.title);
      if (r.itemType) bump(rec.itemTypes, r.itemType);
      if (r.month >= 1 && r.month <= 12) rec.months[r.month] += 1;
      if (r.hour >= 0 && r.hour < 24) rec.hours[r.hour] += 1;
      if (r.dow >= 0 && r.dow < 7) rec.dows[r.dow] += 1;
      if (r.date < rec.firstDate) rec.firstDate = r.date;
      if (r.date > rec.lastDate) rec.lastDate = r.date;
      if (r.peri) rec.periCount += 1;
      if (!rec.gender && r.gender) rec.gender = r.gender;
      if (!rec.ageBand && r.ageBand) rec.ageBand = r.ageBand;
    }

    readers.forEach((rec) => loanCounts.push(rec.loans));
    loanCounts.sort((a, b) => a - b);

    return { readers, loanCounts };
  }

  function rankPercentile(loans, loanCounts) {
    if (!loanCounts.length) return 0;
    let below = 0;
    for (let i = 0; i < loanCounts.length; i++) {
      if (loanCounts[i] < loans) below++;
    }
    return Math.round((below / loanCounts.length) * 100);
  }

  function peakIndex(arr, start, end) {
    let best = start;
    let bestV = -1;
    for (let i = start; i <= end; i++) {
      if (arr[i] > bestV) {
        bestV = arr[i];
        best = i;
      }
    }
    return { index: best, value: bestV };
  }

  function personalityTags(rec, bill) {
    const tags = [];
    const weekend = rec.dows[5] + rec.dows[6];
    const weekday = rec.loans - weekend;
    if (bill.peakHour.index >= 18) tags.push("夜读星人");
    if (bill.peakHour.index <= 10 && bill.peakHour.value > 0) tags.push("晨光读者");
    if (weekend > weekday * 0.45) tags.push("周末读书人");
    if (rec.loans >= 50) tags.push("借阅达人");
    if (Object.keys(rec.titles).length >= 25) tags.push("博览群书");
    if (Object.keys(rec.libs).length >= 4) tags.push("全城打卡");
    if (bill.topClc.name && bill.topClc.name.startsWith("I")) tags.push("文学爱好者");
    if (bill.topClc.name && bill.topClc.name.startsWith("T")) tags.push("科技探索者");
    if (rec.periCount > rec.loans * 0.3) tags.push("期刊常客");
    if (!tags.length) tags.push("安静阅读");
    return tags.slice(0, 5);
  }

  function compute(rid, index) {
    const rec = index.readers.get(Number(rid));
    if (!rec) return null;

    const topLib = topEntry(rec.libs);
    const topClc = topEntry(rec.clcs);
    const topAuthor = topEntry(rec.authors);
    const peakMonth = peakIndex(rec.months, 1, 12);
    const peakHour = peakIndex(rec.hours, 7, 21);
    const peakDow = peakIndex(rec.dows, 0, 6);
    const uniqueTitles = Object.keys(rec.titles).length;
    const uniqueLibs = Object.keys(rec.libs).length;
    const percentile = rankPercentile(rec.loans, index.loanCounts);
    const activeDays = new Set();
    // approximate active days from month distribution - we don't have set in rec
    // use loans spread: count months with activity
    const activeMonths = rec.months.slice(1).filter((v) => v > 0).length;

    const bill = {
      rid: rec.rid,
      gender: rec.gender || "未知",
      ageBand: rec.ageBand || "未知",
      loans: rec.loans,
      percentile,
      uniqueTitles,
      uniqueLibs,
      activeMonths,
      firstDate: rec.firstDate,
      lastDate: rec.lastDate,
      topLib,
      topClc,
      topAuthor,
      topTitles: topList(rec.titles, 5),
      topAuthors: topList(rec.authors, 3),
      months: rec.months.slice(1),
      hours: rec.hours.slice(7, 22),
      hourLabels: d3.range(7, 22),
      dows: rec.dows,
      peakMonth: { month: peakMonth.index, value: peakMonth.value },
      peakHour: { hour: peakHour.index, value: peakHour.value },
      peakDow: { dow: peakDow.index, name: DOW[peakDow.index], value: peakDow.value },
      periShare: pct(rec.periCount, rec.loans),
      tags: [],
    };
    bill.tags = personalityTags(rec, bill);
    return bill;
  }

  function renderPaper(el, bill) {
    el.innerHTML = "";

    const wrap = document.createElement("article");
    wrap.className = "bill-paper-inner";

    const head = document.createElement("header");
    head.className = "bill-header";
    head.innerHTML =
      "<div class=\"bill-year\">2025</div>" +
      "<h2 class=\"bill-title\">我的阅读账单</h2>" +
      "<p class=\"bill-sub\">读者编号 <strong>" +
      bill.rid +
      "</strong> · " +
      bill.gender +
      " · " +
      bill.ageBand +
      "</p>";
    wrap.appendChild(head);

    const hero = document.createElement("div");
    hero.className = "bill-hero";
    hero.innerHTML =
      "<div class=\"bill-hero-num\">" +
      bill.loans.toLocaleString() +
      "</div>" +
      "<div class=\"bill-hero-label\">全年借阅（次）</div>" +
      "<div class=\"bill-hero-rank\">超越 <strong>" +
      bill.percentile +
      "%</strong> 的读者</div>";
    wrap.appendChild(hero);

    const tags = document.createElement("div");
    tags.className = "bill-tags";
    bill.tags.forEach((t) => {
      const span = document.createElement("span");
      span.className = "bill-tag";
      span.textContent = t;
      tags.appendChild(span);
    });
    wrap.appendChild(tags);

    const grid = document.createElement("div");
    grid.className = "bill-grid";
    const stats = [
      { label: "最爱馆点", value: bill.topLib.name, sub: bill.topLib.value + " 次" },
      { label: "最爱类别", value: bill.topClc.name, sub: pct(bill.topClc.value, bill.loans) },
      { label: "最爱作者", value: bill.topAuthor.name || "—", sub: bill.topAuthor.value ? bill.topAuthor.value + " 次" : "" },
      { label: "活跃月份", value: bill.activeMonths + " 个月", sub: bill.firstDate + " ~ " + bill.lastDate },
      { label: "阅读高峰月", value: bill.peakMonth.month + " 月", sub: bill.peakMonth.value + " 次" },
      { label: "阅读高峰时段", value: bill.peakHour.hour + ":00", sub: bill.peakDow.name + "最常借" },
      { label: "读过书目", value: bill.uniqueTitles + " 种", sub: "涉猎 " + bill.uniqueLibs + " 个馆点" },
      { label: "期刊占比", value: bill.periShare, sub: "纸质期刊借阅" },
    ];
    stats.forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "bill-stat";
      cell.innerHTML =
        "<div class=\"bill-stat-label\">" +
        s.label +
        "</div><div class=\"bill-stat-value\">" +
        s.value +
        "</div><div class=\"bill-stat-sub\">" +
        s.sub +
        "</div>";
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);

    const charts = document.createElement("div");
    charts.className = "bill-charts";
    charts.innerHTML =
      "<div class=\"bill-chart-box\"><h4>月度借阅</h4><div id=\"billMonthChart\" class=\"bill-mini-chart\"></div></div>" +
      "<div class=\"bill-chart-box\"><h4>时段偏好</h4><div id=\"billHourChart\" class=\"bill-mini-chart\"></div></div>";
    wrap.appendChild(charts);

    const books = document.createElement("div");
    books.className = "bill-books";
    books.innerHTML = "<h4>年度书单 Top5</h4>";
    const ol = document.createElement("ol");
    bill.topTitles.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML =
        "<span class=\"bill-rank\">" +
        (i + 1) +
        "</span><span class=\"bill-book-name\">" +
        t.name +
        "</span><span class=\"bill-book-count\">" +
        t.value +
        " 次</span>";
      ol.appendChild(li);
    });
    books.appendChild(ol);
    wrap.appendChild(books);

    const foot = document.createElement("footer");
    foot.className = "bill-footer";
    foot.textContent = "图书借阅可视分析系统 · 数据截至 2025 年 · 账单仅供个人阅读回顾";
    wrap.appendChild(foot);

    el.appendChild(wrap);

    renderMiniBars(document.getElementById("billMonthChart"), bill.months, (i) => i + 1 + "月", "#0284c7");
    renderMiniBars(
      document.getElementById("billHourChart"),
      bill.hours,
      (i) => bill.hourLabels[i] + "h",
      "#059669"
    );
  }

  function renderMiniBars(el, data, labelFn, color) {
    if (!el) return;
    const margin = { top: 8, right: 8, bottom: 22, left: 28 };
    const width = Math.max(el.clientWidth || 280, 200);
    const height = 120;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3
      .select(el)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => i))
      .range([0, innerW])
      .padding(0.15);
    const maxV = d3.max(data) || 1;
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([innerH, 0]);

    g.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (_, i) => x(i))
      .attr("y", (d) => y(d))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d))
      .attr("rx", 3)
      .attr("fill", (d) => (d === maxV ? "#d97706" : color))
      .attr("opacity", 0.9);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((i) => labelFn(i))
          .ticks(data.length > 12 ? 6 : data.length)
      )
      .selectAll("text")
      .attr("fill", "#64748b")
      .attr("font-size", 8);
    g.append("g")
      .call(d3.axisLeft(y).ticks(3))
      .selectAll("text")
      .attr("fill", "#64748b")
      .attr("font-size", 8);
  }

  function bindUI(opts) {
    const overlay = document.getElementById("billOverlay");
    const paper = document.getElementById("billPaper");
    const input = document.getElementById("billRid");
    const hint = document.getElementById("billSearchHint");
    const index = opts.index;

    function openBill(rid) {
      const bill = compute(rid, index);
      if (!bill) {
        if (hint) hint.textContent = "未找到读者编号 " + rid;
        return;
      }
      if (hint) hint.textContent = "";
      renderPaper(paper, bill);
      overlay.classList.remove("hidden");
      document.body.classList.add("bill-open");
    }

    document.getElementById("btnBillGen").onclick = () => {
      const v = input.value.trim();
      if (!v) {
        if (hint) hint.textContent = "请输入读者编号";
        return;
      }
      openBill(v);
    };

    document.getElementById("btnBillRandom").onclick = () => {
      const ids = Array.from(index.readers.keys());
      const rid = ids[Math.floor(Math.random() * ids.length)];
      input.value = String(rid);
      openBill(rid);
    };

    document.getElementById("btnBillClose").onclick = () => {
      overlay.classList.add("hidden");
      document.body.classList.remove("bill-open");
    };

    document.getElementById("btnBillPrint").onclick = () => window.print();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("hidden");
        document.body.classList.remove("bill-open");
      }
    });

    // 热门读者快捷入口
    const hotEl = document.getElementById("billHotReaders");
    if (hotEl) {
      const hot = Array.from(index.readers.values())
        .sort((a, b) => b.loans - a.loans)
        .slice(0, 6);
      hot.forEach((r) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bill-hot-chip";
        btn.textContent = "#" + r.rid + "（" + r.loans + "次）";
        btn.onclick = () => {
          input.value = String(r.rid);
          openBill(r.rid);
        };
        hotEl.appendChild(btn);
      });
    }
  }

  return { buildIndex, compute, renderPaper, bindUI };
})();
