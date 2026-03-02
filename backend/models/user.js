// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Don't forget to import jwt

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
    maxLength: [30, 'Your name cannot exceed 30 characters'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true, // This automatically creates an index
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  uid: {
    type: String,
    unique: true, // This automatically creates an index
    sparse: true // Allows null for non-Firebase users
    // REMOVED index: true from here
  },
  password: {
    type: String,
    minLength: [6, 'Your password must be longer than 6 characters'],
    select: false, // Don't return password by default
    validate: {
      validator: function(password) {
        // Only validate password if provider is local
        if (this.provider === 'local') {
          return password && password.length >= 6;
        }
        return true;
      },
      message: 'Password must be at least 6 characters long for local authentication'
    }
  },
  avatar: {
    public_id: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  address: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'vendor'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  provider: {
    type: String,
    enum: ['local', 'firebase', 'google'],
    default: 'firebase' // Changed default to firebase since that's your main provider
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  expoPushToken: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
// REMOVED the duplicate indexes for email and uid
// Keep only the provider index since it's not defined elsewhere
userSchema.index({ provider: 1 }); // This is fine - not duplicated

// Middleware to handle password hashing ONLY for local authentication
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified and provider is local
  if (this.provider !== 'local') {
    return next();
  }
  
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware for Firebase/Google users - ensure password is not set
userSchema.pre('save', function(next) {
  if (this.provider !== 'local' && this.password) {
    this.password = undefined;
  }
  next();
});

// Compare password method (only for local authentication)
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (this.provider !== 'local') {
    throw new Error('Password authentication is not available for Firebase/Google users');
  }
  
  if (!this.password) {
    throw new Error('No password set for this user');
  }
  
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token method (for backend authentication when needed)
userSchema.methods.getJwtToken = function() {
  // Check if JWT_SECRET is available
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role 
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRES_TIME || '7d'
    }
  );
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by Firebase UID
userSchema.statics.findByFirebaseUid = function(uid) {
  return this.findOne({ uid, provider: { $in: ['firebase', 'google'] } });
};

// Static method to find user by email and provider
userSchema.statics.findByEmailAndProvider = function(email, provider) {
  return this.findOne({ email, provider });
};

// Virtual for user's full profile (excluding sensitive data)
userSchema.virtual('profile').get(function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    provider: this.provider,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };
});

// Ensure virtual fields are serialized when converted to JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive information
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// Middleware to handle duplicate key errors (for better error messages)
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    let field = Object.keys(error.keyValue)[0];
    let value = error.keyValue[field];
    
    if (field === 'email') {
      next(new Error(`Email ${value} is already registered`));
    } else if (field === 'uid') {
      next(new Error(`Firebase UID ${value} is already in use`));
    } else {
      next(new Error(`Duplicate key error for field: ${field}`));
    }
  } else {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);