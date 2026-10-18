// User account model
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 60
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8
  },
  dob: {
    type: Date
  },
  preferences: {
    darkMode: { type: Boolean, default: false },
    saveHistory: { type: Boolean, default: true },
    showCitations: { type: Boolean, default: true }
  },
  trustedContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
