const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    '1st Floor': {
        type: Number,
        default: 150
    },
    'Ground Floor': {
        type: Number,
        default: 100
    },
    'Full Villa': {
        type: Number,
        default: 250
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Price', priceSchema);