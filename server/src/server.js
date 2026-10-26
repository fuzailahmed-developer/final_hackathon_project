const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Run initial Admin & Demo User seed
    await seedAdmin();

    // 3. Start Express Server
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`[HCM Lite] Server listening on port ${PORT}`);
      console.log(`[HCM Lite] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[HCM Lite] API Base: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('[HCM Lite] Server startup failure:', error);
    process.exit(1);
  }
};

startServer();
