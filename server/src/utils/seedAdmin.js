const User = require('../models/User');

/**
 * Seed initial administrative and test role users for development / demo evaluation
 */
const seedAdmin = async () => {
  try {
    // 1. Seed Primary Admin
    const existingAdmin = await User.findOne({ email: 'admin@hcm-lite.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'System Administrator',
        email: 'admin@hcm-lite.com',
        password: 'Admin@123',
        role: 'admin',
        employeeId: 'ADM-001',
        isActive: true
      });
      console.log('[HCM Lite] Seeded default Admin user: admin@hcm-lite.com');
    }

    // 2. Seed Demo HR (for RBAC testing and demonstration)
    const existingHr = await User.findOne({ email: 'hr@hcm-lite.com' });
    if (!existingHr) {
      await User.create({
        name: 'HR Manager',
        email: 'hr@hcm-lite.com',
        password: 'Hr@123',
        role: 'hr',
        employeeId: 'HR-001',
        isActive: true
      });
      console.log('[HCM Lite] Seeded demo HR user: hr@hcm-lite.com');
    }

    // 3. Seed Demo Employee (for RBAC testing and demonstration)
    const existingEmployee = await User.findOne({ email: 'employee@hcm-lite.com' });
    if (!existingEmployee) {
      await User.create({
        name: 'Alex Rivera',
        email: 'employee@hcm-lite.com',
        password: 'Employee@123',
        role: 'employee',
        employeeId: 'EMP-001',
        isActive: true
      });
      console.log('[HCM Lite] Seeded demo Employee user: employee@hcm-lite.com');
    }
  } catch (error) {
    console.error('[HCM Lite] Admin seed error:', error.message);
  }
};

module.exports = seedAdmin;
