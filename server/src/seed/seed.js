import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import {
  User,
  AssetCategory,
  Asset,
  MaintenanceLog,
  LifecycleEvent,
  AuditLog,
  Counter
} from '../models/index.js';
import { markOverdueMaintenance } from '../utils/maintenanceHelper.js';

/**
 * Seed Database for Infrastructure Asset Inventory
 * Safe wipe & recreate with demo data
 */
export async function seedDatabase() {
  console.log('\n======================================================');
  console.log(' 🌱 Starting Infrastructure Asset Inventory Seeder');
  console.log('======================================================\n');

  await connectDB();

  // 1. SAFE WIPE OF EXISTING COLLECTIONS
  console.log('🧹 Purging existing collections...');
  await Promise.all([
    User.deleteMany({}),
    AssetCategory.deleteMany({}),
    Asset.deleteMany({}),
    MaintenanceLog.deleteMany({}),
    LifecycleEvent.deleteMany({}),
    AuditLog.deleteMany({}),
    Counter.deleteMany({})
  ]);
  console.log('✅ Collections wiped successfully.');

  // Initialize Counter so next manual asset created will receive AST-0101
  await Counter.create({ name: 'assetTag', seq: 100 });
  console.log('🔢 Counter reset to sequence 100 (next tag: AST-0101).');

  // 2. CREATE USERS
  console.log('\n👥 Seeding demo users (password: Demo@1234)...');
  const demoPassword = 'Demo@1234';

  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@demo.com',
      password: demoPassword,
      role: 'admin',
      isActive: true
    },
    {
      name: 'Operations Manager',
      email: 'manager@demo.com',
      password: demoPassword,
      role: 'manager',
      isActive: true
    },
    {
      name: 'Field Technician Lead',
      email: 'tech@demo.com',
      password: demoPassword,
      role: 'technician',
      isActive: true
    },
    {
      name: 'Senior Systems Technician',
      email: 'tech2@demo.com',
      password: demoPassword,
      role: 'technician',
      isActive: true
    }
  ];

  // User.create triggers the Mongoose pre('save') hook for bcrypt hashing
  const users = await User.create(usersData);
  const userMap = {};
  users.forEach((u) => {
    userMap[u.email] = u;
  });

  // Verify bcrypt password hashing on admin user
  const adminTest = await User.findOne({ email: 'admin@demo.com' }).select('+password');
  const isMatch = await adminTest.comparePassword(demoPassword);
  if (!isMatch) {
    throw new Error('❌ Password hashing verification failed!');
  }
  console.log(`✅ Created ${users.length} users with verified bcrypt hashing.`);

  // 3. CREATE CATEGORIES WITH REALISTIC FIELD DEFINITIONS
  console.log('\n🏷️  Seeding 6 asset categories with dynamic field definitions...');
  const categoriesData = [
    {
      name: 'Civil and Public Works',
      description: 'Roadways, flyovers, bridges, stormwater drainage networks, streetlights, and public municipal infrastructure.',
      icon: 'HardHat',
      fieldDefinitions: [
        { key: 'lengthKm', label: 'Length', type: 'number', unit: 'km', required: false },
        { key: 'surfaceType', label: 'Surface Type', type: 'select', options: ['Asphalt', 'Concrete', 'Bitumen', 'Paver Blocks', 'Gravel'], required: true },
        { key: 'laneCount', label: 'Lane Count', type: 'number', unit: 'lanes', required: false },
        { key: 'conditionRating', label: 'Condition Rating', type: 'number', unit: '1-5', required: true },
        { key: 'loadCapacityTons', label: 'Load Capacity', type: 'number', unit: 'tons', required: false },
        { key: 'lastInspectionDate', label: 'Last Inspection Date', type: 'date', required: false }
      ]
    },
    {
      name: 'Utilities',
      description: 'Power distribution, high-voltage transformers, substations, municipal water supply, reservoirs, and sewage treatment facilities.',
      icon: 'Zap',
      fieldDefinitions: [
        { key: 'voltageKV', label: 'Operating Voltage', type: 'number', unit: 'kV', required: false },
        { key: 'capacityKVA', label: 'Power Capacity', type: 'number', unit: 'kVA', required: false },
        { key: 'manufacturer', label: 'Equipment Manufacturer', type: 'text', required: true },
        { key: 'feederId', label: 'Grid Feeder ID', type: 'text', required: false },
        { key: 'flowRateLPM', label: 'Discharge Flow Rate', type: 'number', unit: 'LPM', required: false },
        { key: 'tankCapacityLitres', label: 'Tank Storage Capacity', type: 'number', unit: 'litres', required: false }
      ]
    },
    {
      name: 'Telecom and Network',
      description: 'Cellular towers, optical fiber transmission rings, high-capacity routers, core network switches, and edge infrastructure.',
      icon: 'Radio',
      fieldDefinitions: [
        { key: 'heightM', label: 'Tower Height', type: 'number', unit: 'm', required: false },
        { key: 'frequencyBand', label: 'Frequency Band', type: 'text', required: false },
        { key: 'cableLengthKm', label: 'Fiber Cable Length', type: 'number', unit: 'km', required: false },
        { key: 'operator', label: 'Network Operator', type: 'text', required: true },
        { key: 'serialNumber', label: 'Hardware Serial Number', type: 'text', required: true },
        { key: 'bandwidthMbps', label: 'Link Bandwidth', type: 'number', unit: 'Mbps', required: false }
      ]
    },
    {
      name: 'Building Facilities',
      description: 'HVAC central chillers, high-speed passenger elevators, backup diesel generators, building surveillance systems, and fire protection equipment.',
      icon: 'Building2',
      fieldDefinitions: [
        { key: 'ratingKW', label: 'Power Rating', type: 'number', unit: 'kW', required: false },
        { key: 'floorOrZone', label: 'Floor or Zone Location', type: 'text', required: true },
        { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true },
        { key: 'lastServiceDate', label: 'Last Service Date', type: 'date', required: false },
        { key: 'safetyCertExpiry', label: 'Safety Certification Expiry', type: 'date', required: true }
      ]
    },
    {
      name: 'Transport',
      description: 'Municipal transit buses, BRTS feeder fleet, emergency response vehicles, terminal depot chargers, and route control equipment.',
      icon: 'Bus',
      fieldDefinitions: [
        { key: 'registrationNumber', label: 'Registration Plate Number', type: 'text', required: true },
        { key: 'engineType', label: 'Engine / Fuel Type', type: 'select', options: ['Diesel', 'CNG', 'Electric', 'Petrol', 'Hybrid'], required: true },
        { key: 'seatingCapacity', label: 'Seating Capacity', type: 'number', unit: 'passengers', required: false },
        { key: 'route', label: 'Primary Assigned Route', type: 'text', required: false },
        { key: 'fitnessCertExpiry', label: 'Vehicle Fitness Certificate Expiry', type: 'date', required: true }
      ]
    },
    {
      name: 'IT Assets',
      description: 'Enterprise datacenter servers, SAN storage arrays, GIS mapping workstations, network security firewalls, and municipal workstations.',
      icon: 'Laptop',
      fieldDefinitions: [
        { key: 'serialNumber', label: 'Asset Serial Number', type: 'text', required: true },
        { key: 'specs', label: 'Hardware Specifications', type: 'text', required: true },
        { key: 'assignedTo', label: 'Assigned User / Department Desk', type: 'text', required: false },
        { key: 'licenseKey', label: 'Software / OS License Key', type: 'text', required: false },
        { key: 'licenseExpiry', label: 'OS / License Expiry Date', type: 'date', required: false }
      ]
    }
  ];

  const categories = await AssetCategory.create(categoriesData);
  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[cat.name] = cat;
  });
  console.log(`✅ Created ${categories.length} categories.`);

  // 4. CREATE 100 ASSETS IN SURAT, GUJARAT AREA
  console.log('\n🏙️  Generating 100 realistic assets across Surat, Gujarat...');
  const now = new Date();

  // Helper date generators relative to now
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 3600 * 1000);
  const daysAhead = (d) => new Date(now.getTime() + d * 24 * 3600 * 1000);
  const yearsAgo = (y) => new Date(now.getTime() - y * 365.25 * 24 * 3600 * 1000);

  // Exact date generators for lifespan alerts
  // Ratio = ageMs / lifespanMs
  const pastLifespanDate = (lifespanYears, targetRatio = 1.18) => {
    return new Date(now.getTime() - Math.round(targetRatio * lifespanYears * 365.25 * 24 * 3600 * 1000));
  };
  const nearLifespanDate = (lifespanYears, targetRatio = 0.95) => {
    return new Date(now.getTime() - Math.round(targetRatio * lifespanYears * 365.25 * 24 * 3600 * 1000));
  };

  /**
   * Surat geographic localities and coordinates bounds:
   * Lat: ~21.10 - 21.25 N
   * Lng: ~72.75 - 72.90 E
   */
  const rawAssets = [
    // =========================================================
    // CIVIL & PUBLIC WORKS (22 assets: 14 In Service, 2 Planned, 1 Procured, 2 Installed, 2 Under Maint, 1 Decomm)
    // =========================================================
    {
      name: 'Adajan Flyover Section A',
      category: 'Civil and Public Works',
      subcategory: 'Flyovers',
      department: 'Public Works',
      cost: 85000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(7.5),
      installationDate: yearsAgo(7.0),
      expectedLifespanYears: 40,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Adajan Gam Circle, Surat', lat: 21.1965, lng: 72.7918 },
      customFields: { lengthKm: 1.8, surfaceType: 'Asphalt', laneCount: 6, conditionRating: 4, loadCapacityTons: 70, lastInspectionDate: daysAgo(45).toISOString() }
    },
    {
      name: 'Varachha Main Road Arterial Corridor',
      category: 'Civil and Public Works',
      subcategory: 'Roads',
      department: 'Public Works',
      cost: 42000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(9.5),
      installationDate: yearsAgo(9.0),
      expectedLifespanYears: 30,
      warrantyExpiry: yearsAgo(4.0),
      location: { address: 'Varachha Main Road, Surat', lat: 21.2125, lng: 72.8592 },
      customFields: { lengthKm: 4.5, surfaceType: 'Asphalt', laneCount: 6, conditionRating: 3, loadCapacityTons: 50, lastInspectionDate: daysAgo(60).toISOString() }
    },
    {
      name: 'Cable-Stayed Bridge Over Tapi River',
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 145000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(8.5),
      installationDate: yearsAgo(7.8),
      expectedLifespanYears: 60,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Athwa-Adajan Tapi Crossing, Surat', lat: 21.1895, lng: 72.7985 },
      customFields: { lengthKm: 0.9, surfaceType: 'Concrete', laneCount: 4, conditionRating: 5, loadCapacityTons: 100, lastInspectionDate: daysAgo(30).toISOString() }
    },
    {
      name: 'Katargam Stormwater Drainage Trunk Canal',
      category: 'Civil and Public Works',
      subcategory: 'Drainage',
      department: 'Water Supply',
      cost: 28000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.8),
      installationDate: yearsAgo(5.2),
      expectedLifespanYears: 30,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Gotalawadi, Katargam, Surat', lat: 21.2268, lng: 72.8254 },
      customFields: { lengthKm: 3.2, surfaceType: 'Concrete', laneCount: 0, conditionRating: 4, loadCapacityTons: 0, lastInspectionDate: daysAgo(75).toISOString() }
    },
    {
      name: 'Athwa Lines Municipal Smart Streetlight Corridor',
      category: 'Civil and Public Works',
      subcategory: 'Streetlights',
      department: 'Electricity',
      cost: 8500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.2),
      installationDate: yearsAgo(3.0),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(18), // Warranty expiring within 30 days (1)
      location: { address: 'Athwa Gate to Parle Point, Surat', lat: 21.1782, lng: 72.8021 },
      customFields: { lengthKm: 2.7, surfaceType: 'Bitumen', laneCount: 4, conditionRating: 5, loadCapacityTons: 0, lastInspectionDate: daysAgo(20).toISOString() }
    },
    {
      name: 'Ring Road Flyover Textile Market Span',
      category: 'Civil and Public Works',
      subcategory: 'Flyovers',
      department: 'Public Works',
      cost: 95000000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 1
      status: 'active',
      purchaseDate: yearsAgo(11.5),
      installationDate: yearsAgo(11.0),
      expectedLifespanYears: 40,
      warrantyExpiry: yearsAgo(6.0),
      location: { address: 'Kinnary Cinema Junction, Ring Road, Surat', lat: 21.1834, lng: 72.8392 },
      customFields: { lengthKm: 2.1, surfaceType: 'Asphalt', laneCount: 6, conditionRating: 3, loadCapacityTons: 65, lastInspectionDate: daysAgo(10).toISOString() }
    },
    {
      name: 'Rander Heritage Causeway Embankment',
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 36000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(13.5),
      installationDate: yearsAgo(13.0),
      expectedLifespanYears: 50,
      warrantyExpiry: yearsAgo(8.0),
      location: { address: 'Causeway Road, Rander, Surat', lat: 21.2184, lng: 72.7845 },
      customFields: { lengthKm: 1.1, surfaceType: 'Concrete', laneCount: 2, conditionRating: 3, loadCapacityTons: 40, lastInspectionDate: daysAgo(90).toISOString() }
    },
    {
      name: 'Majura Gate Underpass Drainage Box Culvert',
      category: 'Civil and Public Works',
      subcategory: 'Drainage',
      department: 'Public Works',
      cost: 16500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.2),
      installationDate: yearsAgo(5.0),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(180),
      location: { address: 'Majura Gate Junction, Surat', lat: 21.1788, lng: 72.8225 },
      customFields: { lengthKm: 0.6, surfaceType: 'Concrete', laneCount: 4, conditionRating: 4, loadCapacityTons: 50, lastInspectionDate: daysAgo(40).toISOString() }
    },
    {
      name: 'Pandesara Industrial Internal Road Link B',
      category: 'Civil and Public Works',
      subcategory: 'Roads',
      department: 'Public Works',
      cost: 19000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.8),
      installationDate: yearsAgo(3.5),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(26), // Warranty expiring within 30 days (2)
      location: { address: 'GIDC Industrial Area, Pandesara, Surat', lat: 21.1325, lng: 72.8284 },
      customFields: { lengthKm: 3.0, surfaceType: 'Paver Blocks', laneCount: 4, conditionRating: 3, loadCapacityTons: 80, lastInspectionDate: daysAgo(110).toISOString() }
    },
    {
      name: 'Dumas Coastal Promenade Paver Walkway',
      category: 'Civil and Public Works',
      subcategory: 'Public Buildings',
      department: 'Public Works',
      cost: 14000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.2),
      installationDate: yearsAgo(2.0),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(400),
      location: { address: 'Dumas Beachfront, Surat', lat: 21.1275, lng: 72.7612 },
      customFields: { lengthKm: 2.4, surfaceType: 'Paver Blocks', laneCount: 0, conditionRating: 5, loadCapacityTons: 10, lastInspectionDate: daysAgo(15).toISOString() }
    },
    {
      name: 'Althan Canal Road Flyover Crossing',
      category: 'Civil and Public Works',
      subcategory: 'Flyovers',
      department: 'Public Works',
      cost: 58000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.8),
      installationDate: yearsAgo(3.2),
      expectedLifespanYears: 40,
      warrantyExpiry: daysAhead(350),
      location: { address: 'Althan Canal Corridor, Surat', lat: 21.1612, lng: 72.8124 },
      customFields: { lengthKm: 1.4, surfaceType: 'Asphalt', laneCount: 4, conditionRating: 4, loadCapacityTons: 60, lastInspectionDate: daysAgo(50).toISOString() }
    },
    {
      name: 'Piplod Gaurav Path Overpass Bridge',
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 72000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(6.5),
      installationDate: yearsAgo(6.0),
      expectedLifespanYears: 50,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Gaurav Path, Piplod, Surat', lat: 21.1632, lng: 72.7758 },
      customFields: { lengthKm: 0.8, surfaceType: 'Concrete', laneCount: 6, conditionRating: 5, loadCapacityTons: 80, lastInspectionDate: daysAgo(35).toISOString() }
    },
    {
      name: 'Sarthana Nature Park Footbridge', // Lifespan Alert: Within 10% (1)
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 5200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: nearLifespanDate(10, 0.96),
      installationDate: nearLifespanDate(10, 0.95), // 0.95 ratio
      expectedLifespanYears: 10,
      warrantyExpiry: yearsAgo(4.0),
      location: { address: 'Sarthana Nature Park, Surat', lat: 21.2335, lng: 72.8872 },
      customFields: { lengthKm: 0.15, surfaceType: 'Concrete', laneCount: 0, conditionRating: 4, loadCapacityTons: 15, lastInspectionDate: daysAgo(80).toISOString() }
    },
    {
      name: 'Pal-Hazira Connecting Link Highway Section 1',
      category: 'Civil and Public Works',
      subcategory: 'Roads',
      department: 'Public Works',
      cost: 38000000,
      lifecycleStage: 'Installed', // Installed 1
      status: 'active',
      purchaseDate: daysAgo(75),
      installationDate: daysAgo(15),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(700),
      location: { address: 'Pal Gam Outer Ring, Surat', lat: 21.1942, lng: 72.7725 },
      customFields: { lengthKm: 3.8, surfaceType: 'Bitumen', laneCount: 4, conditionRating: 5, loadCapacityTons: 70, lastInspectionDate: daysAgo(10).toISOString() }
    },
    {
      name: 'Katargam Canal Overbridge Span D',
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 29000000,
      lifecycleStage: 'Installed', // Installed 2
      status: 'active',
      purchaseDate: daysAgo(90),
      installationDate: daysAgo(20),
      expectedLifespanYears: 40,
      warrantyExpiry: daysAhead(730),
      location: { address: 'Katargam Canal Link, Surat', lat: 21.2292, lng: 72.8245 },
      customFields: { lengthKm: 0.45, surfaceType: 'Concrete', laneCount: 4, conditionRating: 5, loadCapacityTons: 60, lastInspectionDate: daysAgo(5).toISOString() }
    },
    {
      name: 'Dumas Road Drainage Culvert DC-02',
      category: 'Civil and Public Works',
      subcategory: 'Drainage',
      department: 'Public Works',
      cost: 14200000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 2
      status: 'active',
      purchaseDate: yearsAgo(6.5),
      installationDate: yearsAgo(6.0),
      expectedLifespanYears: 25,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Dumas Road Junction, Surat', lat: 21.1342, lng: 72.7665 },
      customFields: { lengthKm: 0.8, surfaceType: 'Concrete', laneCount: 4, conditionRating: 3, loadCapacityTons: 60, lastInspectionDate: daysAgo(4).toISOString() }
    },
    {
      name: 'Vesu Canal Walkway & Stormwater Siphon',
      category: 'Civil and Public Works',
      subcategory: 'Drainage',
      department: 'Water Supply',
      cost: 11500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.2),
      installationDate: yearsAgo(4.0),
      expectedLifespanYears: 30,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'VIP Road Canal, Vesu, Surat', lat: 21.1448, lng: 72.7834 },
      customFields: { lengthKm: 1.9, surfaceType: 'Concrete', laneCount: 0, conditionRating: 4, loadCapacityTons: 0, lastInspectionDate: daysAgo(100).toISOString() }
    },
    {
      name: 'Old Rander Pier Wooden-Steel Footbridge', // Lifespan Alert: Past Lifespan (1)
      category: 'Civil and Public Works',
      subcategory: 'Bridges',
      department: 'Public Works',
      cost: 4500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(12, 1.16),
      installationDate: pastLifespanDate(12, 1.15), // ratio 1.15
      expectedLifespanYears: 12,
      warrantyExpiry: yearsAgo(7.0),
      location: { address: 'Navdi Ovara, Rander, Surat', lat: 21.2152, lng: 72.7876 },
      customFields: { lengthKm: 0.12, surfaceType: 'Gravel', laneCount: 0, conditionRating: 2, loadCapacityTons: 8, lastInspectionDate: daysAgo(12).toISOString() }
    },
    {
      name: 'Udhna Railway Crossing Elevated Overpass Phase 2',
      category: 'Civil and Public Works',
      subcategory: 'Flyovers',
      department: 'Public Works',
      cost: 76000000,
      lifecycleStage: 'Planned', // Planned 1
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 50,
      warrantyExpiry: null,
      location: { address: 'Udhna Junction Yard, Surat', lat: 21.1512, lng: 72.8465 },
      customFields: { lengthKm: 2.2, surfaceType: 'Concrete', laneCount: 6, conditionRating: 5, loadCapacityTons: 80, lastInspectionDate: null }
    },
    {
      name: 'Ring Road North Flyover Extension',
      category: 'Civil and Public Works',
      subcategory: 'Flyovers',
      department: 'Public Works',
      cost: 88000000,
      lifecycleStage: 'Planned', // Planned 2
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 50,
      warrantyExpiry: null,
      location: { address: 'Delhi Gate Ring Road, Surat', lat: 21.2012, lng: 72.8365 },
      customFields: { lengthKm: 1.7, surfaceType: 'Concrete', laneCount: 6, conditionRating: 5, loadCapacityTons: 70, lastInspectionDate: null }
    },
    {
      name: 'Surat Smart City West Bank Riverfront Embankment',
      category: 'Civil and Public Works',
      subcategory: 'Public Buildings',
      department: 'Public Works',
      cost: 110000000,
      lifecycleStage: 'Procured', // Procured 1
      status: 'active',
      purchaseDate: daysAgo(40),
      installationDate: null,
      expectedLifespanYears: 60,
      warrantyExpiry: null,
      location: { address: 'West Tapi Riverfront, Adajan, Surat', lat: 21.1912, lng: 72.7892 },
      customFields: { lengthKm: 3.5, surfaceType: 'Concrete', laneCount: 0, conditionRating: 5, loadCapacityTons: 0, lastInspectionDate: null }
    },
    {
      name: 'Old Katargam Brick Arch Culvert #04', // Decommissioned 1
      category: 'Civil and Public Works',
      subcategory: 'Drainage',
      department: 'Public Works',
      cost: 1200000,
      lifecycleStage: 'Decommissioned',
      status: 'retired',
      purchaseDate: yearsAgo(25.0),
      installationDate: yearsAgo(24.0),
      expectedLifespanYears: 20,
      warrantyExpiry: yearsAgo(18.0),
      location: { address: 'Old Katargam Darwaja, Surat', lat: 21.2295, lng: 72.8212 },
      customFields: { lengthKm: 0.08, surfaceType: 'Paver Blocks', laneCount: 2, conditionRating: 1, loadCapacityTons: 10, lastInspectionDate: yearsAgo(1.0).toISOString() }
    },

    // =========================================================
    // UTILITIES (20 assets: 12 In Service, 2 Planned, 1 Procured, 2 Installed, 2 Under Maint, 1 Decomm)
    // =========================================================
    {
      name: 'Varachha 11kV Distribution Transformer T-07',
      category: 'Utilities',
      subcategory: 'Transformers',
      department: 'Electricity',
      cost: 1400000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.2),
      installationDate: yearsAgo(5.0),
      expectedLifespanYears: 25,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Laxminagar Substation, Varachha, Surat', lat: 21.2145, lng: 72.8612 },
      customFields: { voltageKV: 11, capacityKVA: 500, manufacturer: 'ABB India Ltd', feederId: 'FDR-VAR-11-07', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Katargam Water Treatment Plant Chlorination Unit',
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 14500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.3),
      installationDate: yearsAgo(3.1),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(8), // Warranty expiring within 30 days (3)
      location: { address: 'Katargam Water Works, Surat', lat: 21.2285, lng: 72.8275 },
      customFields: { voltageKV: 0.415, capacityKVA: 85, manufacturer: 'Thermax India', feederId: 'FDR-KTG-WTP', flowRateLPM: 28000, tankCapacityLitres: 5000000 }
    },
    {
      name: 'Vesu 66/11kV Step-Down Power Substation',
      category: 'Utilities',
      subcategory: 'Substations',
      department: 'Electricity',
      cost: 28000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(6.8),
      installationDate: yearsAgo(6.2),
      expectedLifespanYears: 35,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'VIP Road Substation Complex, Vesu, Surat', lat: 21.1415, lng: 72.7865 },
      customFields: { voltageKV: 66, capacityKVA: 25000, manufacturer: 'Siemens Energy Ltd', feederId: 'SS-VESU-66', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Udhna Water Pump Station P-03',
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 6500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.8),
      installationDate: yearsAgo(4.6),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(180),
      location: { address: 'Udhna Teen Rasta, Surat', lat: 21.1542, lng: 72.8421 },
      customFields: { voltageKV: 0.415, capacityKVA: 120, manufacturer: 'Kirloskar Brothers Ltd', feederId: 'FDR-UDH-PUMP', flowRateLPM: 14500, tankCapacityLitres: 2500000 }
    },
    {
      name: 'Pandesara Sewage Pumping Station Lift Unit #2',
      category: 'Utilities',
      subcategory: 'Sewage Pumps',
      department: 'Water Supply',
      cost: 8200000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 3
      status: 'active',
      purchaseDate: yearsAgo(5.8),
      installationDate: yearsAgo(5.5),
      expectedLifespanYears: 20,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'GIDC Drainage Terminal, Pandesara, Surat', lat: 21.1305, lng: 72.8315 },
      customFields: { voltageKV: 0.415, capacityKVA: 220, manufacturer: 'Grundfos Pumps India', feederId: 'FDR-PND-STP', flowRateLPM: 19000, tankCapacityLitres: 1200000 }
    },
    {
      name: 'Adajan Overhead Water Reservoir Tank 4ML',
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 18000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(7.8),
      installationDate: yearsAgo(7.2),
      expectedLifespanYears: 40,
      warrantyExpiry: yearsAgo(3.0),
      location: { address: 'Pal-Adajan Main Crossing, Surat', lat: 21.1985, lng: 72.7872 },
      customFields: { voltageKV: 0, capacityKVA: 0, manufacturer: 'Larsen & Toubro Ltd', feederId: 'ESR-ADJ-04', flowRateLPM: 32000, tankCapacityLitres: 4000000 }
    },
    {
      name: 'Majura Gate 11kV Ring Main Unit RMU-12',
      category: 'Utilities',
      subcategory: 'Transformers',
      department: 'Electricity',
      cost: 1650000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.2),
      installationDate: yearsAgo(2.0),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(450),
      location: { address: 'Civil Hospital Road, Majura Gate, Surat', lat: 21.1765, lng: 72.8212 },
      customFields: { voltageKV: 11, capacityKVA: 630, manufacturer: 'Schneider Electric India', feederId: 'FDR-MJR-11-12', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Athwa Lines Underground Gas Distribution Valve Station',
      category: 'Utilities',
      subcategory: 'Gas Distribution',
      department: 'Utilities',
      cost: 3200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.8),
      installationDate: yearsAgo(3.5),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(21), // Warranty expiring within 30 days (4)
      location: { address: 'Near Circuit House, Athwa Lines, Surat', lat: 21.1812, lng: 72.8045 },
      customFields: { voltageKV: 0, capacityKVA: 0, manufacturer: 'Gujarat Gas Ltd / Fisher', feederId: 'GAS-ATH-01', flowRateLPM: 8500, tankCapacityLitres: 0 }
    },
    {
      name: 'Sarthana 66kV Transmission Tower Line Section 4',
      category: 'Utilities',
      subcategory: 'Power Grid',
      department: 'Electricity',
      cost: 12500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(8.8),
      installationDate: yearsAgo(8.2),
      expectedLifespanYears: 40,
      warrantyExpiry: yearsAgo(3.0),
      location: { address: 'Sarthana Canal Road, Surat', lat: 21.2365, lng: 72.8892 },
      customFields: { voltageKV: 66, capacityKVA: 45000, manufacturer: 'KEC International', feederId: 'GETCO-SAR-66', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Althan Raw Water Intake Pumping Station',
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 9800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.5),
      installationDate: yearsAgo(4.2),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(200),
      location: { address: 'Althan Water Works, Surat', lat: 21.1634, lng: 72.8152 },
      customFields: { voltageKV: 3.3, capacityKVA: 350, manufacturer: 'Crompton Greaves Ltd', feederId: 'FDR-ALT-PMP', flowRateLPM: 21000, tankCapacityLitres: 1800000 }
    },
    {
      name: 'Dindoli 11kV Power Feeder Transformer TX-03', // Lifespan Alert: Past Lifespan (2)
      category: 'Utilities',
      subcategory: 'Transformers',
      department: 'Electricity',
      cost: 1100000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(12, 1.18),
      installationDate: pastLifespanDate(12, 1.18), // ratio 1.18
      expectedLifespanYears: 12,
      warrantyExpiry: yearsAgo(8.0),
      location: { address: 'Dindoli Gam Road, Surat', lat: 21.1565, lng: 72.8712 },
      customFields: { voltageKV: 11, capacityKVA: 250, manufacturer: 'Bharat Bijlee Ltd', feederId: 'FDR-DIN-11-03', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Rander Old Booster Pump Station P-01', // Lifespan Alert: Within 10% (2)
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 2100000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: nearLifespanDate(10, 0.96),
      installationDate: nearLifespanDate(10, 0.95), // ratio 0.95
      expectedLifespanYears: 10,
      warrantyExpiry: yearsAgo(4.0),
      location: { address: 'Bunder Road, Rander, Surat', lat: 21.2198, lng: 72.7825 },
      customFields: { voltageKV: 0.415, capacityKVA: 60, manufacturer: 'Kirloskar Brothers Ltd', feederId: 'FDR-RND-BST', flowRateLPM: 6500, tankCapacityLitres: 400000 }
    },
    {
      name: 'Limbayat 66/11kV Substation Circuit Breaker CB-04',
      category: 'Utilities',
      subcategory: 'Substations',
      department: 'Electricity',
      cost: 2400000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 4
      status: 'active',
      purchaseDate: yearsAgo(4.8),
      installationDate: yearsAgo(4.3),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(140),
      location: { address: 'Limbayat Power Yard, Surat', lat: 21.1734, lng: 72.8612 },
      customFields: { voltageKV: 66, capacityKVA: 10000, manufacturer: 'ABB India Ltd', feederId: 'SS-LIM-CB4', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Surat Central Railway Station 11kV Substation Feed',
      category: 'Utilities',
      subcategory: 'Substations',
      department: 'Electricity',
      cost: 16000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.8),
      installationDate: yearsAgo(5.2),
      expectedLifespanYears: 30,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Station Road, Surat Central, Surat', lat: 21.2045, lng: 72.8425 },
      customFields: { voltageKV: 11, capacityKVA: 3500, manufacturer: 'Siemens Energy Ltd', feederId: 'SS-STN-11', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Pal Sub-Distribution Water Valve Cluster V-14',
      category: 'Utilities',
      subcategory: 'Water Distribution',
      department: 'Water Supply',
      cost: 1850000,
      lifecycleStage: 'Installed', // Installed 3
      status: 'active',
      purchaseDate: daysAgo(60),
      installationDate: daysAgo(10),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(720),
      location: { address: 'Pal Lake Road, Pal, Surat', lat: 21.1925, lng: 72.7762 },
      customFields: { voltageKV: 0, capacityKVA: 0, manufacturer: 'L&T Valves India', feederId: 'VLV-PAL-14', flowRateLPM: 11000, tankCapacityLitres: 800000 }
    },
    {
      name: 'Sarthana 11kV Feeder RMU-09',
      category: 'Utilities',
      subcategory: 'Transformers',
      department: 'Electricity',
      cost: 1450000,
      lifecycleStage: 'Installed', // Installed 4
      status: 'active',
      purchaseDate: daysAgo(50),
      installationDate: daysAgo(8),
      expectedLifespanYears: 25,
      warrantyExpiry: daysAhead(710),
      location: { address: 'Sarthana Jakat Naka, Surat', lat: 21.2342, lng: 72.8865 },
      customFields: { voltageKV: 11, capacityKVA: 500, manufacturer: 'Schneider Electric India', feederId: 'FDR-SAR-11-09', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Mota Varachha Solar Farm 500kVA Inverter Array',
      category: 'Utilities',
      subcategory: 'Power Grid',
      department: 'Electricity',
      cost: 15500000,
      lifecycleStage: 'Planned', // Planned 3
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 25,
      warrantyExpiry: null,
      location: { address: 'Mota Varachha Green Energy Park, Surat', lat: 21.2425, lng: 72.8752 },
      customFields: { voltageKV: 33, capacityKVA: 500, manufacturer: 'Sungrow Power Supply', feederId: 'SOL-MVAR-500', flowRateLPM: 0, tankCapacityLitres: 0 }
    },
    {
      name: 'Dindoli Sewage Treatment Expansion Phase 2',
      category: 'Utilities',
      subcategory: 'Sewage Pumps',
      department: 'Water Supply',
      cost: 18500000,
      lifecycleStage: 'Planned', // Planned 4
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 30,
      warrantyExpiry: null,
      location: { address: 'Dindoli Kharwasa Road, Surat', lat: 21.1545, lng: 72.8732 },
      customFields: { voltageKV: 3.3, capacityKVA: 450, manufacturer: 'Larsen & Toubro Water', feederId: 'STP-DIN-PH2', flowRateLPM: 35000, tankCapacityLitres: 8000000 }
    },
    {
      name: 'Vesu Canal Secondary Drainage Lift Pump Unit',
      category: 'Utilities',
      subcategory: 'Sewage Pumps',
      department: 'Water Supply',
      cost: 4100000,
      lifecycleStage: 'Procured', // Procured 2
      status: 'active',
      purchaseDate: daysAgo(25),
      installationDate: null,
      expectedLifespanYears: 20,
      warrantyExpiry: null,
      location: { address: 'VIP Road Canal Terminal, Vesu, Surat', lat: 21.1462, lng: 72.7812 },
      customFields: { voltageKV: 0.415, capacityKVA: 95, manufacturer: 'Kirloskar Brothers Ltd', feederId: 'FDR-VES-LIFT', flowRateLPM: 12000, tankCapacityLitres: 350000 }
    },
    {
      name: 'Old Udhna GIDC Oil Transformer T-01 (Retired)', // Decommissioned 2
      category: 'Utilities',
      subcategory: 'Transformers',
      department: 'Electricity',
      cost: 950000,
      lifecycleStage: 'Decommissioned',
      status: 'retired',
      purchaseDate: yearsAgo(22.0),
      installationDate: yearsAgo(21.0),
      expectedLifespanYears: 18,
      warrantyExpiry: yearsAgo(16.0),
      location: { address: 'Plot 12, Udhna GIDC, Surat', lat: 21.1485, lng: 72.8395 },
      customFields: { voltageKV: 11, capacityKVA: 200, manufacturer: 'Voltas Transformers Ltd', feederId: 'FDR-UDH-OLD01', flowRateLPM: 0, tankCapacityLitres: 0 }
    },

    // =========================================================
    // TELECOM & NETWORK (16 assets: 9 In Service, 1 Planned, 1 Procured, 2 Installed, 2 Under Maint, 1 Decomm)
    // =========================================================
    {
      name: 'Adajan Telecom Tower 5G Micro-Site TT-01',
      category: 'Telecom and Network',
      subcategory: 'Cellular Towers',
      department: 'IT',
      cost: 4200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.4),
      installationDate: yearsAgo(2.2),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(380),
      location: { address: 'Anand Mahal Road, Adajan, Surat', lat: 21.1982, lng: 72.7935 },
      customFields: { heightM: 42, frequencyBand: '3.5 GHz (n78) / 700 MHz (n28)', cableLengthKm: 0.8, operator: 'BSNL / SMC Smart Net', serialNumber: 'TEL-ADJ-5G-01', bandwidthMbps: 10000 }
    },
    {
      name: 'Surat Municipal Corporation Fiber Backbone Ring East',
      category: 'Telecom and Network',
      subcategory: 'Fiber Optics',
      department: 'IT',
      cost: 8500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.0),
      installationDate: yearsAgo(3.6),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(180),
      location: { address: 'Varachha-Katargam Loop, Surat', lat: 21.2185, lng: 72.8452 },
      customFields: { heightM: 0, frequencyBand: 'Optical 1310/1550nm Single Mode', cableLengthKm: 28.5, operator: 'SMC Smart City SPV', serialNumber: 'FBR-SMC-RNG-E', bandwidthMbps: 40000 }
    },
    {
      name: 'Majura Gate Core Edge Routing Gateway CR-02',
      category: 'Telecom and Network',
      subcategory: 'Core Routers',
      department: 'IT',
      cost: 3200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.2),
      installationDate: yearsAgo(3.0),
      expectedLifespanYears: 10,
      warrantyExpiry: daysAhead(13), // Warranty expiring within 30 days (5)
      location: { address: 'SMC Majura Zonal Office, Surat', lat: 21.1772, lng: 72.8235 },
      customFields: { heightM: 0, frequencyBand: 'N/A IP Backbone', cableLengthKm: 0.1, operator: 'Cisco Systems / SMC', serialNumber: 'CISCO-ASR9001-MJR', bandwidthMbps: 100000 }
    },
    {
      name: 'Athwa Lines Municipal Data Center Aggregation Switch',
      category: 'Telecom and Network',
      subcategory: 'Switches',
      department: 'IT',
      cost: 2800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.2),
      installationDate: yearsAgo(2.0),
      expectedLifespanYears: 8,
      warrantyExpiry: daysAhead(360),
      location: { address: 'Muglisara Main HQ / Athwa NOC, Surat', lat: 21.1872, lng: 72.8125 },
      customFields: { heightM: 0, frequencyBand: 'Layer 3 100GbE', cableLengthKm: 0.2, operator: 'Juniper Networks', serialNumber: 'JNP-QFX5120-NOC', bandwidthMbps: 100000 }
    },
    {
      name: 'Vesu Smart City Wi-Fi Hotspot Array Zone-B',
      category: 'Telecom and Network',
      subcategory: 'Wireless Access',
      department: 'IT',
      cost: 950000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 5
      status: 'active',
      purchaseDate: yearsAgo(2.5),
      installationDate: yearsAgo(2.2),
      expectedLifespanYears: 8,
      warrantyExpiry: daysAhead(250),
      location: { address: 'University Road, Vesu, Surat', lat: 21.1482, lng: 72.7845 },
      customFields: { heightM: 12, frequencyBand: '2.4 GHz / 5 GHz Wi-Fi 6', cableLengthKm: 1.4, operator: 'Aruba Networks', serialNumber: 'ARUBA-AP575-VESU', bandwidthMbps: 2500 }
    },
    {
      name: 'Piplod Cellular Macro Tower PT-04',
      category: 'Telecom and Network',
      subcategory: 'Cellular Towers',
      department: 'IT',
      cost: 5400000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.2),
      installationDate: yearsAgo(5.0),
      expectedLifespanYears: 20,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Dumas Road Junction, Piplod, Surat', lat: 21.1612, lng: 72.7745 },
      customFields: { heightM: 55, frequencyBand: '1800/2100/3500 MHz', cableLengthKm: 1.2, operator: 'Indus Towers Ltd', serialNumber: 'INDUS-PIP-55M-04', bandwidthMbps: 20000 }
    },
    {
      name: 'Udhna Industrial Fiber Feeder Ring UF-01',
      category: 'Telecom and Network',
      subcategory: 'Fiber Optics',
      department: 'IT',
      cost: 3600000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.2),
      installationDate: yearsAgo(2.8),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(550),
      location: { address: 'Main Road GIDC, Udhna, Surat', lat: 21.1525, lng: 72.8415 },
      customFields: { heightM: 0, frequencyBand: 'Single Mode 96-Core', cableLengthKm: 14.2, operator: 'Sterlite Tech Ltd', serialNumber: 'STL-OFC-96C-UDH', bandwidthMbps: 40000 }
    },
    {
      name: 'Katargam Water Works SCADA Telemetry Tower',
      category: 'Telecom and Network',
      subcategory: 'Cellular Towers',
      department: 'Water Supply',
      cost: 1800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.2),
      installationDate: yearsAgo(4.0),
      expectedLifespanYears: 18,
      warrantyExpiry: daysAhead(120),
      location: { address: 'WTP Control Compound, Katargam, Surat', lat: 21.2272, lng: 72.8262 },
      customFields: { heightM: 30, frequencyBand: '868 MHz LoRaWAN / 4G LTE', cableLengthKm: 0.4, operator: 'Schneider SCADA Net', serialNumber: 'SCADA-TWR-KTG-01', bandwidthMbps: 100 }
    },
    {
      name: 'Rander Old Microwave Relay Antenna Link', // Lifespan Alert: Past Lifespan (3)
      category: 'Telecom and Network',
      subcategory: 'Cellular Towers',
      department: 'IT',
      cost: 1200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(7, 1.20),
      installationDate: pastLifespanDate(7, 1.20), // ratio 1.20
      expectedLifespanYears: 7,
      warrantyExpiry: yearsAgo(4.0),
      location: { address: 'Old Water Tank Top, Rander, Surat', lat: 21.2165, lng: 72.7832 },
      customFields: { heightM: 35, frequencyBand: '18 GHz Microwave', cableLengthKm: 0.1, operator: 'Ericsson India', serialNumber: 'ERIC-MINILINK-RND', bandwidthMbps: 500 }
    },
    {
      name: 'Limbayat Traffic Surveillance Core Gateway GW-03', // Lifespan Alert: Within 10% (3)
      category: 'Telecom and Network',
      subcategory: 'Core Routers',
      department: 'IT',
      cost: 1950000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: nearLifespanDate(8, 0.95),
      installationDate: nearLifespanDate(8, 0.94), // ratio 0.94
      expectedLifespanYears: 8,
      warrantyExpiry: yearsAgo(3.0),
      location: { address: 'Limbayat Police Station Control Room, Surat', lat: 21.1722, lng: 72.8645 },
      customFields: { heightM: 0, frequencyBand: 'Ethernet Backbone', cableLengthKm: 0.2, operator: 'Fortinet India', serialNumber: 'FG-600E-LIM-03', bandwidthMbps: 20000 }
    },
    {
      name: 'Sarthana Ring Road Micro Cellular Monopole SM-09',
      category: 'Telecom and Network',
      subcategory: 'Cellular Towers',
      department: 'IT',
      cost: 2600000,
      lifecycleStage: 'Installed', // Installed 5
      status: 'active',
      purchaseDate: daysAgo(45),
      installationDate: daysAgo(8),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(700),
      location: { address: 'Near Zoo Gate, Sarthana, Surat', lat: 21.2325, lng: 72.8885 },
      customFields: { heightM: 30, frequencyBand: '700/1800/3500 MHz', cableLengthKm: 0.9, operator: 'Reliance Jio / SMC', serialNumber: 'JIO-MONO-SAR-09', bandwidthMbps: 10000 }
    },
    {
      name: 'Vesu Optical Splitter Node OS-05',
      category: 'Telecom and Network',
      subcategory: 'Fiber Optics',
      department: 'IT',
      cost: 1100000,
      lifecycleStage: 'Installed', // Installed 6
      status: 'active',
      purchaseDate: daysAgo(40),
      installationDate: daysAgo(7),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(720),
      location: { address: 'Someshwara Enclave Junction, Vesu, Surat', lat: 21.1432, lng: 72.7825 },
      customFields: { heightM: 0, frequencyBand: 'FTTH Passive GPON', cableLengthKm: 4.8, operator: 'Sterlite Tech Ltd', serialNumber: 'STL-OS-VES-05', bandwidthMbps: 10000 }
    },
    {
      name: 'Pal Fiber Distribution Hub Optical Cabinet FDT-04',
      category: 'Telecom and Network',
      subcategory: 'Fiber Optics',
      department: 'IT',
      cost: 1350000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 6
      status: 'active',
      purchaseDate: yearsAgo(2.5),
      installationDate: yearsAgo(2.2),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(400),
      location: { address: 'Pal RTO Cross Road, Surat', lat: 21.1935, lng: 72.7745 },
      customFields: { heightM: 0, frequencyBand: 'Passive Optical 288F', cableLengthKm: 8.5, operator: 'CommScope Inc', serialNumber: 'CS-FDT-288-PAL', bandwidthMbps: 40000 }
    },
    {
      name: 'Surat Smart City West Bank LoRaWAN Gateway Network',
      category: 'Telecom and Network',
      subcategory: 'Wireless Access',
      department: 'IT',
      cost: 850000,
      lifecycleStage: 'Planned', // Planned 5
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 8,
      warrantyExpiry: null,
      location: { address: 'Riverfront Control Kiosk, Adajan, Surat', lat: 21.1925, lng: 72.7915 },
      customFields: { heightM: 18, frequencyBand: '865-867 MHz IN865 LoRa', cableLengthKm: 0.1, operator: 'Kerlink / SMC IoT', serialNumber: 'KERLINK-LORA-W01', bandwidthMbps: 50 }
    },
    {
      name: '5G Edge Computing Micro-Data Node Pal',
      category: 'Telecom and Network',
      subcategory: 'Wireless Access',
      department: 'IT',
      cost: 2850000,
      lifecycleStage: 'Procured', // Procured 3
      status: 'active',
      purchaseDate: daysAgo(30),
      installationDate: null,
      expectedLifespanYears: 10,
      warrantyExpiry: null,
      location: { address: 'Pal Gam Smart Pole Array, Surat', lat: 21.1955, lng: 72.7738 },
      customFields: { heightM: 15, frequencyBand: '3.5GHz / Edge 10GbE', cableLengthKm: 0.5, operator: 'Ericsson / SMC Net', serialNumber: 'ERIC-EDGE-PAL-01', bandwidthMbps: 20000 }
    },
    {
      name: 'Legacy Copper Cable Trunk Line Katargam-Old City', // Decommissioned 3
      category: 'Telecom and Network',
      subcategory: 'Fiber Optics',
      department: 'IT',
      cost: 650000,
      lifecycleStage: 'Decommissioned',
      status: 'retired',
      purchaseDate: yearsAgo(20.0),
      installationDate: yearsAgo(19.0),
      expectedLifespanYears: 15,
      warrantyExpiry: yearsAgo(14.0),
      location: { address: 'Darwaja Corridor, Katargam, Surat', lat: 21.2285, lng: 72.8235 },
      customFields: { heightM: 0, frequencyBand: 'Voiceband Copper Pairs', cableLengthKm: 5.2, operator: 'BSNL Legacy Line', serialNumber: 'BSNL-COPPER-KTG', bandwidthMbps: 2 }
    },

    // =========================================================
    // BUILDING FACILITIES (16 assets: 9 In Service, 1 Planned, 1 Procured, 2 Installed, 2 Under Maint, 1 Decomm)
    // =========================================================
    {
      name: 'SMC Headquarters Central HVAC Chiller Unit CH-01',
      category: 'Building Facilities',
      subcategory: 'HVAC',
      department: 'Facilities',
      cost: 9500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.2),
      installationDate: yearsAgo(3.8),
      expectedLifespanYears: 18,
      warrantyExpiry: daysAhead(160),
      location: { address: 'Muglisara Main Administrative Complex, Surat', lat: 21.1865, lng: 72.8135 },
      customFields: { ratingKW: 450, floorOrZone: 'Basement Mechanical Plant Room', manufacturer: 'Blue Star Ltd', lastServiceDate: daysAgo(30).toISOString(), safetyCertExpiry: daysAhead(180).toISOString() }
    },
    {
      name: 'New Civil Hospital High-Speed Emergency Elevator EL-01',
      category: 'Building Facilities',
      subcategory: 'Elevators',
      department: 'Facilities',
      cost: 6200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.5),
      installationDate: yearsAgo(3.2),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(22), // Warranty expiring within 30 days (6)
      location: { address: 'Trauma Care Wing, New Civil Hospital, Majura Gate, Surat', lat: 21.1755, lng: 72.8218 },
      customFields: { ratingKW: 35, floorOrZone: 'Core Shaft G-7 Emergency Block', manufacturer: 'Otis Elevator Co', lastServiceDate: daysAgo(15).toISOString(), safetyCertExpiry: daysAhead(90).toISOString() }
    },
    {
      name: 'Adajan Community Center Standby Generator 500kVA',
      category: 'Building Facilities',
      subcategory: 'Generators',
      department: 'Facilities',
      cost: 4800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.8),
      installationDate: yearsAgo(4.5),
      expectedLifespanYears: 18,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Adajan Civic Center, Pal Road, Surat', lat: 21.1972, lng: 72.7885 },
      customFields: { ratingKW: 400, floorOrZone: 'Ground Floor Utility Yard', manufacturer: 'Cummins India Ltd', lastServiceDate: daysAgo(40).toISOString(), safetyCertExpiry: daysAhead(240).toISOString() }
    },
    {
      name: 'Surat Smart City Integrated Command Center CCTV Wall Display',
      category: 'Building Facilities',
      subcategory: 'CCTV Surveillance',
      department: 'IT',
      cost: 12500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.8),
      installationDate: yearsAgo(2.6),
      expectedLifespanYears: 12,
      warrantyExpiry: daysAhead(420),
      location: { address: 'ICCC Control Room, Althan, Surat', lat: 21.1625, lng: 72.8135 },
      customFields: { ratingKW: 25, floorOrZone: '3rd Floor Main Operations Room', manufacturer: 'Barco Display Systems', lastServiceDate: daysAgo(20).toISOString(), safetyCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Varachha Zonal Office Fire Suppression Sprinkler Array',
      category: 'Building Facilities',
      subcategory: 'Fire Safety',
      department: 'Facilities',
      cost: 3800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.2),
      installationDate: yearsAgo(4.0),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(150),
      location: { address: 'Varachha Zonal Civic Building, Surat', lat: 21.2135, lng: 72.8582 },
      customFields: { ratingKW: 15, floorOrZone: 'All Floors (G+4)', manufacturer: 'Tyco Fire Protection', lastServiceDate: daysAgo(50).toISOString(), safetyCertExpiry: daysAhead(60).toISOString() }
    },
    {
      name: 'Katargam Indoor Sports Complex Chiller Plant CH-02',
      category: 'Building Facilities',
      subcategory: 'HVAC',
      department: 'Facilities',
      cost: 7200000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 7
      status: 'active',
      purchaseDate: yearsAgo(5.0),
      installationDate: yearsAgo(4.6),
      expectedLifespanYears: 18,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Katargam Stadium Complex, Surat', lat: 21.2255, lng: 72.8285 },
      customFields: { ratingKW: 320, floorOrZone: 'Rooftop Plant Bay 2', manufacturer: 'Voltas Limited', lastServiceDate: daysAgo(5).toISOString(), safetyCertExpiry: daysAhead(110).toISOString() }
    },
    {
      name: 'Vesu Convention Center Heavy Freight Lift FL-01',
      category: 'Building Facilities',
      subcategory: 'Elevators',
      department: 'Facilities',
      cost: 5100000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.3),
      installationDate: yearsAgo(3.0),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(310),
      location: { address: 'Sarsana International Exhibition Center, Surat', lat: 21.1395, lng: 72.7812 },
      customFields: { ratingKW: 45, floorOrZone: 'Service Dock B', manufacturer: 'Schindler India Ltd', lastServiceDate: daysAgo(25).toISOString(), safetyCertExpiry: daysAhead(200).toISOString() }
    },
    {
      name: 'Athwa Police Commissionerate Standby Diesel Generator 250kVA',
      category: 'Building Facilities',
      subcategory: 'Generators',
      department: 'Facilities',
      cost: 3100000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.8),
      installationDate: yearsAgo(5.5),
      expectedLifespanYears: 20,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Athwa Lines Police HQ, Surat', lat: 21.1795, lng: 72.8055 },
      customFields: { ratingKW: 200, floorOrZone: 'Rear Generator Yard', manufacturer: 'Kirloskar Oil Engines', lastServiceDate: daysAgo(60).toISOString(), safetyCertExpiry: daysAhead(150).toISOString() }
    },
    {
      name: 'Old Rander Municipal Dispensary Window AC Array', // Lifespan Alert: Past Lifespan (4)
      category: 'Building Facilities',
      subcategory: 'HVAC',
      department: 'Facilities',
      cost: 450000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(5, 1.25),
      installationDate: pastLifespanDate(5, 1.25), // ratio 1.25
      expectedLifespanYears: 5,
      warrantyExpiry: yearsAgo(3.0),
      location: { address: 'Old Town Health Center, Rander, Surat', lat: 21.2175, lng: 72.7855 },
      customFields: { ratingKW: 18, floorOrZone: 'Clinic Rooms 1-6', manufacturer: 'Carrier Midea India', lastServiceDate: daysAgo(14).toISOString(), safetyCertExpiry: daysAhead(45).toISOString() }
    },
    {
      name: 'Limbayat Maternity Hospital Emergency Generator', // Lifespan Alert: Within 10% (4)
      category: 'Building Facilities',
      subcategory: 'Generators',
      department: 'Facilities',
      cost: 2200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: nearLifespanDate(8, 0.96),
      installationDate: nearLifespanDate(8, 0.95), // ratio 0.95
      expectedLifespanYears: 8,
      warrantyExpiry: yearsAgo(4.0),
      location: { address: 'Limbayat Community Hospital, Surat', lat: 21.1712, lng: 72.8625 },
      customFields: { ratingKW: 160, floorOrZone: 'Utility Annex Shed', manufacturer: 'Mahindra Powerol', lastServiceDate: daysAgo(45).toISOString(), safetyCertExpiry: daysAhead(120).toISOString() }
    },
    {
      name: 'Dindoli Town Hall Rooftop Fire Hydrant Booster Pump',
      category: 'Building Facilities',
      subcategory: 'Fire Safety',
      department: 'Facilities',
      cost: 1600000,
      lifecycleStage: 'Installed', // Installed 7
      status: 'active',
      purchaseDate: daysAgo(50),
      installationDate: daysAgo(12),
      expectedLifespanYears: 18,
      warrantyExpiry: daysAhead(710),
      location: { address: 'Dindoli Town Hall Complex, Surat', lat: 21.1592, lng: 72.8735 },
      customFields: { ratingKW: 30, floorOrZone: 'Rooftop Water Storage Level', manufacturer: 'Crompton Fire Pumps', lastServiceDate: daysAgo(12).toISOString(), safetyCertExpiry: daysAhead(360).toISOString() }
    },
    {
      name: 'Althan Civic Center Service Elevator EL-03',
      category: 'Building Facilities',
      subcategory: 'Elevators',
      department: 'Facilities',
      cost: 3200000,
      lifecycleStage: 'Installed', // Installed 8
      status: 'active',
      purchaseDate: daysAgo(45),
      installationDate: daysAgo(10),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(720),
      location: { address: 'Althan Zonal Building, Surat', lat: 21.1618, lng: 72.8128 },
      customFields: { ratingKW: 24, floorOrZone: 'Rear Loading Bay (G+3)', manufacturer: 'Johnson Lifts India', lastServiceDate: daysAgo(10).toISOString(), safetyCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Surat Railway Station Multi-Level Car Parking Elevator P1',
      category: 'Building Facilities',
      subcategory: 'Elevators',
      department: 'Facilities',
      cost: 4100000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 8
      status: 'active',
      purchaseDate: yearsAgo(3.8),
      installationDate: yearsAgo(3.5),
      expectedLifespanYears: 20,
      warrantyExpiry: daysAhead(280),
      location: { address: 'MLCP Block, Station Road, Surat', lat: 21.2052, lng: 72.8432 },
      customFields: { ratingKW: 28, floorOrZone: 'North Tower Shaft (G+6)', manufacturer: 'Thyssenkrupp India', lastServiceDate: daysAgo(2).toISOString(), safetyCertExpiry: daysAhead(70).toISOString() }
    },
    {
      name: 'Sarthana Bio-Waste Processing Facility Solar Rooftop Plant',
      category: 'Building Facilities',
      subcategory: 'Generators',
      department: 'Facilities',
      cost: 8800000,
      lifecycleStage: 'Planned', // Planned 6
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 25,
      warrantyExpiry: null,
      location: { address: 'Waste Management Hub, Sarthana, Surat', lat: 21.2345, lng: 72.8862 },
      customFields: { ratingKW: 250, floorOrZone: 'Processing Shed Roof A & B', manufacturer: 'Tata Power Solar', lastServiceDate: null, safetyCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Athwa Zone Health Center Backup Generator 160kVA',
      category: 'Building Facilities',
      subcategory: 'Generators',
      department: 'Facilities',
      cost: 2450000,
      lifecycleStage: 'Procured', // Procured 4
      status: 'active',
      purchaseDate: daysAgo(35),
      installationDate: null,
      expectedLifespanYears: 20,
      warrantyExpiry: null,
      location: { address: 'Near Athwa Dispensary Yard, Surat', lat: 21.1768, lng: 72.8042 },
      customFields: { ratingKW: 128, floorOrZone: 'Outdoor Acoustic Enclosure', manufacturer: 'Mahindra Powerol', lastServiceDate: null, safetyCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Old Muglisara Boiler Unit (Decommissioned)', // Decommissioned 4
      category: 'Building Facilities',
      subcategory: 'HVAC',
      department: 'Facilities',
      cost: 850000,
      lifecycleStage: 'Decommissioned',
      status: 'retired',
      purchaseDate: yearsAgo(22.0),
      installationDate: yearsAgo(21.0),
      expectedLifespanYears: 15,
      warrantyExpiry: yearsAgo(16.0),
      location: { address: 'Old Boiler Room, Muglisara, Surat', lat: 21.1868, lng: 72.8142 },
      customFields: { ratingKW: 120, floorOrZone: 'Old Cellar Boiler Bay', manufacturer: 'Thermax India (Legacy)', lastServiceDate: yearsAgo(3.0).toISOString(), safetyCertExpiry: yearsAgo(3.0).toISOString() }
    },

    // =========================================================
    // TRANSPORT (14 assets: 8 In Service, 1 Planned, 1 Procured, 1 Installed, 2 Under Maint, 1 Decomm)
    // =========================================================
    {
      name: 'Surat Sitilink BRTS Electric Bus #GJ-05-EB-4102',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 11500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.6),
      installationDate: yearsAgo(2.4),
      expectedLifespanYears: 12,
      warrantyExpiry: daysAhead(450),
      location: { address: 'Adajan BRTS Bus Depot, Surat', lat: 21.1952, lng: 72.7942 },
      customFields: { registrationNumber: 'GJ-05-EB-4102', engineType: 'Electric', seatingCapacity: 42, route: 'Route 101: Adajan Gam to Sarthana Nature Park', fitnessCertExpiry: daysAhead(280).toISOString() }
    },
    {
      name: 'Surat Sitilink CNG Feeder Bus #GJ-05-BZ-7814',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 4200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(5.2),
      installationDate: yearsAgo(5.0),
      expectedLifespanYears: 12,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Katargam Bus Terminal, Surat', lat: 21.2262, lng: 72.8242 },
      customFields: { registrationNumber: 'GJ-05-BZ-7814', engineType: 'CNG', seatingCapacity: 34, route: 'Route 12: Katargam to Surat Central Railway Station', fitnessCertExpiry: daysAhead(140).toISOString() }
    },
    {
      name: 'SMC Water Supply Heavy Emergency Tanker #GJ-05-WT-9021',
      category: 'Transport',
      subcategory: 'Emergency Vehicles',
      department: 'Water Supply',
      cost: 2800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(4.6),
      installationDate: yearsAgo(4.4),
      expectedLifespanYears: 15,
      warrantyExpiry: daysAhead(180),
      location: { address: 'Althan Water Works Depot, Surat', lat: 21.1628, lng: 72.8145 },
      customFields: { registrationNumber: 'GJ-05-WT-9021', engineType: 'Diesel', seatingCapacity: 3, route: 'Emergency potable water distribution - South Zone', fitnessCertExpiry: daysAhead(95).toISOString() }
    },
    {
      name: 'Surat Fire Brigade Hydraulic Platform Tender #GJ-05-FB-1101',
      category: 'Transport',
      subcategory: 'Emergency Vehicles',
      department: 'Facilities',
      cost: 14000000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.8),
      installationDate: yearsAgo(3.6),
      expectedLifespanYears: 18,
      warrantyExpiry: daysAhead(5), // Warranty expiring within 30 days (7)
      location: { address: 'Muglisara Central Fire Station, Surat', lat: 21.1858, lng: 72.8122 },
      customFields: { registrationNumber: 'GJ-05-FB-1101', engineType: 'Diesel', seatingCapacity: 6, route: 'Surat Central Urban Core Emergency Response', fitnessCertExpiry: daysAhead(200).toISOString() }
    },
    {
      name: 'Surat Sitilink CNG Transit Bus #GJ-05-BZ-6523',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 4200000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 9
      status: 'active',
      purchaseDate: yearsAgo(5.8),
      installationDate: yearsAgo(5.5),
      expectedLifespanYears: 12,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Pandesara Maintenance Shed, Surat', lat: 21.1318, lng: 72.8295 },
      customFields: { registrationNumber: 'GJ-05-BZ-6523', engineType: 'CNG', seatingCapacity: 34, route: 'Route 45: Pandesara GIDC to Varachha', fitnessCertExpiry: daysAhead(60).toISOString() }
    },
    {
      name: 'Traffic Enforcement Interceptor Patrol Vehicle #GJ-05-TP-3344',
      category: 'Transport',
      subcategory: 'Emergency Vehicles',
      department: 'Transport',
      cost: 1800000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.2),
      installationDate: yearsAgo(2.0),
      expectedLifespanYears: 10,
      warrantyExpiry: daysAhead(360),
      location: { address: 'Majura Gate Traffic Outpost, Surat', lat: 21.1775, lng: 72.8221 },
      customFields: { registrationNumber: 'GJ-05-TP-3344', engineType: 'Petrol', seatingCapacity: 5, route: 'Ring Road & Gaurav Path Surveillance', fitnessCertExpiry: daysAhead(300).toISOString() }
    },
    {
      name: 'Surat Sitilink Electric BRTS Bus #GJ-05-EB-4130',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 11500000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(1.8),
      installationDate: yearsAgo(1.6),
      expectedLifespanYears: 12,
      warrantyExpiry: daysAhead(520),
      location: { address: 'Pal BRTS Depot, Surat', lat: 21.1938, lng: 72.7735 },
      customFields: { registrationNumber: 'GJ-05-EB-4130', engineType: 'Electric', seatingCapacity: 42, route: 'Route 305: Pal RTO to Surat Airport / Dumas', fitnessCertExpiry: daysAhead(340).toISOString() }
    },
    {
      name: 'Municipal Solid Waste Compactor Truck #GJ-05-SW-5512', // Lifespan Alert: Past Lifespan (5)
      category: 'Transport',
      subcategory: 'Emergency Vehicles',
      department: 'Public Works',
      cost: 3200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(6, 1.15),
      installationDate: pastLifespanDate(6, 1.15), // ratio 1.15
      expectedLifespanYears: 6,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Varachha Solid Waste Station, Surat', lat: 21.2115, lng: 72.8625 },
      customFields: { registrationNumber: 'GJ-05-SW-5512', engineType: 'Diesel', seatingCapacity: 3, route: 'Ward 8 Commercial Garbage Collection', fitnessCertExpiry: daysAhead(40).toISOString() }
    },
    {
      name: 'Surat Sitilink Feeder Mini-Bus #GJ-05-BZ-3301', // Lifespan Alert: Within 10% (5)
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 2600000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: nearLifespanDate(6, 0.95),
      installationDate: nearLifespanDate(6, 0.95), // ratio 0.95
      expectedLifespanYears: 6,
      warrantyExpiry: yearsAgo(1.0),
      location: { address: 'Rander Bus Terminus, Surat', lat: 21.2188, lng: 72.7835 },
      customFields: { registrationNumber: 'GJ-05-BZ-3301', engineType: 'CNG', seatingCapacity: 24, route: 'Route 8: Rander to Chowk Bazaar', fitnessCertExpiry: daysAhead(85).toISOString() }
    },
    {
      name: 'Surat Sitilink Low-Floor Electric Bus #GJ-05-EB-5001',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 12000000,
      lifecycleStage: 'Installed', // Installed 9
      status: 'active',
      purchaseDate: daysAgo(50),
      installationDate: daysAgo(10),
      expectedLifespanYears: 12,
      warrantyExpiry: daysAhead(720),
      location: { address: 'Sarthana Depot Bay 4, Surat', lat: 21.2338, lng: 72.8878 },
      customFields: { registrationNumber: 'GJ-05-EB-5001', engineType: 'Electric', seatingCapacity: 45, route: 'Route 501: Sarthana Express to Dumas', fitnessCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Surat Airport Express Hybrid Shuttle Bus #GJ-05-HB-2201',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 8500000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 10
      status: 'active',
      purchaseDate: yearsAgo(2.0),
      installationDate: yearsAgo(1.8),
      expectedLifespanYears: 10,
      warrantyExpiry: daysAhead(300),
      location: { address: 'Dumas Road Transit Bay, Surat', lat: 21.1265, lng: 72.7625 },
      customFields: { registrationNumber: 'GJ-05-HB-2201', engineType: 'Hybrid', seatingCapacity: 30, route: 'Route 99: Surat Railway to Airport Link', fitnessCertExpiry: daysAhead(180).toISOString() }
    },
    {
      name: 'Electric Bus Heavy Fast-Charging Depot Gantry #03',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 6500000,
      lifecycleStage: 'Planned', // Planned 7
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 15,
      warrantyExpiry: null,
      location: { address: 'Pal Transit Depot Expansion, Surat', lat: 21.1945, lng: 72.7718 },
      customFields: { registrationNumber: 'CHARGER-DEPOT-03', engineType: 'Electric', seatingCapacity: 0, route: 'Depot Fleet Overnight Charging Gantry', fitnessCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Surat BRTS Low-Floor Electric Bus Fleet Addition #GJ-05-EB-5110',
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 11800000,
      lifecycleStage: 'Procured', // Procured 5
      status: 'active',
      purchaseDate: daysAgo(35),
      installationDate: null,
      expectedLifespanYears: 12,
      warrantyExpiry: null,
      location: { address: 'SMC Central Transit Depot, Surat', lat: 21.1538, lng: 72.8442 },
      customFields: { registrationNumber: 'GJ-05-EB-5110', engineType: 'Electric', seatingCapacity: 45, route: 'Route 401: Athwa to Varachha Express', fitnessCertExpiry: daysAhead(365).toISOString() }
    },
    {
      name: 'Old Tata Diesel City Bus #GJ-05-T-1288 (Retired)', // Decommissioned 5
      category: 'Transport',
      subcategory: 'City Buses',
      department: 'Transport',
      cost: 1800000,
      lifecycleStage: 'Decommissioned',
      status: 'retired',
      purchaseDate: yearsAgo(18.0),
      installationDate: yearsAgo(17.5),
      expectedLifespanYears: 12,
      warrantyExpiry: yearsAgo(13.0),
      location: { address: 'Udhna Scrapyard Bay, Surat', lat: 21.1492, lng: 72.8412 },
      customFields: { registrationNumber: 'GJ-05-T-1288', engineType: 'Diesel', seatingCapacity: 48, route: 'Old Route 5: Udhna to Chowk', fitnessCertExpiry: yearsAgo(5.0).toISOString() }
    },

    // =========================================================
    // IT ASSETS (12 assets: 8 In Service, 1 Planned, 0 Procured, 1 Installed, 2 Under Maint, 0 Decomm)
    // =========================================================
    {
      name: 'SMC Central Datacenter Primary Rack Server SRV-01',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 1850000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.0),
      installationDate: yearsAgo(2.8),
      expectedLifespanYears: 7,
      warrantyExpiry: daysAhead(28), // Warranty expiring within 30 days (8)
      location: { address: 'Data Center Room 102, Muglisara HQ, Surat', lat: 21.1862, lng: 72.8132 },
      customFields: { serialNumber: 'DELL-R750-SRV01-SMC', specs: 'Dell PowerEdge R750, 2x Intel Xeon Gold 6330, 512GB DDR4, 8x 3.84TB NVMe SSD', assignedTo: 'Server Operations Team / IT Head', licenseKey: 'WIN-SRV-2022-DATACENTER-8941', licenseExpiry: daysAhead(350).toISOString() }
    },
    {
      name: 'SMC SAN Central Storage Array SAN-01',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 3200000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.2),
      installationDate: yearsAgo(3.0),
      expectedLifespanYears: 8,
      warrantyExpiry: daysAhead(220),
      location: { address: 'Data Center Room 102, Muglisara HQ, Surat', lat: 21.1862, lng: 72.8132 },
      customFields: { serialNumber: 'HPE-MSA2062-SAN01', specs: 'HPE MSA 2062 16Gb FC Dual Controller, 48TB Flash Array, Raid 6', assignedTo: 'Infrastructure Storage Admin', licenseKey: 'HPE-STORAGE-ENT-LIC-4412', licenseExpiry: daysAhead(500).toISOString() }
    },
    {
      name: 'Integrated Command Center Main Video Wall Controller Server',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 2100000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.6),
      installationDate: yearsAgo(2.4),
      expectedLifespanYears: 8,
      warrantyExpiry: daysAhead(400),
      location: { address: 'ICCC Server Room, Althan, Surat', lat: 21.1622, lng: 72.8132 },
      customFields: { serialNumber: 'HP-DL380-ICCC-WALL', specs: 'HPE ProLiant DL380 Gen10, 2x Xeon 6248R, 256GB RAM, 4x NVIDIA RTX A5000', assignedTo: 'Smart City Surveillance Team', licenseKey: 'BARCO-WALL-CTRL-KEY-9902', licenseExpiry: daysAhead(400).toISOString() }
    },
    {
      name: 'Surat Urban GIS Mapping High-Performance Workstation WS-01',
      category: 'IT Assets',
      subcategory: 'Workstations',
      department: 'IT',
      cost: 240000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(1.5),
      installationDate: yearsAgo(1.4),
      expectedLifespanYears: 6,
      warrantyExpiry: daysAhead(600),
      location: { address: 'Town Planning Section, Athwa Lines, Surat', lat: 21.1785, lng: 72.8032 },
      customFields: { serialNumber: 'LENOVO-P620-WS01', specs: 'Lenovo ThinkStation P620, AMD Threadripper PRO 3955WX, 128GB RAM, RTX A4000', assignedTo: 'Senior GIS Spatial Analyst (Town Planning)', licenseKey: 'ESRI-ARCGIS-PRO-ADV-7821', licenseExpiry: daysAhead(210).toISOString() }
    },
    {
      name: 'Katargam Citizen Center Public Kiosk Server Unit',
      category: 'IT Assets',
      subcategory: 'Workstations',
      department: 'IT',
      cost: 115000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 11
      status: 'active',
      purchaseDate: yearsAgo(2.3),
      installationDate: yearsAgo(2.1),
      expectedLifespanYears: 6,
      warrantyExpiry: daysAhead(110),
      location: { address: 'Civic Center Lobby, Katargam, Surat', lat: 21.2265, lng: 72.8252 },
      customFields: { serialNumber: 'DELL-OPTI-7090-KTG', specs: 'Dell OptiPlex 7090 Micro, Intel i7-11700, 32GB RAM, 1TB SSD', assignedTo: 'Front Desk Operator 02', licenseKey: 'MS-WIN11-PRO-OEM-1938', licenseExpiry: daysAhead(500).toISOString() }
    },
    {
      name: 'Varachha Zonal Office Property Tax Database Backup Server',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 1450000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(3.5),
      installationDate: yearsAgo(3.2),
      expectedLifespanYears: 7,
      warrantyExpiry: daysAhead(190),
      location: { address: 'Zonal Server Room, Varachha, Surat', lat: 21.2142, lng: 72.8602 },
      customFields: { serialNumber: 'CISCO-UCS-C220-VAR', specs: 'Cisco UCS C220 M5, 2x Intel Xeon Silver 4214, 128GB RAM, 6x 1.92TB SAS SSD', assignedTo: 'Revenue & Tax IT Administrator', licenseKey: 'RHEL-ENT-SRV-8-SUBSCR', licenseExpiry: daysAhead(180).toISOString() }
    },
    {
      name: 'Adajan Health Center Medical Records Terminals Cluster',
      category: 'IT Assets',
      subcategory: 'Workstations',
      department: 'IT',
      cost: 185000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(1.8),
      installationDate: yearsAgo(1.7),
      expectedLifespanYears: 6,
      warrantyExpiry: daysAhead(550),
      location: { address: 'Health Center Records Wing, Adajan, Surat', lat: 21.1968, lng: 72.7925 },
      customFields: { serialNumber: 'HP-ELITE-800-ADJ', specs: 'HP EliteDesk 800 G6, Intel Core i5-10500, 16GB RAM, 512GB SSD', assignedTo: 'Health Records Officer', licenseKey: 'WIN10-ENT-VOLUME-0941', licenseExpiry: daysAhead(400).toISOString() }
    },
    {
      name: 'Surat Municipal Corporation Core Firewall Appliance FW-01',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 1750000,
      lifecycleStage: 'Under Maintenance', // Under Maintenance 12
      status: 'active',
      purchaseDate: yearsAgo(2.8),
      installationDate: yearsAgo(2.6),
      expectedLifespanYears: 8,
      warrantyExpiry: daysAhead(310),
      location: { address: 'Central NOC Room, Muglisara HQ, Surat', lat: 21.1862, lng: 72.8132 },
      customFields: { serialNumber: 'PALOALTO-PA-3260-01', specs: 'Palo Alto PA-3260 Next-Gen Firewall, 8.8 Gbps Threat Prevention Throughput', assignedTo: 'Network Security Lead', licenseKey: 'PAN-OS-THREAT-PREV-SUB-8812', licenseExpiry: daysAhead(140).toISOString() }
    },
    {
      name: 'Old Majura Gate Billing Terminal Desktop', // Lifespan Alert: Past Lifespan (6)
      category: 'IT Assets',
      subcategory: 'Workstations',
      department: 'IT',
      cost: 75000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: pastLifespanDate(5, 1.20),
      installationDate: pastLifespanDate(5, 1.20), // ratio 1.20
      expectedLifespanYears: 5,
      warrantyExpiry: yearsAgo(2.0),
      location: { address: 'Water Bill Counter #3, Majura Gate, Surat', lat: 21.1775, lng: 72.8228 },
      customFields: { serialNumber: 'HCL-INFINITY-MJR03', specs: 'HCL Infiniti Pro, Intel Core i3-6100, 8GB DDR4, 500GB HDD', assignedTo: 'Billing Cashier Counter 3', licenseKey: 'WIN7-PRO-OEM-LEGACY', licenseExpiry: yearsAgo(2.0).toISOString() }
    },
    {
      name: 'Udhna Citizen Kiosk Display Terminal Unit 01',
      category: 'IT Assets',
      subcategory: 'Workstations',
      department: 'IT',
      cost: 88000,
      lifecycleStage: 'Installed', // Installed 10
      status: 'active',
      purchaseDate: daysAgo(35),
      installationDate: daysAgo(5),
      expectedLifespanYears: 6,
      warrantyExpiry: daysAhead(720),
      location: { address: 'Zone Office Entrance, Udhna, Surat', lat: 21.1538, lng: 72.8428 },
      customFields: { serialNumber: 'ACER-VERITON-UDH01', specs: 'Acer Veriton Touch Kiosk PC, Core i5 12th Gen, 16GB RAM, 512GB SSD', assignedTo: 'Public Information Desk', licenseKey: 'WIN11-KIOSK-OEM-5512', licenseExpiry: daysAhead(700).toISOString() }
    },
    {
      name: 'Surat Smart City Data Warehouse Analytics Host SW-01',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 2650000,
      lifecycleStage: 'In Service',
      status: 'active',
      purchaseDate: yearsAgo(2.2),
      installationDate: yearsAgo(2.0),
      expectedLifespanYears: 7,
      warrantyExpiry: daysAhead(480),
      location: { address: 'Data Center Room 102, Muglisara HQ, Surat', lat: 21.1862, lng: 72.8132 },
      customFields: { serialNumber: 'DELL-R840-DW01', specs: 'Dell PowerEdge R840, 4x Intel Xeon Gold 6248, 768GB RAM, 12x NVMe SSD', assignedTo: 'Smart City Data Science Cell', licenseKey: 'ORACLE-DB-EE-21C-LIC', licenseExpiry: daysAhead(400).toISOString() }
    },
    {
      name: 'Surat Smart City Disaster Recovery Cloud Node Cluster',
      category: 'IT Assets',
      subcategory: 'Datacenter Servers',
      department: 'IT',
      cost: 3800000,
      lifecycleStage: 'Planned', // Planned 8
      status: 'active',
      purchaseDate: null,
      installationDate: null,
      expectedLifespanYears: 8,
      warrantyExpiry: null,
      location: { address: 'Off-site DR Center, Dumas Road, Surat', lat: 21.1285, lng: 72.7635 },
      customFields: { serialNumber: 'HPE-SYNERGY-DR-NODE', specs: 'HPE Synergy 480 Gen10 Composable Compute Module, Dual Xeon 6338, 1TB RAM', assignedTo: 'Disaster Recovery Operations Lead', licenseKey: 'VMWARE-VSPHERE-ENT-PLUS', licenseExpiry: daysAhead(365).toISOString() }
    }
  ];

  if (rawAssets.length !== 100) {
    throw new Error(`Expected exactly 100 assets, but created ${rawAssets.length}`);
  }

  // Assign asset tags AST-0001 through AST-0100 and categories/createdBy
  const adminId = userMap['admin@demo.com']._id;
  const managerId = userMap['manager@demo.com']._id;

  const assetsToInsert = rawAssets.map((asset, index) => {
    const seq = index + 1;
    const tag = `AST-${String(seq).padStart(4, '0')}`;
    const categoryDoc = categoryMap[asset.category];
    if (!categoryDoc) {
      throw new Error(`Category not found: ${asset.category}`);
    }

    return {
      ...asset,
      assetTag: tag,
      category: categoryDoc._id,
      createdBy: adminId
    };
  });

  const createdAssets = await Asset.create(assetsToInsert);
  console.log(`✅ Seeded ${createdAssets.length} assets with tags AST-0001 through AST-0100.`);

  // Verify lifecycle stages distribution
  const stageCounts = {};
  createdAssets.forEach((a) => {
    stageCounts[a.lifecycleStage] = (stageCounts[a.lifecycleStage] || 0) + 1;
  });
  console.log('📊 Asset Lifecycle Distribution:', stageCounts);

  // 5. CREATE LIFECYCLE EVENTS
  console.log('\n📜 Generating historical lifecycle events for all assets...');
  const lifecycleEventsToInsert = [];

  for (const asset of createdAssets) {
    const pDate = asset.purchaseDate || daysAgo(120);
    const iDate = asset.installationDate || daysAgo(60);

    // Event 1: Creation in Planned stage
    lifecycleEventsToInsert.push({
      asset: asset._id,
      fromStage: null,
      toStage: 'Planned',
      changedBy: managerId,
      remarks: 'Asset identified and added to municipal capital project inventory plan',
      date: new Date(pDate.getTime() - 90 * 24 * 3600 * 1000)
    });

    if (['Procured', 'Installed', 'In Service', 'Under Maintenance', 'Decommissioned'].includes(asset.lifecycleStage)) {
      lifecycleEventsToInsert.push({
        asset: asset._id,
        fromStage: 'Planned',
        toStage: 'Procured',
        changedBy: managerId,
        remarks: 'Procurement tender approved; purchase order issued to manufacturer',
        date: pDate
      });
    }

    if (['Installed', 'In Service', 'Under Maintenance', 'Decommissioned'].includes(asset.lifecycleStage)) {
      lifecycleEventsToInsert.push({
        asset: asset._id,
        fromStage: 'Procured',
        toStage: 'Installed',
        changedBy: managerId,
        remarks: 'Physical installation, civil foundation, and utility connection completed',
        date: iDate
      });
    }

    if (['In Service', 'Under Maintenance', 'Decommissioned'].includes(asset.lifecycleStage)) {
      const commDate = new Date(iDate.getTime() + 14 * 24 * 3600 * 1000);
      lifecycleEventsToInsert.push({
        asset: asset._id,
        fromStage: 'Installed',
        toStage: 'In Service',
        changedBy: adminId,
        remarks: 'Commissioning inspection verified; asset handed over for live municipal operation',
        date: commDate
      });
    }

    if (asset.lifecycleStage === 'Under Maintenance') {
      lifecycleEventsToInsert.push({
        asset: asset._id,
        fromStage: 'In Service',
        toStage: 'Under Maintenance',
        changedBy: managerId,
        remarks: 'Asset placed under active maintenance for overhaul / corrective repairs',
        date: daysAgo(3)
      });
    }

    if (asset.lifecycleStage === 'Decommissioned') {
      lifecycleEventsToInsert.push({
        asset: asset._id,
        fromStage: 'In Service',
        toStage: 'Decommissioned',
        changedBy: adminId,
        remarks: 'Asset reached end of operational lifespan; officially retired and decommissioned',
        date: daysAgo(15)
      });
    }
  }

  const createdLifecycleEvents = await LifecycleEvent.create(lifecycleEventsToInsert);
  console.log(`✅ Seeded ${createdLifecycleEvents.length} lifecycle events.`);

  // 6. CREATE MAINTENANCE LOGS (~150 logs: 10 Overdue, 12 Upcoming, 12 In-Progress, 116 Completed = 150)
  console.log('\n🔧 Generating 150 maintenance logs (overdue, upcoming, in-progress, completed)...');
  const tech1Id = userMap['tech@demo.com']._id;
  const tech2Id = userMap['tech2@demo.com']._id;

  const maintenanceLogsToInsert = [];

  // 6.1: 10 Overdue Logs (scheduledDate in past, status: 'overdue')
  const overdueAssets = [
    createdAssets[1], createdAssets[3], createdAssets[6], createdAssets[8],
    createdAssets[22], createdAssets[24], createdAssets[28], createdAssets[43],
    createdAssets[52], createdAssets[64]
  ];

  overdueAssets.forEach((asset, idx) => {
    const sDate = daysAgo(8 + idx * 4); // 8 to 44 days ago
    maintenanceLogsToInsert.push({
      asset: asset._id,
      title: `Overdue Routine Inspection & Safety Audit #${idx + 1}`,
      type: idx % 2 === 0 ? 'preventive' : 'inspection',
      status: 'overdue',
      scheduledDate: sDate,
      completedDate: null,
      cost: 0,
      technician: idx % 2 === 0 ? tech1Id : tech2Id,
      notes: 'Scheduled preventive review has elapsed without completion. Technician re-dispatch required.'
    });
  });

  // 6.2: 12 Upcoming Logs within next 14 days (status: 'scheduled')
  const upcomingAssets = [
    createdAssets[0], createdAssets[2], createdAssets[4], createdAssets[7],
    createdAssets[21], createdAssets[23], createdAssets[26], createdAssets[41],
    createdAssets[44], createdAssets[61], createdAssets[63], createdAssets[76]
  ];

  upcomingAssets.forEach((asset, idx) => {
    const sDate = daysAhead(1 + idx); // 1 to 12 days ahead
    maintenanceLogsToInsert.push({
      asset: asset._id,
      title: `Upcoming Bi-Monthly Preventive Calibration #${idx + 1}`,
      type: idx % 3 === 0 ? 'inspection' : 'preventive',
      status: 'scheduled',
      scheduledDate: sDate,
      completedDate: null,
      cost: 0,
      technician: idx % 2 === 0 ? tech2Id : tech1Id,
      notes: 'Scheduled maintenance notification sent to operations dispatch.'
    });
  });

  // 6.3: 12 In-Progress Logs (for the 12 Under Maintenance assets)
  const underMaintenanceAssets = createdAssets.filter((a) => a.lifecycleStage === 'Under Maintenance');
  underMaintenanceAssets.forEach((asset, idx) => {
    maintenanceLogsToInsert.push({
      asset: asset._id,
      title: `Active Overhaul & Component Replacement: ${asset.name}`,
      type: 'corrective',
      status: 'in_progress',
      scheduledDate: daysAgo(2 + (idx % 3)),
      completedDate: null,
      cost: Math.round(15000 + (idx * 4500)),
      technician: idx % 2 === 0 ? tech1Id : tech2Id,
      notes: 'Disassembly and diagnostics in progress. Replacement parts sourced and on-site testing underway.'
    });
  });

  // 6.4: 116 Completed Logs spread across last 6 months (April 2026 - September 2026)
  // Each with realistic costs (₹8,000 - ₹95,000) to populate the monthly cost chart
  const completedLogTitles = [
    'Quarterly Lubrication and Bearing Alignment',
    'High-Voltage Insulation Resistance Test',
    'Hydraulic Filter and Seal Gasket Replacement',
    'Structural Crack and Deflection Ultrasonic Testing',
    'Cooling Chiller Coil Descaling and Chemical Flush',
    'Optical Fiber Splicing and OTDR Attenuation Audit',
    'Brake Shoe Replacement and Drum Machining',
    'Switchgear Contact Cleaning and Arc Chute Inspection',
    'Emergency Diesel Generator Load Bank Testing',
    'Fire Extinguisher Refill & Hydrostatic Shell Test',
    'Pneumatic Valve Calibrations and Pressure Sweep',
    'Server Firmware Security Patching and Airflow Clean'
  ];

  // Distribute ~19 logs per month across the last 6 months (Months: -5, -4, -3, -2, -1, 0)
  for (let m = 5; m >= 0; m--) {
    const logsInThisMonth = m === 0 ? 21 : 19; // total 5 * 19 + 21 = 116 completed logs
    for (let i = 0; i < logsInThisMonth; i++) {
      const assetIdx = (m * 20 + i * 3) % createdAssets.length;
      const asset = createdAssets[assetIdx];

      // Target day in month
      const targetDate = new Date(now);
      targetDate.setMonth(now.getMonth() - m);
      const dayOfMonth = Math.min(28, 2 + i);
      targetDate.setDate(dayOfMonth);
      targetDate.setHours(10 + (i % 6), (i * 12) % 60, 0, 0);

      const scheduledDate = new Date(targetDate.getTime() - 2 * 24 * 3600 * 1000);
      const titleTemplate = completedLogTitles[(m + i) % completedLogTitles.length];
      const cost = Math.round(8000 + ((i * 3700 + m * 5200) % 75000));
      const type = i % 3 === 0 ? 'corrective' : (i % 3 === 1 ? 'preventive' : 'inspection');

      maintenanceLogsToInsert.push({
        asset: asset._id,
        title: `${titleTemplate} (${asset.assetTag})`,
        type,
        status: 'completed',
        scheduledDate,
        completedDate: targetDate,
        cost,
        technician: (i + m) % 2 === 0 ? tech1Id : tech2Id,
        notes: `Work completed successfully according to standard operating procedure. All test parameters logged within acceptable tolerances.`
      });
    }
  }

  const createdMaintenanceLogs = await MaintenanceLog.create(maintenanceLogsToInsert);
  console.log(`✅ Seeded ${createdMaintenanceLogs.length} maintenance logs:`);
  console.log(`   - 10 Overdue`);
  console.log(`   - 12 Upcoming (next 14 days)`);
  console.log(`   - 12 In Progress (Under Maintenance assets)`);
  console.log(`   - 116 Completed across the last 6 months with rich costs`);

  // 7. CREATE AUDIT LOGS
  console.log('\n🛡️  Generating recent audit log activity entries...');
  const auditLogsToInsert = [
    {
      user: adminId,
      action: 'login',
      entity: 'User',
      entityId: adminId,
      summary: 'User admin@demo.com authenticated successfully via credentials',
      changes: { ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
      timestamp: daysAgo(10)
    },
    {
      user: managerId,
      action: 'login',
      entity: 'User',
      entityId: managerId,
      summary: 'User manager@demo.com authenticated successfully via credentials',
      changes: { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' },
      timestamp: daysAgo(8)
    },
    {
      user: managerId,
      action: 'stage_change',
      entity: 'Asset',
      entityId: underMaintenanceAssets[0]?._id,
      summary: `Asset ${underMaintenanceAssets[0]?.assetTag} transitioned from In Service to Under Maintenance`,
      changes: { fromStage: 'In Service', toStage: 'Under Maintenance', remarks: 'Bearing overhaul initiated' },
      timestamp: daysAgo(3)
    },
    {
      user: managerId,
      action: 'stage_change',
      entity: 'Asset',
      entityId: underMaintenanceAssets[1]?._id,
      summary: `Asset ${underMaintenanceAssets[1]?.assetTag} transitioned from In Service to Under Maintenance`,
      changes: { fromStage: 'In Service', toStage: 'Under Maintenance', remarks: 'Feeder insulation test repair' },
      timestamp: daysAgo(2)
    },
    {
      user: adminId,
      action: 'create',
      entity: 'Asset',
      entityId: createdAssets[98]?._id,
      summary: `Created asset ${createdAssets[98]?.assetTag} (${createdAssets[98]?.name})`,
      changes: { assetTag: createdAssets[98]?.assetTag, department: 'IT' },
      timestamp: daysAgo(5)
    },
    {
      user: managerId,
      action: 'update',
      entity: 'Asset',
      entityId: createdAssets[10]?._id,
      summary: `Updated inspection notes and condition rating for ${createdAssets[10]?.assetTag}`,
      changes: { conditionRating: { old: 3, new: 4 } },
      timestamp: daysAgo(4)
    },
    {
      user: tech1Id,
      action: 'login',
      entity: 'User',
      entityId: tech1Id,
      summary: 'User tech@demo.com authenticated successfully via credentials',
      changes: { ip: '192.168.1.105' },
      timestamp: daysAgo(2)
    },
    {
      user: tech2Id,
      action: 'login',
      entity: 'User',
      entityId: tech2Id,
      summary: 'User tech2@demo.com authenticated successfully via credentials',
      changes: { ip: '192.168.1.106' },
      timestamp: daysAgo(1)
    },
    {
      user: adminId,
      action: 'update',
      entity: 'AssetCategory',
      entityId: categories[0]._id,
      summary: 'Verified and refreshed dynamic field definitions for Civil and Public Works',
      changes: { fieldsCount: 6 },
      timestamp: daysAgo(6)
    },
    {
      user: managerId,
      action: 'create',
      entity: 'MaintenanceLog',
      entityId: createdMaintenanceLogs[0]._id,
      summary: `Dispatched preventive maintenance task for ${createdAssets[0]?.assetTag}`,
      changes: { title: createdMaintenanceLogs[0].title },
      timestamp: daysAgo(1)
    }
  ];

  const createdAuditLogs = await AuditLog.create(auditLogsToInsert);
  console.log(`✅ Seeded ${createdAuditLogs.length} recent audit logs.`);

  // 8. RUN OVERDUE MAINTENANCE HELPER TO SYNC DATES
  await markOverdueMaintenance();

  // 9. PRINT SUMMARY
  console.log('\n======================================================');
  console.log(' ✨ Infrastructure Asset Inventory - Seeding Summary');
  console.log('======================================================');
  console.log(`👤 Users:           ${users.length} (admin, manager, tech, tech2)`);
  console.log(`🏷️  Categories:      ${categories.length} (Civil, Utilities, Telecom, Facilities, Transport, IT)`);
  console.log(`🏙️  Assets:          ${createdAssets.length} (100% located in Surat, Gujarat)`);
  console.log(`   - In Service:        ${stageCounts['In Service']}`);
  console.log(`   - Under Maintenance: ${stageCounts['Under Maintenance']}`);
  console.log(`   - Installed:         ${stageCounts['Installed']}`);
  console.log(`   - Planned:           ${stageCounts['Planned']}`);
  console.log(`   - Procured:          ${stageCounts['Procured']}`);
  console.log(`   - Decommissioned:    ${stageCounts['Decommissioned']}`);
  console.log(`🔧 Maintenance:     ${createdMaintenanceLogs.length} logs (overdue: 10, upcoming: 12, in-prog: 12, completed: 116)`);
  console.log(`📜 Lifecycle Events: ${createdLifecycleEvents.length}`);
  console.log(`🛡️  Audit Logs:       ${createdAuditLogs.length}`);
  console.log('======================================================\n');

  return {
    usersCount: users.length,
    categoriesCount: categories.length,
    assetsCount: createdAssets.length,
    maintenanceCount: createdMaintenanceLogs.length,
    lifecycleEventsCount: createdLifecycleEvents.length,
    auditLogsCount: createdAuditLogs.length
  };
}

// Execute standalone if invoked directly
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed with error:', err);
      process.exit(1);
    });
}

export default seedDatabase;
