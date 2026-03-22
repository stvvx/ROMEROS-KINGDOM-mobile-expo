const User = require('../models/user');
const crypto = require('crypto');
const cloudinary = require('cloudinary');
const sendEmail = require('../utils/sendEmail');
const multer = require('multer');
const fetch = require('node-fetch');
const upload = multer({ storage: multer.memoryStorage() }); // For avatar upload

// Firebase Admin (optional) for verifying ID tokens
const { getAuth: getFirebaseAuth } = require('../config/firebase')

async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null
  const fbAuth = getFirebaseAuth()
  if (!fbAuth) return null
  try {
    return await fbAuth.verifyIdToken(idToken)
  } catch (e) {
    return null
  }
}

function getAllowedGoogleAudiences() {
  const candidates = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    // Safe defaults from current Firebase project config.
    '724001311783-6g9ph4863lh788uptne069n7hce08cau.apps.googleusercontent.com',
    '724001311783-2jb1erml690k31bsdrhvthkqnkvvs8nr.apps.googleusercontent.com',
  ]

  return [...new Set(candidates.filter(Boolean))]
}

async function verifyGoogleIdToken(googleIdToken) {
  if (!googleIdToken || typeof googleIdToken !== 'string') return null

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleIdToken)}`
    const response = await fetch(url)
    if (!response.ok) return null

    const payload = await response.json()
    const aud = payload && payload.aud
    const allowedAudiences = getAllowedGoogleAudiences()
    if (!aud || (allowedAudiences.length > 0 && !allowedAudiences.includes(aud))) {
      return null
    }

    if (!payload.sub || !payload.email) return null

    return {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }
  } catch {
    return null
  }
}

function extractBearerToken(req) {
  const h = req.headers?.authorization
  if (!h || typeof h !== 'string') return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

// REGISTER USER
exports.registerUser = async (req, res, next) => {
  try {
    console.log('Register Request:', req.body);

    const { name, email, password, address } = req.body;

    // Firebase-backed register (does not break existing local flow)
    const provider = String(req.body.provider || '').toLowerCase()
    const idToken = req.body.idToken || extractBearerToken(req)
    const googleIdToken = req.body.googleIdToken

    if ((provider === 'firebase' || provider === 'google') && idToken) {
      let decoded = await verifyFirebaseIdToken(idToken)
      let tokenSource = 'firebase'

      if (!decoded && provider === 'google') {
        const googleDecoded = await verifyGoogleIdToken(googleIdToken)
        if (googleDecoded) {
          decoded = googleDecoded
          tokenSource = 'google'
        }
      }

      if (!decoded) {
        return res.status(401).json({ message: 'Invalid Firebase token' })
      }

      const uid = decoded.uid
      const tokenEmail = decoded.email
      const displayName = decoded.name || decoded.displayName
      const picture = decoded.picture

      if (!uid || !tokenEmail) {
        return res.status(400).json({ message: 'Firebase token missing uid/email' })
      }

      // Find existing user (by uid or by email for social providers)
      let user = await User.findOne({
        $or: [
          { uid },
          { email: tokenEmail, provider: { $in: ['firebase', 'google'] } },
          { email: tokenEmail, provider: 'local' },
        ],
      })

      if (!user) {
        user = await User.create({
          uid,
          name: name || displayName || tokenEmail.split('@')[0],
          email: tokenEmail,
          address: address || '',
          provider: provider === 'google' || tokenSource === 'google' ? 'google' : 'firebase',
          avatar: picture ? { url: picture } : undefined,
          isVerified: true,
          lastLogin: new Date(),
        })
      } else {
        // Update synced fields only (avoid breaking existing accounts)
        const updates = {
          uid: user.uid || uid,
          provider: user.provider === 'local' ? user.provider : ((provider === 'google' || tokenSource === 'google') ? 'google' : 'firebase'),
          lastLogin: new Date(),
        }
        if (displayName && user.name !== displayName) updates.name = displayName
        if (picture && user.avatar?.url !== picture) updates.avatar = { ...(user.avatar || {}), url: picture }
        if (typeof address === 'string' && address && user.address !== address) updates.address = address

        user = await User.findByIdAndUpdate(user._id, updates, { new: true })
      }

      const token = user.getJwtToken()
      return res.status(201).json({ success: true, user, token })
    }

    // Validate required fields (local)
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Upload avatar to Cloudinary if provided, otherwise use default
    let avatarData = {
      public_id: 'avatars/default',
      url: 'https://via.placeholder.com/150', // Default avatar
    };

    if (req.file) {
      try {
        // Convert buffer to base64 for upload
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const result = await cloudinary.v2.uploader.upload(dataURI, {
          folder: 'avatars',
          width: 150,
          crop: 'scale',
        });

        avatarData = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (uploadError) {
        console.warn('Avatar upload failed, using default:', uploadError.message);
        // Continue with default avatar if upload fails
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      address: address || '',
      provider: 'local', // Set provider to local for email/password auth
      avatar: avatarData,
    });

    // Generate JWT token
    const token = user.getJwtToken();

    return res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// LOGIN USER
exports.loginUser = async (req, res, next) => {
  try {
    // Firebase-backed login (does not break existing local flow)
    const provider = String(req.body.provider || '').toLowerCase()
    const idToken = req.body.idToken || extractBearerToken(req)
    const googleIdToken = req.body.googleIdToken

    if ((provider === 'firebase' || provider === 'google') && idToken) {
      let decoded = await verifyFirebaseIdToken(idToken)
      let tokenSource = 'firebase'

      if (!decoded && provider === 'google') {
        const googleDecoded = await verifyGoogleIdToken(googleIdToken)
        if (googleDecoded) {
          decoded = googleDecoded
          tokenSource = 'google'
        }
      }

      if (!decoded) {
        return res.status(401).json({ message: 'Invalid Firebase token' })
      }

      const uid = decoded.uid
      const tokenEmail = decoded.email
      const displayName = decoded.name || decoded.displayName
      const picture = decoded.picture

      if (!uid || !tokenEmail) {
        return res.status(400).json({ message: 'Firebase token missing uid/email' })
      }

      let user = await User.findOne({
        $or: [
          { uid },
          { email: tokenEmail, provider: { $in: ['firebase', 'google'] } },
          { email: tokenEmail, provider: 'local' },
        ],
      })

      if (!user) {
        // Auto-register on first social sign-in
        user = await User.create({
          uid,
          name: displayName || tokenEmail.split('@')[0],
          email: tokenEmail,
          provider: provider === 'google' || tokenSource === 'google' ? 'google' : 'firebase',
          avatar: picture ? { url: picture } : undefined,
          isVerified: true,
          lastLogin: new Date(),
        })
      } else {
        const updates = {
          uid: user.uid || uid,
          lastLogin: new Date(),
        }
        if (displayName && user.name !== displayName) updates.name = displayName
        if (picture && user.avatar?.url !== picture) updates.avatar = { ...(user.avatar || {}), url: picture }
        if (user.provider !== 'local') updates.provider = (provider === 'google' || tokenSource === 'google') ? 'google' : 'firebase'

        user = await User.findByIdAndUpdate(user._id, updates, { new: true })
      }

      const token = user.getJwtToken()
      return res.status(200).json({ success: true, token, user })
    }

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email & password' });
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    // Check password
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    const token = user.getJwtToken();

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get('host')}/password/reset/${resetToken}`;
    const message = `Your password reset token is as follows:\n\n${resetUrl}\n\nIf you did not request this email, please ignore it.`;

    await sendEmail({
      email: user.email,
      subject: 'Password Recovery',
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to: ${user.email}`,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    const token = user.getJwtToken();

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET USER PROFILE
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user }); // user.address will be included
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res, next) => {
  try {
    const newUserData = {
      name:    req.body.name    || undefined,
      email:   req.body.email   || undefined,
      address: req.body.address ?? '',
    }

    // Remove undefined keys so we don't overwrite with undefined
    Object.keys(newUserData).forEach(k => newUserData[k] === undefined && delete newUserData[k])

    // Handle avatar upload via multer (req.file) or base64 fallback (req.body.avatar)
    if (req.file) {
      try {
        const user = await User.findById(req.user.id)

        // Delete old avatar if it's not the default placeholder
        if (user.avatar?.public_id && user.avatar.public_id !== 'avatars/default') {
          await cloudinary.v2.uploader.destroy(user.avatar.public_id).catch(() => {})
        }

        // Upload buffer as base64 data URI
        const b64 = Buffer.from(req.file.buffer).toString('base64')
        const dataURI = `data:${req.file.mimetype};base64,${b64}`
        const result = await cloudinary.v2.uploader.upload(dataURI, {
          folder: 'avatars',
          width: 300,
          crop: 'scale',
        })

        newUserData.avatar = { public_id: result.public_id, url: result.secure_url }
      } catch (uploadErr) {
        console.warn('[updateProfile] avatar upload failed:', uploadErr.message)
        // Continue saving other fields even if avatar upload fails
      }
    } else if (req.body.avatar && req.body.avatar !== '') {
      // Legacy base64 path (kept for backward compat)
      try {
        const user = await User.findById(req.user.id)
        if (user.avatar?.public_id && user.avatar.public_id !== 'avatars/default') {
          await cloudinary.v2.uploader.destroy(user.avatar.public_id).catch(() => {})
        }
        const result = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: 'avatars', width: 300, crop: 'scale',
        })
        newUserData.avatar = { public_id: result.public_id, url: result.secure_url }
      } catch (uploadErr) {
        console.warn('[updateProfile] legacy avatar upload failed:', uploadErr.message)
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({ success: true, user })
  } catch (error) {
    console.error('Update Profile Error:', error)
    res.status(500).json({ message: error.message })
  }
}


// UPDATE PASSWORD
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const isMatched = await user.comparePassword(req.body.oldPassword);

    if (!isMatched) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = req.body.password;
    await user.save();
    const token = user.getJwtToken();

    res.status(200).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error('Update Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ADMIN ROUTES
exports.allUsers = async (req, res) => {
  const users = await User.find();
  res.status(200).json({ success: true, users });
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: `User not found with id: ${req.params.id}` });
    }

    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    await user.deleteOne();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: `User not found with id: ${req.params.id}` });
  }
  res.status(200).json({ success: true, user });
};

exports.updateUser = async (req, res) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  if (typeof req.body.isActive === 'boolean') {
    newUserData.isActive = req.body.isActive;
  }

  await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true });
};

exports.registerFirebaseUser = async (req, res, next) => {
  try {
    console.log('Firebase register endpoint hit');
    
    const { uid, name, email, provider = 'firebase', avatar, address } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ 
        message: 'UID and email are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { uid },
        { email, provider: { $in: ['firebase', 'google'] } }
      ]
    });

    if (existingUser) {
      return res.status(200).json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      });
    }

    // Create new user
    const user = await User.create({
      uid,
      name: name || email.split('@')[0],
      email,
      address: address || '',
      provider,
      avatar: avatar ? { url: avatar } : undefined,
      lastLogin: new Date()
    });

    return res.status(201).json({
      success: true,
      user,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Firebase Register Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User with this email or UID already exists' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Internal server error' 
    });
  }
};

// SYNC FIREBASE USER
exports.syncFirebaseUser = async (req, res, next) => {
  try {
    console.log('Firebase sync endpoint hit');
    
    const { uid, name, email, provider = 'firebase', avatar } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ 
        message: 'UID and email are required' 
      });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { uid },
        { email, provider: { $in: ['firebase', 'google'] } }
      ]
    });

      if (user) {
      // Update existing user
      const updates = {};
      if (name && user.name !== name) {
        updates.name = name;
      }
      if (avatar && user.avatar?.url !== avatar) {
        updates.avatar = { url: avatar };
      }
        if (address && user.address !== address) {
          updates.address = address;
        }
      updates.lastLogin = new Date();

      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    } else {
      // Create new user
      user = await User.create({
        uid,
        name: name || email.split('@')[0],
        email,
        provider,
        avatar: avatar ? { url: avatar } : undefined,
        lastLogin: new Date()
      });
    }

    res.status(200).json({
      success: true,
      user,
      message: 'User synced successfully'
    });
  } catch (error) {
    console.error('Sync Firebase User Error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error' 
    });
  }
};

