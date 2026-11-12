const PAGE = document.querySelector("main[data-view]")?.dataset.view;
const CLUB_NAME = "CJ Prom 07";
const DEFAULT_VENUE = "Cancha del Colegio Javier";
let currentPlayers = [];
let currentMatches = [];
let installPrompt = null;

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
  return new Intl.DateTimeFormat("es", { dateStyle: "full", timeZone: "America/Panama" }).format(date);
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hora por confirmar";
  return new Intl.DateTimeFormat("es", { timeStyle: "short", timeZone: "America/Panama", hourCycle: "h12" }).format(date);
};

const titleCase = (value) => String(value || "").trim().toLocaleLowerCase("es")
  .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));

const matchTime = (match) => {
  const timestamp = Date.parse(match.fecha);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

const icon = (name) => {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

const teamMarkup = (name, clubName) => sameTeam(name, clubName)
  ? `<strong>${escapeHTML(name)}</strong>`
  : escapeHTML(name);

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
    ? match.goleadores.map(({ jugador, goles }) => `${escapeHTML(titleCase(jugador))} (${asNumber(goles)})`).join(", ")
    : "";
  const calendarData = JSON.stringify({
    jornada: match.jornada,
    fecha: match.fecha,
    local: match.local,
    visitante: match.visitante,
    sede: match.sede || DEFAULT_VENUE
  });

  return `<article class="card match-card" data-status="${escapeHTML(match.estado)}">
    <div class="match-card-heading"><h2>Jornada ${escapeHTML(match.jornada)}</h2><span class="match-status" data-tone="${tone}">${label}</span></div>
    <div class="match-banner"><span class="team">${teamMarkup(match.local, clubName)}</span><strong class="vs${finished ? " score" : ""}">${score}</strong><span class="team">${teamMarkup(match.visitante, clubName)}</span></div>
    <div class="match-info">
      <p class="match-detail">${icon("calendar")}<time datetime="${escapeHTML(match.fecha)}">${escapeHTML(formatDate(match.fecha))}</time></p>
      <p class="match-detail">${icon("clock")}<time datetime="${escapeHTML(match.fecha)}">${escapeHTML(formatTime(match.fecha))}</time></p>
      <p class="match-detail">${icon("pin")}<span>${escapeHTML(match.sede || DEFAULT_VENUE)}</span></p>
      ${scorers ? `<p class="match-detail match-scorers">Goleadores: ${scorers}</p>` : ""}
      ${!finished && match.estado === "programado" ? `<div class="match-actions"><button class="calendar-save" type="button" data-calendar-match="${escapeHTML(calendarData)}">Guardar en mi calendario</button></div>` : ""}
    </div>
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
    ? scorers.map((scorer, index) => `<tr class="scorer-row"><td class="scorer-rank">${index + 1}</td><td><span class="player-name scorer-player">${playerAvatar(scorer.player)}<span>${escapeHTML(titleCase(scorer.jugador))}</span></span></td><td class="scorer-goals"><strong>${scorer.goles}</strong></td></tr>`).join("")
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

const renderPlayerDialog = (player, goals) => {
  let dialog = document.querySelector("#player-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "player-dialog";
    dialog.className = "player-dialog";
    dialog.setAttribute("aria-labelledby", "player-dialog-title");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  dialog.innerHTML = `<div class="dialog-heading"><p class="eyebrow">FICHA DEL JUGADOR</p><button class="dialog-close" type="button" aria-label="Cerrar ficha">&times;</button></div>
    <div class="player-profile">
      ${playerAvatar(player)}
      <h2 id="player-dialog-title">${escapeHTML(titleCase(player.nombre))}</h2>
      <p class="player-profile-meta">#${player.dorsal === null || player.dorsal === undefined ? "—" : asNumber(player.dorsal)} · ${escapeHTML(player.posicion || "Posición por confirmar")}</p>
      <p class="player-profile-goals">${displayStat(goals)}<span>goles en la temporada</span></p>
    </div>`;
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
  dialog.showModal();
};

const renderRoster = (players, matches) => {
  const target = document.querySelector("#roster-table");
  if (!target) return;
  const playerGoals = calculatePlayerGoals(players, matches);
  const ordered = [...players].sort((first, second) => asNumber(first.dorsal) - asNumber(second.dorsal));
  target.innerHTML = ordered.length ? ordered.map((player) => `<tr>
    <td>${player.dorsal === null || player.dorsal === undefined ? "—" : asNumber(player.dorsal)}</td><td><button class="player-name player-open" type="button" data-player-index="${players.indexOf(player)}" aria-label="Ver ficha de ${escapeHTML(titleCase(player.nombre))}">${playerAvatar(player)}<span>${escapeHTML(titleCase(player.nombre))}</span></button></td><td>${escapeHTML(player.posicion || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="3" class="empty-state">Sin jugadores publicados.</td></tr>`;
  target.querySelectorAll(".player-photo").forEach((image) => image.addEventListener("error", () => image.classList.add("is-hidden"), { once: true }));
  target.querySelectorAll("[data-player-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const player = players[Number(button.dataset.playerIndex)];
      if (player) renderPlayerDialog(player, playerGoals.get(player.nombre));
    });
  });
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
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-calendar-match]");
    if (!button) return;
    try {
      saveMatchToCalendar(JSON.parse(button.dataset.calendarMatch));
    } catch (error) {
      console.error("No se pudo preparar el evento para el calendario.", error);
    }
  });
};

const icsEscape = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const saveMatchToCalendar = (match) => {
  const start = new Date(match.fecha);
  if (Number.isNaN(start.getTime())) throw new Error("La fecha del partido no es válida.");
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const event = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CJ07 App//Calendario de partidos//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:cj07-jornada-${icsEscape(match.jornada)}-${start.getTime()}@cj-prom07fc`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${icsEscape(`${match.local} vs ${match.visitante} · Jornada ${match.jornada}`)}`,
    `LOCATION:${icsEscape(match.sede)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([event], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `cj07-jornada-${String(match.jornada).replace(/[^a-z0-9-]/gi, "-")}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const setupPWAInstall = () => {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  const dialog = document.createElement("dialog");
  dialog.className = "install-dialog";
  dialog.setAttribute("aria-labelledby", "install-title");
  dialog.innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">CJ PROM 07</p><h2 id="install-title">Llévanos a tu inicio</h2></div><button class="dialog-close" type="button" aria-label="Cerrar">&times;</button></div>
    <p class="install-help"></p>
    <ol class="install-steps"></ol>
    <button class="button-link" type="button" data-confirm-install hidden>Instalar ahora</button>`;
  document.body.append(dialog);
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector("[data-confirm-install]").addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") dialog.close();
      else dialog.querySelector(".install-help").textContent = "Puedes instalarla cuando quieras desde el menú del navegador.";
    } catch (error) {
      dialog.querySelector(".install-help").textContent = "No se pudo abrir la instalación. Usa las instrucciones de tu navegador.";
      console.error("No se pudo iniciar la instalación PWA.", error);
    }
    dialog.querySelector("[data-confirm-install]").hidden = true;
  });
  document.querySelectorAll("[data-install-app]").forEach((button) => button.addEventListener("click", () => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const steps = dialog.querySelector(".install-steps");
    const help = dialog.querySelector(".install-help");
    const installButton = dialog.querySelector("[data-confirm-install]");
    if (isIOS) {
      help.textContent = "En Safari, agrega CJ07 App a la pantalla de inicio:";
      steps.innerHTML = "<li>Toca Compartir (el cuadro con la flecha hacia arriba).</li><li>Elige “Añadir a pantalla de inicio”.</li><li>Confirma con “Añadir”.</li>";
      installButton.hidden = true;
    } else {
      help.textContent = "En Android, instala CJ07 App para abrirla a pantalla completa:";
      steps.innerHTML = "<li>Toca “Instalar ahora” si aparece el aviso.</li><li>Si no aparece, abre el menú ⋮ del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.</li>";
      installButton.hidden = !installPrompt;
    }
    dialog.showModal();
  }));
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
  setupPWAInstall();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

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