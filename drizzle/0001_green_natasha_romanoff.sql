CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertId` varchar(100) NOT NULL,
	`deviceId` varchar(100),
	`severity` enum('critical','high','medium','low','info') NOT NULL,
	`category` varchar(100),
	`title` varchar(255) NOT NULL,
	`description` text,
	`timestamp` timestamp NOT NULL,
	`acknowledged` int NOT NULL DEFAULT 0,
	`acknowledgedAt` timestamp,
	`acknowledgedBy` varchar(255),
	`rawData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`tokenType` varchar(50) NOT NULL DEFAULT 'Bearer',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cli_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`command` text NOT NULL,
	`output` text,
	`status` enum('pending','success','failed','timeout') NOT NULL DEFAULT 'pending',
	`executedAt` timestamp,
	`completedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cli_commands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(100) NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`hostname` varchar(255),
	`macAddress` varchar(17),
	`ipAddress` varchar(45),
	`ipv6Address` varchar(45),
	`osType` varchar(100),
	`ssid` varchar(255),
	`vlan` int,
	`connected` int NOT NULL DEFAULT 0,
	`connectionType` varchar(50),
	`signalStrength` int,
	`healthScore` int,
	`rawData` json,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(100) NOT NULL,
	`hostname` varchar(255),
	`macAddress` varchar(17),
	`ipAddress` varchar(45),
	`serialNumber` varchar(255),
	`productType` varchar(255),
	`softwareVersion` varchar(255),
	`connected` int NOT NULL DEFAULT 0,
	`lastConnectTime` timestamp,
	`deviceFunction` varchar(100),
	`managedStatus` varchar(50),
	`rawData` json,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
