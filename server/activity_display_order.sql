-- One-time migration: persist activity list order for admin drag-and-drop.
-- Run against the same database the Node server uses (e.g. mysql client or admin tool).
-- If `display_order` already exists, skip the ALTER and only run the UPDATE if you need to reset order.

ALTER TABLE activity ADD COLUMN display_order INT NOT NULL DEFAULT 0;

-- Initialise order to match previous alphabetical listing (activity_name).
SET @rank = 0;
UPDATE activity SET display_order = (@rank := @rank + 1) ORDER BY activity_name;
