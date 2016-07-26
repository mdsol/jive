ALTER TABLE medifaces_review MODIFY COLUMN known int(11) NOT NULL DEFAULT 0;
ALTER TABLE medifaces_review MODIFY COLUMN unknown int(11) NOT NULL DEFAULT 0;
ALTER TABLE medifaces_review MODIFY COLUMN done boolean NOT NULL DEFAULT FALSE;
