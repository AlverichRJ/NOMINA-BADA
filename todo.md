# Sistema de Gestión de Asistencias y Nómina - TODO

## Base de Datos
- [x] Tabla empleados (id, nombre, salario_mensual, bonos, activo)
- [x] Tabla periodos (id, nombre, fecha_inicio, fecha_fin, archivo_original)
- [x] Tabla asistencias (id, empleado_id, periodo_id, fecha, entrada, salida, es_falta, es_descanso)
- [x] Tabla calculos_nomina (id, empleado_id, periodo_id, dias_laborables, dias_asistidos, dias_falta, descuento, salario_pagar)

## Backend
- [x] Parser de archivos TXT del reloj checador
- [x] Detección estricta de faltas (cualquier línea con "Falta")
- [x] Cálculo de descuentos: (Salario/30) × Días_Faltados
- [x] Cálculo de salario: (Salario/30) × Días_Laborables + Bonos - Descuentos
- [x] API CRUD de empleados
- [x] API para subir y procesar archivos TXT
- [x] API para obtener reportes por período
- [x] API para estadísticas generales

## Frontend
- [x] DashboardLayout con sidebar de navegación
- [x] Página Dashboard con estadísticas generales
- [x] Página Empleados: lista, crear, editar
- [x] Página Cargar Reporte: subida de archivo TXT
- [x] Página Reportes: tabla de asistencia por empleado
- [x] Tabla de asistencia con columnas FECHA, ENTRADA, SALIDA, FALTAS
- [x] Filas de faltas resaltadas en rojo
- [x] Resumen del período por empleado
- [x] Reporte ejecutivo con estadísticas

## Exportación
- [x] Exportación a PDF con formato profesional
- [x] Exportación a Excel (XLSX)

## Pruebas
- [x] Tests del parser TXT (14 tests pasando)
- [x] Tests de cálculo de descuentos
- [x] Tests de cálculo de salario

## Documentación
- [x] README_VSCODE.md con instrucciones para trabajar en VS Code

## Mejoras v2 - Tabla de Empleados
- [x] Agregar columnas dias_laborados y descuentos_adicionales a BD (ALTER TABLE)
- [x] Actualizar schema Drizzle con nuevos campos
- [x] Actualizar procedimiento tRPC empleados.update para nuevos campos
- [x] Edición inline de Días Laborados directamente en la tabla
- [x] Edición inline de Descuentos directamente en la tabla
- [x] Columna Salario Semanal calculada: (salario/30)*dias_laborados - descuentos
- [x] Fila de totales al pie de la tabla de empleados
- [x] Carga de 88 empleados con salarios correctos desde imagen
