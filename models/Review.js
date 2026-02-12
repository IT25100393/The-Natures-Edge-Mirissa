const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    country: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);