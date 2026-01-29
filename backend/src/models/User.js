import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    picture: String,
    role: {
        type: String,
        enum: ['admin', 'teacher', 'student', 'viewer'],
        default: 'viewer'
    },
    source: {
        type: String,
        default: 'google' // 'google' for OAuth, 'classroom' for synced members
    },
    accessToken: {
        iv: String,
        content: String
    },
    refreshToken: {
        iv: String,
        content: String
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
