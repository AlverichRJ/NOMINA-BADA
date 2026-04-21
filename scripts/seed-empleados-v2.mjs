import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida");
  process.exit(1);
}

// Los salarios en el archivo usan formato $25.000,00 (puntos como separador de miles, coma como decimal)
// Los convertimos a número: $25.000,00 -> 25000.00
function parseSalario(str) {
  return parseFloat(str.replace("$", "").replace(/\./g, "").replace(",", "."));
}

const empleadosData = [
  // SECCIÓN PRINCIPAL
  { nombre: "Tellez Jimenez Noemi Isabel", salario: parseSalario("$25.000,00") },
  { nombre: "Diego Alberto Rodriguez Garcia", salario: parseSalario("$20.000,00") },
  { nombre: "Vizcarra Soto Elizabeth", salario: parseSalario("$20.000,00") },
  { nombre: "Ceseña Romero Braulio", salario: parseSalario("$20.000,00") },
  { nombre: "Avila Barroso Ricardo Antonio", salario: parseSalario("$20.000,00") },
  { nombre: "Lucia Elizabeth Figueroa Garcia", salario: parseSalario("$20.000,00") },
  { nombre: "David Alejandro Valencia Valdez", salario: parseSalario("$20.000,00") },
  { nombre: "Brando Hernandez Quiñonez", salario: parseSalario("$20.000,00") },
  { nombre: "Carlos Alonso Guerrero Alvarez", salario: parseSalario("$20.000,00") },
  { nombre: "Camacho Sandoval Roberto Alejandro", salario: parseSalario("$20.000,00") },
  { nombre: "Palacios Ramirez Abigail", salario: parseSalario("$20.000,00") },
  { nombre: "Edna Yamile Arellano Ramirez", salario: parseSalario("$20.000,00") },
  { nombre: "Nelson Emilio Saavedra Rivera", salario: parseSalario("$25.000,00") },
  { nombre: "Ismael Leonardo Juarez Nolasco", salario: parseSalario("$20.000,00") },
  { nombre: "Derly Yoliand Rodriguez Salto", salario: parseSalario("$10.000,00") },
  { nombre: "Arcel Osvaldo Balderas Gomez", salario: parseSalario("$18.000,00") },
  { nombre: "Veronica Alejandra Dominguez Tellez", salario: parseSalario("$20.000,00") },
  { nombre: "Alejandro Flores Madueño", salario: parseSalario("$20.000,00") },
  { nombre: "Octavio Zambrano Gonzalez", salario: parseSalario("$20.000,00") },
  { nombre: "Lorena Hernandez Carrasco", salario: parseSalario("$20.000,00") },
  { nombre: "Martha Concepcion Laguna Valdez", salario: parseSalario("$15.000,00") },
  { nombre: "Christian Ivan Hermosillo Villarruel", salario: parseSalario("$25.000,00") },
  { nombre: "Anais Garcia Padilla", salario: parseSalario("$20.000,00") },
  { nombre: "Jaquelin Reyes Valerio", salario: parseSalario("$21.000,00") },
  { nombre: "Chuc Mansur Julio Cesar", salario: parseSalario("$25.000,00") },
  { nombre: "Roberto Alonso Hernandez Piña", salario: parseSalario("$20.000,00") },
  { nombre: "Gabriela Guerrero", salario: parseSalario("$25.000,00") },
  { nombre: "Oscar Noe Segura Becerra", salario: parseSalario("$14.500,00") },
  { nombre: "Abraham Torres Ortega", salario: parseSalario("$18.000,00") },
  { nombre: "Karen Jocelyn Aguirre Robles", salario: parseSalario("$16.000,00") },
  { nombre: "Suarez Nieto Jesus Alberto", salario: parseSalario("$25.000,00") },
  { nombre: "Guillermo Guzman Aceves", salario: parseSalario("$20.000,00") },
  { nombre: "Ana Paola Beltran Briones", salario: parseSalario("$18.000,00") },
  { nombre: "Brandon Alexis Herrera Guerra", salario: parseSalario("$16.000,00") },

  // BBVA
  { nombre: "Jesus Mauricio Gomez Jimenez", salario: parseSalario("$20.000,00") },
  { nombre: "Jesus Emmanuel Alvares Medina", salario: parseSalario("$20.000,00") },
  { nombre: "Luis Angel Arredondo Balderas", salario: parseSalario("$20.000,00") },
  { nombre: "Cesar Andre Lozano Lemus", salario: parseSalario("$20.000,00") },
  { nombre: "Bladimir Madero Salazar", salario: parseSalario("$20.000,00") },
  { nombre: "Selene Sofia Dominguez Tellez", salario: parseSalario("$20.000,00") },
  { nombre: "Jorge Alejandro Melendez Soria", salario: parseSalario("$25.000,00") },
  { nombre: "Martinez Rubio Erik", salario: parseSalario("$30.000,00") },
  { nombre: "Natalia Camarena Hernandez", salario: parseSalario("$20.000,00") },
  { nombre: "Estela Alonso Diaz", salario: parseSalario("$14.500,00") },
  { nombre: "Carlos Daniel Herrera Martinez", salario: parseSalario("$20.000,00") },
  { nombre: "Hector Armando Quintero Hernandez", salario: parseSalario("$16.000,00") },
  { nombre: "Johana Lorena Rios Partida", salario: parseSalario("$20.000,00") },
  { nombre: "Luis Fernando Rios Villegas", salario: parseSalario("$15.000,00") },
  { nombre: "Esteban Bañuelos Garcia", salario: parseSalario("$20.000,00") },
  { nombre: "Mario Alberto Abrajan Ordorica", salario: parseSalario("$18.000,00") },
  { nombre: "Jaziel Yair Luna Garcia", salario: parseSalario("$20.000,00") },
  { nombre: "Sandra Solorio Luis", salario: parseSalario("$15.000,00") },
  { nombre: "Alejandra Mendoza", salario: parseSalario("$20.000,00") },
  { nombre: "Adriana Arredondo", salario: parseSalario("$20.000,00") },
  { nombre: "Felix Enrique Zempoalteca Saucedo", salario: parseSalario("$18.000,00") },
  { nombre: "Edgar Ulises Vargas Leon", salario: parseSalario("$18.000,00") },
  { nombre: "Racso Sami Cabrera Hernandez", salario: parseSalario("$18.000,00") },
  { nombre: "Ivan Zuno Sierra", salario: parseSalario("$20.000,00") },
  { nombre: "Ricardo Paez Valadez", salario: parseSalario("$15.000,00") },
  { nombre: "Cesar Jesus Perez Villegas", salario: parseSalario("$15.000,00") },
  { nombre: "Oscar Daniel Madera Meraz", salario: parseSalario("$15.000,00") },
  { nombre: "Alberto Jesus Diaz Calderon", salario: parseSalario("$15.000,00") },
  { nombre: "Karla Miranda Serrano Gastelum", salario: parseSalario("$20.000,00") },
  { nombre: "Grettel Paola Montes Garcia", salario: parseSalario("$15.000,00") },
  { nombre: "Oscar Guadalupe Cervantes Patino", salario: parseSalario("$15.000,00") },
  { nombre: "Esteban Mariano de la Paz Ventura", salario: parseSalario("$15.000,00") },
  { nombre: "Anneth Mathilda Serrano Gastelum", salario: parseSalario("$20.000,00") },
  { nombre: "Gibran Adrian Roman Corona", salario: parseSalario("$20.000,00") },
  { nombre: "Yahaira Rojas Mota", salario: parseSalario("$18.000,00") },
  { nombre: "Lesli Virginia Rodriguez Avila", salario: parseSalario("$18.000,00") },
  { nombre: "Pedro Jorge Arroyo Sanchez", salario: parseSalario("$15.000,00") },

  // OTROS BANCOS
  { nombre: "Hector X Martinez", salario: parseSalario("$16.000,00") },
  { nombre: "Martin Mendez Pineda", salario: parseSalario("$40.000,00") },
  { nombre: "Alejandra Gutierrez Sanchez", salario: parseSalario("$16.000,00") },
  { nombre: "Luis Daniel Garcia Jaramillo", salario: parseSalario("$18.000,00") },
  { nombre: "Juan Jose Mendoza Gallardo", salario: parseSalario("$25.000,00") },
  { nombre: "Angela Magaly Navarro Baro", salario: parseSalario("$25.000,00") },
  { nombre: "Laura Roberto Carlos", salario: parseSalario("$40.000,00") },
  { nombre: "Mariana Guridi Amezquita", salario: parseSalario("$16.000,00") },
  { nombre: "Cesar Alejandro Villanueva Aguero", salario: parseSalario("$18.000,00") },
  { nombre: "Gabriela Ulloa", salario: parseSalario("$15.000,00") },
  { nombre: "Yair Martinez Cisneros", salario: parseSalario("$18.000,00") },
  { nombre: "Felipe Rangel", salario: parseSalario("$12.000,00") },
  { nombre: "Erik Emmanuel Gutierrez Segura", salario: parseSalario("$15.000,00") },
  { nombre: "Pedro Esteban Barrios Sosa", salario: parseSalario("$18.000,00") },
  { nombre: "Cristiany Cardenas Rojas", salario: parseSalario("$20.000,00") },
  { nombre: "Cesar Octavio Olvera Lopez", salario: parseSalario("$16.000,00") },
  { nombre: "Karla Melissa Cruz Ramirez", salario: parseSalario("$18.000,00") },
];

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  // Borrar todos los empleados anteriores
  console.log("Borrando empleados anteriores...");
  await connection.execute("DELETE FROM empleados");
  console.log("Tabla limpiada.");

  console.log(`\nInsertando ${empleadosData.length} empleados con salarios correctos...`);

  let insertados = 0;
  let errores = 0;

  for (const emp of empleadosData) {
    try {
      await connection.execute(
        `INSERT INTO empleados (nombre, salario_mensual, bonos, activo, createdAt, updatedAt) 
         VALUES (?, ?, 0, 1, NOW(), NOW())`,
        [emp.nombre, emp.salario]
      );
      insertados++;
      console.log(`  ✓ ${emp.nombre} - $${emp.salario.toLocaleString("es-MX")}`);
    } catch (err) {
      errores++;
      console.error(`  ✗ Error con ${emp.nombre}:`, err.message);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Insertados: ${insertados}`);
  console.log(`Errores: ${errores}`);

  const [rows] = await connection.execute("SELECT COUNT(*) as total FROM empleados");
  console.log(`Total en BD: ${rows[0].total} empleados`);

  await connection.end();
}

main().catch(console.error);
