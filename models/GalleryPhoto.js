const mongoose = require('mongoose');

const galleryPhotoSchema = new mongoose.Schema({
    floor: {
        type: String,
        required: true,
        enum: ['ground', 'first']
    },
    area: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    // 🆕 NEW: Cloudinary එකෙන් photo delete කරන්න මේ ID එක ඕනේ
    imagePublicId: {
        type: String,
        default: ''
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GalleryPhoto', galleryPhotoSchema);
