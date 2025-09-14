-- Test the extractTestNamesFromNotes function logic
-- This will help us debug why only CBC Test is being extracted

-- Let's manually test the regex patterns that should extract "CBC Test, MRI Scan"
-- from "fever - Consultation Fee: ₹500, Tests: CBC Test, MRI Scan"

-- Pattern 1: /Tests?:\s*([^.]+)/i
-- Should match: "Tests: CBC Test, MRI Scan"
-- Expected result: ["CBC Test", "MRI Scan"]

-- Pattern 2: Split by [,;|&]
-- "CBC Test, MRI Scan" -> ["CBC Test", "MRI Scan"]

-- Let's check what's actually in the test_requests table for these bills
SELECT 
  br.id,
  br.notes,
  COUNT(tr.id) as test_count,
  STRING_AGG(tr.test_name, ', ') as extracted_tests
FROM bill_requests br
LEFT JOIN test_requests tr ON br.id = tr.bill_request_id
WHERE br.notes ILIKE '%Tests:%'
GROUP BY br.id, br.notes
ORDER BY br.created_at DESC
LIMIT 5;
