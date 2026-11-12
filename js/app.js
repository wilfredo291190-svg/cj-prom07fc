const PAGE = document.querySelector("main[data-view]")?.dataset.view;
const CLUB_NAME = "CJ Prom 07";
let currentPlayers = [];
let currentMatches = [];
let currentTeams = [CLUB_NAME];

const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

const asNumber = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const displayStat = (value) => value === null || value === undefined ? "—" : asNumber(value);
const validScore = (value) => value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
const sameTeam = (first, second) => String(first || "").trim().toLocaleLowerCase("es") === String(second || "").trim().toLocaleLowerCase("es");

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short" }).format(date);
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
    <div class="match-info"><p><time datetime="${escapeHTML(match.fecha)}">${escapeHTML(formatDate(match.fecha))}</time></p><p>${escapeHTML(match.sede || "Sede por confirmar")}</p>${scorers ? `<p>Goleadores: ${scorers}</p>` : ""}</div>
  </article>`;
};

const calculateStandings = (matches, teamNames) => {
  const standings = new Map();
  const getTeam = (name) => {
    const teamName = String(name || "").trim();
    if (!standings.has(teamName)) standings.set(teamName, { equipo: teamName, pj: 0, ganados: 0, empatados: 0, perdidos: 0, gf: 0, gc: 0, pts: 0 });
    return standings.get(teamName);
  };

  teamNames.forEach(getTeam);
  for (const match of completedMatches(matches)) {
    if (!String(match.local || "").trim() || !String(match.visitante || "").trim()) continue;
    const home = getTeam(match.local);
    const away = getTeam(match.visitante);
    const homeGoals = Number(match.golesLocal);
    const awayGoals = Number(match.golesVisitante);
    home.pj += 1;
    away.pj += 1;
    home.gf += homeGoals;
    home.gc += awayGoals;
    away.gf += awayGoals;
    away.gc += homeGoals;
    if (homeGoals > awayGoals) {
      home.ganados += 1; away.perdidos += 1; home.pts += 3;
    } else if (homeGoals < awayGoals) {
      away.ganados += 1; home.perdidos += 1; away.pts += 3;
    } else {
      home.empatados += 1; away.empatados += 1; home.pts += 1; away.pts += 1;
    }
  }

  return [...standings.values()].filter((team) => team.equipo).sort((first, second) => second.pts - first.pts
    || (second.gf - second.gc) - (first.gf - first.gc)
    || second.gf - first.gf
    || first.equipo.localeCompare(second.equipo, "es"));
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

const renderStandings = (matches, teamNames) => {
  const standings = calculateStandings(matches, teamNames);
  const homeBody = document.querySelector("#home-standings");
  const fullBody = document.querySelector("#standings-table");
  const row = (team, index, full) => {
    const isClub = sameTeam(team.equipo, CLUB_NAME);
    const classes = [isClub ? "is-cj-team" : "", index === 0 && team.pj > 0 ? "is-leader" : ""].filter(Boolean).join(" ");
    const cells = full
      ? `<td>${team.pj}</td><td>${team.ganados}</td><td>${team.empatados}</td><td>${team.perdidos}</td><td>${team.gf}</td><td>${team.gc}</td><td>${team.gf - team.gc}</td><td>${team.pts}</td>`
      : `<td>${team.pj}</td><td>${team.gf - team.gc}</td><td>${team.pts}</td>`;
    const leaderBadge = index === 0 && team.pj > 0 ? `<span class="leader-badge">LÍDER</span>` : "";
    return `<tr class="${classes}"><td>${index + 1}</td><td><span class="table-team-name">${escapeHTML(team.equipo)}${leaderBadge}</span></td>${cells}</tr>`;
  };
  if (homeBody) homeBody.innerHTML = standings.length ? standings.slice(0, 5).map((team, index) => row(team, index, false)).join("") : `<tr><td colspan="5" class="empty-state">Sin equipos publicados.</td></tr>`;
  if (fullBody) fullBody.innerHTML = standings.length ? standings.map((team, index) => row(team, index, true)).join("") : `<tr><td colspan="10" class="empty-state">Sin equipos publicados.</td></tr>`;
};

const renderScorers = (matches) => {
  const scorers = calculateScorers(matches);
  const rowMarkup = scorers.length
    ? scorers.map((scorer, index) => `<tr><td>${index + 1}</td><td>${escapeHTML(scorer.jugador)}</td><td>${scorer.goles}</td></tr>`).join("")
    : `<tr><td colspan="3" class="empty-state">Sin goles registrados.</td></tr>`;
  ["#scorers-table", "#home-scorers"].forEach((selector) => {
    const target = document.querySelector(selector);
    if (target) target.innerHTML = rowMarkup;
  });
};

const animateCounters = (matches, clubName) => {
  const finished = completedMatches(matches);
  const totals = { played: 0, wins: 0, goals: 0 };
  for (const match of finished) {
    const atHome = sameTeam(match.local, clubName);
    const away = sameTeam(match.visitante, clubName);
    if (!atHome && !away) continue;
    const clubGoals = Number(atHome ? match.golesLocal : match.golesVisitante);
    const rivalGoals = Number(atHome ? match.golesVisitante : match.golesLocal);
    totals.played += 1;
    totals.goals += clubGoals;
    if (clubGoals > rivalGoals) totals.wins += 1;
  }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-counter]").forEach((element) => {
    const total = totals[element.dataset.counter] || 0;
    if (reducedMotion || total === 0) { element.textContent = String(total); return; }
    const start = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = String(Math.round(total * (1 - (1 - progress) ** 3)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
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

const renderRoster = (players) => {
  const target = document.querySelector("#roster-table");
  if (!target) return;
  const ordered = [...players].sort((first, second) => asNumber(first.dorsal) - asNumber(second.dorsal));
  target.innerHTML = ordered.length ? ordered.map((player) => `<tr>
    <td>${asNumber(player.dorsal) || "—"}</td><td><span class="player-name">${playerAvatar(player)}<span>${escapeHTML(player.nombre)}</span></span></td><td>${escapeHTML(player.posicion)}</td>
    <td>${displayStat(player.partidosJugados)}</td><td>${displayStat(player.goles)}</td><td>${displayStat(player.asistencias)}</td><td>${displayStat(player.tarjetasAmarillas)}</td><td>${displayStat(player.tarjetasRojas)}</td>
  </tr>`).join("") : `<tr><td colspan="8" class="empty-state">Sin jugadores publicados.</td></tr>`;
  target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
};

const renderPlayerStats = (players, sortBy = "goles") => {
  const target = document.querySelector("#player-stats-table");
  if (!target) return;
  const ordered = [...players].sort((first, second) => asNumber(second[sortBy]) - asNumber(first[sortBy]) || first.nombre.localeCompare(second.nombre, "es"));
  target.innerHTML = ordered.length ? ordered.map((player) => `<tr>
    <td><span class="player-name">${playerAvatar(player)}<span>${escapeHTML(player.nombre)}</span></span></td><td>${displayStat(player.partidosJugados)}</td><td>${displayStat(player.goles)}</td><td>${displayStat(player.asistencias)}</td><td>${displayStat(player.tarjetasAmarillas)}</td><td>${displayStat(player.tarjetasRojas)}</td>
  </tr>`).join("") : `<tr><td colspan="6" class="empty-state">Sin estadísticas individuales publicadas.</td></tr>`;
  target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
};

const renderCalendar = (matches, clubName) => {
  const target = document.querySelector("#calendar-list");
  if (!target) return;
  const ordered = [...matches].sort((first, second) => matchTime(first) - matchTime(second));
  target.innerHTML = ordered.length ? ordered.map((match) => matchCard(match, clubName)).join("") : `<p class="empty-state">Sin partidos publicados.</p>`;
};

const renderHome = (matches, teamNames, site) => {
  const upcoming = matches.filter((match) => match.estado === "programado").sort((first, second) => matchTime(first) - matchTime(second));
  const next = upcoming.find((match) => matchTime(match) >= Date.now()) || upcoming[0];
  const latest = completedMatches(matches).sort((first, second) => matchTime(second) - matchTime(first))[0];
  const nextTarget = document.querySelector("#next-match");
  const latestTarget = document.querySelector("#latest-result");
  if (nextTarget) nextTarget.innerHTML = next ? matchCard(next, site.nombre) : `<p class="empty-state">Sin próximos partidos publicados.</p>`;
  if (latestTarget) latestTarget.innerHTML = latest ? matchCard(latest, site.nombre) : `<p class="empty-state">Sin resultados publicados.</p>`;
  const season = document.querySelector("#season-label");
  if (season) season.textContent = `${site.institucion} · ${site.temporada}`.toLocaleUpperCase("es");
  renderStandings(matches, teamNames);
  renderScorers(matches);
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
  document.querySelector("#stats-sort")?.addEventListener("change", (event) => renderPlayerStats(currentPlayers, event.target.value));
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
    const paths = ["/content/partidos.json", "/content/plantel.json", "/content/equipos.json", "/content/site.json"];
    const responses = await Promise.all(paths.map((path) => fetch(path)));
    if (responses.some((response) => !response.ok)) throw new Error("No fue posible leer los archivos de contenido.");
    const [matchData, rosterData, teamsData, site] = await Promise.all(responses.map((response) => response.json()));
    currentMatches = Array.isArray(matchData.partidos) ? matchData.partidos : [];
    currentPlayers = Array.isArray(rosterData.jugadores) ? rosterData.jugadores : [];
    currentTeams = Array.isArray(teamsData.equipos) ? teamsData.equipos : [site.nombre || CLUB_NAME];
    if (!currentTeams.some((team) => sameTeam(team, site.nombre))) currentTeams.unshift(site.nombre || CLUB_NAME);
    applyBranding(site);

    if (PAGE === "inicio") renderHome(currentMatches, currentTeams, site);
    if (PAGE === "calendario") renderCalendar(currentMatches, site.nombre);
    if (PAGE === "estadisticas") {
      renderStandings(currentMatches, currentTeams);
      renderScorers(currentMatches);
      renderPlayerStats(currentPlayers);
    }
    if (PAGE === "plantel") renderRoster(currentPlayers);
  } catch {
    document.querySelectorAll(".empty-state").forEach((element) => { element.textContent = "No se pudieron cargar los datos publicados."; });
  }
};

start();