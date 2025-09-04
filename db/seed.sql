-- Sample data for development and testing

-- Create a sample user
INSERT INTO public.users (email, full_name) VALUES
('john.doe@example.com', 'John Doe')
ON CONFLICT (email) DO NOTHING;

-- Get the user ID for reference
-- Note: In a real scenario, you'd use the returned UUID, but for seeding we'll assume this is the first user

-- Create sample companies
INSERT INTO public.companies (name, phone, website, notes) VALUES
('TechCorp Solutions', '+1-555-0101', 'https://techcorp.com', 'Leading technology solutions provider'),
('Global Industries', '+1-555-0102', 'https://globalind.com', 'Manufacturing and distribution company'),
('Innovate Labs', '+1-555-0103', 'https://innovatelabs.com', 'Research and development firm')
ON CONFLICT DO NOTHING;

-- Create sample contacts
INSERT INTO public.contacts (company_id, first_name, last_name, email, phone, title, tags) VALUES
(
  (SELECT id FROM public.companies WHERE name = 'TechCorp Solutions' LIMIT 1),
  'Jane', 'Smith', 'jane.smith@techcorp.com', '+1-555-1001', 'VP of Sales', ARRAY['decision-maker', 'tech-savvy']
),
(
  (SELECT id FROM public.companies WHERE name = 'Global Industries' LIMIT 1),
  'Mike', 'Johnson', 'mike.johnson@globalind.com', '+1-555-1002', 'CEO', ARRAY['executive', 'manufacturing']
),
(
  (SELECT id FROM public.companies WHERE name = 'Innovate Labs' LIMIT 1),
  'Sarah', 'Williams', 'sarah.williams@innovatelabs.com', '+1-555-1003', 'CTO', ARRAY['technical', 'innovation']
),
(
  (SELECT id FROM public.companies WHERE name = 'TechCorp Solutions' LIMIT 1),
  'Bob', 'Brown', 'bob.brown@techcorp.com', '+1-555-1004', 'Sales Manager', ARRAY['sales', 'manager']
)
ON CONFLICT DO NOTHING;

-- Create sample deals across different stages
INSERT INTO public.deals (title, company_id, contact_id, amount, stage_id) VALUES
(
  'Enterprise Software License',
  (SELECT id FROM public.companies WHERE name = 'TechCorp Solutions' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'jane.smith@techcorp.com' LIMIT 1),
  50000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'New' LIMIT 1)
),
(
  'Manufacturing Automation System',
  (SELECT id FROM public.companies WHERE name = 'Global Industries' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'mike.johnson@globalind.com' LIMIT 1),
  150000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Qualified' LIMIT 1)
),
(
  'R&D Partnership Agreement',
  (SELECT id FROM public.companies WHERE name = 'Innovate Labs' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'sarah.williams@innovatelabs.com' LIMIT 1),
  75000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Proposal' LIMIT 1)
),
(
  'Cloud Migration Services',
  (SELECT id FROM public.companies WHERE name = 'TechCorp Solutions' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'bob.brown@techcorp.com' LIMIT 1),
  25000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Won' LIMIT 1)
),
(
  'Legacy System Upgrade',
  (SELECT id FROM public.companies WHERE name = 'Global Industries' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'mike.johnson@globalind.com' LIMIT 1),
  80000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Lost' LIMIT 1)
),
(
  'AI Integration Project',
  (SELECT id FROM public.companies WHERE name = 'Innovate Labs' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'sarah.williams@innovatelabs.com' LIMIT 1),
  120000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Qualified' LIMIT 1)
),
(
  'Data Analytics Platform',
  (SELECT id FROM public.companies WHERE name = 'TechCorp Solutions' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'jane.smith@techcorp.com' LIMIT 1),
  45000.00,
  (SELECT id FROM public.deal_stages WHERE name = 'Proposal' LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Create sample activities
INSERT INTO public.activities (deal_id, contact_id, type, summary, due_at, done) VALUES
(
  (SELECT id FROM public.deals WHERE title = 'Enterprise Software License' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'jane.smith@techcorp.com' LIMIT 1),
  'call', 'Initial discovery call', NOW() + INTERVAL '2 days', false
),
(
  (SELECT id FROM public.deals WHERE title = 'Manufacturing Automation System' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'mike.johnson@globalind.com' LIMIT 1),
  'task', 'Prepare technical proposal', NOW() + INTERVAL '1 day', false
),
(
  (SELECT id FROM public.deals WHERE title = 'R&D Partnership Agreement' LIMIT 1),
  (SELECT id FROM public.contacts WHERE email = 'sarah.williams@innovatelabs.com' LIMIT 1),
  'email', 'Send partnership proposal', NOW() + INTERVAL '3 hours', true
)
ON CONFLICT DO NOTHING;
