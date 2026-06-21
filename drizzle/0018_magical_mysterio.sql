CREATE TABLE `evaKnowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(32) NOT NULL DEFAULT 'info',
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 5,
	`expiresAt` timestamp,
	`createdBy` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaKnowledge_id` PRIMARY KEY(`id`)
);
