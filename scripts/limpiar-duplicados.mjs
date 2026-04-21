import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

function normalizar(s) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Obtener empleados con salario > 0 (los originales correctos)
const [originales] = await conn.execute(
  "SELECT id, nombre FROM empleados WHERE salario_mensual > 0 AND activo = 1 ORDER BY id"
);
console.log("Originales con salario:", originales.length);

// Obtener empleados con salario = 0 (los duplicados creados por el TXT)
const [duplicados] = await conn.execute(
  "SELECT id, nombre FROM empleados WHERE salario_mensual = '0.00' AND activo = 1 ORDER BY id"
);
console.log("Duplicados a limpiar:", duplicados.length);

// Función de similitud: cuenta palabras en común (longitud >= 3)
function similitud(a, b) {
  const palabrasA = new Set(normalizar(a).split(" ").filter(p => p.length >= 3));
  const palabrasB = new Set(normalizar(b).split(" ").filter(p => p.length >= 3));
  let comunes = 0;
  for (const p of palabrasA) {
    if (palabrasB.has(p)) comunes++;
  }
  return comunes;
}

let reasignados = 0;
let sinMatch = [];

for (const dup of duplicados) {
  // Buscar el original con mayor similitud de nombre
  let mejorMatch = null;
  let mejorScore = 0;

  for (const orig of originales) {
    const score = similitud(dup.nombre, orig.nombre);
    if (score > mejorScore) {
      mejorScore = score;
      mejorMatch = orig;
    }
  }

  if (mejorMatch && mejorScore >= 2) {
    // Reasignar asistencias y calculos al empleado original
    await conn.execute("UPDATE asistencias SET empleado_id = ? WHERE empleado_id = ?", [mejorMatch.id, dup.id]);
    await conn.execute("UPDATE calculos_nomina SET empleado_id = ? WHERE empleado_id = ?", [mejorMatch.id, dup.id]);
    
    // Copiar dias_laborados si el original tiene 0 y el duplicado tiene > 0
    const [dupData] = await conn.execute("SELECT dias_laborados FROM empleados WHERE id = ?", [dup.id]);
    const [origData] = await conn.execute("SELECT dias_laborados FROM empleados WHERE id = ?", [mejorMatch.id]);
    if (dupData[0].dias_laborados > 0 && origData[0].dias_laborados === 0) {
      await conn.execute("UPDATE empleados SET dias_laborados = ? WHERE id = ?", [dupData[0].dias_laborados, mejorMatch.id]);
    }
    
    // Marcar duplicado como inactivo
    await conn.execute("UPDATE empleados SET activo = 0 WHERE id = ?", [dup.id]);
    console.log(`✓ "${dup.nombre}" -> "${mejorMatch.nombre}" (score: ${mejorScore})`);
    reasignados++;
  } else {
    sinMatch.push({ dup: dup.nombre, score: mejorScore, match: mejorMatch?.nombre });
  }
}

console.log(`\n=== RESULTADO ===`);
console.log(`Reasignados y limpiados: ${reasignados}`);
console.log(`Sin match suficiente: ${sinMatch.length}`);
if (sinMatch.length > 0) console.log("Sin match:", sinMatch);

// Verificar resultado
const [totalActivos] = await conn.execute("SELECT COUNT(*) as total FROM empleados WHERE activo = 1");
const [conSalario] = await conn.execute("SELECT COUNT(*) as total FROM empleados WHERE salario_mensual > 0 AND activo = 1");
console.log(`\nTotal activos: ${totalActivos[0].total}`);
console.log(`Con salario > 0: ${conSalario[0].total}`);

// Actualizar dias_laborados de los originales desde calculos_nomina del último período
const [ultimoPeriodo] = await conn.execute("SELECT MAX(id) as id FROM periodos");
const periodoId = ultimoPeriodo[0].id;
if (periodoId) {
  await conn.execute(`
    UPDATE empleados e
    JOIN calculos_nomina cn ON cn.empleado_id = e.id AND cn.periodo_id = ?
    SET e.dias_laborados = cn.dias_asistidos
    WHERE e.salario_mensual > 0
  `, [periodoId]);
  console.log(`\nDías laborados actualizados desde período ${periodoId}`);
}

await conn.end();
