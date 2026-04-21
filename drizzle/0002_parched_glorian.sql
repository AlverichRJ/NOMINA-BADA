ALTER TABLE `asistencias` MODIFY COLUMN `fecha` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `periodos` MODIFY COLUMN `fecha_inicio` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `periodos` MODIFY COLUMN `fecha_fin` varchar(10) NOT NULL;