CREATE TABLE `log` (
	`idx` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '고유번호',
	`created_at` DATETIME NOT NULL COMMENT '기록 날짜',
	`level` TINYINT NOT NULL COMMENT '로그 레벨',
	`subject` VARCHAR(128) NOT NULL COMMENT '분류',
	`content` TEXT NOT NULL COMMENT '로그 내용',
	`from` VARCHAR(128) NULL DEFAULT NULL COMMENT '기록 아이피',
	PRIMARY KEY (`idx`)
)
COLLATE='utf8_general_ci';

CREATE TABLE `blacklist` (
	`idx` INT UNSIGNED NOT NULL AUTO_INCREMENT,
	`last_connected` DATETIME NOT NULL,
	`address` VARCHAR(64) NOT NULL,
	`description` TEXT DEFAULT NULL,
	PRIMARY KEY (`idx`),
	UNIQUE KEY (`address`)
)
COLLATE='utf8_general_ci';