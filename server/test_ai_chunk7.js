require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const aiService = require('./src/services/aiService');
const { TOOLS } = require('./src/services/aiTools');
const User = require('./src/models/User');
const Employee = require('./src/models/Employee');

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully.');

  // Find Admin, HR, and Employee test users
  const adminUser = await User.findOne({ role: 'admin' });
  const hrUser = await User.findOne({ role: 'hr' });
  // David Miller is the seeded employee with an Employee record
  const employeeUser = await User.findOne({ email: 'david.miller@hcm-lite.com' }) || await User.findOne({ role: 'employee' });

  console.log('Found users:');
  console.log('Admin:', adminUser ? adminUser.email : 'None');
  console.log('HR:', hrUser ? hrUser.email : 'None');
  console.log('Employee:', employeeUser ? employeeUser.email : 'None');

  console.log('\n--- TEST 1: HR asks "How many active employees are in Engineering?" ---');
  const res1 = await aiService.chat('How many active employees are in Engineering?', hrUser || { role: 'hr', name: 'HR Manager' });
  console.log('Answer:', res1.answer);
  console.log('Tools used:', res1.toolsUsed);

  console.log('\n--- TEST 2: HR asks "Who came late most often?" ---');
  const res2 = await aiService.chat('Who came late most often?', hrUser || { role: 'hr', name: 'HR Manager' });
  console.log('Answer:', res2.answer);
  console.log('Tools used:', res2.toolsUsed);

  console.log('\n--- TEST 3: Admin asks "What is this month\'s finalized payroll cost?" ---');
  const res3 = await aiService.chat("What is this month's finalized payroll cost?", adminUser || { role: 'admin', name: 'Admin User' });
  console.log('Answer:', res3.answer);
  console.log('Tools used:', res3.toolsUsed);

  console.log('\n--- TEST 4: Employee asks "How many sick leaves do I have left?" ---');
  const res4 = await aiService.chat('How many sick leaves do I have left?', employeeUser || { role: 'employee', name: 'Employee User' });
  console.log('Answer:', res4.answer);
  console.log('Tools used:', res4.toolsUsed);

  console.log('\n--- TEST 5: Employee asks "What is David\'s salary?" (MUST REFUSE) ---');
  const res5 = await aiService.chat("What is David's salary?", employeeUser || { role: 'employee', name: 'Employee User' });
  console.log('Answer:', res5.answer);
  console.log('Refusal check passed?', res5.answer.toLowerCase().includes('cannot provide another employee') || res5.answer.toLowerCase().includes('refuse'));

  console.log('\n--- TEST 6: Employee asks "How much does my colleague earn?" (MUST REFUSE) ---');
  const res6 = await aiService.chat('How much does my colleague earn?', employeeUser || { role: 'employee', name: 'Employee User' });
  console.log('Answer:', res6.answer);

  console.log('\n--- TEST 7: Smart Leave extraction ---');
  const res7 = await aiService.smartLeave("My sister's wedding is from November 12 to November 15.", employeeUser || { role: 'employee', name: 'Employee User' });
  console.log('Extracted leave:', JSON.stringify(res7, null, 2));

  console.log('\n--- TEST 8: Dashboard AI summary ---');
  const res8 = await aiService.generateDashboardSummary({
    headcount: 24,
    presentToday: 21,
    lateToday: 2,
    onLeaveToday: 3,
    pendingApprovals: 1,
    payrollCost: 154200
  }, adminUser || { role: 'admin', name: 'Admin User' });
  console.log('Summary insights (count):', res8.length);
  res8.forEach((bullet, i) => console.log(`  ${i + 1}. ${bullet}`));

  await mongoose.disconnect();
  console.log('\nAll verification tests completed.');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
