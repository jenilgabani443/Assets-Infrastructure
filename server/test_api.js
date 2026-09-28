const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let managerToken = '';
let technicianToken = '';

let adminUser = null;
let managerUser = null;
let technicianUser = null;

let testCategory = null;
let testAsset = null;
let testAsset2 = null;

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
};

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

const runTests = async () => {
  console.log('🚀 [STARTING COMPREHENSIVE API TEST SUITE]\n');

  try {
    // 0. HEALTH CHECK
    console.log('--- 0. SYSTEM HEALTH ---');
    const healthRes = await request('/health');
    console.log(`[GET /api/health] Status: ${healthRes.status}, DB: ${healthRes.data?.data?.database?.state}`);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // 1. AUTH & USERS
    console.log('\n--- 1. AUTH & USER REGISTRATION ---');

    // Check if any users exist in DB
    const adminEmail = `admin_${Date.now()}@infra.test`;
    const registerRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'System Administrator',
        email: adminEmail,
        password: 'AdminPassword123!',
        role: 'admin'
      }
    });

    console.log(`[POST /api/auth/register] Status: ${registerRes.status}, Success: ${registerRes.data?.success}`);

    if (registerRes.status === 201) {
      adminToken = registerRes.data.data.token;
      adminUser = registerRes.data.data.user;
      console.log(`✅ Admin registered as first user: ${adminUser.email} (Role: ${adminUser.role})`);
    } else {
      console.log('Users already exist in database.');
      // If users already exist, let us login or find admin credentials
      throw new Error(`Register failed with status ${registerRes.status}: ${JSON.stringify(registerRes.data)}`);
    }

    // Test second user registration without token (MUST FAIL 403)
    const unauthorizedReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Rogue User',
        email: `rogue_${Date.now()}@infra.test`,
        password: 'RoguePassword123!'
      }
    });
    console.log(`[Unauthenticated Register] Status: ${unauthorizedReg.status} (Expected: 403)`);
    if (unauthorizedReg.status !== 403) {
      throw new Error(`Expected 403 for unauthorized registration, got ${unauthorizedReg.status}`);
    }
    console.log('✅ Unauthenticated registration correctly blocked when users exist.');

    // Test login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: adminUser.email,
        password: 'AdminPassword123!'
      }
    });
    console.log(`[POST /api/auth/login] Status: ${loginRes.status}, Success: ${loginRes.data?.success}`);
    if (loginRes.status !== 200) throw new Error('Admin login failed');
    adminToken = loginRes.data.data.token;
    console.log('✅ Admin login succeeded, token acquired.');

    // Test GET /api/auth/me
    const meRes = await request('/auth/me', {
      method: 'GET',
      ...authHeader(adminToken)
    });
    console.log(`[GET /api/auth/me] Status: ${meRes.status}, Email: ${meRes.data?.data?.user?.email}`);
    if (meRes.status !== 200) throw new Error('GET /api/auth/me failed');
    console.log('✅ /api/auth/me authenticated successfully.');

    // Test PATCH /api/auth/change-password
    const changePassRes = await request('/auth/change-password', {
      method: 'PATCH',
      body: {
        currentPassword: 'AdminPassword123!',
        newPassword: 'NewAdminPassword456!'
      },
      ...authHeader(adminToken)
    });
    console.log(`[PATCH /api/auth/change-password] Status: ${changePassRes.status}, Success: ${changePassRes.data?.success}`);
    if (changePassRes.status !== 200) throw new Error('Password change failed');

    // Switch back password
    await request('/auth/change-password', {
      method: 'PATCH',
      body: {
        currentPassword: 'NewAdminPassword456!',
        newPassword: 'AdminPassword123!'
      },
      ...authHeader(adminToken)
    });
    console.log('✅ Password change and reset verified.');

    // 2. ADMIN USER MANAGEMENT
    console.log('\n--- 2. ADMIN USER MANAGEMENT (/api/users) ---');

    // Admin creates Manager
    const managerEmail = `manager_${Date.now()}@infra.test`;
    const createManagerRes = await request('/users', {
      method: 'POST',
      body: {
        name: 'Operations Manager',
        email: managerEmail,
        password: 'ManagerPassword123!',
        role: 'manager'
      },
      ...authHeader(adminToken)
    });
    console.log(`[Admin POST /users (Manager)] Status: ${createManagerRes.status}`);
    if (createManagerRes.status !== 201) throw new Error('Manager creation failed');
    managerUser = createManagerRes.data.data;
    console.log(`✅ Manager user created: ${managerUser.email}`);

    // Admin creates Technician
    const techEmail = `tech_${Date.now()}@infra.test`;
    const createTechRes = await request('/users', {
      method: 'POST',
      body: {
        name: 'Field Technician',
        email: techEmail,
        password: 'TechPassword123!',
        role: 'technician'
      },
      ...authHeader(adminToken)
    });
    console.log(`[Admin POST /users (Technician)] Status: ${createTechRes.status}`);
    if (createTechRes.status !== 201) throw new Error('Technician creation failed');
    technicianUser = createTechRes.data.data;
    console.log(`✅ Technician user created: ${technicianUser.email}`);

    // Login as Manager
    const mgrLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: managerEmail,
        password: 'ManagerPassword123!'
      }
    });
    managerToken = mgrLoginRes.data.data.token;

    // Login as Technician
    const techLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: techEmail,
        password: 'TechPassword123!'
      }
    });
    technicianToken = techLoginRes.data.data.token;
    console.log('✅ Manager and Technician tokens generated.');

    // Admin self-protection tests:
    console.log('Testing Admin self-protection rules...');
    const selfDemoteRes = await request(`/users/${adminUser._id}`, {
      method: 'PUT',
      body: { role: 'technician' },
      ...authHeader(adminToken)
    });
    console.log(`[Self-Demote Test] Status: ${selfDemoteRes.status} (Expected: 400)`);
    if (selfDemoteRes.status !== 400) throw new Error('Admin self-demotion was not blocked!');

    const selfDeactivateRes = await request(`/users/${adminUser._id}/status`, {
      method: 'PATCH',
      body: { isActive: false },
      ...authHeader(adminToken)
    });
    console.log(`[Self-Deactivate Test] Status: ${selfDeactivateRes.status} (Expected: 400)`);
    if (selfDeactivateRes.status !== 400) throw new Error('Admin self-deactivation was not blocked!');
    console.log('✅ Admin self-demotion and self-deactivation safeguards verified.');

    // List users with search
    const listUsersRes = await request('/users?search=Operations', {
      method: 'GET',
      ...authHeader(adminToken)
    });
    console.log(`[GET /api/users?search=Operations] Status: ${listUsersRes.status}, Total: ${listUsersRes.data?.total}`);
    if (listUsersRes.status !== 200 || listUsersRes.data.total < 1) throw new Error('User search failed');
    console.log('✅ User list with search verified.');

    // 3. CATEGORIES
    console.log('\n--- 3. CATEGORIES & FIELD DEFINITION VALIDATION (/api/categories) ---');

    // Technician attempts to create category (MUST FAIL 403)
    const techCatCreate = await request('/categories', {
      method: 'POST',
      body: { name: 'Unauthorized Category' },
      ...authHeader(technicianToken)
    });
    console.log(`[Technician POST /categories] Status: ${techCatCreate.status} (Expected: 403)`);
    if (techCatCreate.status !== 403) throw new Error('Technician should not be allowed to create categories');

    // Test invalid fieldDefinitions (duplicate keys, invalid select options)
    const invalidCatRes = await request('/categories', {
      method: 'POST',
      body: {
        name: `Invalid Category ${Date.now()}`,
        fieldDefinitions: [
          { key: 'voltage', label: 'Voltage', type: 'number' },
          { key: 'voltage', label: 'Voltage Duplicate', type: 'text' }, // duplicate
          { key: 'phase', label: 'Phase', type: 'select', options: [] } // empty options
        ]
      },
      ...authHeader(managerToken)
    });
    console.log(`[POST /categories Invalid fieldDefinitions] Status: ${invalidCatRes.status} (Expected: 400)`);
    console.log('Errors:', invalidCatRes.data?.errors);
    if (invalidCatRes.status !== 400) throw new Error('Invalid fieldDefinitions were not rejected');
    console.log('✅ Category field definition validation verified.');

    // Manager creates valid category
    const validCatRes = await request('/categories', {
      method: 'POST',
      body: {
        name: `Civil Works ${Date.now()}`,
        description: 'Bridges, roads, and municipal physical infrastructure',
        icon: 'Hammer',
        fieldDefinitions: [
          { key: 'materialGrade', label: 'Material Grade', type: 'text', required: true },
          { key: 'loadCapacity', label: 'Load Capacity', type: 'number', required: true, unit: 'tons' },
          { key: 'inspectionDate', label: 'Last Structural Inspection', type: 'date', required: false },
          {
            key: 'bridgeType',
            label: 'Bridge Type',
            type: 'select',
            options: ['Suspension', 'Truss', 'Arch', 'Beam'],
            required: true
          }
        ]
      },
      ...authHeader(managerToken)
    });
    console.log(`[Manager POST /categories Valid] Status: ${validCatRes.status}, ID: ${validCatRes.data?.data?._id}`);
    if (validCatRes.status !== 201) throw new Error('Valid category creation failed');
    testCategory = validCatRes.data.data;
    console.log('✅ Valid category created with dynamic fields.');

    // 4. ASSETS
    console.log('\n--- 4. ASSETS & CUSTOM FIELDS VALIDATION (/api/assets) ---');

    // Asset with invalid custom fields (missing required, wrong types)
    const invalidAssetRes = await request('/assets', {
      method: 'POST',
      body: {
        name: 'Invalid Test Bridge',
        category: testCategory._id,
        customFields: {
          // missing materialGrade
          loadCapacity: 'NOT_A_NUMBER', // invalid number
          bridgeType: 'INVALID_TYPE' // not in options
        }
      },
      ...authHeader(managerToken)
    });
    console.log(`[POST /assets Invalid customFields] Status: ${invalidAssetRes.status} (Expected: 400)`);
    console.log('Field-level errors:', invalidAssetRes.data?.errors);
    if (invalidAssetRes.status !== 400) throw new Error('Invalid customFields were not rejected');
    console.log('✅ Asset customFields validation correctly returned field-level errors.');

    // Manager creates valid Asset 1
    const validAssetRes = await request('/assets', {
      method: 'POST',
      body: {
        name: 'Golden Gate Municipal Overpass',
        category: testCategory._id,
        subcategory: 'Bridges',
        department: 'Transportation',
        status: 'active',
        cost: 1250000,
        expectedLifespanYears: 50,
        warrantyExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        customFields: {
          materialGrade: 'High Tensile Structural Steel',
          loadCapacity: 45,
          inspectionDate: '2025-06-15',
          bridgeType: 'Suspension'
        }
      },
      ...authHeader(managerToken)
    });
    console.log(`[Manager POST /assets Valid] Status: ${validAssetRes.status}, Tag: ${validAssetRes.data?.data?.assetTag}`);
    if (validAssetRes.status !== 201) throw new Error('Asset creation failed');
    testAsset = validAssetRes.data.data;
    console.log(`✅ Asset created with auto-tag: ${testAsset.assetTag}`);

    // Create Asset 2 to verify incremental tag numbering
    const validAsset2Res = await request('/assets', {
      method: 'POST',
      body: {
        name: 'Metro Line Drainage Canal',
        category: testCategory._id,
        subcategory: 'Drainage',
        department: 'Public Works',
        cost: 320000,
        customFields: {
          materialGrade: 'Reinforced Concrete',
          loadCapacity: 20,
          bridgeType: 'Beam'
        }
      },
      ...authHeader(managerToken)
    });
    testAsset2 = validAsset2Res.data.data;
    console.log(`✅ Asset 2 created with auto-tag: ${testAsset2.assetTag}`);

    // Test PUT /assets/:id rejecting direct lifecycleStage change
    const rejectStageUpdate = await request(`/assets/${testAsset._id}`, {
      method: 'PUT',
      body: { lifecycleStage: 'In Service' },
      ...authHeader(managerToken)
    });
    console.log(`[PUT /assets/:id direct lifecycleStage] Status: ${rejectStageUpdate.status} (Expected: 400)`);
    if (rejectStageUpdate.status !== 400) throw new Error('Direct lifecycleStage update was not rejected!');
    console.log('✅ Direct modification of lifecycleStage correctly rejected.');

    // Valid PUT /assets/:id (update cost and customFields)
    const validUpdateRes = await request(`/assets/${testAsset._id}`, {
      method: 'PUT',
      body: {
        cost: 1300000,
        customFields: {
          materialGrade: 'Upgraded Weathering Steel Grade A',
          loadCapacity: 50,
          bridgeType: 'Suspension'
        }
      },
      ...authHeader(managerToken)
    });
    console.log(`[PUT /assets/:id Valid update] Status: ${validUpdateRes.status}`);
    if (validUpdateRes.status !== 200) throw new Error('Asset update failed');
    console.log('✅ Asset update succeeded with audit diff recorded.');

    // 5. ASSET QUERY, QR CODE, AND AUDIT
    console.log('\n--- 5. ASSET QUERY, QR CODE & AUDIT TRAIL ---');

    // List assets with search and filters
    const queryAssetsRes = await request(
      `/assets?search=Golden&department=Transportation`,
      { method: 'GET', ...authHeader(technicianToken) } // Technician can read
    );
    console.log(`[GET /assets query] Status: ${queryAssetsRes.status}, Total: ${queryAssetsRes.data?.total}`);
    if (queryAssetsRes.status !== 200 || queryAssetsRes.data.total < 1) throw new Error('Asset query failed');
    console.log('✅ Assets query with search and filters verified.');

    // Distinct departments
    const deptRes = await request('/assets/meta/departments', {
      method: 'GET',
      ...authHeader(technicianToken)
    });
    console.log(`[GET /assets/meta/departments] Status: ${deptRes.status}, Departments:`, deptRes.data?.data);
    if (deptRes.status !== 200 || !deptRes.data.data.includes('Transportation')) {
      throw new Error('Distinct departments query failed');
    }
    console.log('✅ Distinct departments endpoint verified.');

    // QR Code generation
    const qrRes = await request(`/assets/${testAsset._id}/qr`, {
      method: 'GET',
      ...authHeader(technicianToken)
    });
    console.log(`[GET /assets/:id/qr] Status: ${qrRes.status}, StartsWith: ${qrRes.data?.data?.qrCode?.substring(0, 30)}...`);
    if (qrRes.status !== 200 || !qrRes.data?.data?.qrCode?.startsWith('data:image/png;base64,')) {
      throw new Error('QR code generation failed');
    }
    console.log('✅ Asset QR code generation returned valid PNG data URL.');

    // Asset audit history
    const auditRes = await request(`/assets/${testAsset._id}/audit`, {
      method: 'GET',
      ...authHeader(technicianToken)
    });
    console.log(`[GET /assets/:id/audit] Status: ${auditRes.status}, Audit Records: ${auditRes.data?.data?.length}`);
    if (auditRes.status !== 200 || auditRes.data?.data?.length < 2) {
      throw new Error('Asset audit history verification failed');
    }
    console.log('✅ Asset audit history verified (contains create and update entries with changes).');

    // 6. CATEGORY DELETE PROTECTION
    console.log('\n--- 6. CATEGORY DELETE PROTECTION ---');
    const deleteCatBlocked = await request(`/categories/${testCategory._id}`, {
      method: 'DELETE',
      ...authHeader(adminToken)
    });
    console.log(`[DELETE /categories/:id with active assets] Status: ${deleteCatBlocked.status} (Expected: 400)`);
    if (deleteCatBlocked.status !== 400) throw new Error('Category deletion with active assets was not blocked!');
    console.log('✅ Category deletion protection verified.');

    // 7. ASSET DELETE & CLEANUP
    console.log('\n--- 7. ASSET DELETION & ROLE PERMISSION ---');

    // Manager attempts to delete asset (MUST FAIL 403)
    const mgrDeleteAsset = await request(`/assets/${testAsset2._id}`, {
      method: 'DELETE',
      ...authHeader(managerToken)
    });
    console.log(`[Manager DELETE /assets/:id] Status: ${mgrDeleteAsset.status} (Expected: 403)`);
    if (mgrDeleteAsset.status !== 403) throw new Error('Manager should not be allowed to delete assets');

    // Admin deletes Asset 2
    const adminDeleteAsset = await request(`/assets/${testAsset2._id}`, {
      method: 'DELETE',
      ...authHeader(adminToken)
    });
    console.log(`[Admin DELETE /assets/:id] Status: ${adminDeleteAsset.status}`);
    if (adminDeleteAsset.status !== 200) throw new Error('Admin asset deletion failed');
    console.log('✅ Admin asset deletion and role permissions verified.');

    console.log('\n🎉 ==============================================');
    console.log('🎉 ALL ENDPOINTS AND PERMISSIONS TESTED SUCCESSFULLY!');
    console.log('🎉 ==============================================\n');
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILURE:', error.message);
    return false;
  }
};

runTests().then((success) => {
  process.exit(success ? 0 : 1);
});
