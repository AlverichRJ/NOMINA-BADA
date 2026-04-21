CREATE TABLE `asistencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empleado_id` int NOT NULL,
	`periodo_id` int NOT NULL,
	`fecha` date NOT NULL,
	`entrada` varchar(20),
	`salida` varchar(20),
	`es_falta` boolean NOT NULL DEFAULT false,
	`es_descanso` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asistencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calculos_nomina` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empleado_id` int NOT NULL,
	`periodo_id` int NOT NULL,
	`dias_laborables` int NOT NULL DEFAULT 0,
	`dias_asistidos` int NOT NULL DEFAULT 0,
	`dias_falta` int NOT NULL DEFAULT 0,
	`descuento` decimal(12,2) NOT NULL DEFAULT '0',
	`salario_a_pagar` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calculos_nomina_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `empleados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`salario_mensual` decimal(12,2) NOT NULL DEFAULT '0',
	`bonos` decimal(12,2) NOT NULL DEFAULT '0',
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `empleados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `periodos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`fecha_inicio` date NOT NULL,
	`fecha_fin` date NOT NULL,
	`archivo_nombre` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `periodos_id` PRIMARY KEY(`id`)
);
