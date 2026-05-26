CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('order','reservation') NOT NULL,
	`serviceType` enum('dine-in','pickup','delivery') NOT NULL,
	`scheduledDate` varchar(10) NOT NULL,
	`scheduledTime` varchar(5) NOT NULL,
	`partySize` int,
	`customerName` varchar(128) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`customerEmail` varchar(320),
	`deliveryAddress` text,
	`notes` text,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
