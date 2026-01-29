CREATE TABLE `api_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`errorCode` varchar(50),
	`errorMessage` text,
	`statusCode` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`status` enum('up','down') NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`durationSeconds` int,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_availability_id` PRIMARY KEY(`id`)
);
