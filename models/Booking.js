const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    roomType: {
        type: String,
        required: true,
        enum: ['1st Floor', 'Ground Floor', 'Full Villa']
    },
    guests: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    guestDetails: {
        fullName: String,
        phone: String,
        nationality: String,
        specialRequest: String
    },
    status: {
        type: String,
        default: 'Confirmed',
        enum: ['Confirmed', 'Cancelled']
    },
    cancellationReason: String,
    bookedAt: {
        type: Date,
        default: Date.now
    },
    cancelledAt: Date
});

module.exports = mongoose.model('Booking', bookingSchema);