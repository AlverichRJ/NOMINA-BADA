/**
 * Reprocesa el TXT con el parser corregido para actualizar las horas en la BD
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Importar el parser compilado (usamos require del JS compilado)
// Como es TypeScript, usamos el parser directamente en JS

function convertirHora12(horaStr) {
  const match = horaStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return horaStr;
  const [, h, m, ampm] = match;
  return h.padStart(2, '0') + ':' + m + ' ' + ampm.toUpperCase();
}

function extraerHoras(linea) {
  const lineaSinFecha = linea.replace(/\d{1,2}\/[a-záéíóú]+\/(\d{2})/gi, (m, anio) => {
    return m.slice(0, -anio.length) + 'XX';
  });
  const regex = /(?<!\d)(\d{1,2}):(\d{2})(am|pm)/gi;
  const resultados = [];
  let match;
  while ((match = regex.exec(lineaSinFecha)) !== null) {
    resultados.push(convertirHora12(match[1] + ':' + match[2] + match[3]));
  }
  return resultados;
}

const MESES = {
  ene: '01', jan: '01', feb: '02', mar: '03', abr: '04', apr: '04',
  may: '05', jun: '06', jul: '07', ago: '08', aug: '08',
  sep: '09', oct: '10', nov: '11', dic: '12', dec: '12',
};

function parsearFecha(diaStr, mesStr, anioStr) {
  const mes = MESES[mesStr.toLowerCase()];
  if (!mes) return null;
  const anio = anioStr.length === 2 ? `20${anioStr}` : anioStr;
  const dia = diaStr.padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Leer el TXT
  const txtPath = '/home/ubuntu/upload/TWReporte2033308.txt';
  const contenido = fs.readFileSync(txtPath, 'latin1');
  const lineas = contenido.split(/\r?\n/);
  
  // Obtener el período actual
  const [periodos] = await conn.execute('SELECT * FROM periodos ORDER BY id DESC LIMIT 1');
  const periodo = periodos[0];
  console.log('Período:', periodo.nombre, '| ID:', periodo.id);
  
  // Obtener todas las asistencias del período
  const [asistencias] = await conn.execute(
    'SELECT a.*, e.nombre as emp_nombre FROM asistencias a JOIN empleados e ON a.empleado_id = e.id WHERE a.periodo_id = ?',
    [periodo.id]
  );
  console.log('Asistencias a actualizar:', asistencias.length);
  
  // Parsear el TXT para obtener las horas correctas
  const reEmpleado = /^\s*\(\d+\)\s+(.+?)\s*$/;
  const reFechaCorta = /^\s*(?:lun|mar|mi[eé]|jue|vie|sáb|sab|dom)\.\s+(\d{1,2})\/([a-záéíóú]+)\/(\d{2})(?=\d{1,2}:|\s|$)/i;
  
  let empleadoActual = null;
  let diaActual = null;
  let horasAcumuladas = [];
  const registrosPorEmpleado = new Map(); // nombre -> [{ fecha, entrada, salida }]
  
  const guardarDia = () => {
    if (diaActual && empleadoActual) {
      if (horasAcumuladas.length > 0 && !diaActual.esFalta && !diaActual.esDescanso) {
        diaActual.entrada = horasAcumuladas[0] || null;
        diaActual.salida = horasAcumuladas.length > 1 ? horasAcumuladas[horasAcumuladas.length - 1] : null;
      }
      if (!registrosPorEmpleado.has(empleadoActual)) {
        registrosPorEmpleado.set(empleadoActual, []);
      }
      registrosPorEmpleado.get(empleadoActual).push({ ...diaActual });
      diaActual = null;
      horasAcumuladas = [];
    }
  };
  
  for (const linea of lineas) {
    const matchEmp = linea.match(reEmpleado);
    if (matchEmp && !linea.match(/Fecha|Horario|Tiempo|Resumen|Días|Faltas|Asistido|Falta|Descanso/i)) {
      guardarDia();
      empleadoActual = matchEmp[1].trim();
      diaActual = null;
      horasAcumuladas = [];
      continue;
    }
    
    if (!empleadoActual) continue;
    
    const reEstado = /^\s*(?:lunes|martes|mi[eé]rcoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\/([a-záéíóú]+)\/(\d{2,4})\s*(Asistido|Falta|Descanso)/i;
    const matchEstado = linea.match(reEstado);
    if (matchEstado) {
      const [, dia, mes, anio, estado] = matchEstado;
      const fecha = parsearFecha(dia, mes, anio);
      if (!fecha) continue;
      if (diaActual && diaActual.fecha !== fecha) guardarDia();
      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = { fecha, entrada: null, salida: null, esFalta: /falta/i.test(estado), esDescanso: /descanso/i.test(estado) };
      }
      continue;
    }
    
    const matchFechaCorta = linea.match(reFechaCorta);
    if (matchFechaCorta) {
      const [, dia, mes, anio] = matchFechaCorta;
      const fecha = parsearFecha(dia, mes, anio);
      if (!fecha) continue;
      if (diaActual && diaActual.fecha !== fecha) guardarDia();
      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = { fecha, entrada: null, salida: null, esFalta: false, esDescanso: false };
        horasAcumuladas = [];
      }
      if (/falta/i.test(linea)) diaActual.esFalta = true;
      const horas = extraerHoras(linea);
      horasAcumuladas.push(...horas);
      continue;
    }
    
    const reSoloHoras = /^\s*\d{1,2}:\d{2}(?:am|pm)/i;
    if (reSoloHoras.test(linea) && diaActual) {
      const horas = extraerHoras(linea);
      horasAcumuladas.push(...horas);
    }
  }
  guardarDia();
  
  console.log('Empleados parseados del TXT:', registrosPorEmpleado.size);
  
  // Actualizar las asistencias en la BD con las horas correctas
  let actualizados = 0;
  let sinMatch = 0;
  
  for (const asistencia of asistencias) {
    // Buscar el empleado en los registros parseados
    let registros = null;
    const nombreEmp = asistencia.emp_nombre.toLowerCase().trim();
    
    for (const [nombre, regs] of registrosPorEmpleado) {
      const nombreTxt = nombre.toLowerCase().trim();
      // Match por palabras en común
      const palabrasEmp = nombreEmp.split(' ').filter(p => p.length >= 3);
      const palabrasTxt = nombreTxt.split(' ').filter(p => p.length >= 3);
      const comunes = palabrasEmp.filter(p => palabrasTxt.includes(p)).length;
      if (comunes >= 2) {
        registros = regs;
        break;
      }
    }
    
    if (!registros) {
      sinMatch++;
      continue;
    }
    
    // Buscar el registro del día específico
    const reg = registros.find(r => r.fecha === asistencia.fecha);
    if (!reg) continue;
    
    // Actualizar la asistencia con las horas correctas
    await conn.execute(
      'UPDATE asistencias SET entrada = ?, salida = ? WHERE id = ?',
      [reg.entrada, reg.salida, asistencia.id]
    );
    actualizados++;
  }
  
  console.log(`\nActualizados: ${actualizados} asistencias`);
  console.log(`Sin match: ${sinMatch} asistencias`);
  
  // Verificar resultado
  const [sample] = await conn.execute(
    `SELECT e.nombre, a.fecha, a.entrada, a.salida 
     FROM asistencias a JOIN empleados e ON a.empleado_id = e.id 
     WHERE a.periodo_id = ? AND a.entrada IS NOT NULL 
     LIMIT 5`,
    [periodo.id]
  );
  console.log('\nMuestra de horas actualizadas:');
  for (const row of sample) {
    console.log(`  ${row.nombre} | ${row.fecha} | ${row.entrada} → ${row.salida}`);
  }
  
  await conn.end();
}

main().catch(e => console.error(e.message));
