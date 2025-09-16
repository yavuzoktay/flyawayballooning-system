CREATE TABLE IF NOT EXISTS additional_information_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES all_vouchers(id) ON DELETE CASCADE
);