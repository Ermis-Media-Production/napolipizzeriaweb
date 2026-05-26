ALTER TABLE `scheduledOrders` MODIFY COLUMN `paymentMethod` enum('stripe','authorizenet','clover','cash','elavon') DEFAULT 'stripe';--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `elavonSessionId` varchar(256);--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `elavonTransactionId` varchar(128);