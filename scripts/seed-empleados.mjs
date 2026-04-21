import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida");
  process.exit(1);
}

const empleadosData = [
  // SECCIÓN PRINCIPAL - NÓMINA DEL 16 AL 22 DE ABRIL
  { nombre: "Yoleo Jimenez Moreno Solis", salario_mensual: "4000.00", bonos: "0", activo: 1 },
  { nombre: "Diego Alberto Rodriguez Garcia", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Angelica Sofia Elizondo", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Oswaldo Moreno Basulto", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Karely Ponce Hernandez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Lucia Elizabeth Figueroa Narciso", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Gisela Alejandra Valencia Valdez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Alejandro Gonzalez Hernandez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Carlos Alfonso Guerrero Alvarez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Alejandro Roberto Hernandez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Felipe Ramirez Abigail", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Nelson Arnoldo Guerrero Alvarez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Angel Leonardo Suarez Nolasco", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Alejandro Hernandez Hernandez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Azul Osvaldo Ramirez Guzman", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Rodrigo Alejandro Hernandez Rivas", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Yanet Alejandro Ramirez Juarez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Lorenzo Hernandez Cardenas", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Maribel Concepcion Laguna Valdes", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Christian Alejandro Morales Purcell", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Alexis Garcia Padilla", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Gerardo Reyes Valverde", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Ulises Manuel Julio Omar", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Ruben Alejandro Moreno Pita", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Gabriela Guerrero", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Oscar Noel Segura Becerra", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Guadalupe Hernandez Morales", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Karen Jacobo Aguirre Poblano", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Angela Nieto Moya Aguirre", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Guillermo Guzman Alvarez", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Daniela Hernandez Morales", salario_mensual: "3600.00", bonos: "0", activo: 1 },
  { nombre: "Brandon Alfredo Herrera Guerrero", salario_mensual: "3600.00", bonos: "0", activo: 1 },

  // SECCIÓN BBVA
  { nombre: "Jesus Macario Salinas Jimenez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Jesus Emmanuel Alvarez Medina", salario_mensual: "3280.00", bonos: "0", activo: 1 },
  { nombre: "Cesar Andres Lazaro Lemus", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Selene Sofia Dominguez Tellez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Jorge Alejandro Plancarte Juarez", salario_mensual: "2800.00", bonos: "0", activo: 1 },
  { nombre: "Maribel Martinez Hernandez", salario_mensual: "3280.00", bonos: "0", activo: 1 },
  { nombre: "Martha Alejandra Diaz", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Carlos Daniel Herrera Martinez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Rodrigo Adan Gonzalez Ugalde", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Edilson Lorena Rios Partida", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Luis Fernando Rios Villegas", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Edilson Barrera Hernandez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Mario Alberto Magaon Espinoza", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Guadalupe Salinas Perez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Sandra Salinas Luis", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Lorena Soto Perez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Felix Enrique Demografica Inocente", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Edgar Rios Vargas Ortiz", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Lucero Isabel Hernandez Hernandez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Ricardo Pino Valentin", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Cesar Daniel Diaz Albegali", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Oscar Daniel Medina Minuez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Gilberto Jesus Diaz Gutierrez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Kelly Montserrat Moran Orellana", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Grabiel Paulo Morales Garcia", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Dulce Maria Gonzalez Espinoza", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Esdeban Martinez de la Paz Ventura", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Gibran Adrian Moreno Garcia Ortiz", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Tahiana Ryan Mota", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Adriana Arenas Espinoza de la Bella", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Pedro Jorge Arenas Sanchez", salario_mensual: "3500.00", bonos: "0", activo: 1 },

  // SECCIÓN OTROS BANCOS
  { nombre: "Hector R Martinez", salario_mensual: "3700.00", bonos: "0", activo: 1 },
  { nombre: "Alicia Alejandra Plata", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Alejandra Gutierrez Sanchez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Laura Alejandra Magaon", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Angela Magaly Manzano Baez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Omar Alejandro Hernandez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Gabriela Ulloa", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Gerardo Ulloa", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Felipe Rangel", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Aide Emmanuel Gutierrez Segura", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Natalia Gutierrez Segura", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Dario Gonzalez Rangel", salario_mensual: "3500.00", bonos: "0", activo: 1 },
  { nombre: "Gato Melissa Cruz Ramirez", salario_mensual: "3500.00", bonos: "0", activo: 1 },
];

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log(`Insertando ${empleadosData.length} empleados...`);
  
  let insertados = 0;
  let errores = 0;
  
  for (const emp of empleadosData) {
    try {
      await connection.execute(
        `INSERT INTO empleados (nombre, salario_mensual, bonos, activo, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [emp.nombre, emp.salario_mensual, emp.bonos, emp.activo]
      );
      insertados++;
      console.log(`  ✓ ${emp.nombre} - $${emp.salario_mensual}`);
    } catch (err) {
      errores++;
      console.error(`  ✗ Error con ${emp.nombre}:`, err.message);
    }
  }
  
  console.log(`\n=== RESULTADO ===`);
  console.log(`Insertados: ${insertados}`);
  console.log(`Errores: ${errores}`);
  
  // Verificar total en la tabla
  const [rows] = await connection.execute("SELECT COUNT(*) as total FROM empleados");
  console.log(`Total en BD: ${rows[0].total} empleados`);
  
  await connection.end();
}

main().catch(console.error);
