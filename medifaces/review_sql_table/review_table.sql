DROP TABLE IF EXISTS `medifaces_review`;
CREATE TABLE `medifaces_review` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `jive_profile_id` int(11) NOT NULL,
    `p_shown_id` int(11) NOT NULL,
    `known` int(11) NOT NULL,
    `unknown` int(11) NOT NULL,
    `done` boolean NOT NULL,
    PRIMARY KEY (`id`)
);
