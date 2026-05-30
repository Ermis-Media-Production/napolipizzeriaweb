CREATE TABLE `aiUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feature` varchar(64) NOT NULL,
	`model` varchar(64) NOT NULL DEFAULT 'gpt-4o-mini',
	`promptTokens` int NOT NULL DEFAULT 0,
	`completionTokens` int NOT NULL DEFAULT 0,
	`totalTokens` int NOT NULL DEFAULT 0,
	`estimatedCostUsd` decimal(10,6) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiUsageLogs_id` PRIMARY KEY(`id`)
);
