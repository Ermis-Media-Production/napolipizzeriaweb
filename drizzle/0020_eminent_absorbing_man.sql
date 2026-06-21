CREATE TABLE `itemVariantGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text,
	`imageUrl` text,
	`badges` json DEFAULT ('[]'),
	`isAvailable` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itemVariantGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itemVariants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`label` varchar(64) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itemVariants_id` PRIMARY KEY(`id`)
);
