-- Optional manual migration if Node startup migration did not run.
-- Separates crew/pilot rows when Private and Shared share the same activity_id + date + time.

ALTER TABLE flight_crew_assignments ADD COLUMN slot_segment VARCHAR(32) NOT NULL DEFAULT '' AFTER time;
ALTER TABLE flight_crew_assignments DROP INDEX uniq_slot;
ALTER TABLE flight_crew_assignments ADD UNIQUE KEY uniq_slot (activity_id, date, time, slot_segment);

ALTER TABLE flight_pilot_assignments ADD COLUMN slot_segment VARCHAR(32) NOT NULL DEFAULT '' AFTER time;
ALTER TABLE flight_pilot_assignments DROP INDEX uniq_slot;
ALTER TABLE flight_pilot_assignments ADD UNIQUE KEY uniq_slot (activity_id, date, time, slot_segment);
