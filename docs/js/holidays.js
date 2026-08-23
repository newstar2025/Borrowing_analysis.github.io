window.Holidays = (function () {
  const LS_KEY = "web2_holidays_v1";
  let baseEvents = [];
  let customEvents = [];
  let disabledIds = new Set();
  const listeners = [];

  function parseLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      customEvents = Array.isArray(s.custom) ? s.custom : [];
      disabledIds = new Set(Array.isArray(s.disabled) ? s.disabled : []);
    } catch (_) {
      customEvents = [];
      disabledIds = new Set();
    }
  }

  function saveLocal() {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ custom: customEvents, disabled: Array.from(disabledIds) })
    );
    listeners.forEach((fn) => fn());
  }

  async function load() {
    parseLocal();
    const res = await fetch(new URL("data/holidays.json", document.baseURI).href);
    const json = await res.json();
    baseEvents = json.events || [];
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function getAllEvents() {
    return baseEvents.concat(customEvents);
  }

  function isEnabled(ev) {
    if (ev.enabled === false) return false;
    if (disabledIds.has(ev.id)) return false;
    return true;
  }

  function toggleEvent(id) {
    if (disabledIds.has(id)) disabledIds.delete(id);
    else disabledIds.add(id);
    saveLocal();
  }

  function addCustom(date, name) {
    if (!date || !name) return false;
    const id = "custom_" + date + "_" + Math.random().toString(36).slice(2, 6);
    customEvents.push({
      id,
      name: name.trim(),
      type: "自定义",
      start: date,
      end: date,
      priority: 70,
      enabled: true,
    });
    saveLocal();
    return true;
  }

  function removeCustom(id) {
    customEvents = customEvents.filter((e) => e.id !== id);
    saveLocal();
  }

  function dateMap() {
    const map = new Map();
    getAllEvents().forEach((ev) => {
      if (!isEnabled(ev)) return;
      const start = new Date(ev.start + "T00:00:00");
      const end = new Date(ev.end + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");
        const prev = map.get(iso);
        if (!prev || (ev.priority || 0) > (prev.priority || 0)) {
          map.set(iso, { name: ev.name, type: ev.type, id: ev.id, priority: ev.priority || 0 });
        }
      }
    });
    return map;
  }

  function renderPanel(el) {
    function paint() {
      el.innerHTML = "";
      const head = document.createElement("div");
      head.className = "holiday-head";
      head.innerHTML = "<strong>节假日</strong><span class=\"hint\">勾选在热力图中高亮</span>";
      el.appendChild(head);

      const list = document.createElement("div");
      list.className = "holiday-list";
      getAllEvents().forEach((ev) => {
        const row = document.createElement("label");
        row.className = "holiday-row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = isEnabled(ev);
        cb.onchange = () => toggleEvent(ev.id);
        const span = document.createElement("span");
        span.textContent = ev.name + "（" + ev.start + (ev.end !== ev.start ? " ~ " + ev.end : "") + "）";
        row.appendChild(cb);
        row.appendChild(span);
        if (ev.id.startsWith("custom_")) {
          const del = document.createElement("button");
          del.type = "button";
          del.className = "holiday-del";
          del.textContent = "×";
          del.onclick = (e) => {
            e.preventDefault();
            removeCustom(ev.id);
          };
          row.appendChild(del);
        }
        list.appendChild(row);
      });
      el.appendChild(list);

      const form = document.createElement("div");
      form.className = "holiday-form";
      const dateIn = document.createElement("input");
      dateIn.type = "date";
      dateIn.min = "2025-01-01";
      dateIn.max = "2025-12-31";
      const nameIn = document.createElement("input");
      nameIn.type = "text";
      nameIn.placeholder = "节日名称";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-sm";
      addBtn.textContent = "添加";
      addBtn.onclick = () => {
        if (addCustom(dateIn.value, nameIn.value)) {
          nameIn.value = "";
          paint();
        }
      };
      form.appendChild(dateIn);
      form.appendChild(nameIn);
      form.appendChild(addBtn);
      el.appendChild(form);
    }
    paint();
    onChange(paint);
  }

  return { load, onChange, dateMap, renderPanel, getAllEvents, isEnabled };
})();
