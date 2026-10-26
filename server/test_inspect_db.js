require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Employee = require('./src/models/Employee');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}).lean();
  console.log('All Users in DB:');
  users.forEach(u => console.log(`ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, EmployeeId: ${u.employeeId}`));

  const emps = await Employee.find({}).lean();
  console.log('\nAll Employees in DB:');
  emps.forEach(e => console.log(`ID: ${e._id}, Name: ${e.firstName} ${e.lastName}, UserRef: ${e.user}, EmpId: ${e.employeeId}`));

  await mongoose.disconnect();
}

inspect();
