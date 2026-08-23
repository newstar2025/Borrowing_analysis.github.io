window.Charts = (function () {
  const DOW = window.LoanData.DOW;

  function ui() {
    const r = document.documentElement;
    const v = (name) => getComputedStyle(r).getPropertyValue(name).trim();
    return {
      text: v("--text") || "#1e293b",
      muted: v("--muted") || "#64748b",
      label: v("--chart-label") || "#475569",
      tooltipBg: v("--tooltip-bg") || "rgba(255,255,255,0.98)",
      tooltipBorder: v("--tooltip-border") || "rgba(15,23,42,0.12)",
      empty: v("--chart-empty") || "rgba(148,163,184,0.22)",
      dayStroke: v("--day-stroke") || "rgba(15,23,42,0.18)",
      monthBg: v("--month-bg") || "rgba(15,23,42,0.03)",
      monthSelBg: v("--month-sel-bg") || "rgba(245,158,11,0.12)",
      weekendBg: v("--weekend-bg") || "rgba(148,163,184,0.14)",
      grid: v("--chart-grid") || "rgba(15,23,42,0.08)",
      starDim: v("--star-dim") || "rgba(148,163,184,0.35)",
      accent2: v("--accent-2") || "#d97706",
    };
  }

  function toggleDim(key, value) {
    AppState.toggle(key, value);
  }

  function dimActive(key, value) {
    return AppState.get()[key] === value;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function empty(el, msg) {
    clear(el);
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = msg || "当前选择无数据";
    el.appendChild(d);
  }

  function tip(svg) {
    const C = ui();
    const g = svg.append("g").attr("class", "tip").style("display", "none").style("pointer-events", "none");
    g.append("rect").attr("rx", 8).attr("fill", C.tooltipBg).attr("stroke", C.tooltipBorder);
    const text = g.append("text").attr("fill", C.text).attr("font-size", 11).attr("x", 10).attr("y", 0);
    return {
      show(x, y, lines) {
        const arr = Array.isArray(lines) ? lines : String(lines).split("\n");
        g.style("display", null);
        text.selectAll("tspan").remove();
        arr.forEach((line, i) => {
          if (!line) return;
          text
            .append("tspan")
            .attr("x", 10)
            .attr("dy", i === 0 ? 16 : 15)
            .attr("fill", i === 0 ? C.text : C.muted)
            .text(line);
        });
        const b = text.node().getBBox();
        g.select("rect").attr("x", b.x - 8).attr("y", b.y - 8).attr("width", b.width + 16).attr("height", b.height + 14);
        const tx = Math.min(Math.max(4, x), (+svg.attr("viewBox").split(" ")[2] || 400) - b.width - 24);
        g.attr("transform", `translate(${tx},${Math.max(4, y)})`);
        g.raise();
      },
      hide() {
        g.style("display", "none");
      },
    };
  }

  function starPath(size) {
    // 五角星 path，中心在 0,0
    const r = size;
    const r2 = size * 0.45;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (-Math.PI / 2) + (i * 2 * Math.PI) / 5;
      const b = a + Math.PI / 5;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      pts.push([Math.cos(b) * r2, Math.sin(b) * r2]);
    }
    return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
  }

  function starCount(value, maxV) {
    if (!maxV) return 1;
    const ratio = value / maxV;
    if (ratio >= 0.85) return 5;
    if (ratio >= 0.65) return 4;
    if (ratio >= 0.4) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  }

  function pct(v, total) {
    return total ? ((v / total) * 100).toFixed(1) + "%" : "0%";
  }

  function hexPath(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
  }

  function dowCountInMonth(month, dow) {
    const end = new Date(2025, month, 0).getDate();
    let n = 0;
    for (let d = 1; d <= end; d++) {
      const js = new Date(2025, month - 1, d).getDay();
      const ourDow = js === 0 ? 6 : js - 1;
      if (ourDow === dow) n++;
    }
    return n;
  }

  function dayOfMonthFromDate(dateStr) {
    return Number(String(dateStr).slice(8, 10));
  }

  // ---------- 馆点图例 ----------
  function renderLibLegend(typeEl, nameEl, rows, state) {
    clear(typeEl);
    clear(nameEl);

    const typeCounts = d3.rollup(rows, (v) => v.length, (d) => d.libType || "其他网点");
    const types = Array.from(typeCounts, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);

    function addChip(parent, label, color, active, dim, onClick, isAll) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (active ? " active" : "") + (dim ? " dim" : "") + (isAll ? " all" : "");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(label));
      btn.onclick = onClick;
      parent.appendChild(btn);
    }

    addChip(
      typeEl,
      "全部大类",
      "#f59e0b",
      !state.libType,
      false,
      () => AppState.set({ libType: null, library: null }),
      true
    );
    types.forEach((t) => {
      addChip(
        typeEl,
        `${t.k}（${t.v.toLocaleString()}）`,
        LoanData.colorOfType(t.k),
        state.libType === t.k,
        state.libType && state.libType !== t.k,
        () => AppState.set({ libType: t.k, library: null })
      );
    });

    // 二级：当前大类下全部馆，或全部大类时按借阅量 Top + 其余可滚动全量
    const libMeta = new Map();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.lib) continue;
      let o = libMeta.get(r.lib);
      if (!o) {
        o = { lib: r.lib, count: 0, libType: r.libType || "其他网点" };
        libMeta.set(r.lib, o);
      }
      o.count += 1;
    }
    let libs = Array.from(libMeta.values()).sort((a, b) => b.count - a.count);

    if (state.libType) {
      libs = libs.filter((d) => d.libType === state.libType);
    }

    addChip(
      nameEl,
      "全部馆点",
      "#fbbf24",
      !state.library,
      false,
      () => AppState.set({ library: null }),
      true
    );

    libs.forEach((d, i) => {
      addChip(
        nameEl,
        `${d.lib}（${d.count}）`,
        LoanData.colorOfType(d.libType),
        state.library === d.lib,
        state.library && state.library !== d.lib,
        () => AppState.set({ library: d.lib, libType: d.libType })
      );
    });
  }

  // ---------- 12 月热力日历 ----------
  function renderCalendar(el, rows, state) {
    clear(el);
    if (!rows.length) return empty(el);
    const C = ui();

    const byDate = d3.rollup(rows, (v) => v.length, (d) => d.date);
    const maxV = d3.max(byDate.values()) || 1;
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxV]);

    // 每月一行；按星期对齐（周一为第1列），月初空位留白
    const hostW = Math.max(el.clientWidth || 0, 720);
    const padX = 8;
    const padY = 8;
    const legendH = 48;
    const labelW = 88;
    const sumW = 90;
    const headerH = 36;
    const rowGap = 8;
    // 最多：月初偏移6 + 31天 = 37 格，按 6 周×7=42 预留更稳
    const maxCols = 42;
    const usable = hostW - padX * 2 - labelW - sumW - 8;
    const gap = 2;
    const cell = Math.max(12, Math.min(24, Math.floor((usable - gap * (maxCols - 1)) / maxCols)));
    const rowH = cell + 12;
    const width = hostW;
    const height = padY * 2 + headerH + 12 * rowH + 11 * rowGap + legendH;
    const months = d3.range(1, 13);
    const dowShort = ["一", "二", "三", "四", "五", "六", "日"]; // 周一→周日

    const layouts = months.map((m) => {
      const endDay = new Date(2025, m, 0).getDate();
      const first = new Date(2025, m - 1, 1);
      // JS: 0=Sun..6=Sat → 0=Mon..6=Sun
      const js = first.getDay();
      const startDow = js === 0 ? 6 : js - 1;
      const days = [];
      for (let d = 1; d <= endDay; d++) {
        const iso = d3.timeFormat("%Y-%m-%d")(new Date(2025, m - 1, d));
        days.push({
          day: d,
          date: iso,
          col: startDow + d - 1,
          value: byDate.get(iso) || 0,
        });
      }
      return { m, days, startDow, sum: d3.sum(days, (x) => x.value) };
    });

    const peakSum = d3.max(layouts, (L) => L.sum) || 0;
    const usedCols = d3.max(layouts, (L) => d3.max(L.days, (d) => d.col) + 1) || 31;

    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const gridX = padX + labelW;
    const gridTop = padY + headerH;
    const gridBottom = gridTop + 12 * rowH + 11 * rowGap;
    const gridRight = gridX + usedCols * (cell + gap) - gap;

    // 周六、周日列浅色背景（列索引 %7：5=周六 6=周日）
    const weekendBg = svg.append("g").attr("class", "weekend-bg").style("pointer-events", "none");
    d3.range(usedCols).forEach((col) => {
      if (col % 7 < 5) return;
      weekendBg
        .append("rect")
        .attr("x", gridX + col * (cell + gap) - 1)
        .attr("y", gridTop - 6)
        .attr("width", cell + gap + 2)
        .attr("height", gridBottom - gridTop + 12)
        .attr("fill", C.weekendBg)
        .attr("rx", 4);
    });

    const holidayMap = window.Holidays ? Holidays.dateMap() : new Map();
    const hexR = cell * 0.46;

    // 纵横高亮层（置于日格下方）
    const cross = svg.append("g").attr("class", "heat-crosshair").style("pointer-events", "none");
    const crossCol = cross
      .append("rect")
      .attr("class", "cross-col")
      .attr("y", gridTop - 4)
      .attr("height", gridBottom - gridTop + 8)
      .attr("width", cell + 4)
      .attr("rx", 4)
        .attr("fill", "rgba(2, 132, 199, 0.1)")
      .attr("stroke", "rgba(2, 132, 199, 0.28)")
      .style("display", "none");
    const crossRow = cross
      .append("rect")
      .attr("class", "cross-row")
      .attr("x", padX - 2)
      .attr("width", width - padX * 2 + 4)
      .attr("height", rowH)
      .attr("rx", 8)
        .attr("fill", "rgba(245, 158, 11, 0.1)")
      .attr("stroke", "rgba(245, 158, 11, 0.35)")
      .style("display", "none");

    function showCross(rowIdx, col) {
      crossRow
        .attr("y", gridTop + rowIdx * (rowH + rowGap))
        .style("display", null);
      crossCol
        .attr("x", gridX + col * (cell + gap) - 2)
        .style("display", null);
    }
    function hideCross() {
      crossRow.style("display", "none");
      crossCol.style("display", "none");
    }

    const t = tip(svg);

    // 顶部分两行：周次感 + 一二三四五六日循环
    const header = svg.append("g").attr("transform", `translate(0,${padY})`);
    header
      .append("text")
      .attr("x", padX)
      .attr("y", 22)
      .attr("fill", C.muted)
      .attr("font-size", 11)
      .text("月份");

    d3.range(usedCols).forEach((col) => {
      header
        .append("text")
        .attr("x", gridX + col * (cell + gap) + cell / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("fill", col % 7 >= 5 ? "#d97706" : ui().muted)
        .attr("font-size", 10)
        .text(dowShort[col % 7]);
    });

    layouts.forEach((L, idx) => {
      const y0 = padY + headerH + idx * (rowH + rowGap);
      const g = svg.append("g").attr("transform", `translate(0,${y0})`);
      const selectedMonth = state.month === L.m && !state.date;
      const isPeak = L.sum === peakSum && peakSum > 0;

      g.append("rect")
        .attr("class", "month-bg")
        .attr("x", padX - 2)
        .attr("y", 0)
        .attr("width", width - padX * 2 + 4)
        .attr("height", rowH)
        .attr("rx", 8)
        .attr("fill", selectedMonth ? C.monthSelBg : C.monthBg)
        .attr("stroke", selectedMonth ? "rgba(245,158,11,0.4)" : C.grid);

      const label = g
        .append("text")
        .attr("class", "month-label" + (selectedMonth ? " active" : ""))
        .attr("x", padX + 10)
        .attr("y", rowH / 2 + 5)
        .attr("font-size", 14)
        .attr("font-weight", selectedMonth ? 700 : 600)
        .style("cursor", "pointer")
        .text(L.m + "月");
      label.on("click", (event) => {
        event.stopPropagation();
        if (state.month === L.m && !state.date) AppState.set({ month: null, date: null });
        else AppState.set({ month: L.m, date: null });
      });

      // 月合计；最高月前加火焰图标
      const sumText = (isPeak ? "🔥 " : "") + L.sum.toLocaleString();
      g.append("text")
        .attr("x", width - padX - 6)
        .attr("y", rowH / 2 + 5)
        .attr("text-anchor", "end")
        .attr("fill", isPeak ? "#ea580c" : C.muted)
        .attr("font-size", isPeak ? 13 : 12)
        .attr("font-weight", isPeak ? 700 : 400)
        .text(sumText);

      // 月初星期空位（浅底矩形）
      if (L.startDow > 0) {
        g.selectAll("rect.pad")
          .data(d3.range(L.startDow))
          .join("rect")
          .attr("x", (i) => gridX + i * (cell + gap))
          .attr("y", (rowH - cell) / 2)
          .attr("width", cell)
          .attr("height", cell)
          .attr("rx", 3)
          .attr("fill", "rgba(148,163,184,0.08)")
          .attr("stroke", C.grid)
          .on("mouseenter", function (event, i) {
            showCross(idx, i);
          })
          .on("mouseleave", hideCross);
      }

      function bindDayEvents(node, d) {
        node
          .on("mouseenter", function () {
            showCross(idx, d.col);
          })
          .on("mousemove", function (event) {
            showCross(idx, d.col);
            const [x, y] = d3.pointer(event, svg.node());
            const wd = dowShort[d.col % 7];
            const hol = holidayMap.get(d.date);
            const lines = [`${L.m}月${d.day}日（周${wd}）· ${d.value} 次`];
            if (hol) lines.push(`节假日：${hol.name}`);
            t.show(x + 12, y - 10, lines);
          })
          .on("mouseleave", function () {
            hideCross();
            t.hide();
          })
          .on("click", (event) => {
            event.stopPropagation();
            if (state.date === d.date) AppState.set({ date: null });
            else AppState.set({ date: d.date, month: L.m });
          });
      }

      const dayFill = (d) => (d.value ? color(d.value) : C.empty);

      // 普通日格：矩形
      g.selectAll("rect.day")
        .data(L.days.filter((d) => !holidayMap.has(d.date)))
        .join("rect")
        .attr("class", "day-cell")
        .attr("x", (d) => gridX + d.col * (cell + gap))
        .attr("y", (rowH - cell) / 2)
        .attr("width", cell)
        .attr("height", cell)
        .attr("rx", 4)
        .attr("fill", dayFill)
        .attr("stroke", C.dayStroke)
        .attr("stroke-width", 1)
        .classed("active", (d) => state.date === d.date)
        .each(function (d) {
          bindDayEvents(d3.select(this), d);
        });

      // 节假日日格：六边形
      g.selectAll("path.day")
        .data(L.days.filter((d) => holidayMap.has(d.date)))
        .join("path")
        .attr("class", "day-cell holiday")
        .attr("d", (d) => {
          const cx = gridX + d.col * (cell + gap) + cell / 2;
          const cy = rowH / 2;
          return hexPath(cx, cy, hexR);
        })
        .attr("fill", dayFill)
        .attr("stroke", "#7c3aed")
        .attr("stroke-width", 1.5)
        .classed("active", (d) => state.date === d.date)
        .each(function (d) {
          bindDayEvents(d3.select(this), d);
        });
    });

    // 十字准星置于日格之上，便于看见纵横引导
    cross.raise();
    svg.select("g.tip").raise();

    const lg = svg.append("g").attr("transform", `translate(${padX},${height - 28})`);
    const defs = svg.append("defs");
    const gradId = "heatGrad-" + Math.random().toString(36).slice(2, 8);
    const grad = defs.append("linearGradient").attr("id", gradId);
    grad.append("stop").attr("offset", "0%").attr("stop-color", color(0));
    grad.append("stop").attr("offset", "100%").attr("stop-color", color(maxV));
    lg.append("text").attr("x", 0).attr("y", 10).attr("fill", C.muted).attr("font-size", 11).text("借阅量");
    lg.append("rect").attr("x", 48).attr("y", 2).attr("width", 180).attr("height", 10).attr("rx", 5).attr("fill", `url(#${gradId})`);
    lg.append("text").attr("x", 48).attr("y", -2).attr("fill", C.muted).attr("font-size", 10).text("少");
    lg.append("text")
      .attr("x", 228)
      .attr("y", -2)
      .attr("text-anchor", "end")
      .attr("fill", C.muted)
      .attr("font-size", 10)
      .text("多 · 峰值 " + maxV);
    lg.append("text")
      .attr("x", 250)
      .attr("y", 10)
      .attr("fill", C.muted)
      .attr("font-size", 11)
      .text("矩形=平日 · 六边形=节假日 · 🔥=全年最高月");
  }

  // ---------- 时段：合计 + 日均 ----------
  function hourSeries(rows) {
    const byHour = d3.rollup(rows, (v) => v.length, (d) => d.hour);
    const days = new Set(rows.map((r) => r.date)).size || 1;
    return d3.range(7, 22).map((h) => {
      const total = byHour.get(h) || 0;
      return { hour: h, total, avg: total / days, days };
    });
  }

  function renderHourBars(el, data, valueKey, color, labelUnit, state, hourFilter) {
    clear(el);
    if (!data.length || !d3.max(data, (d) => d[valueKey])) return empty(el, "无时段数据");

    const margin = { top: 14, right: 12, bottom: 28, left: 40 };
    const width = Math.max(el.clientWidth || 360, 280);
    const height = 170;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const x = d3.scaleBand().domain(data.map((d) => d.hour)).range([0, innerW]).padding(0.2);
    const maxV = d3.max(data, (d) => d[valueKey]) || 1;
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([innerH, 0]);
    const peak = data.filter((d) => d[valueKey] === maxV);

    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat((d) => d + "h"))
      .selectAll("text").attr("fill", ui().muted).attr("font-size", 9);
    g.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").attr("fill", ui().muted).attr("font-size", 9);

    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar chart-click")
      .attr("x", (d) => x(d.hour))
      .attr("y", (d) => y(d[valueKey]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d[valueKey]))
      .attr("rx", 3)
      .attr("fill", (d) => {
        if (hourFilter && dimActive("hour", d.hour)) return "#d97706";
        return d[valueKey] === maxV ? "#f59e0b" : color;
      })
      .attr("opacity", 0.92)
      .attr("stroke", (d) => (hourFilter && dimActive("hour", d.hour) ? "#d97706" : "none"))
      .attr("stroke-width", (d) => (hourFilter && dimActive("hour", d.hour) ? 2 : 0))
      .style("cursor", hourFilter ? "pointer" : "default")
      .on("click", function (event, d) {
        if (!hourFilter) return;
        event.stopPropagation();
        toggleDim("hour", d.hour);
      })
      .on("mousemove", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke", "#0f172a").attr("stroke-width", 1);
        const [mx, my] = d3.pointer(event, svg.node());
        const lines = [
          `${d.hour}:00–${d.hour}:59`,
          `${labelUnit} ${valueKey === "avg" ? d.avg.toFixed(1) : d.total.toLocaleString()}`,
          d[valueKey] === maxV ? "★ 当前范围高峰时段" : `占比 ${pct(d.total, d3.sum(data, (x) => x.total))}`,
        ];
        if (hourFilter) lines.push("点击筛选该时段 · 联动全页");
        ttip.show(mx + 10, my - 8, lines);
      })
      .on("mouseleave", function (event, d) {
        const active = hourFilter && dimActive("hour", d.hour);
        d3.select(this)
          .attr("opacity", 0.92)
          .attr("stroke", active ? "#d97706" : "none")
          .attr("stroke-width", active ? 2 : 0);
        ttip.hide();
      });

    peak.forEach((d) => {
      g.append("text")
        .attr("x", x(d.hour) + x.bandwidth() / 2)
        .attr("y", y(d[valueKey]) - 4)
        .attr("text-anchor", "middle")
        .attr("fill", "#fbbf24")
        .attr("font-size", 10)
        .text("★");
    });
  }

  function renderHours(chartEl, hintEl, titleEl, calRows, state) {
    let scope = calRows;
    let title = "全年 · 小时合计";
    let hint = "默认全年小时合计 · 点击热力图某一天查看当日小时分布";

    if (state.date) {
      scope = calRows.filter((r) => r.date === state.date);
      title = state.date + " · 当日小时分布";
      hint = "当前：选中日期 · 再次点击同日可恢复全年";
    } else if (state.gender || state.ageBand || state.clc || state.dow) {
      hint = "已联动人群/类别等筛选 · 点击柱筛选时段";
    }

    titleEl.textContent = title;
    hintEl.textContent = hint + " · 点击柱联动全页";

    const data = hourSeries(scope);
    const hourFilter = !state.date;
    renderHourBars(chartEl, data, "total", "#0284c7", "借阅", state, hourFilter);
  }

  // ---------- 周几：星级忙碌度 ----------
  function renderDow(el, calRows, state, hintEl) {
    clear(el);
    if (!calRows.length) return empty(el);

    let rows = calRows;
    let useAvg = false;
    let modeLabel = "全年合计";

    if (state.month && !state.date) {
      rows = calRows.filter((r) => r.month === state.month);
      useAvg = true;
      modeLabel = state.month + "月 · 周平均";
    }

    if (hintEl) {
      const base =
        useAvg
          ? modeLabel + " · 柱高为当月各星期几的日均借阅"
          : "全年合计 · 点击柱筛选该星期 · 联动热力图与时段";
      hintEl.textContent = base;
    }

    const total = useAvg ? null : rows.length;
    const data = d3.range(7).map((dow) => {
      const raw = rows.filter((r) => r.dow === dow).length;
      const count = useAvg ? raw / (dowCountInMonth(state.month, dow) || 1) : raw;
      return { dow, name: DOW[dow], count, raw };
    });
    const maxV = d3.max(data, (d) => d.count) || 1;
    data.forEach((d) => {
      d.stars = starCount(d.count, maxV);
      d.share = useAvg ? null : pct(d.raw, total);
      d.label = useAvg ? d.count.toFixed(1) : d.raw.toLocaleString();
    });

    const margin = { top: 16, right: 12, bottom: 48, left: 40 };
    const width = Math.max(el.clientWidth || 360, 280);
    const height = 240;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const x = d3.scaleBand().domain(data.map((d) => d.name)).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([innerH, 0]);

    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x))
      .selectAll("text").attr("fill", ui().muted);
    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("fill", ui().muted);

    g.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("class", "chart-click")
      .attr("x", (d) => x(d.name))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d.count))
      .attr("rx", 6)
      .attr("fill", (d) => {
        if (dimActive("dow", d.dow)) return "#d97706";
        return d.stars >= 5 ? "#f59e0b" : "#0284c7";
      })
      .attr("stroke", (d) => (dimActive("dow", d.dow) ? "#d97706" : "none"))
      .attr("stroke-width", (d) => (dimActive("dow", d.dow) ? 2 : 0))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        toggleDim("dow", d.dow);
      })
      .on("mousemove", function (event, d) {
        d3.select(this).attr("stroke", "#0f172a").attr("stroke-width", 1.5);
        const [mx, my] = d3.pointer(event, svg.node());
        ttip.show(mx + 10, my - 8, [
          d.name,
          useAvg ? `周平均 ${d.label} 次/天` : `借阅 ${d.label}（${d.share}）`,
          `忙碌星级 ${"★".repeat(d.stars)}${"☆".repeat(5 - d.stars)}`,
          "点击筛选该星期 · 联动全页",
        ]);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", "none");
        ttip.hide();
      });

    data.forEach((d) => {
      const gx = g.append("g").attr("transform", `translate(${x(d.name) + x.bandwidth() / 2},${innerH + 28})`);
      for (let i = 0; i < 5; i++) {
        gx.append("path")
          .attr("d", starPath(5))
          .attr("transform", `translate(${(i - 2) * 11},0)`)
          .attr("fill", i < d.stars ? "#fbbf24" : ui().starDim);
      }
    });
  }

  // ---------- 借阅河流图 + 可点图例 ----------
  function renderRiver(el, rows, state, hintEl) {
    clear(el);
    if (!rows.length) return empty(el);

    let scope = rows;
    let mode = "year";
    let xLabel = (d) => d + "月";

    if (state.date) {
      scope = rows.filter((r) => r.date === state.date);
      mode = "day";
      xLabel = (d) => d + "h";
      if (hintEl) hintEl.textContent = state.date + " · 按小时中图法河流";
    } else if (state.month) {
      scope = rows.filter((r) => r.month === state.month);
      mode = "month";
      xLabel = (d) => d + "日";
      if (hintEl) hintEl.textContent = state.month + "月 · 按日中图法河流";
    } else if (hintEl) {
      hintEl.textContent = state.clc
        ? "已筛选类别 " + state.clc + " · 点击图例切换/取消"
        : "默认全年 · 点击月名/日格或图例类别联动";
    }

    if (!scope.length) return empty(el, "当前范围无数据");

    let keys;
    let keyAccessor;
    if (mode === "year") {
      keys = d3.range(1, 13);
      keyAccessor = (d) => d.month;
    } else if (mode === "month") {
      const endDay = new Date(2025, state.month, 0).getDate();
      keys = d3.range(1, endDay + 1);
      keyAccessor = (d) => dayOfMonthFromDate(d.date);
    } else {
      keys = d3.range(7, 22);
      keyAccessor = (d) => d.hour;
    }

    const counts = d3.rollup(
      scope.filter((r) => r.clc),
      (v) => v.length,
      (d) => d.clc,
      keyAccessor
    );
    const topMeta = Array.from(counts, ([clc, m]) => ({
      clc,
      total: d3.sum(m.values()),
    }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    const topClc = topMeta.map((d) => d.clc);
    if (!topClc.length) return empty(el, "无中图法数据");

    const stackData = keys.map((k) => {
      const o = { x: k };
      topClc.forEach((c) => {
        const mm = counts.get(c);
        o[c] = mm && mm.get(k) ? mm.get(k) : 0;
      });
      return o;
    });

    const stacked = d3.stack().keys(topClc).order(d3.stackOrderInsideOut).offset(d3.stackOffsetWiggle)(stackData);
    const margin = { top: 28, right: 12, bottom: 28, left: 28 };
    const width = Math.max(el.clientWidth || 360, 280);
    const height = 250;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const xMin = d3.min(keys);
    const xMax = d3.max(keys);
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
    const y = d3.scaleLinear()
      .domain([
        d3.min(stacked, (layer) => d3.min(layer, (d) => d[0])),
        d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])),
      ])
      .range([innerH, 0]);
    const area = d3.area()
      .x((d) => x(d.data.x))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    const legend = svg.append("g").attr("transform", `translate(${margin.left},8)`);
    topClc.forEach((c, i) => {
      const lg = legend.append("g").attr("transform", `translate(${i * 52},0)`).style("cursor", "pointer");
      lg.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", LoanData.colorAt(i));
      lg.append("text").attr("x", 14).attr("y", 9).attr("fill", ui().label).attr("font-size", 11).text(c);
      lg.on("mouseenter", () => {
        g.selectAll("path.river").attr("opacity", (d) => (d.key === c ? 1 : 0.18));
      }).on("mouseleave", () => {
        g.selectAll("path.river").attr("opacity", 0.88);
      }).on("click", (event) => {
        event.stopPropagation();
        toggleDim("clc", c);
      });
      if (dimActive("clc", c)) {
        lg.select("rect").attr("stroke", "#d97706").attr("stroke-width", 2);
      }
    });

    g.selectAll("path.river")
      .data(stacked)
      .join("path")
      .attr("class", "river")
      .attr("d", area)
      .attr("fill", (d, i) => LoanData.colorAt(i))
      .attr("opacity", 0.88)
      .on("mousemove", function (event, d) {
        g.selectAll("path.river").attr("opacity", (x) => (x.key === d.key ? 1 : 0.18));
        const [mx, my] = d3.pointer(event, svg.node());
        const meta = topMeta.find((x) => x.clc === d.key);
        ttip.show(mx + 10, my - 8, [
          `中图法 ${d.key}`,
          `当前范围合计 ${meta ? meta.total.toLocaleString() : 0}`,
          "悬停图例可单独高亮该类",
        ]);
      })
      .on("mouseleave", function () {
        g.selectAll("path.river").attr("opacity", 0.88);
        ttip.hide();
      });

    const tickCount = mode === "year" ? 12 : mode === "month" ? Math.min(keys.length, 10) : 8;
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(tickCount).tickFormat(xLabel))
      .selectAll("text")
      .attr("fill", ui().muted)
      .attr("font-size", 9);
  }

  // ---------- 关联矩阵（替代难读平行坐标） ----------
  function renderParallel(el, rows, state) {
    // 实际呈现：年龄段 × 中图法 关联热力 + 悬停详情
    clear(el);
    if (!rows.length) return empty(el);
    const ages = ["19-35青年", "36-50中年", "51-65中老年", "66+老年", "13-18青少年", "0-12儿童"];
    const clcTop = d3.rollups(rows.filter((r) => r.clc), (v) => v.length, (d) => d.clc)
      .sort((a, b) => b[1] - a[1]).slice(0, 7).map((d) => d[0]);
    if (!clcTop.length) return empty(el, "无类目关联数据");

    const cells = [];
    ages.forEach((a) => {
      clcTop.forEach((c) => {
        const v = rows.filter((r) => r.ageBand === a && r.clc === c).length;
        cells.push({ age: a, clc: c, value: v });
      });
    });
    const maxV = d3.max(cells, (d) => d.value) || 1;
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxV]);

    const margin = { top: 28, right: 12, bottom: 36, left: 72 };
    const width = Math.max(el.clientWidth || 360, 300);
    const height = 250;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const x = d3.scaleBand().domain(clcTop).range([0, innerW]).padding(0.08);
    const y = d3.scaleBand().domain(ages).range([0, innerH]).padding(0.08);

    svg.append("text").attr("x", margin.left).attr("y", 16).attr("fill", ui().muted).attr("font-size", 11)
      .text("点击格子筛选年龄+类别 · 联动全页");

    g.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("class", "chart-click")
      .attr("x", (d) => x(d.clc))
      .attr("y", (d) => y(d.age))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", (d) => (d.value ? color(d.value) : ui().empty))
      .attr("stroke", (d) =>
        state.ageBand === d.age && state.clc === d.clc ? "#d97706" : "none")
      .attr("stroke-width", (d) => (state.ageBand === d.age && state.clc === d.clc ? 2 : 0))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        if (state.ageBand === d.age && state.clc === d.clc) {
          AppState.set({ ageBand: null, clc: null });
        } else {
          AppState.set({ ageBand: d.age, clc: d.clc });
        }
      })
      .on("mousemove", function (event, d) {
        if (state.ageBand !== d.age || state.clc !== d.clc) {
          d3.select(this).attr("stroke", "#0f172a").attr("stroke-width", 1.5);
        }
        const [mx, my] = d3.pointer(event, svg.node());
        ttip.show(mx + 10, my - 8, [
          `${d.age} × ${d.clc}`,
          `借阅 ${d.value.toLocaleString()}`,
          `相对峰值 ${pct(d.value, maxV)}`,
          "点击筛选该交叉人群",
        ]);
      })
      .on("mouseleave", function (event, d) {
        const active = state.ageBand === d.age && state.clc === d.clc;
        d3.select(this).attr("stroke", active ? "#d97706" : "none").attr("stroke-width", active ? 2 : 0);
        ttip.hide();
      });

    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x))
      .selectAll("text").attr("fill", ui().muted).attr("font-size", 10);
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("fill", ui().muted).attr("font-size", 9);
  }

  // ---------- 中图法：条形 + 星级 ----------
  function renderClcStars(el, items, filterKey) {
    clear(el);
    if (!items.length) return empty(el);
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const maxV = d3.max(sorted, (d) => d.value) || 1;
    const total = d3.sum(sorted, (d) => d.value);
    sorted.forEach((d) => {
      d.stars = starCount(d.value, maxV);
      d.share = pct(d.value, total);
    });

    const margin = { top: 8, right: 16, bottom: 8, left: 48 };
    const width = Math.max(el.clientWidth || 360, 280);
    const rowH = 26;
    const height = 20 + sorted.length * rowH;
    const innerW = width - margin.left - margin.right - 90;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const x = d3.scaleLinear().domain([0, maxV]).range([0, Math.max(innerW, 80)]);

    sorted.forEach((d, i) => {
      const gy = g.append("g").attr("transform", `translate(0,${i * rowH})`).style("cursor", "pointer");
      const active = filterKey && dimActive(filterKey, d.name);
      gy.append("text").attr("x", -8).attr("y", 14).attr("text-anchor", "end")
        .attr("fill", active ? "#d97706" : ui().label).attr("font-size", 12).attr("font-weight", active ? 700 : 400).text(d.name);
      gy.append("rect")
        .attr("x", 0)
        .attr("y", 4)
        .attr("height", 14)
        .attr("width", x(d.value))
        .attr("rx", 4)
        .attr("fill", active ? "#d97706" : LoanData.colorAt(i))
        .on("click", (event) => {
          event.stopPropagation();
          if (filterKey) toggleDim(filterKey, d.name);
        })
        .on("mousemove", function (event) {
          const [mx, my] = d3.pointer(event, svg.node());
          ttip.show(mx + 10, my - 8, [
            `中图法 ${d.name}`,
            `借阅 ${d.value.toLocaleString()}（${d.share}）`,
            `热度 ${"★".repeat(d.stars)}`,
            "点击筛选该类 · 联动全页",
          ]);
        })
        .on("mouseleave", () => ttip.hide());
      const sg = gy.append("g").attr("transform", `translate(${innerW + 18},11)`);
      for (let s = 0; s < 5; s++) {
        sg.append("path")
          .attr("d", starPath(5))
          .attr("transform", `translate(${s * 12},0)`)
          .attr("fill", s < d.stars ? "#fbbf24" : ui().starDim);
      }
    });
  }

  // ---------- 馆藏类型：异形图例 ----------
  function renderItemGlyph(el, items) {
    clear(el);
    if (!items.length) return empty(el);
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const maxV = d3.max(sorted, (d) => d.value) || 1;
    const total = d3.sum(sorted, (d) => d.value);
    const shapes = ["circle", "square", "diamond", "triangle", "hex", "star", "circle", "square"];
    const width = Math.max(el.clientWidth || 360, 280);
    const height = 40 + sorted.length * 34;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const ttip = tip(svg);
    const size = d3.scaleSqrt().domain([0, maxV]).range([8, 22]);

    sorted.forEach((d, i) => {
      const y = 28 + i * 34;
      const active = dimActive("itemType", d.name);
      const g = svg.append("g").attr("transform", `translate(28,${y})`).style("cursor", "pointer");
      const r = size(d.value);
      const fill = active ? "#d97706" : LoanData.colorAt(i + 2);
      const shape = shapes[i % shapes.length];
      let mark;
      if (shape === "circle") mark = g.append("circle").attr("r", r).attr("fill", fill);
      else if (shape === "square") mark = g.append("rect").attr("x", -r).attr("y", -r).attr("width", r * 2).attr("height", r * 2).attr("rx", 3).attr("fill", fill);
      else if (shape === "diamond") mark = g.append("path").attr("d", d3.symbol().type(d3.symbolDiamond).size(r * r * 3)()).attr("fill", fill);
      else if (shape === "triangle") mark = g.append("path").attr("d", d3.symbol().type(d3.symbolTriangle).size(r * r * 3)()).attr("fill", fill);
      else if (shape === "hex") mark = g.append("path").attr("d", d3.symbol().type(d3.symbolWye).size(r * r * 3)()).attr("fill", fill);
      else mark = g.append("path").attr("d", starPath(r)).attr("fill", fill);

      if (active) mark.attr("stroke", "#d97706").attr("stroke-width", 2);
      g.append("text").attr("x", 34).attr("y", 5).attr("fill", ui().text).attr("font-size", 12).text(d.name);
      g.append("text").attr("x", width - 20).attr("y", 5).attr("text-anchor", "end").attr("fill", ui().muted).attr("font-size", 12)
        .text(`${d.value.toLocaleString()} · ${pct(d.value, total)}`);

      g.on("click", (event) => {
        event.stopPropagation();
        toggleDim("itemType", d.name);
      }).on("mousemove", function (event) {
        mark.attr("stroke", "#0f172a").attr("stroke-width", 1.5);
        const [mx, my] = d3.pointer(event, svg.node());
        ttip.show(mx + 10, my - 8, [
          d.name,
          `借阅 ${d.value.toLocaleString()}（${pct(d.value, total)}）`,
          `图例形状：${shape} · 大小∝借阅量`,
          "点击筛选该类型 · 联动全页",
        ]);
      }).on("mouseleave", function () {
        mark.attr("stroke", active ? "#d97706" : "none").attr("stroke-width", active ? 2 : 0);
        ttip.hide();
      });
    });
  }

  // ---------- 星级排行（出版社/作者/书名） ----------
  function renderStarRank(el, items, accent, filterKey) {
    clear(el);
    if (!items.length) return empty(el);
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const maxV = d3.max(sorted, (d) => d.value) || 1;
    const total = d3.sum(sorted, (d) => d.value);
    sorted.forEach((d) => {
      d.stars = starCount(d.value, maxV);
      d.share = pct(d.value, total);
    });

    const width = Math.max(el.clientWidth || 360, 280);
    const rowH = 28;
    const height = 16 + sorted.length * rowH;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const ttip = tip(svg);
    const barW = d3.scaleLinear().domain([0, maxV]).range([0, Math.max(60, width * 0.28)]);

    sorted.forEach((d, i) => {
      const active = filterKey && dimActive(filterKey, d.name);
      const g = svg.append("g").attr("transform", `translate(8,${8 + i * rowH})`).style("cursor", filterKey ? "pointer" : "default");
      g.append("text").attr("x", 0).attr("y", 14).attr("fill", ui().muted).attr("font-size", 11).text(String(i + 1).padStart(2, "0"));
      g.append("text").attr("x", 28).attr("y", 14)
        .attr("fill", active ? "#d97706" : ui().text)
        .attr("font-weight", active ? 700 : 400)
        .attr("font-size", 12)
        .text(d.name.length > 16 ? d.name.slice(0, 16) + "…" : d.name);
      g.append("rect")
        .attr("x", width * 0.42)
        .attr("y", 4)
        .attr("height", 12)
        .attr("width", barW(d.value))
        .attr("rx", 4)
        .attr("fill", active ? "#d97706" : accent || "#a78bfa")
        .attr("opacity", 0.85);
      const sg = g.append("g").attr("transform", `translate(${width - 78},11)`);
      for (let s = 0; s < 5; s++) {
        sg.append("path")
          .attr("d", starPath(5))
          .attr("transform", `translate(${s * 12},0)`)
          .attr("fill", s < d.stars ? "#fbbf24" : ui().starDim);
      }
      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width - 16)
        .attr("height", rowH - 4)
        .attr("fill", "transparent")
        .on("click", (event) => {
          if (!filterKey) return;
          event.stopPropagation();
          toggleDim(filterKey, d.name);
        })
        .on("mousemove", function (event) {
          const [mx, my] = d3.pointer(event, svg.node());
          const lines = [
            d.name,
            `借阅 ${d.value.toLocaleString()}（${d.share}）`,
            `热度星级 ${"★".repeat(d.stars)}${"☆".repeat(5 - d.stars)}`,
          ];
          if (filterKey) lines.push("点击筛选 · 联动全页");
          ttip.show(mx + 10, my - 8, lines);
        })
        .on("mouseleave", () => ttip.hide());
    });
  }

  function topN(rows, key, n, mapFn) {
    const m = d3.rollups(
      rows.filter((r) => {
        const v = mapFn ? mapFn(r) : r[key];
        return v != null && v !== "" && v !== "nan";
      }),
      (v) => v.length,
      (d) => (mapFn ? mapFn(d) : d[key])
    );
    return m
      .map(([name, value]) => ({ name: String(name).slice(0, 28), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }

  function drawCrowdRadar(svg, opts) {
    const {
      cx,
      cy,
      radius,
      axes,
      values,
      categoryTotal,
      fill,
      stroke,
      title,
      ttip,
      mode = "count",
      filterKey = null,
    } = opts;

    const data = axes.map((axis) => {
      const raw = values[axis] || 0;
      const share = categoryTotal ? (raw / categoryTotal) * 100 : 0;
      const plot = mode === "share" ? share : raw;
      return { axis, raw, share, plot };
    });

    const maxV = mode === "share" ? 100 : d3.max(data, (d) => d.plot) || 1;
    const peakPlot = d3.max(data, (d) => d.plot);
    const n = axes.length;
    const angle = d3.scaleLinear().domain([0, n]).range([0, 2 * Math.PI]);
    const rScale = d3.scaleLinear().domain([0, maxV]).range([0, radius]);
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    svg
      .append("text")
      .attr("x", cx)
      .attr("y", cy - radius - 20)
      .attr("text-anchor", "middle")
      .attr("fill", ui().label)
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text(title);

    [0.25, 0.5, 0.75, 1].forEach((t) => {
      g.append("circle")
        .attr("r", radius * t)
        .attr("fill", "none")
        .attr("stroke", "rgba(148,163,184,0.15)")
        .attr("stroke-dasharray", t < 1 ? "2,3" : null);
      if (mode === "share") {
        g.append("text")
          .attr("x", 4)
          .attr("y", -radius * t)
          .attr("dy", "0.35em")
          .attr("fill", "rgba(148,163,184,0.45)")
          .attr("font-size", 8)
          .text(Math.round(t * 100) + "%");
      }
    });

    axes.forEach((axis, i) => {
      const a = angle(i) - Math.PI / 2;
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", Math.cos(a) * radius)
        .attr("y2", Math.sin(a) * radius)
        .attr("stroke", "rgba(148,163,184,0.2)");
      const lx = Math.cos(a) * (radius + 14);
      const ly = Math.sin(a) * (radius + 14);
      const item = data[i];
      const label =
        mode === "share" ? `${axis} ${item.share.toFixed(1)}%` : axis;
      g.append("text")
        .attr("x", lx)
        .attr("y", ly)
        .attr("text-anchor", Math.abs(lx) < 6 ? "middle" : lx > 0 ? "start" : "end")
        .attr("dy", "0.35em")
        .attr("fill", mode === "share" ? stroke : ui().muted)
        .attr("font-size", 10)
        .text(label);
    });

    const line = d3
      .lineRadial()
      .radius((d) => rScale(d.plot))
      .angle((d, i) => angle(i))
      .curve(d3.curveLinearClosed);

    g.append("path")
      .datum(data)
      .attr("d", line)
      .attr("fill", fill)
      .attr("stroke", stroke)
      .attr("stroke-width", 2);

    data.forEach((d, i) => {
      const a = angle(i) - Math.PI / 2;
      const px = Math.cos(a) * rScale(d.plot);
      const py = Math.sin(a) * rScale(d.plot);
      g.append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", filterKey && dimActive(filterKey, d.axis) ? 7 : 4)
        .attr("fill", d.plot === peakPlot ? "#f59e0b" : stroke)
        .attr("stroke", filterKey && dimActive(filterKey, d.axis) ? "#d97706" : "none")
        .attr("stroke-width", filterKey && dimActive(filterKey, d.axis) ? 2 : 0)
        .style("cursor", filterKey ? "pointer" : "default")
        .on("click", function (event) {
          if (!filterKey) return;
          event.stopPropagation();
          toggleDim(filterKey, d.axis);
        })
        .on("mousemove", function (event) {
          d3.select(this).attr("r", 7);
          const [mx, my] = d3.pointer(event, svg.node());
          const tipLines =
            mode === "share"
              ? [
                  `${title} · ${d.axis}`,
                  `占比 ${d.share.toFixed(1)}%`,
                  `借阅 ${d.raw.toLocaleString()}`,
                  d.plot === peakPlot ? "★ 占比最高" : "",
                ]
              : [
                  `${title} · ${d.axis}`,
                  `借阅 ${d.raw.toLocaleString()}（${pct(d.raw, categoryTotal)}）`,
                  d.plot === peakPlot ? "★ 该类峰值" : "",
                ];
          if (filterKey) tipLines.push("点击筛选 · 联动热力图/时段等");
          ttip.show(mx + 10, my - 8, tipLines);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", filterKey && dimActive(filterKey, d.axis) ? 7 : 4);
          ttip.hide();
        });
    });
  }

  function renderCrowd(el, rows, state) {
    clear(el);
    if (!rows.length) return empty(el);

    const genderValues = {};
    let genderTotal = 0;
    rows.forEach((r) => {
      const g = r.gender === "男" || r.gender === "女" ? r.gender : "未知";
      genderValues[g] = (genderValues[g] || 0) + 1;
      genderTotal += 1;
    });
    const genderAxes = ["男", "女"];
    if (genderValues["未知"]) genderAxes.push("未知");

    const ageAxes = ["0-12儿童", "13-18青少年", "19-35青年", "36-50中年", "51-65中老年", "66+老年"];
    const ageValues = {};
    let ageTotal = 0;
    rows.forEach((r) => {
      if (!r.ageBand) return;
      ageValues[r.ageBand] = (ageValues[r.ageBand] || 0) + 1;
      ageTotal += 1;
    });
    if (!ageTotal) ageTotal = rows.length;

    const width = Math.max(el.clientWidth || 360, 280);
    const height = 260;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const ttip = tip(svg);
    const radius = Math.min(width / 2, height) * 0.28;
    const leftCx = width * 0.28;
    const rightCx = width * 0.72;
    const cy = height / 2 + 12;

    drawCrowdRadar(svg, {
      cx: leftCx,
      cy,
      radius,
      axes: genderAxes,
      values: genderValues,
      categoryTotal: genderTotal,
      fill: "rgba(56, 189, 248, 0.28)",
      stroke: "#38bdf8",
      title: "性别（占比）",
      mode: "share",
      filterKey: "gender",
      ttip,
    });

    drawCrowdRadar(svg, {
      cx: rightCx,
      cy,
      radius,
      axes: ageAxes,
      values: ageValues,
      categoryTotal: ageTotal,
      fill: "rgba(52, 211, 153, 0.25)",
      stroke: "#34d399",
      title: "年龄",
      filterKey: "ageBand",
      ttip,
    });

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 4)
      .attr("text-anchor", "middle")
      .attr("fill", ui().muted)
      .attr("font-size", 11)
      .text("点击雷达点筛选人群 · 热力图/时段等联动更新");
  }

  function renderYearArea(el, rows) {
    clear(el);
    const data = d3.rollups(
      rows.filter((r) => r.pubYear && r.pubYear >= 1990 && r.pubYear <= 2025),
      (v) => v.length,
      (d) => d.pubYear
    )
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);
    if (!data.length) return empty(el);
    const total = d3.sum(data, (d) => d.value);
    const maxV = d3.max(data, (d) => d.value) || 1;
    const margin = { top: 16, right: 16, bottom: 28, left: 40 };
    const width = Math.max(el.clientWidth || 360, 280);
    const height = 230;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ttip = tip(svg);
    const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([innerH, 0]);
    const area = d3.area().x((d) => x(d.year)).y0(innerH).y1((d) => y(d.value)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "rgba(56,189,248,0.25)").attr("d", area);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#38bdf8").attr("stroke-width", 2)
      .attr("d", d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX));

    // 近三年区间标注
    const recent = data.filter((d) => d.year >= 2023);
    if (recent.length) {
      g.append("rect")
        .attr("x", x(2023))
        .attr("width", Math.max(0, x(2025) - x(2023)))
        .attr("y", 0)
        .attr("height", innerH)
        .attr("fill", "rgba(251,191,36,0.08)");
      g.append("text").attr("x", x(2023) + 4).attr("y", 12).attr("fill", "#fbbf24").attr("font-size", 10).text("近3年");
    }

    g.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("class", "chart-click")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", (d) => (dimActive("pubYear", d.year) ? 7 : d.value === maxV ? 5 : 3))
      .attr("fill", (d) => {
        if (dimActive("pubYear", d.year)) return "#d97706";
        return d.value === maxV ? "#f59e0b" : "#0284c7";
      })
      .attr("stroke", (d) => (dimActive("pubYear", d.year) ? "#d97706" : "none"))
      .attr("stroke-width", (d) => (dimActive("pubYear", d.year) ? 2 : 0))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        toggleDim("pubYear", d.year);
      })
      .on("mousemove", function (event, d) {
        d3.select(this).attr("r", 8);
        const [mx, my] = d3.pointer(event, svg.node());
        ttip.show(mx + 10, my - 8, [
          `${d.year} 年出版`,
          `借阅 ${d.value.toLocaleString()}（${pct(d.value, total)}）`,
          d.value === maxV ? "★ 出版年峰值" : `热度 ${"★".repeat(starCount(d.value, maxV))}`,
          "点击筛选该出版年 · 联动全页",
        ]);
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).attr("r", dimActive("pubYear", d.year) ? 7 : d.value === maxV ? 5 : 3);
        ttip.hide();
      });

    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")))
      .selectAll("text").attr("fill", ui().muted);
    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("fill", ui().muted);
  }

  return {
    renderLibLegend,
    renderCalendar,
    renderHours,
    renderDow,
    renderRiver,
    renderParallel,
    renderCrowd,
    renderYearArea,
    renderClcStars,
    renderItemGlyph,
    renderStarRank,
    topN,
  };
})();
