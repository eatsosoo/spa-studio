CREATE TABLE `api_rate_limits` (
	`key` varchar(64) NOT NULL,
	`hits` int unsigned NOT NULL DEFAULT 1,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `api_rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `api_rate_limits_expires_idx` ON `api_rate_limits` (`expires_at`);