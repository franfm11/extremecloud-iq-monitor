CREATE TABLE `device_availability_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`eventType` enum('up','down','flapping_detected') NOT NULL,
	`status` enum('up','down') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`durationSeconds` int,
	`reason` varchar(255),
	`detectionMethod` varchar(50),
	`retryAttempts` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_availability_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flapping_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`transitionCount` int NOT NULL,
	`timeWindowSeconds` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`severity` enum('low','medium','high') NOT NULL,
	`acknowledged` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flapping_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planned_downtime` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`recurring` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planned_downtime_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `polling_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pollingIntervalSeconds` int NOT NULL DEFAULT 300,
	`fastPollingIntervalSeconds` int NOT NULL DEFAULT 30,
	`fastPollingRetries` int NOT NULL DEFAULT 3,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `polling_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `polling_config_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_endpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(255),
	`enabled` int NOT NULL DEFAULT 1,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_endpoints_id` PRIMARY KEY(`id`)
);
