CREATE TABLE `records` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
