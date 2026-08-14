-- =========================================================
-- ResQAI DEMO SEED DATA
-- NOTE: FOR DEMO AND SIMULATION PURPOSES ONLY
-- =========================================================

-- 1. DEMO DEPARTMENTS
INSERT INTO departments (id, name, department_type, contact_number, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 'Emergency Medical Services (EMS)', 'MEDICAL', '+91 80 2222 0108', true),
('d2222222-2222-2222-2222-222222222222', 'Fire & Emergency Rescue Services', 'FIRE', '+91 80 2222 0101', true),
('d3333333-3333-3333-3333-333333333333', 'Bangalore City Police', 'POLICE', '+91 80 2222 0100', true),
('d4444444-4444-4444-4444-444444444444', 'State Disaster Response Force (SDRF)', 'DISASTER_MANAGEMENT', '+91 80 2222 0107', true);

-- 2. DEMO LOCATIONS / ZONES
INSERT INTO locations (id, name, address, latitude, longitude, zone, risk_level) VALUES
('l1111111-1111-1111-1111-111111111111', 'Central Business District', 'MG Road / Residency Road Corridor', 12.9716, 77.5946, 'Central Zone', 'HIGH'),
('l2222222-2222-2222-2222-222222222222', 'Peenya Industrial Area', 'Peenya Phase 2 Industrial Belt', 13.0285, 77.5197, 'North-West Zone', 'CRITICAL'),
('l3333333-3333-3333-3333-333333333333', 'Koramangala Tech Hub', '80 Feet Road, Koramangala', 12.9352, 77.6245, 'South-East Zone', 'MEDIUM'),
('l4444444-4444-4444-4444-444444444444', 'Whitefield IT Expressway', 'ITPL Main Road, Whitefield', 12.9698, 77.7500, 'East Zone', 'MEDIUM'),
('l5555555-5555-5555-5555-555555555555', 'JP Nagar Residential Sector', '100 Feet Ring Road, JP Nagar', 12.9077, 77.5857, 'South Zone', 'LOW');

-- 3. DEMO HOSPITALS (5 Hospitals)
INSERT INTO hospitals (id, name, address, latitude, longitude, emergency_capability, available_beds, icu_available, status, contact_number) VALUES
('h1111111-1111-1111-1111-111111111111', 'Apex City Trauma Institute', 'Central District, MG Road', 12.9716, 77.5946, ARRAY['LEVEL_1_TRAUMA', 'ICU', 'NEUROSURGERY', 'BURN_UNIT'], 28, 6, 'OPERATIONAL', '+91 80 2222 1000'),
('h2222222-2222-2222-2222-222222222222', 'St. Jude Emergency Hospital', 'JP Nagar 2nd Phase', 12.9077, 77.5857, ARRAY['LEVEL_2_TRAUMA', 'ICU', 'CARDIAC_CARE'], 14, 3, 'OPERATIONAL', '+91 80 2666 2000'),
('h3333333-3333-3333-3333-333333333333', 'Metro Care Specialty Center', '80 Feet Road, Koramangala', 12.9352, 77.6245, ARRAY['LEVEL_1_TRAUMA', 'ICU', 'TOXICOLOGY'], 19, 4, 'OPERATIONAL', '+91 80 2555 3000'),
('h4444444-4444-4444-4444-444444444444', 'Eastside General Hospital', 'Whitefield ITPL Road', 12.9698, 77.7500, ARRAY['LEVEL_2_TRAUMA', 'ICU', 'PEDIATRIC_EMERGENCY'], 8, 1, 'NEAR_CAPACITY', '+91 80 2845 4000'),
('h5555555-5555-5555-5555-555555555555', 'Peenya Industrial Toxicology Center', 'Peenya Industrial Estate', 13.0285, 77.5197, ARRAY['TOXICOLOGY', 'HAZMAT_DECON', 'ICU', 'BURN_UNIT'], 12, 2, 'OPERATIONAL', '+91 80 2839 7000');

-- 4. DEMO RESOURCES (15 Units: 5 Ambulances, 4 Fire, 4 Police, 2 Rescue)
INSERT INTO resources (id, resource_code, name, resource_type, status, latitude, longitude, capability, capacity, department_id, is_active) VALUES
-- 5 Ambulances
('r1111111-1111-1111-1111-111111111111', 'AMB-01', 'ALS Rapid Medical Response 1', 'AMBULANCE', 'AVAILABLE', 12.9720, 77.5900, ARRAY['ADVANCED_LIFE_SUPPORT', 'CARDIAC_MONITOR', 'VENTILATOR'], 2, 'd1111111-1111-1111-1111-111111111111', true),
('r1111111-1111-1111-1111-222222222222', 'AMB-02', 'Trauma Critical Response 2', 'AMBULANCE', 'AVAILABLE', 12.9250, 77.5820, ARRAY['ADVANCED_LIFE_SUPPORT', 'EXTRICATION', 'CRUSH_INJURY_MANAGEMENT'], 2, 'd1111111-1111-1111-1111-111111111111', true),
('r1111111-1111-1111-1111-333333333333', 'AMB-03', 'Koramangala BLS Unit 3', 'AMBULANCE', 'AVAILABLE', 12.9400, 77.6200, ARRAY['BASIC_LIFE_SUPPORT', 'OXYGEN_THERAPY'], 1, 'd1111111-1111-1111-1111-111111111111', true),
('r1111111-1111-1111-1111-444444444444', 'AMB-04', 'Whitefield ALS Unit 4', 'AMBULANCE', 'AVAILABLE', 12.9650, 77.7400, ARRAY['ADVANCED_LIFE_SUPPORT', 'PEDIATRIC_ALS', 'INCUBATOR'], 2, 'd1111111-1111-1111-1111-111111111111', true),
('r1111111-1111-1111-1111-555555555555', 'AMB-05', 'Peenya Industrial ALS Unit 5', 'AMBULANCE', 'AVAILABLE', 13.0250, 77.5200, ARRAY['ADVANCED_LIFE_SUPPORT', 'TOXICOLOGY_ALS', 'BURN_TRAUMA'], 2, 'd1111111-1111-1111-1111-111111111111', true),

-- 4 Fire Units
('r2222222-2222-2222-2222-111111111111', 'FIRE-01', 'Central Heavy Engine 1', 'FIRE_UNIT', 'AVAILABLE', 12.9750, 77.6000, ARRAY['HIGH_REACH_LADDER', 'WATER_CANNON', 'FOAM_SUPPRESSION'], 6, 'd2222222-2222-2222-2222-222222222222', true),
('r2222222-2222-2222-2222-222222222222', 'FIRE-02', 'Peenya Hazmat Fire Unit 2', 'FIRE_UNIT', 'AVAILABLE', 13.0250, 77.5150, ARRAY['HAZMAT', 'CHEMICAL_HAZMAT', 'CONTAINMENT', 'FOAM_SUPPRESSION'], 5, 'd2222222-2222-2222-2222-222222222222', true),
('r2222222-2222-2222-2222-333333333333', 'FIRE-03', 'South Engine Company 3', 'FIRE_UNIT', 'AVAILABLE', 12.9100, 77.5900, ARRAY['WATER_CANNON', 'RESCUE_CUTTERS'], 4, 'd2222222-2222-2222-2222-222222222222', true),
('r2222222-2222-2222-2222-444444444444', 'FIRE-04', 'Whitefield Ladder Company 4', 'FIRE_UNIT', 'AVAILABLE', 12.9720, 77.7350, ARRAY['HIGH_REACH_LADDER', 'THERMAL_IMAGING'], 5, 'd2222222-2222-2222-2222-222222222222', true),

-- 4 Police Units
('r3333333-3333-3333-3333-111111111111', 'POL-01', 'Central Traffic & Perimeter Patrol 1', 'POLICE_UNIT', 'AVAILABLE', 12.9680, 77.5920, ARRAY['TRAFFIC_CONTROL', 'PERIMETER_SECURITY', 'CROWD_MANAGEMENT'], 4, 'd3333333-3333-3333-3333-333333333333', true),
('r3333333-3333-3333-3333-222222222222', 'POL-02', 'South Police Interceptor 2', 'POLICE_UNIT', 'AVAILABLE', 12.9200, 77.5880, ARRAY['FAST_RESPONSE', 'TRAFFIC_CONTROL'], 2, 'd3333333-3333-3333-3333-333333333333', true),
('r3333333-3333-3333-3333-333333333333', 'POL-03', 'Peenya Sector Patrol 3', 'POLICE_UNIT', 'AVAILABLE', 13.0200, 77.5250, ARRAY['TRAFFIC_CONTROL', 'HAZMAT_PERIMETER'], 3, 'd3333333-3333-3333-3333-333333333333', true),
('r3333333-3333-3333-3333-444444444444', 'POL-04', 'Whitefield Sector Interceptor 4', 'POLICE_UNIT', 'AVAILABLE', 12.9650, 77.7450, ARRAY['TRAFFIC_CONTROL', 'CRIME_SCENE_SECURE'], 3, 'd3333333-3333-3333-3333-333333333333', true),

-- 2 Rescue Teams
('r4444444-4444-4444-4444-111111111111', 'RSC-01', 'Urban Search & Collapse Rescue 1', 'RESCUE_TEAM', 'AVAILABLE', 12.9700, 77.5950, ARRAY['STRUCTURAL_SEARCH', 'HEAVY_LIFTING', 'K9_SEARCH', 'EXTRICATION'], 8, 'd4444444-4444-4444-4444-444444444444', true),
('r4444444-4444-4444-4444-222222222222', 'RSC-02', 'Flood & Water Rescue Squad 2', 'RESCUE_TEAM', 'AVAILABLE', 12.9450, 77.6150, ARRAY['WATER_RESCUE', 'AMPHIBIOUS', 'DIVING_EQUIPMENT'], 6, 'd4444444-4444-4444-4444-444444444444', true);

-- 5. DEMO INCIDENTS
INSERT INTO incidents (id, incident_number, emergency_type, title, description, latitude, longitude, address, people_affected, injury_level, severity, priority_score, priority_level, status, location_id) VALUES
('i1111111-1111-1111-1111-111111111111', 'INC-1001', 'ROAD_ACCIDENT', 'Multi-Vehicle Collision on Silk Board Flyover', 'Bus and car collision blocking dual carriage lanes. Multiple severe injuries trapped.', 12.9172, 77.6228, 'Silk Board Flyover, Hosur Road', 6, 'CRITICAL', 'CRITICAL', 92.00, 'CRITICAL', 'REPORTED', 'l3333333-3333-3333-3333-333333333333'),
('i2222222-2222-2222-2222-222222222222', 'INC-1002', 'FIRE', 'Commercial Mall Electrical Transformer Fire', 'Thick smoke emerging from basement level 2. Evacuation in progress.', 12.9756, 77.6066, 'MG Road Metro Station Complex', 15, 'MINOR', 'HIGH', 78.50, 'HIGH', 'REPORTED', 'l1111111-1111-1111-1111-111111111111'),
('i3333333-3333-3333-3333-333333333333', 'INC-1003', 'MEDICAL', 'Cardiac Arrest Emergency at IT Park', '52-year-old employee collapsed in main lobby, non-responsive.', 12.9268, 77.6852, 'EcoWorld Tech Park, Sarjapur Outer Ring Road', 1, 'CRITICAL', 'HIGH', 76.00, 'HIGH', 'REPORTED', 'l4444444-4444-4444-4444-444444444444'),
('i4444444-4444-4444-4444-444444444444', 'INC-1004', 'FLOOD', 'Submerged Underpass Vehicle Trapped', 'Sudden cloudburst flash flood, 3 cars submerged in underpass.', 12.9550, 77.6520, 'Windtunnel Road Underpass, HAL', 4, 'MODERATE', 'MEDIUM', 58.00, 'MEDIUM', 'REPORTED', 'l1111111-1111-1111-1111-111111111111'),
('i5555555-5555-5555-5555-555555555555', 'INC-1005', 'BUILDING_COLLAPSE', 'Construction Scaffolding Collapse', 'Scaffolding collapse at high-rise construction site, workers trapped under heavy concrete debris.', 12.9298, 77.5826, 'Jayanagar 4th Block Complex', 8, 'CRITICAL', 'CRITICAL', 96.50, 'CRITICAL', 'REPORTED', 'l5555555-5555-5555-5555-555555555555');
