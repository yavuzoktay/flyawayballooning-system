ALTER TABLE activity_availability
    ADD COLUMN IF NOT EXISTS hidden_flight_types VARCHAR(255) NULL AFTER flight_types,
    ADD COLUMN IF NOT EXISTS hidden_voucher_types VARCHAR(255) NULL AFTER voucher_types;

CREATE TABLE IF NOT EXISTS manifest_date_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manifest_date DATE NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_manifest_date (manifest_date)
) COMMENT 'Admin note attached to a manifest date';
