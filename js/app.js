const PAGE = document.querySelector("main[data-view]")?.dataset.view;
const CLUB_NAME = "CJ Prom 07";
const DEFAULT_VENUE = "Cancha del Colegio Javier";
let currentPlayers = [];
let currentMatches = [];

const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

const asNumber = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const displayStat = (value) => value === null || value === undefined ? "—" : asNumber(value);
const validScore = (value) => value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
const normalizeName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
const normalizeTeamName = (value) => normalizeName(value).replace(/^cj\s+/, "");
const sameTeam = (first, second) => normalizeTeamName(first) === normalizeTeamName(second);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short", timeZone: "America/Panama", hourCycle: "h12" }).format(date);
};

const matchTime = (match) => {
  const timestamp = Date.parse(match.fecha);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

const completedMatches = (matches) => matches.filter((match) => match.estado === "finalizado"
  && validScore(match.golesLocal) && validScore(match.golesVisitante));

const matchCard = (match, clubName = CLUB_NAME) => {
  const finished = match.estado === "finalizado";
  const homeGoals = Number(match.golesLocal);
  const awayGoals = Number(match.golesVisitante);
  const score = finished && validScore(match.golesLocal) && validScore(match.golesVisitante) ? `${homeGoals} - ${awayGoals}` : "vs";
  const clubAtHome = sameTeam(match.local, clubName);
  const involvesClub = clubAtHome || sameTeam(match.visitante, clubName);
  const clubGoals = clubAtHome ? homeGoals : awayGoals;
  const rivalGoals = clubAtHome ? awayGoals : homeGoals;
  const outcome = finished && involvesClub ? (clubGoals > rivalGoals ? "VICTORIA" : clubGoals === rivalGoals ? "EMPATE" : "DERROTA") : "FINALIZADO";
  const label = finished ? outcome : match.estado === "programado" ? "PRÓXIMO ENCUENTRO" : String(match.estado || "PROGRAMADO").toUpperCase();
  const tone = finished && involvesClub ? (clubGoals > rivalGoals ? "win" : clubGoals < rivalGoals ? "loss" : "draw") : !finished && match.estado === "programado" ? "next" : "";
  const scorers = Array.isArray(match.goleadores)
    ? match.goleadores.map(({ jugador, goles }) => `${escapeHTML(jugador)} (${asNumber(goles)})`).join(", ")
    : "";

  return `<article class="card match-card" data-status="${escapeHTML(match.estado)}">
    <div class="match-card-heading"><h2>Jornada ${escapeHTML(match.jornada)}</h2><span class="match-status" data-tone="${tone}">${label}</span></div>
    <div class="match-banner"><span class="team">${escapeHTML(match.local)}</span><strong class="vs${finished ? " score" : ""}">${score}</strong><span class="team">${escapeHTML(match.visitante)}</span></div>
    <div class="match-info"><p><time datetime="${escapeHTML(match.fecha)}">${escapeHTML(formatDate(match.fecha))}</time></p><p>${escapeHTML(match.sede || DEFAULT_VENUE)}</p>${scorers ? `<p>Goleadores: ${scorers}</p>` : ""}</div>
  </article>`;
};

const calculateScorers = (matches) => {
  const scorers = new Map();
  for (const match of completedMatches(matches)) {
    for (const scorer of Array.isArray(match.goleadores) ? match.goleadores : []) {
      const name = String(scorer.jugador || "").trim();
      const goals = Number(scorer.goles);
      if (name && Number.isInteger(goals) && goals > 0) scorers.set(name, (scorers.get(name) || 0) + goals);
    }
  }
  return [...scorers.entries()].map(([jugador, goles]) => ({ jugador, goles }))
    .sort((first, second) => second.goles - first.goles || first.jugador.localeCompare(second.jugador, "es"));
};

const findPlayer = (players, name) => {
  const scorerName = normalizeName(name);
  const exactMatch = players.find((player) => normalizeName(player.nombre) === scorerName);
  const surnameMatches = players.filter((player) => normalizeName(player.nombre).endsWith(` ${scorerName}`));
  return exactMatch || (surnameMatches.length === 1 ? surnameMatches[0] : null);
};

const calculatePlayerGoals = (players, matches) => {
  const totals = new Map(players.map((player) => [player.nombre, 0]));
  for (const scorer of calculateScorers(matches)) {
    const player = findPlayer(players, scorer.jugador);
    if (player) totals.set(player.nombre, (totals.get(player.nombre) || 0) + scorer.goles);
  }
  return totals;
};

const renderScorers = (matches, players) => {
  const playerGoals = calculatePlayerGoals(players, matches);
  const rosterScorers = players
    .filter((player) => playerGoals.get(player.nombre) > 0)
    .map((player) => ({ jugador: player.nombre, goles: playerGoals.get(player.nombre), player }));
  const unmatchedScorers = calculateScorers(matches)
    .filter((scorer) => !findPlayer(players, scorer.jugador))
    .map((scorer) => ({ ...scorer, player: { nombre: scorer.jugador } }));
  const scorers = [...rosterScorers, ...unmatchedScorers]
    .sort((first, second) => second.goles - first.goles || first.jugador.localeCompare(second.jugador, "es"));
  const rowMarkup = scorers.length
    ? scorers.map((scorer, index) => `<tr class="scorer-row"><td class="scorer-rank">${index + 1}</td><td><span class="player-name scorer-player">${playerAvatar(scorer.player)}<span>${escapeHTML(scorer.jugador)}</span></span></td><td class="scorer-goals"><strong>${scorer.goles}</strong></td></tr>`).join("")
    : `<tr><td colspan="3" class="empty-state">Sin goles registrados.</td></tr>`;
  ["#scorers-table", "#home-scorers"].forEach((selector) => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.innerHTML = rowMarkup;
    target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
  });
};

const animateCounters = (matches, clubName) => {
  const finished = completedMatches(matches);
  const totals = { played: 0, goals: 0 };
  for (const match of finished) {
    const atHome = sameTeam(match.local, clubName);
    const away = sameTeam(match.visitante, clubName);
    if (!atHome && !away) continue;
    const clubGoals = Number(atHome ? match.golesLocal : match.golesVisitante);
    totals.played += 1;
    totals.goals += clubGoals;
  }
  const elements = [...document.querySelectorAll("[data-counter]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  elements.forEach((element) => {
    const total = totals[element.dataset.counter] || 0;
    element.dataset.target = String(total);
    element.textContent = String(reducedMotion || !total ? total : 0);
  });
  if (reducedMotion || !("IntersectionObserver" in window)) return;

  const frames = new Map();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target;
      const total = Number(element.dataset.target);
      if (!entry.isIntersecting) {
        cancelAnimationFrame(frames.get(element));
        frames.delete(element);
        element.textContent = "0";
        continue;
      }
      if (!total) continue;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 850, 1);
        element.textContent = String(Math.round(total * (1 - (1 - progress) ** 3)));
        if (progress < 1) frames.set(element, requestAnimationFrame(tick));
        else frames.delete(element);
      };
      frames.set(element, requestAnimationFrame(tick));
    }
  }, { threshold: 0.6 });
  elements.forEach((element) => observer.observe(element));
};

const initials = (name) => String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("es");
const imageURL = (value) => {
  const source = String(value || "").trim();
  return source.startsWith("/") && !source.startsWith("//") || source.startsWith("https://") ? source : "";
};

const playerAvatar = (player) => {
  const source = imageURL(player.imagen);
  return `<span class="player-avatar" aria-hidden="true"><span class="player-initials">${escapeHTML(initials(player.nombre))}</span>${source ? `<img class="player-photo" src="${escapeHTML(source)}" alt="" loading="lazy">` : ""}</span>`;
};

const renderRoster = (players, matches) => {
  const target = document.querySelector("#roster-table");
  if (!target) return;
  const playerGoals = calculatePlayerGoals(players, matches);
  const ordered = [...players].sort((first, second) => asNumber(first.dorsal) - asNumber(second.dorsal));
  target.innerHTML = ordered.length ? ordered.map((player) => `<tr>
    <td>${player.dorsal === null || player.dorsal === undefined ? "—" : asNumber(player.dorsal)}</td><td><span class="player-name">${playerAvatar(player)}<span>${escapeHTML(player.nombre)}</span></span></td><td>${escapeHTML(player.posicion)}</td><td>${displayStat(playerGoals.get(player.nombre))}</td>
  </tr>`).join("") : `<tr><td colspan="4" class="empty-state">Sin jugadores publicados.</td></tr>`;
  target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
};

const renderCalendar = (matches, clubName) => {
  const target = document.querySelector("#calendar-list");
  if (!target) return;
  const ordered = [...matches].sort((first, second) => matchTime(first) - matchTime(second));
  target.innerHTML = ordered.length ? ordered.map((match) => matchCard(match, clubName)).join("") : `<p class="empty-state">Sin partidos publicados.</p>`;
};

const renderHome = (matches, players, site) => {
  const upcoming = matches.filter((match) => match.estado === "programado").sort((first, second) => matchTime(first) - matchTime(second));
  const next = upcoming.find((match) => matchTime(match) >= Date.now()) || upcoming[0];
  const latest = completedMatches(matches).sort((first, second) => matchTime(second) - matchTime(first))[0];
  const nextTarget = document.querySelector("#next-match");
  const latestTarget = document.querySelector("#latest-result");
  if (nextTarget) nextTarget.innerHTML = next ? matchCard(next, site.nombre) : `<p class="empty-state">Sin próximos partidos publicados.</p>`;
  if (latestTarget) latestTarget.innerHTML = latest ? matchCard(latest, site.nombre) : `<p class="empty-state">Sin resultados publicados.</p>`;
  const season = document.querySelector("#season-label");
  if (season) season.textContent = `${site.institucion} · ${site.temporada}`.toLocaleUpperCase("es");
  renderScorers(matches, players);
  animateCounters(matches, site.nombre);
};

const applyBranding = (site) => {
  const brandName = document.querySelector(".brand-name");
  const logo = document.querySelector(".brand-logo");
  if (brandName) brandName.textContent = String(site.nombre || CLUB_NAME).toLocaleUpperCase("es");
  const source = imageURL(site.logo);
  if (logo && source) {
    logo.src = source;
    logo.alt = `${site.nombre || CLUB_NAME} logo`;
    logo.hidden = false;
    logo.addEventListener("error", () => { logo.hidden = true; logo.removeAttribute("src"); }, { once: true });
  }
};

const setupNavigation = () => {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-navigation");
  if (!toggle || !navigation) return;
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    navigation.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  navigation.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
};

const setupInteractions = () => {
  document.querySelectorAll("[data-match-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-match-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      const filter = button.dataset.matchFilter;
      document.querySelectorAll("#calendar-list .match-card").forEach((card) => {
        card.hidden = filter !== "todos" && card.dataset.status !== filter;
      });
    });
  });
};

const setupReveals = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("motion-ready");
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
};

const start = async () => {
  if (!PAGE) return;
  setupNavigation();
  setupInteractions();
  setupReveals();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/js/sw.js").catch(() => {});

  try {
    const paths = ["/content/partidos.json", "/content/plantel.json", "/content/site.json"];
    const responses = await Promise.all(paths.map((path) => fetch(path)));
    if (responses.some((response) => !response.ok)) throw new Error("No fue posible leer los archivos de contenido.");
    const [matchData, rosterData, site] = await Promise.all(responses.map((response) => response.json()));
    currentMatches = Array.isArray(matchData.partidos) ? matchData.partidos : [];
    currentPlayers = Array.isArray(rosterData.jugadores) ? rosterData.jugadores : [];
    applyBranding(site);

    if (PAGE === "inicio") renderHome(currentMatches, currentPlayers, site);
    if (PAGE === "calendario") renderCalendar(currentMatches, site.nombre);
    if (PAGE === "estadisticas") {
      renderScorers(currentMatches, currentPlayers);
    }
    if (PAGE === "plantel") renderRoster(currentPlayers, currentMatches);
  } catch {
    document.querySelectorAll(".empty-state").forEach((element) => { element.textContent = "No se pudieron cargar los datos publicados."; });
  }
};

start();