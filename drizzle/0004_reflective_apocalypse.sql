ALTER TABLE `scheduledOrders` MODIFY COLUMN `status` enum('pending_payment','pending','confirmed','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `paymentMethod` enum('stripe','authorizenet','clover','cash') DEFAULT 'clover';--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `paymentStatus` enum('pending','paid','refunded','failed') DEFAULT 'paid';--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `cloverSessionId` varchar(128);--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `cloverPaymentId` varchar(128);