const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    // Guest ගේ විස්තර ලබා ගැනීමට email එක අනිවාර්ය වේ
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
    guests: { 
        type: Number, 
        required: true 
    },
    roomType: { 
        type: String, 
        enum: ['Full Villa', '1st Floor', 'Ground Floor'], 
        required: true 
    },
    totalPrice: { 
        type: Number,
        required: true 
    },
    // --- මෙන්න මේ කොටස අලුතින් එක් කළා ---
    status: { 
        type: String, 
        enum: ['Confirmed', 'Cancelled'], 
        default: 'Confirmed' 
    },
    cancellationReason: {
        type: String,
        default: ""
    },
    // ------------------------------------------
    guestDetails: {
        fullName: String,
        phone: String,
        nationality: String,
        specialRequest: String
    },
    bookedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Booking', BookingSchema);