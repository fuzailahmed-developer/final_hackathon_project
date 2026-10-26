const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    designation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: [true, 'Designation is required']
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are serialized in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
