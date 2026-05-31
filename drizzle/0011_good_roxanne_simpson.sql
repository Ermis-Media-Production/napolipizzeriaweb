CREATE TABLE `itemCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#6b7280',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itemCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `itemCategories_slug_unique` UNIQUE(`slug`)
);
