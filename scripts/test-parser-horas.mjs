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

const lineas = [
  'jue. 2/abr/268:50am2:42pm5:52',
  '6:30pm?0:00',
  'lun. 6/abr/268:42am1:59pm5:17',
  'mar. 7/abr/268:59am1:58pm4:59',
  'lun. 13/abr/268:59am7:51pm10:52',
  'mié. 1/abr/268:52am6:35pm9:43',
];

for (const linea of lineas) {
  const horas = extraerHoras(linea);
  console.log(`Línea: ${linea}`);
  console.log(`Horas: ${JSON.stringify(horas)}`);
  console.log();
}
