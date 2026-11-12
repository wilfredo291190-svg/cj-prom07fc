import { readFile } from "node:fs/promises";

const readJSON = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const matchesContent = await readJSON("content/partidos.json");
const rosterContent = await readJSON("content/plantel.json");
const teamsContent = await readJSON("content/equipos.json");
const siteContent = await readJSON("content/site.json");

if (!Array.isArray(matchesContent.partidos)) throw new Error("content/partidos.json debe contener un arreglo partidos.");
if (!Array.isArray(rosterContent.jugadores)) throw new Error("content/plantel.json debe contener un arreglo jugadores.");
const normalizeTeam = (name) => String(name || "").trim().toLocaleLowerCase("es").replace(/^cj\s+/, "");
if (!Array.isArray(teamsContent.equipos) || !teamsContent.equipos.some((team) => normalizeTeam(team) === normalizeTeam(siteContent.nombre))) {
  throw new Error("content/equipos.json debe incluir el equipo del club.");
}
if (!siteContent.nombre?.trim() || !siteContent.institucion?.trim() || !siteContent.temporada?.trim()) throw new Error("content/site.json debe incluir nombre, institución y temporada.");

for (const [index, match] of matchesContent.partidos.entries()) {
  const label = `Partido ${index + 1}`;
  if (!Number.isInteger(match.jornada) || match.jornada < 1) throw new Error(`${label}: jornada debe ser un entero positivo.`);
  if (!Number.isFinite(Date.parse(match.fecha))) throw new Error(`${label}: fecha no es válida.`);
  if (!match.local?.trim() || !match.visitante?.trim()) throw new Error(`${label}: faltan los nombres de los equipos.`);
  if (!["programado", "finalizado", "suspendido"].includes(match.estado)) throw new Error(`${label}: estado no válido.`);
  if (match.estado === "finalizado" && (![match.golesLocal, match.golesVisitante].every((goals) => Number.isInteger(goals) && goals >= 0))) {
    throw new Error(`${label}: un partido finalizado debe tener ambos marcadores como enteros no negativos.`);
  }
  for (const scorer of match.goleadores || []) {
    if (!scorer.jugador?.trim() || !Number.isInteger(scorer.goles) || scorer.goles < 1) {
      throw new Error(`${label}: cada goleador debe tener nombre y al menos un gol.`);
    }
  }
}

for (const [index, player] of rosterContent.jugadores.entries()) {
  const hasValidDorsal = player.dorsal === null || player.dorsal === undefined
    || Number.isInteger(player.dorsal) && player.dorsal >= 0;
  if (!player.nombre?.trim() || !player.posicion?.trim() || !hasValidDorsal) {
    throw new Error(`Jugador ${index + 1}: nombre y posición son obligatorios; el dorsal debe ser un entero no negativo o estar vacío.`);
  }
  for (const stat of ["partidosJugados", "goles", "asistencias", "tarjetasAmarillas", "tarjetasRojas"]) {
    if (player[stat] !== undefined && (!Number.isInteger(player[stat]) || player[stat] < 0)) {
      throw new Error(`Jugador ${index + 1}: ${stat} debe ser un entero no negativo.`);
    }
  }
}

for (const [index, team] of teamsContent.equipos.entries()) {
  if (typeof team !== "string" || !team.trim() || teamsContent.equipos.indexOf(team) !== index) {
    throw new Error(`Equipo ${index + 1}: debe tener un nombre único.`);
  }
}

console.log(`Contenido válido: ${matchesContent.partidos.length} partidos, ${rosterContent.jugadores.length} jugadores y ${teamsContent.equipos.length} equipos.`);