const User = require('../models/user');

exports.syncFirebaseUser = async (req, res, next) => {
    try {
        const { uid, name, email, provider = 'firebase', avatar } = req.body;

        // Only sync if we have Firebase user data
        if (uid && email) {
            console.log('Syncing Firebase user:', { uid, email, name });

            // Find existing user by UID or email (for Firebase/Google providers)
            let user = await User.findOne({
                $or: [
                    { uid }, // Match by UID
                    { 
                        email, 
                        provider: { $in: ['firebase', 'google'] } 
                    } // Match by email for social providers
                ]
            });

            if (user) {
                console.log('Found existing user:', user._id);
                
                // Update user information if needed
                const updates = {};
                if (name && user.name !== name) {
                    updates.name = name;
                }
                if (avatar && user.avatar?.url !== avatar) {
                    updates.avatar = { url: avatar };
                }
                
                // Always update last login
                updates.lastLogin = new Date();
                
                if (Object.keys(updates).length > 0) {
                    user = await User.findByIdAndUpdate(
                        user._id, 
                        updates, 
                        { new: true }
                    );
                    console.log('Updated user:', user._id);
                }
                
                // Attach user to request for controllers to use
                req.syncedUser = user;
            } else {
                console.log('Creating new Firebase user');
                // Create new user if doesn't exist
                user = await User.create({
                    uid,
                    name: name || email.split('@')[0],
                    email,
                    provider: provider || 'firebase',
                    avatar: avatar ? { url: avatar } : undefined,
                    lastLogin: new Date()
                });
                req.syncedUser = user;
                console.log('Created new user:', user._id);
            }
        }
        next();
    } catch (error) {
        console.error('Firebase sync middleware error:', error);
        // Continue to next middleware/controller even if sync fails
        next();
    }
};