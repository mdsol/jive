/*
 Navicat MySQL Data Transfer

 Source Server         : medidata
 Source Server Type    : MySQL
 Source Server Version : 50550
 Source Host           : 173.194.85.32
 Source Database       : knowledgebase_report

 Target Server Type    : MySQL
 Target Server Version : 50550
 File Encoding         : utf-8

 Date: 08/18/2017 21:13:04 PM
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `help_center_articles`
-- ----------------------------
DROP TABLE IF EXISTS `help_center_articles`;
CREATE TABLE `help_center_articles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `zendesk_id` bigint(20) DEFAULT NULL,
  `section_id` bigint(20) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `body` text,
  `html_url` varchar(255) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `draft` varchar(255) DEFAULT NULL,
  `position` int(1) DEFAULT NULL,
  `locale` varchar(5) DEFAULT NULL,
  `outdated` varchar(5) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `jive_id` int(11) DEFAULT NULL,
  `jive_url` varchar(255) DEFAULT NULL,
  `jive_title` varchar(255) DEFAULT NULL,
  `jive_categories` varchar(1000) DEFAULT NULL,
  `jive_content` text CHARACTER SET utf8,
  `jive_place_id` int(11) DEFAULT NULL,
  `jive_content_id` varchar(255) DEFAULT NULL,
  `jive_updated` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  Table structure for `help_center_categories`
-- ----------------------------
DROP TABLE IF EXISTS `help_center_categories`;
CREATE TABLE `help_center_categories` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `zendesk_id` bigint(20) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `html_url` varchar(255) DEFAULT NULL,
  `position` int(1) DEFAULT NULL,
  `locale` varchar(5) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

-- ----------------------------
--  Table structure for `help_center_sections`
-- ----------------------------
DROP TABLE IF EXISTS `help_center_sections`;
CREATE TABLE `help_center_sections` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `zendesk_id` bigint(20) DEFAULT NULL,
  `category_id` bigint(20) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `html_url` varchar(255) DEFAULT NULL,
  `position` int(1) DEFAULT NULL,
  `locale` varchar(5) DEFAULT NULL,
  `outdated` varchar(5) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `jive_place_id` int(11) DEFAULT NULL,
  `jive_content_id` int(11) DEFAULT NULL,
  `jive_url` varchar(512) DEFAULT NULL,
  `jive_name` varchar(512) DEFAULT NULL,
  `jive_updated` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

SET FOREIGN_KEY_CHECKS = 1;
