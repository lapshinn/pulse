const ICONS = {
  menu: ["M4 5h16", "M4 12h16", "M4 19h16"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  sun: { circle: [12, 12, 4], paths: ["M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"] },
  moon: ["M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"],
  settings: { circle: [12, 12, 3], paths: ["M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"] },
  footprints: ["M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z", "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z", "M16 17h4", "M4 13h4"],
  bed: ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8v9"],
  heart: ["M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5", "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  cloud: ["M12 2v2", "m4.93 4.93 1.41 1.41", "M20 12h2", "m19.07 4.93-1.41 1.41", "M15.947 12.65a4 4 0 0 0-5.925-4.128", "M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"],
  wind: ["M12.8 19.6A2 2 0 1 0 14 16H2", "M17.5 8a2.5 2.5 0 1 1 2 4H2", "M9.8 4.4A2 2 0 1 1 11 8H2"],
  drops: ["M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z", "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"],
}

const PAGES = ["dashboard", "health", "weather", "news", "settings"]
const ZONES = ["Europe/Moscow", "Europe/Kaliningrad", "Asia/Yekaterinburg", "Asia/Vladivostok"]
const DEMO = {
  steps: 6420,
  sleep: "7 ч 20 мин",
  sleepRange: "23:40–07:00",
  heart: 72,
  heartAt: "08:16",
  calories: 1840,
  weather: { temp: 4, feels: 1, wind: 3, humidity: 78, rain: 0.2, text: "Облачно" },
  hours: [
    ["12:00", "4°"],
    ["13:00", "5°"],
    ["14:00", "5°"],
    ["15:00", "4°"],
    ["16:00", "3°"],
  ],
  days: [
    ["Пн", "2°", "0 мм"],
    ["Вт", "3°", "0,4 мм"],
    ["Ср", "1°", "1 мм"],
    ["Чт", "4°", "0 мм"],
    ["Пт", "5°", "0 мм"],
    ["Сб", "3°", "0,2 мм"],
    ["Вс", "2°", "0 мм"],
  ],
  news: [
    ["Город", "Демонстрационный заголовок о городской теме", "09:10"],
    ["Наука", "Демонстрационный заголовок о научной теме", "08:40"],
    ["Спорт", "Демонстрационный заголовок о спортивной теме", "08:05"],
    ["Экономика", "Демонстрационный заголовок об экономической теме", "07:30"],
    ["Технологии", "Демонстрационный заголовок о технологической теме", "07:05"],
  ],
  extra: [
    ["hrv", "HRV", "42 мс"],
    ["spo2", "SpO₂", "97%"],
    ["stress", "Стресс", "28"],
    ["vo2", "VO₂max", "41 мл/кг/мин"],
    ["load", "Нагрузка", "9"],
    ["ready", "Готовность", "71"],
    ["bio", "Биологический возраст", "на 2 года меньше календарного"],
  ],
}

const ui = {
  theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  tz: localStorage.getItem("pd-tz") || "Europe/Moscow",
  goal: localStorage.getItem("pd-goal") || "",
  state: "success",
}

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("class", "icon")
  svg.setAttribute("aria-hidden", "true")
  const spec = ICONS[name]
  const paths = Array.isArray(spec) ? spec : spec.paths
  if (spec.circle) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", spec.circle[0])
    circle.setAttribute("cy", spec.circle[1])
    circle.setAttribute("r", spec.circle[2])
    svg.append(circle)
  }
  paths.forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", d)
    svg.append(path)
  })
  return svg
}

function mountIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((slot) => {
    const svg = icon(slot.dataset.icon)
    slot.classList.forEach((name) => svg.classList.add(name))
    slot.replaceWith(svg)
  })
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]))
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value)
}

function zoneDate(date, options) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: ui.tz, ...options }).format(date)
}

function hourInZone(date) {
  return Number(zoneDate(date, { hour: "numeric", hourCycle: "h23" }))
}

function greeting(date) {
  const hour = hourInZone(date)
  if (hour >= 5 && hour < 12) return "Доброе утро"
  if (hour >= 12 && hour < 18) return "Добрый день"
  return "Добрый вечер"
}

function goalNumber() {
  if (ui.goal.trim() === "") return null
  const value = Number(ui.goal)
  if (!Number.isInteger(value) || value < 1 || value > 100000) return null
  return value
}

function viewFor(block) {
  if (ui.state === "weather-error") return block === "weather" ? "error" : "success"
  return ui.state
}

function statusNote(block) {
  const now = Date.now()
  const ages = { health: 38 * 3600e3, activity: 38 * 3600e3, weather: 2 * 3600e3, news: 20 * 60e3 }
  const when = new Date(now - ages[block])
  const stamp = `${zoneDate(when, { day: "numeric", month: "long" })} ${zoneDate(when, { hour: "2-digit", minute: "2-digit" })}`
  return `Обновлено ${stamp}. Это пример устаревших данных.`
}

function skeleton(wide) {
  return `<div class="state-box is-loading" role="status"><span class="sr-only">Загрузка</span><div class="skeleton lg"></div><div class="skeleton"></div><div class="skeleton" style="width:${wide}"></div></div>`
}

function emptyBox() {
  return `<div class="state-box"><strong>Нет данных</strong><p class="meta">Источник не подключён или за этот период ничего не пришло.</p></div>`
}

function errorBox() {
  return `<div class="state-box"><strong>Не удалось обновить этот блок</strong><p class="meta">Остальные блоки Dashboard от этого не скрываются.</p><button type="button" class="button" data-retry>Повторить</button></div>`
}

function wrap(block, success) {
  const view = viewFor(block)
  if (view === "loading") return skeleton("70%")
  if (view === "empty") return emptyBox()
  if (view === "error") return errorBox()
  const stale = view === "stale" ? `<p class="meta"><span class="badge badge-warn">Устарело</span> ${esc(statusNote(block))}</p>` : ""
  return success + stale
}

function stepsDetail() {
  const goal = goalNumber()
  if (!goal) return { text: "Цель не задана", percent: null }
  const percent = Math.min(100, Math.round((DEMO.steps / goal) * 100))
  return { text: `${formatNumber(DEMO.steps)} из ${formatNumber(goal)} · ${percent}%`, percent }
}

function metricCard({ href, iconName, title, value, detail, percent }) {
  const bar = percent === null || percent === undefined
    ? ""
    : `<div class="progress" role="img" aria-label="Выполнено ${percent} процентов"><span style="width:${percent}%"></span></div>`
  return `<a class="card card-link" href="${href}">
    <div class="card-head"><span><span data-icon="${iconName}"></span><h3>${title}</h3></span><span class="badge">Пример</span></div>
    <p class="value">${value}</p>
    <p class="meta">${detail}</p>
    ${bar}
  </a>`
}

function renderHealthCards() {
  const root = document.querySelector("#health-cards")
  const view = viewFor("health")
  if (view === "loading") {
    root.innerHTML = `<div class="metrics">${skeleton("80%")}${skeleton("60%")}${skeleton("50%")}${skeleton("70%")}</div>`
    return
  }
  if (view === "empty" || view === "error") {
    root.innerHTML = `<div class="metrics">${emptyOrError(view)}${emptyOrError(view)}${emptyOrError(view)}${emptyOrError(view)}</div>`
    return
  }
  const steps = stepsDetail()
  const stale = view === "stale" ? `<p class="meta"><span class="badge badge-warn">Устарело</span> ${esc(statusNote("health"))}</p>` : ""
  root.innerHTML = `<div class="metrics">
    ${metricCard({ href: "#health-steps", iconName: "footprints", title: "Шаги", value: formatNumber(DEMO.steps), detail: esc(steps.text), percent: steps.percent })}
    ${metricCard({ href: "#health-sleep", iconName: "bed", title: "Сон", value: DEMO.sleep, detail: `Засыпание и пробуждение ${DEMO.sleepRange}`, percent: null })}
    ${metricCard({ href: "#health-heart", iconName: "heart", title: "Пульс", value: `${DEMO.heart} уд/мин`, detail: `Измерение в ${DEMO.heartAt}`, percent: null })}
    ${metricCard({ href: "#health-calories", iconName: "flame", title: "Калории", value: `${formatNumber(DEMO.calories)} ккал`, detail: "Тип в источнике не разделён", percent: null })}
  </div>${stale}`
  mountIcons(root)
}

function emptyOrError(view) {
  return view === "error" ? errorBox() : emptyBox()
}

function renderWeather(target, detailed) {
  const root = document.querySelector(target)
  const hours = DEMO.hours.map(([time, temp]) => `<li><span>${time}</span><strong>${temp}</strong></li>`).join("")
  const days = DEMO.days.map(([day, temp, rain]) => `<li><span>${day}</span><strong>${temp}</strong><span class="meta">${rain}</span></li>`).join("")
  const body = `<div class="card-head"><span><span data-icon="cloud"></span><h2>${detailed ? "Сейчас в Москве" : "Москва"}</h2></span><span class="badge">Пример</span></div>
    <p class="value">${DEMO.weather.temp}°C</p>
    <p>${DEMO.weather.text}</p>
    <ul class="facts">
      <li><span data-icon="cloud"></span>Ощущается как ${DEMO.weather.feels}°C</li>
      <li><span data-icon="wind"></span>Ветер ${DEMO.weather.wind} м/с</li>
      <li><span data-icon="drops"></span>Влажность ${DEMO.weather.humidity}%</li>
      ${detailed ? `<li>Осадки ${String(DEMO.weather.rain).replace(".", ",")} мм</li>` : ""}
    </ul>
    ${detailed ? "" : `<h3 class="section-title" style="font-size:14px">Ближайшие 5 часов</h3><ul class="hours">${hours}</ul>`}
    ${detailed ? `<h3 class="section-title">7 дней</h3><ul class="days">${days}</ul>` : ""}`
  root.innerHTML = wrap("weather", body)
  mountIcons(root)
}

function renderNews(target, withLink) {
  const root = document.querySelector(target)
  const items = DEMO.news.map(([category, title, time], index) => `<li>
    <span>${index + 1}</span>
    <div>
      <div class="news-kicker"><span>${category}</span><span class="badge">Пример</span></div>
      <h3>${title}</h3>
      <p class="meta">Пример источника · время в примере ${time}. Ссылки нет: публикация не настоящая.</p>
    </div>
  </li>`).join("")
  const link = withLink ? `<a class="text-button" href="#news">Все новости</a>` : `<p class="note">Поиск и категории MediaMetrics появятся после отдельного согласования источника. Сейчас это только примеры.</p>`
  const listClass = withLink ? "news-list news-list--split" : "news-list"
  root.innerHTML = wrap("news", `<div class="card-head"><h2 class="section-title">Новости</h2><span class="badge">Пример</span></div><ol class="${listClass}">${items}</ol>${link}`)
}

function renderHealthPage() {
  const root = document.querySelector("#health-root")
  const view = viewFor("health")
  const steps = stepsDetail()
  const primary = [
    ["health-steps", "Шаги", `${formatNumber(DEMO.steps)}`, steps.text],
    ["health-sleep", "Сон", DEMO.sleep, `${DEMO.sleepRange}. Оценки качества нет: в примере нет исходного показателя.`],
    ["health-heart", "Пульс", `${DEMO.heart} уд/мин`, `Последнее значение, ${DEMO.heartAt}`],
    ["health-calories", "Калории", `${formatNumber(DEMO.calories)} ккал`, "Тип в источнике не разделён, поэтому калории не названы активными."],
  ]
  const cards = primary.map(([id, title, value, detail]) => `<article class="card" id="${id}"><h2>${title}</h2><p class="value">${value}</p><p class="meta">${esc(detail)}</p><span class="badge">Пример</span></article>`).join("")
  const extras = DEMO.extra.map(([id, title, value]) => `<article class="card" id="${id}"><h2>${title}</h2><p class="value" style="font-size:22px">${esc(value)}</p><p class="meta">${id === "bio" ? "На главной этот показатель не показывается." : "Дополнительный показатель раздела Health."}</p><span class="badge">Пример</span></article>`).join("")
  const body = `<div class="detail-grid">${cards}</div><h2 class="section-title">Дополнительные показатели</h2><div class="detail-grid">${extras}</div>`
  root.innerHTML = view === "success" || view === "stale" ? body + (view === "stale" ? `<p class="meta"><span class="badge badge-warn">Устарело</span> ${esc(statusNote("health"))}</p>` : "") : wrap("health", "")
}

function renderAll() {
  renderWeather("#weather-card", false)
  renderHealthCards()
  renderNews("#news-card", true)
  renderWeather("#weather-page", true)
  renderNews("#news-page", false)
  renderHealthPage()
}

function bindDynamic() {
  document.body.addEventListener("click", (event) => {
    if (event.target.closest("[data-retry]")) {
      ui.state = "success"
      document.querySelector("#data-state").value = "success"
      renderAll()
    }
  })
}

function tick() {
  const now = new Date()
  document.querySelector("#clock").textContent = zoneDate(now, { hour: "2-digit", minute: "2-digit" })
  document.querySelector("#today").textContent = zoneDate(now, { day: "numeric", month: "long", year: "numeric" })
  document.querySelector("#hello").textContent = greeting(now)
  document.querySelector("#weekday").textContent = zoneDate(now, { weekday: "long" })
}

function applyTheme(theme) {
  ui.theme = theme === "dark" ? "dark" : "light"
  document.documentElement.dataset.theme = ui.theme
  localStorage.setItem("pd-theme", ui.theme)
  const button = document.querySelector("#theme-toggle")
  const dark = ui.theme === "dark"
  button.setAttribute("aria-pressed", String(dark))
  button.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему")
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === ui.theme
  })
}

function showPage(page, anchor) {
  const next = PAGES.includes(page) ? page : "dashboard"
  document.querySelectorAll("[data-page]").forEach((section) => {
    section.hidden = section.dataset.page !== next
  })
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const current = link.dataset.nav === next
    if (current) link.setAttribute("aria-current", "page")
    else link.removeAttribute("aria-current")
  })
  document.title = `${document.querySelector(`#${next} h1`)?.textContent || "Personal Dashboard"} — прототип`
  if (anchor) {
    const target = document.getElementById(anchor)
    if (target) target.scrollIntoView({ block: "start" })
  } else {
    window.scrollTo(0, 0)
  }
}

function readHash() {
  const raw = location.hash.replace(/^#/, "")
  if (!raw) return { page: "dashboard", anchor: "" }
  if (raw.startsWith("health-") || DEMO.extra.some(([id]) => id === raw)) return { page: "health", anchor: raw }
  const page = raw.split("-")[0]
  return { page: PAGES.includes(page) ? page : "dashboard", anchor: raw.includes("-") ? raw : "" }
}

function setMenuIcon(name) {
  const button = document.querySelector("#menu-button")
  const label = button.querySelector(".sr-only")
  button.replaceChildren(icon(name), label)
}

function closeMenu() {
  const menu = document.querySelector("#mobile-menu")
  const button = document.querySelector("#menu-button")
  menu.hidden = true
  button.setAttribute("aria-expanded", "false")
  setMenuIcon("menu")
}

function openMenu() {
  const menu = document.querySelector("#mobile-menu")
  const button = document.querySelector("#menu-button")
  menu.hidden = false
  button.setAttribute("aria-expanded", "true")
  setMenuIcon("x")
}

function bindChrome() {
  mountIcons()
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    applyTheme(ui.theme === "dark" ? "light" : "dark")
  })
  document.querySelector("#menu-button").addEventListener("click", () => {
    const expanded = document.querySelector("#menu-button").getAttribute("aria-expanded") === "true"
    if (expanded) closeMenu()
    else openMenu()
  })
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu()
  })
  document.querySelector("#mobile-menu").addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu()
  })
  window.addEventListener("hashchange", () => {
    const route = readHash()
    showPage(route.page, route.anchor)
  })
  document.querySelector("#data-state").addEventListener("change", (event) => {
    ui.state = event.target.value
    renderAll()
  })
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) applyTheme(input.value)
    })
  })
  const zone = document.querySelector("#timezone")
  ZONES.forEach((name) => {
    const option = document.createElement("option")
    option.value = name
    option.textContent = name
    zone.append(option)
  })
  if (!ZONES.includes(ui.tz)) ui.tz = "Europe/Moscow"
  zone.value = ui.tz
  zone.addEventListener("change", () => {
    ui.tz = zone.value
    localStorage.setItem("pd-tz", ui.tz)
    tick()
  })
  const goal = document.querySelector("#step-goal")
  const goalError = document.querySelector("#goal-error")
  goal.value = ui.goal
  goal.addEventListener("input", () => {
    const raw = goal.value.trim()
    if (raw !== "" && !/^\d+$/.test(raw)) {
      goalError.textContent = "Введите целое число шагов или очистите поле."
      return
    }
    const numeric = Number(raw)
    if (raw !== "" && (numeric < 1 || numeric > 100000)) {
      goalError.textContent = "Цель может быть от 1 до 100 000 шагов."
      return
    }
    goalError.textContent = ""
    ui.goal = raw
    localStorage.setItem("pd-goal", raw)
    renderHealthCards()
    renderHealthPage()
  })
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeMenu()
  })
}

applyTheme(ui.theme)
bindChrome()
bindDynamic()
tick()
renderAll()
showPage(readHash().page, readHash().anchor)
window.setInterval(tick, 1000)
