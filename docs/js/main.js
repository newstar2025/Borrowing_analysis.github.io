(async function main() {
  const status = document.getElementById("loadStatus");
  const allCount = document.getElementById("allCount");
  const fltCount = document.getElementById("fltCount");
  const crumb = document.getElementById("crumb");

  let allRows = [];

  try {
    status.textContent = "加载数据…";
    const pack = await LoanData.load();
    allRows = pack.rows;
    allCount.textContent = pack.n.toLocaleString();
    await Holidays.load();
    Holidays.renderPanel(document.getElementById("holidayPanel"));
    status.textContent = "就绪";
  } catch (err) {
    status.textContent = "失败";
    alert(err.message || String(err));
    return;
  }

  const baseRows = allRows.filter((r) => !r.peri && !r.ageOutlier);
  const readerIndex = ReaderBill.buildIndex(allRows);
  ReaderBill.bindUI({ index: readerIndex });

  function refresh() {
    const state = AppState.get();
    AppState.renderFilterBar(document.getElementById("filterBar"));
    crumb.textContent = AppState.crumb();

    const calRows = AppState.filterForCalendar(baseRows);
    const linked = AppState.filter(baseRows);
    fltCount.textContent = linked.length.toLocaleString();

    Charts.renderLibLegend(
      document.getElementById("libTypeLegend"),
      document.getElementById("libNameLegend"),
      baseRows,
      state
    );

    Charts.renderCalendar(document.getElementById("calHeat"), calRows, state);

    Charts.renderHours(
      document.getElementById("hourChart"),
      document.getElementById("hourHint"),
      document.getElementById("hourTitle"),
      calRows,
      state
    );

    Charts.renderDow(
      document.getElementById("dowChart"),
      AppState.filter(baseRows, { skip: ["dow"], includeTime: false }),
      state,
      document.getElementById("dowHint")
    );

    Charts.renderRiver(
      document.getElementById("riverChart"),
      calRows,
      state,
      document.getElementById("riverHint")
    );

    Charts.renderParallel(
      document.getElementById("parallelChart"),
      AppState.filter(baseRows, { skip: ["ageBand", "clc"] }),
      state
    );

    Charts.renderCrowd(
      document.getElementById("crowdChart"),
      AppState.filter(baseRows, { skip: ["gender", "ageBand"] }),
      state
    );

    Charts.renderClcStars(
      document.getElementById("clcChart"),
      Charts.topN(AppState.filter(baseRows, { skip: ["clc"] }), "clc", 10),
      "clc"
    );

    Charts.renderItemGlyph(
      document.getElementById("itemChart"),
      Charts.topN(AppState.filter(baseRows, { skip: ["itemType"] }), "itemType", 8)
    );

    Charts.renderYearArea(
      document.getElementById("yearChart"),
      AppState.filter(baseRows, { skip: ["pubYear"] })
    );

    Charts.renderStarRank(
      document.getElementById("pubChart"),
      Charts.topN(AppState.filter(baseRows, { skip: ["publisher"] }), "publisher", 10),
      "#7c3aed",
      "publisher"
    );

    Charts.renderStarRank(
      document.getElementById("authorChart"),
      Charts.topN(AppState.filter(baseRows, { skip: ["author"] }), "author", 10),
      "#d97706",
      "author"
    );

    Charts.renderStarRank(
      document.getElementById("titleChart"),
      Charts.topN(AppState.filter(baseRows, { skip: ["title"] }), "title", 20),
      "#0284c7",
      "title"
    );
  }

  AppState.onChange(refresh);
  Holidays.onChange(refresh);
  document.getElementById("btnReset").onclick = () => AppState.reset();

  status.textContent = "渲染中…";
  await new Promise((r) => setTimeout(r, 30));
  refresh();
  status.textContent = "就绪";
})();
