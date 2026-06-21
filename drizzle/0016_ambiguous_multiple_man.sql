ALTER TABLE `scheduledOrders` ADD `deliveryProvider` enum('doordash','uber');--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `deliveryExternalId` varchar(128);--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `deliveryTrackingUrl` text;--> statement-breakpoint
ALTER TABLE `scheduledOrders` ADD `deliveryStatus` varchar(64);