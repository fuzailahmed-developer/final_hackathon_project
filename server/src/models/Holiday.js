const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Holiday', holidaySchema);
