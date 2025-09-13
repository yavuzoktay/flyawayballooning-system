-- Fix broken journey_types data in additional_information_questions table
USE flyawayballooning;

-- First, let's see what broken data we have
SELECT id, question_text, journey_types 
FROM additional_information_questions 
WHERE journey_types IS NOT NULL 
AND journey_types NOT LIKE '["%"]'
AND journey_types NOT LIKE '[]'
LIMIT 10;

-- Check for truncated "Book Fligh" entries
SELECT id, question_text, journey_types 
FROM additional_information_questions 
WHERE journey_types LIKE '%Book Fligh%'
OR journey_types LIKE '%Book Flight%'
LIMIT 10;

-- Fix the broken journey_types data
-- Update records with invalid JSON to have proper default values
UPDATE additional_information_questions 
SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]'
WHERE journey_types IS NULL 
OR journey_types = ''
OR journey_types NOT LIKE '["%"]'
OR journey_types NOT LIKE '[]'
OR journey_types LIKE '%Book Fligh%'
OR journey_types LIKE '%Book Flight%'
OR JSON_VALID(journey_types) = 0;

-- Verify the fix
SELECT id, question_text, journey_types 
FROM additional_information_questions 
WHERE id IN (13, 14, 16)
ORDER BY id;

-- Check all journey_types are now valid JSON
SELECT id, question_text, journey_types, JSON_VALID(journey_types) as is_valid_json
FROM additional_information_questions 
WHERE journey_types IS NOT NULL
ORDER BY id;
