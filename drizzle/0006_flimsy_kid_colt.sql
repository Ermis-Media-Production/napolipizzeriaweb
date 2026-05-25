CREATE TABLE `itemModifierGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`groupId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `itemModifierGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`price2` decimal(10,2),
	`price2Label` varchar(64),
	`imageUrl` text,
	`imageKey` varchar(256),
	`printLabel` enum('Food','Pizza','Pizzeria','Bar/Drinks') NOT NULL DEFAULT 'Food',
	`isAvailable` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menuItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modifierGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`required` boolean NOT NULL DEFAULT false,
	`minSelect` int NOT NULL DEFAULT 0,
	`maxSelect` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modifierGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modifierOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`priceAdjustment` decimal(10,2) NOT NULL DEFAULT '0',
	`isDefault` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `modifierOptions_id` PRIMARY KEY(`id`)
);
