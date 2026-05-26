/**
 * Parser de archivos TXT del reloj checador VERTIKAL
 * Regla crítica: cualquier línea que contenga "Falta" = falta obligatoria
 */

export interface RegistroDia {
  fecha: string; // YYYY-MM-DD
  /** Primera marca del día: inicio de jornada laboral. */
  entrada: string | null;
  /** Segunda marca del día cuando existe comida: salida a comer. */
  salidaComida: string | null;
  /** Tercera marca del día cuando existe comida: regreso de comida. */
  entradaComida: string | null;
  /** Última marca del día: salida final de jornada laboral. */
  salida: string | null;
  esFalta: boolean;
  esDescanso: boolean;
}

export interface EmpleadoParsed {
  nombre: string;
  fechaIngreso: string | null;
  horario: string | null;
  registros: RegistroDia[];
  diasLaborablesAsistidos: number;
  faltasAsistencia: number;
}

export interface ParseResult {
  empleados: EmpleadoParsed[];
  fechaInicio: string | null;
  fechaFin: string | null;
}

// Mapeo de nombres de mes en español a número
const MESES: Record<string, string> = {
  ene: "01", jan: "01",
  feb: "02",
  mar: "03",
  abr: "04", apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08", aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12", dec: "12",
};

function parsearFecha(diaStr: string, mesStr: string, anioStr: string): string | null {
  const mes = MESES[mesStr.toLowerCase()];
  if (!mes) return null;
  const anio = anioStr.length === 2 ? `20${anioStr}` : anioStr;
  const dia = diaStr.padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function convertirHora12(horaStr: string): string {
  // Convierte "8:54am" o "8:11pm" a "08:54 AM" / "08:11 PM"
  const match = horaStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return horaStr;
  const [, h, m, ampm] = match;
  return `${h!.padStart(2, "0")}:${m} ${ampm.toUpperCase()}`;
}

function extraerHoras(linea: string): string[] {
  // El formato del TXT pega el año (2 dígitos) directamente con la hora: "268:50am".
  // Para separar correctamente: primero eliminar el año de la fecha (dd/mes/AA) de la línea.
  const lineaSinFecha = linea.replace(/\d{1,2}\/[a-záéíóú]+\/(\d{2})/gi, (match, anio) => {
    return match.slice(0, -anio.length) + "XX";
  });

  // Regla robusta para el TXT real del reloj checador:
  // solo son marcas válidas las horas con AM/PM. Los valores sin AM/PM, como 5:14 o 4:17,
  // pertenecen a la columna Tiempo y se descartan desde aquí para no contaminar comida.
  const regex = /(\d{1,2}):(\d{2})(am|pm)/gi;
  const resultados: string[] = [];
  let matchResult: RegExpExecArray | null;
  while ((matchResult = regex.exec(lineaSinFecha)) !== null) {
    const valor = `${matchResult[1]}:${matchResult[2]}${matchResult[3]}`;
    resultados.push(convertirHora12(valor));
  }
  return resultados;
}

function asignarMarcasDia(dia: RegistroDia, valores: string[]) {
  dia.entrada = valores[0] || null;

  if (valores.length >= 4) {
    dia.salidaComida = valores[1] || null;
    dia.entradaComida = valores[2] || null;
    dia.salida = valores[3] || null;
  } else if (valores.length === 3) {
    dia.salidaComida = valores[1] || null;
    dia.entradaComida = null;
    dia.salida = valores[2] || null;
  } else {
    dia.salidaComida = null;
    dia.entradaComida = null;
    dia.salida = valores[1] || null;
  }
}

/**
 * Parsea el contenido completo del archivo TXT
 */
export function parsearArchivo(contenido: string): ParseResult {
  // Normalizar saltos de línea y convertir a UTF-8 si es necesario
  const lineas = contenido.split(/\r?\n/);

  const empleados: EmpleadoParsed[] = [];
  let empleadoActual: EmpleadoParsed | null = null;
  let diaActual: RegistroDia | null = null;
  let horasAcumuladas: string[] = [];

  // Regex para detectar inicio de empleado: "(N) Nombre Apellido"
  const reEmpleado = /^\s*\(\d+\)\s+(.+?)\s*$/;

  // Regex para detectar línea de fecha corta: "lun. 1/abr/26..." o "mié. 1/abr/268:54am..."
  // IMPORTANTE: no dependemos del nombre exacto del día, porque en archivos Latin-1 mal decodificados
  // los acentos pueden llegar como "s�b.", "mi�rcoles" o variantes mojibake. La fecha es la fuente confiable.
  // El lookahead (?=\d{1,2}:) captura cuando la hora va pegada al año (ej: 268:50am -> año=26, hora=8:50am)
  const reFechaCorta = /^\s*[^\d\/\r\n]+?\s+(\d{1,2})\/([a-záéíóúñ]+)\/(\d{2})(?=\d{1,2}:|\s|$)/i;

  // Regex para detectar línea de estado: "lunes 1/abr/26Asistido..." o "miércoles 15/abr/26Falta..."
  // Nota: el estado puede aparecer pegado a la fecha o separado por espacio. También aquí ignoramos
  // el nombre exacto del día para no perder sábados/miércoles cuando el acento llegue corrupto.
  const reEstado = /^\s*[^\d\/\r\n]+?\s+(\d{1,2})\/([a-záéíóúñ]+)\/(\d{2,4})\s*(Asistido|Falta|Descanso)/i;

  // Regex para detectar línea de ingreso
  const reIngreso = /Fecha de ingreso:\s*(\S+)/i;
  const reHorario = /Horario:\s*(.+)/i;

  // Regex para resumen del período
  const reDiasAsistidos = /D[ií]as laborables asistidos:\s*(\d+)\s+de\s+(\d+)/i;
  const reFaltasAsistencia = /Faltas de asistencia:\s*(\d+)/i;

  // Regex para líneas de solo horas (sin fecha)
  const reSoloHoras = /^\s*\d{1,2}:\d{2}(?:am|pm)/i;

  let fechaInicio: string | null = null;
  let fechaFin: string | null = null;

  const guardarDiaActual = () => {
    if (diaActual && empleadoActual) {
      // Interpretar solo las marcas reales del reloj checador en orden cronológico.
      // Las duraciones de la columna Tiempo no tienen AM/PM y se descartan al extraer horas.
      if (horasAcumuladas.length > 0 && !diaActual.esFalta && !diaActual.esDescanso) {
        asignarMarcasDia(diaActual, horasAcumuladas);
      }
      empleadoActual.registros.push(diaActual);
      diaActual = null;
      horasAcumuladas = [];
    }
  };

  for (const linea of lineas) {
    // Detectar nuevo empleado
    const matchEmpleado = linea.match(reEmpleado);
    if (matchEmpleado && !linea.match(/Fecha|Horario|Tiempo|Resumen|D[ií]as|Faltas|Asistido|Falta|Descanso/i)) {
      guardarDiaActual();
      if (empleadoActual) {
        empleados.push(empleadoActual);
      }
      empleadoActual = {
        nombre: matchEmpleado[1]!.trim(),
        fechaIngreso: null,
        horario: null,
        registros: [],
        diasLaborablesAsistidos: 0,
        faltasAsistencia: 0,
      };
      diaActual = null;
      horasAcumuladas = [];
      continue;
    }

    if (!empleadoActual) continue;

    // Detectar fecha de ingreso
    const matchIngreso = linea.match(reIngreso);
    if (matchIngreso) {
      empleadoActual.fechaIngreso = matchIngreso[1]!;
      continue;
    }

    // Detectar horario
    const matchHorario = linea.match(reHorario);
    if (matchHorario) {
      empleadoActual.horario = matchHorario[1]!.trim();
      continue;
    }

    // Detectar resumen del período
    const matchDiasAsistidos = linea.match(reDiasAsistidos);
    if (matchDiasAsistidos) {
      empleadoActual.diasLaborablesAsistidos = parseInt(matchDiasAsistidos[1]!);
      continue;
    }

    const matchFaltasAsistencia = linea.match(reFaltasAsistencia);
    if (matchFaltasAsistencia) {
      empleadoActual.faltasAsistencia = parseInt(matchFaltasAsistencia[1]!);
      continue;
    }

    // Detectar línea de estado (lunes/martes/etc. con Asistido/Falta/Descanso)
    const matchEstado = linea.match(reEstado);
    if (matchEstado) {
      const [, dia, mes, anio, estado] = matchEstado;
      const fecha = parsearFecha(dia!, mes!, anio!);
      if (!fecha) continue;

      // Si hay un día previo sin estado, guardarlo
      if (diaActual && diaActual.fecha !== fecha) {
        guardarDiaActual();
      }

      const esFalta = /falta/i.test(estado!);
      const esDescanso = /descanso/i.test(estado!);

      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = {
          fecha,
          entrada: null,
          salidaComida: null,
          entradaComida: null,
          salida: null,
          esFalta,
          esDescanso,
        };
      } else {
        diaActual.esFalta = esFalta;
        diaActual.esDescanso = esDescanso;
      }

      // Actualizar fechas del período
      if (!fechaInicio || fecha < fechaInicio) fechaInicio = fecha;
      if (!fechaFin || fecha > fechaFin) fechaFin = fecha;

      continue;
    }

    // Detectar línea de fecha corta con horas
    const matchFechaCorta = linea.match(reFechaCorta);
    if (matchFechaCorta) {
      const [, dia, mes, anio] = matchFechaCorta;
      const fecha = parsearFecha(dia!, mes!, anio!);
      if (!fecha) continue;

      // Guardar día anterior si es diferente
      if (diaActual && diaActual.fecha !== fecha) {
        guardarDiaActual();
      }

      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = {
          fecha,
          entrada: null,
          salidaComida: null,
          entradaComida: null,
          salida: null,
          esFalta: false,
          esDescanso: false,
        };
        horasAcumuladas = [];
      }

      // REGLA CRÍTICA: si la línea contiene "Falta", es falta obligatoria
      if (/falta/i.test(linea)) {
        diaActual.esFalta = true;
      }

      // Extraer horas de esta línea
      const horas = extraerHoras(linea);
      for (const hora of horas) {
        horasAcumuladas.push(hora);
      }

      // Actualizar fechas del período
      if (!fechaInicio || fecha < fechaInicio) fechaInicio = fecha;
      if (!fechaFin || fecha > fechaFin) fechaFin = fecha;

      continue;
    }

    // Detectar líneas de solo horas (registros adicionales del mismo día)
    if (reSoloHoras.test(linea) && diaActual) {
      const horas = extraerHoras(linea);
      for (const hora of horas) {
        horasAcumuladas.push(hora);
      }
      continue;
    }

    // REGLA CRÍTICA: cualquier línea con "Falta" marca el día actual como falta
    // EXCEPCIÓN: líneas de resumen como "Faltas de asistencia: N" no cuentan
    if (/falta/i.test(linea) && diaActual && !/faltas de asistencia/i.test(linea) && !/tomando en cuenta faltas/i.test(linea)) {
      diaActual.esFalta = true;
    }
  }

  // Guardar último día y último empleado
  guardarDiaActual();
  if (empleadoActual) {
    empleados.push(empleadoActual);
  }

  return { empleados, fechaInicio, fechaFin };
}

/**
 * Calcula si una fecha es domingo (no laborable)
 */
export function esDomingo(fechaStr: string): boolean {
  const fecha = new Date(fechaStr + "T12:00:00Z");
  return fecha.getUTCDay() === 0;
}

/**
 * Calcula los días laborables en un rango (excluye domingos)
 */
export function calcularDiasLaborables(registros: RegistroDia[]): number {
  return registros.filter((r) => !r.esDescanso && !esDomingo(r.fecha)).length;
}

/**
 * Calcula el descuento por faltas
 * Fórmula: (Salario / 30) × Días_Faltados
 */
export function calcularDescuento(salarioMensual: number, diasFalta: number): number {
  return (salarioMensual / 30) * diasFalta;
}

/**
 * Calcula el salario a pagar
 * Fórmula: (Salario / 30) × Días_Laborables + Bonos - Descuentos
 */
export function calcularSalarioAPagar(
  salarioMensual: number,
  diasLaborables: number,
  bonos: number,
  descuento: number
): number {
  return (salarioMensual / 30) * diasLaborables + bonos - descuento;
}
