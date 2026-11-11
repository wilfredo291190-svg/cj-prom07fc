import { readFile } from "node:fs/promises";

const readJSON = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const matchesContent = await readJSON("content/partidos.json");
const rosterContent = await readJSON("content/plantel.json");

if (!Array.isArray(matchesContent.partidos)) throw new Error("content/partidos.json debe contener un arreglo partidos.");
if (!Array.isArray(rosterContent.jugadores)) throw new Error("content/plantel.json debe contener un arreglo jugadores.");

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
  if (!player.nombre?.trim() || !player.posicion?.trim() || !Number.isInteger(player.dorsal) || player.dorsal < 0) {
    throw new Error(`Jugador ${index + 1}: nombre, posición y dorsal válido son obligatorios.`);
  }
}

console.log(`Contenido válido: ${matchesContent.partidos.length} partidos y ${rosterContent.jugadores.length} jugadores.`);