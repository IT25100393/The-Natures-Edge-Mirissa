const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" }, // අලුතින් එක් කළා
    isEmailVerified: { type: Boolean, default: false }, // Email තහවුරු කර ඇත්ද?
    otp: { type: String, default: null }, // OTP කේතය තාවකාලිකව තබා ගැනීමට
    otpExpires: { type: Date, default: null }, // OTP එක වලංගු කාලය
    profilePic: { type: String, default: "" } // අලුතින් එක් කළා
});

module.exports = mongoose.model('User', UserSchema);