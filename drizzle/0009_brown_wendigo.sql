CREATE TABLE `evaQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionText` text NOT NULL,
	`normalizedText` varchar(512) NOT NULL,
	`count` int NOT NULL DEFAULT 1,
	`lastAskedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `evaQuestions_normalizedText_unique` UNIQUE(`normalizedText`)
);
