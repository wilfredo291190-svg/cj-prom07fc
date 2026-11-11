const PAGE = document.querySelector("main[data-view]")?.dataset.view;

const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[character]));

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
};

const matchTime = (match) => {
  const timestamp = Date.parse(match.fecha);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

const validScore = (value) => value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;

const emptyMessage = (target, message, columns = 1) => {
  if (target) target.innerHTML = `<tr><td class="empty-state" colspan="${columns}">${escapeHTML(message)}</td></tr>`;
};

const matchCard = (match) => {
  const finished = match.estado === "finalizado";
  const score = finished && validScore(match.golesLocal) && validScore(match.golesVisitante)
    ? `${Number(match.golesLocal)} - ${Number(match.golesVisitante)}`
    : "vs";
  const scorers = Array.isArray(match.goleadores)
    ? match.goleadores.map(({ jugador, goles }) => `${escapeHTML(jugador)} (${Number(goles) || 0})`).join(", ")
    : "";

  return `<article class="card match-card">
    <div class="match-card-heading"><h2>Jornada ${escapeHTML(match.jornada)}</h2><span class="match-status">${finished ? "Finalizado" : escapeHTML(match.estado || "Programado")}</span></div>
    <div class="match-banner"><span class="team">${escapeHTML(match.local)}</span><strong class="vs${finished ? " score" : ""}">${score}</strong><span class="team">${escapeHTML(match.visitante)}</span></div>
    <div class="match-info"><p><time datetime="${escapeHTML(match.fecha)}">${escapeHTML(formatDate(match.fecha))}</time></p><p>${escapeHTML(match.sede || "Sede por confirmar")}</p>${scorers ? `<p>Goleadores: ${scorers}</p>` : ""}</div>
  </article>`;
};

const completedMatches = (matches) => matches.filter((match) => match.estado === "finalizado"
  && validScore(match.golesLocal)
  && validScore(match.golesVisitante));

const calculateStandings = (matches) => {
  const standings = new Map();
  const getTeam = (name) => {
    if (!standings.has(name)) standings.set(name, { equipo: name, pj: 0, ganados: 0, empatados: 0, perdidos: 0, gf: 0, gc: 0, pts: 0 });
    return standings.get(name);
  };

  for (const match of completedMatches(matches)) {
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
      home.ganados += 1;
      away.perdidos += 1;
      home.pts += 3;
    } else if (homeGoals < awayGoals) {
      away.ganados += 1;
      home.perdidos += 1;
      away.pts += 3;
    } else {
      home.empatados += 1;
      away.empatados += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  return [...standings.values()].sort((first, second) => second.pts - first.pts
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
      if (!name || !Number.isInteger(goals) || goals < 1) continue;
      scorers.set(name, (scorers.get(name) || 0) + goals);
    }
  }
  return [...scorers.entries()]
    .map(([jugador, goles]) => ({ jugador, goles }))
    .sort((first, second) => second.goles - first.goles || first.jugador.localeCompare(second.jugador, "es"));
};

const standingsRows = (standings, limit = standings.length) => standings.slice(0, limit).map((team, index) => `<tr>
  <td>${index + 1}</td><td>${escapeHTML(team.equipo)}</td><td>${team.pj}</td><td>${team.ganados}</td><td>${team.empatados}</td><td>${team.perdidos}</td><td>${team.gf}</td><td>${team.gc}</td><td>${team.gf - team.gc}</td><td>${team.pts}</td>
</tr>`).join("");

const renderStandings = (matches) => {
  const standings = calculateStandings(matches);
  const homeBody = document.querySelector("#home-standings");
  const fullBody = document.querySelector("#standings-table");
  if (!standings.length) {
    emptyMessage(homeBody, "Aún no hay resultados publicados.", 5);
    emptyMessage(fullBody, "Aún no hay resultados publicados.", 10);
    return;
  }
  if (homeBody) homeBody.innerHTML = standings.slice(0, 3).map((team, index) => `<tr><td>${index + 1}</td><td>${escapeHTML(team.equipo)}</td><td>${team.pj}</td><td>${team.gf - team.gc}</td><td>${team.pts}</td></tr>`).join("");
  if (fullBody) fullBody.innerHTML = standingsRows(standings);
};

const renderHome = (matches) => {
  const now = Date.now();
  const upcoming = matches.filter((match) => match.estado === "programado").sort((a, b) => matchTime(a) - matchTime(b));
  const next = upcoming.find((match) => matchTime(match) >= now) || upcoming[0];
  const latest = completedMatches(matches).sort((a, b) => matchTime(b) - matchTime(a))[0];
  const nextTarget = document.querySelector("#next-match");
  const latestTarget = document.querySelector("#latest-result");
  if (nextTarget) nextTarget.innerHTML = next ? matchCard(next) : `<p class="empty-state">No hay próximos partidos publicados.</p>`;
  if (latestTarget) latestTarget.innerHTML = latest ? matchCard(latest) : `<p class="empty-state">Aún no hay resultados publicados.</p>`;
  renderStandings(matches);
};

const renderCalendar = (matches) => {
  const target = document.querySelector("#calendar-list");
  if (!target) return;
  const ordered = [...matches].sort((a, b) => matchTime(a) - matchTime(b));
  target.innerHTML = ordered.length ? ordered.map(matchCard).join("") : `<p class="empty-state">Aún no hay partidos publicados.</p>`;
};

const renderStatistics = (matches) => {
  const scorersBody = document.querySelector("#scorers-table");
  const scorers = calculateScorers(matches);
  if (scorersBody) {
    scorersBody.innerHTML = scorers.length
      ? scorers.map((scorer, index) => `<tr><td>${index + 1}</td><td>${escapeHTML(scorer.jugador)}</td><td>${scorer.goles}</td></tr>`).join("")
      : `<tr><td colspan="3" class="empty-state">Aún no hay goles registrados.</td></tr>`;
  }
  renderStandings(matches);
};

const initials = (name) => String(name || "")
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toLocaleUpperCase("es");

const imageURL = (value) => {
  const source = String(value || "").trim();
  return source.startsWith("/") || source.startsWith("https://") ? source : "";
};

const renderRoster = (players) => {
  const target = document.querySelector("#roster-table");
  if (!target) return;
  const ordered = [...players].sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
  if (!ordered.length) {
    emptyMessage(target, "Aún no hay jugadores publicados.", 3);
    return;
  }
  target.innerHTML = ordered.map((player) => {
    const source = imageURL(player.imagen);
    const avatar = `<span class="player-avatar" aria-hidden="true"><span class="player-initials">${escapeHTML(initials(player.nombre))}</span>${source ? `<img class="player-photo" src="${escapeHTML(source)}" alt="" loading="lazy">` : ""}</span>`;
    return `<tr><td>${Number(player.dorsal) || "—"}</td><td><span class="player-name">${avatar}<span>${escapeHTML(player.nombre)}</span></span></td><td>${escapeHTML(player.posicion)}</td></tr>`;
  }).join("");
  target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
};

const showLoadError = () => {
  const message = "No se pudieron cargar los datos. Intenta actualizar la página.";
  document.querySelectorAll(".empty-state").forEach((element) => { element.textContent = message; });
};

const start = async () => {
  if (!PAGE) return;
  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = `${window.location.origin}${window.location.pathname}`;
  document.head.append(canonical);
  const openGraphURL = document.createElement("meta");
  openGraphURL.setAttribute("property", "og:url");
  openGraphURL.content = canonical.href;
  document.head.append(openGraphURL);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/js/sw.js").catch((error) => {
      console.error("No se pudo registrar el service worker.", error);
    });
  }
  try {
    const [matchResponse, rosterResponse] = await Promise.all([
      fetch("/content/partidos.json"),
      fetch("/content/plantel.json")
    ]);
    if (!matchResponse.ok || !rosterResponse.ok) throw new Error("Error al consultar contenido");
    const [matchData, rosterData] = await Promise.all([matchResponse.json(), rosterResponse.json()]);
    const matches = Array.isArray(matchData.partidos) ? matchData.partidos : [];
    const players = Array.isArray(rosterData.jugadores) ? rosterData.jugadores : [];

    if (PAGE === "inicio") renderHome(matches);
    if (PAGE === "calendario") renderCalendar(matches);
    if (PAGE === "estadisticas") renderStatistics(matches);
    if (PAGE === "plantel") renderRoster(players);
  } catch (error) {
    showLoadError();
    console.error("No se pudo cargar el contenido del equipo.", error);
  }
};

start();