import mysql from "mysql2/promise";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

const txtRaw = fs.readFileSync("/home/ubuntu/upload/TWReporte2033308.txt");
const contenido = txtRaw.toString("latin1");
const lineas = contenido.split(/\r?\n/);

// ─── PARSER VERTIKAL ─────────────────────────────────────────────────────────
// Formato:
//   (1) Hermosillo Villarruel Christian Ivan
//   lunes 6/abr/26Falta 9:30
//   lun. 13/abr/268:59am7:51pm10:52        <- línea de hora (antes de la de estado)
//   lunes 13/abr/26Asistido10:529:301:22
//   Días laborables asistidos: 5 de 13
//   Faltas de asistencia: 8

const MESES = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12 };

function parseFecha(str) {
  // Formatos: "1/abr/26" o "01/abr/2026"
  const m = str.match(/(\d{1,2})\/([a-záéíóú]+)\/(\d{2,4})/i);
  if (!m) return null;
  const dia = m[1].padStart(2, "0");
  const mes = String(MESES[m[2].toLowerCase().substring(0,3)] || 1).padStart(2, "0");
  const anio = m[3].length === 2 ? "20" + m[3] : m[3];
  return `${anio}-${mes}-${dia}`;
}

function parseHora(str) {
  // "7:04pm" -> "7:04 PM", "8:59am" -> "8:59 AM", "10:52" -> "10:52"
  const m = str.match(/(\d{1,2}:\d{2})([aApP][mM])?/);
  if (!m) return null;
  if (m[2]) return `${m[1]} ${m[2].toUpperCase()}`;
  return m[1];
}

function esDomingo(fechaISO) {
  return new Date(fechaISO + "T12:00:00").getDay() === 0;
}

function parsearArchivo(lineas) {
  const empleados = [];
  let empActual = null;
  let fechaInicio = null;
  let fechaFin = null;
  // Mapa de fecha -> hora (de líneas de hora abreviada)
  let horasPendientes = {};

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const trim = linea.trim();
    if (!trim) continue;

    // Detectar nombre de empleado: "(N) Apellido Nombre"
    const matchNombre = trim.match(/^\((\d+)\)\s+(.+)$/);
    if (matchNombre) {
      if (empActual) empleados.push(empActual);
      empActual = { nombre: matchNombre[2].trim(), registros: [], diasAsistidos: 0, diasFalta: 0 };
      horasPendientes = {};
      continue;
    }

    if (!empActual) continue;

    // Detectar resumen: "Días laborables asistidos: 5 de 13"
    const matchAsistidos = trim.match(/D[íi]as laborables asistidos:\s*(\d+)/i);
    if (matchAsistidos) {
      empActual.diasAsistidos = parseInt(matchAsistidos[1]);
      continue;
    }

    // Detectar resumen: "Faltas de asistencia: 8"
    const matchFaltas = trim.match(/Faltas de asistencia:\s*(\d+)/i);
    if (matchFaltas) {
      empActual.diasFalta = parseInt(matchFaltas[1]);
      continue;
    }

    // Detectar línea de hora abreviada: "lun. 13/abr/268:59am7:51pm10:52"
    // Esta línea NO tiene "Asistido", "Falta" ni "Descanso"
    const matchHoraAbrev = trim.match(/^(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?\s+(\d{1,2}\/[a-z]+\/\d{2,4})(.+)/i);
    if (matchHoraAbrev && !/(Asistido|Falta|Descanso)/i.test(trim)) {
      const fecha = parseFecha(matchHoraAbrev[1]);
      const resto = matchHoraAbrev[2];
      // Extraer todas las horas
      const horas = [];
      const reHora = /(\d{1,2}:\d{2}(?:[aApP][mM])?)/g;
      let hm;
      while ((hm = reHora.exec(resto)) !== null) {
        horas.push(parseHora(hm[1]));
      }
      if (fecha && horas.length > 0) {
        horasPendientes[fecha] = { entrada: horas[0], salida: horas.length > 1 ? horas[horas.length - 1] : horas[0] };
      }
      continue;
    }

    // Detectar línea de estado: "lunes 6/abr/26Falta 9:30" o "lunes 13/abr/26Asistido10:52..."
    const matchEstado = trim.match(/^(?:lunes?|martes?|mi[eé]rcoles?|jueves?|viernes?|s[aá]bados?|domingos?|lun\.|mar\.|mi[eé]\.|jue\.|vie\.|s[aá]b\.|dom\.)\s+(\d{1,2}\/[a-z]+\/\d{2,4})(Asistido|Falta|Descanso)(.*)/i);
    if (matchEstado) {
      const fecha = parseFecha(matchEstado[1]);
      if (!fecha) continue;
      const estado = matchEstado[2];
      const esFalta = /falta/i.test(estado);
      const esDescanso = /descanso/i.test(estado) || esDomingo(fecha);

      // Tomar horas de horasPendientes si existen
      const horas = horasPendientes[fecha] || { entrada: null, salida: null };

      if (!fechaInicio || fecha < fechaInicio) fechaInicio = fecha;
      if (!fechaFin || fecha > fechaFin) fechaFin = fecha;

      empActual.registros.push({
        fecha,
        entrada: horas.entrada,
        salida: horas.salida,
        esFalta,
        esDescanso,
      });
      continue;
    }
  }

  if (empActual) empleados.push(empActual);
  return { empleados, fechaInicio, fechaFin };
}

const { empleados: empParsed, fechaInicio, fechaFin } = parsearArchivo(lineas);
console.log(`Empleados en TXT: ${empParsed.length}`);
console.log(`Período: ${fechaInicio} al ${fechaFin}`);

if (!fechaInicio || empParsed.length === 0) {
  console.error("Parser no encontró datos. Revisando muestra:");
  empParsed.slice(0, 3).forEach(e => console.log(e));
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// Obtener empleados de la BD
const [empleadosDB] = await conn.execute("SELECT id, nombre, salario_mensual, bonos FROM empleados");

function normalizar(s) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
const empleadosMap = new Map(empleadosDB.map(e => [normalizar(e.nombre), e]));

// Crear período
await conn.execute(
  "INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, archivo_nombre, createdAt) VALUES (?, ?, ?, ?, NOW())",
  [`${fechaInicio} al ${fechaFin}`, fechaInicio, fechaFin, "TWReporte2033308.txt"]
);
const [[{ id: periodoId }]] = await conn.execute("SELECT LAST_INSERT_ID() as id");
console.log(`Período creado ID: ${periodoId}`);

let procesados = 0;
const noEncontrados = [];

for (const emp of empParsed) {
  const nombreNorm = normalizar(emp.nombre);
  let empleadoDB = empleadosMap.get(nombreNorm);

  // Búsqueda parcial si no encontró exacto
  if (!empleadoDB) {
    for (const [key, val] of empleadosMap) {
      const partes = nombreNorm.split(" ").filter(p => p.length > 3);
      const coincidencias = partes.filter(p => key.includes(p)).length;
      if (coincidencias >= 2) { empleadoDB = val; break; }
    }
  }

  if (!empleadoDB) {
    noEncontrados.push(emp.nombre);
    continue;
  }

  const empleadoId = empleadoDB.id;
  const salario = parseFloat(empleadoDB.salario_mensual) || 0;
  const bonos = parseFloat(empleadoDB.bonos) || 0;

  // Insertar asistencias
  for (const r of emp.registros) {
    await conn.execute(
      `INSERT INTO asistencias (empleado_id, periodo_id, fecha, entrada, salida, es_falta, es_descanso, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [empleadoId, periodoId, r.fecha, r.entrada, r.salida, r.esFalta ? 1 : 0, r.esDescanso ? 1 : 0]
    );
  }

  // Usar los días del resumen del TXT si están disponibles, si no calcular
  const diasAsistidos = emp.diasAsistidos > 0 ? emp.diasAsistidos :
    Math.max(0, emp.registros.filter(r => !r.esDescanso).length - emp.registros.filter(r => r.esFalta).length);
  const diasFalta = emp.diasFalta > 0 ? emp.diasFalta : emp.registros.filter(r => r.esFalta).length;
  const diasLaborables = emp.registros.filter(r => !r.esDescanso).length;
  const descuento = (salario / 30) * diasFalta;
  const salarioAPagar = Math.max(0, (salario / 30) * diasAsistidos + bonos - descuento);

  // Insertar cálculo
  await conn.execute(
    `INSERT INTO calculos_nomina (empleado_id, periodo_id, dias_laborables, dias_asistidos, dias_falta, descuento, salario_a_pagar, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [empleadoId, periodoId, diasLaborables, diasAsistidos, diasFalta, descuento.toFixed(2), salarioAPagar.toFixed(2)]
  );

  // Actualizar dias_laborados en empleado
  await conn.execute(
    "UPDATE empleados SET dias_laborados = ?, updatedAt = NOW() WHERE id = ?",
    [diasAsistidos, empleadoId]
  );

  console.log(`  ✓ ${emp.nombre} → ${diasAsistidos} días / ${diasFalta} faltas`);
  procesados++;
}

console.log(`\n=== RESULTADO ===`);
console.log(`Procesados: ${procesados}`);
console.log(`No encontrados: ${noEncontrados.length}`);
if (noEncontrados.length > 0) console.log("Sin match:", noEncontrados);

const [check] = await conn.execute("SELECT COUNT(*) as total FROM empleados WHERE dias_laborados > 0");
console.log(`Empleados con días > 0: ${check[0].total}`);

await conn.end();
