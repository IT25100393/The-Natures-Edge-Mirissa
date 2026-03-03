require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// 🔴 CHANGED: multer import එක තවදුරටත් මෙතන ඕන නැහැ (cloudinary.js එකේ handle කරනවා)
// const multer = require('multer');  ← REMOVED
const path = require('path');
// 🔴 CHANGED: fs ඕන නැහැ (local files handle කරන්නේ නැති නිසා)
// const fs = require('fs');  ← REMOVED
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// 🆕 NEW: Cloudinary import
const { cloudinary, uploadProfile, uploadGallery } = require('./config/cloudinary');

// Twilio setup (SAME - වෙනසක් නැහැ)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const app = express();

// Middleware (SAME)
app.use(cors());
app.use(express.json());
// 🔴 CHANGED: uploads static serve ඕන නැහැ (Cloudinary URLs use කරන නිසා)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));  ← REMOVED
app.use(express.static(path.join(__dirname, './')));

// 🔴 REMOVED: uploads directory creation (Cloudinary use කරන නිසා ඕන නැහැ)
// if (!fs.existsSync('uploads')) { ... }
// if (!fs.existsSync('uploads/profiles')) { ... }
// if (!fs.existsSync('uploads/gallery')) { ... }

// MongoDB Connection (SAME - වෙනසක් නැහැ)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/natures-edge';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// JWT Secret (SAME)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Email Configuration (SAME - වෙනසක් නැහැ)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Import Models (SAME - වෙනසක් නැහැ)
const User = require('./models/User');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const Message = require('./models/Message');
const GalleryPhoto = require('./models/GalleryPhoto');
const Price = require('./models/Price');

// 🔴 REMOVED: Old multer diskStorage configuration
// const storage = multer.diskStorage({ ... });
// const upload = multer({ storage: storage, ... });
// ↑↑↑ මේ BLOCK එක මුළුමනින්ම DELETE කරන්න
// ↑↑↑ Cloudinary config එකේ handle කරනවා දැන්

// ==================== AUTH ROUTES ==================== (ALL SAME - වෙනසක් නැහැ)

// Register User (SAME)
app.post('/admin/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify Token Middleware (SAME)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Admin Verification Route (SAME)
app.get('/admin/verify', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        res.json({
            success: true,
            isAdmin: true,
            email: user.email
        });
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ message: 'Server error during verification' });
    }
});

// Protected route (SAME)
app.get('/admin/protected-route', verifyToken, async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    res.json({ message: 'Admin access granted' });
});

// Login User (SAME)
app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        const isAdmin = user.email === process.env.ADMIN_EMAIL;

        res.json({
            message: 'Login successful',
            token,
            isAdmin: isAdmin,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send OTP (SAME)
app.post('/admin/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email },
            { otp, otpExpires: Date.now() + 10 * 60 * 1000 }
        );

        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Email Verification OTP',
                html: `<h2>Your OTP Code</h2><p>Your verification code is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
            });
        }

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('OTP error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// Verify OTP (SAME)
app.post('/admin/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
});

// ==================== USER PROFILE ROUTES ====================

// Get User Details (SAME)
app.get('/admin/get-user-details', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email }).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile (SAME)
app.post('/admin/update-profile', async (req, res) => {
    try {
        const { email, username, phone, newPassword } = req.body;

        const updateData = { username, phone };

        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        const user = await User.findOneAndUpdate(
            { email },
            updateData,
            { new: true }
        ).select('-password');

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Update failed' });
    }
});

// ═══════════════════════════════════════════════════════
// 🔴🔴🔴 CHANGED: Update Profile Picture - Cloudinary 🔴🔴🔴
// ═══════════════════════════════════════════════════════
// කලින්: upload.single('profilePic')  → දැන්: uploadProfile.single('profilePic')
// කලින්: '/uploads/profiles/' + req.file.filename  → දැන්: req.file.path (Cloudinary URL)
app.post('/admin/update-profile-pic', uploadProfile.single('profilePic'), async (req, res) => {
    try {
        const { email } = req.body;

        // 🆕 පරණ profile pic Cloudinary එකෙන් delete කරන්න
        const user = await User.findOne({ email });
        if (user && user.profilePicId) {
            await cloudinary.uploader.destroy(user.profilePicId);
        }

        // 🔴 CHANGED: Cloudinary URL save කරනවා (local path වෙනුවට)
        const imageUrl = req.file.path;          // Cloudinary URL
        const imageId = req.file.filename;       // Cloudinary public_id

        await User.findOneAndUpdate({ email }, {
            profilePic: imageUrl,
            profilePicId: imageId               // 🆕 delete කරන්න ඕන වෙලාවට
        });

        res.json({ message: 'Profile picture updated', imageUrl });
    } catch (error) {
        console.error('Profile pic error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// ==================== BOOKING ROUTES ==================== (ALL SAME)

// Add Booking (SAME - වෙනසක් නැහැ)
app.post('/admin/add-booking', async (req, res) => {
    try {
        const bookingData = req.body;
        const booking = new Booking(bookingData);
        await booking.save();

        const checkIn = new Date(bookingData.checkIn);
        const checkOut = new Date(bookingData.checkOut);
        const totalNights = Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);

        const myWhatsAppNumber = 'whatsapp:+94782363530';
        const twilioWhatsAppNumber = 'whatsapp:+14155238886';

        let messageBody = `🏨 *New Booking Received!*\n\n` +
            `👤 *Guest:* ${bookingData.guestDetails.fullName}\n` +
            `📞 *Phone:* ${bookingData.guestDetails.phone}\n` +
            `🏠 *Type:* ${bookingData.roomType}\n` +
            `🌙 *Nights:* ${totalNights} Night${totalNights > 1 ? 's' : ''}\n` +
            `📅 *Dates:* ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()}\n` +
            `💰 *Total:* $${bookingData.totalPrice}`;

        if (bookingData.guestDetails.specialRequest && bookingData.guestDetails.specialRequest.trim() !== "") {
            messageBody += `\n\n📝 *Special Request:* ${bookingData.guestDetails.specialRequest}`;
        }

        client.messages.create({
            from: twilioWhatsAppNumber,
            to: myWhatsAppNumber,
            body: messageBody
        })
        .then(message => console.log("WhatsApp Sent! SID:", message.sid))
        .catch(err => console.error("Twilio Error:", err.message));

        res.status(201).json({ message: 'Booking created successfully', booking });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: 'Booking failed' });
    }
});

// Get All Bookings (SAME)
app.get('/admin/all-bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookedAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

// Get User Bookings (SAME)
app.get('/admin/user-bookings', async (req, res) => {
    try {
        const { email } = req.query;
        const bookings = await Booking.find({ email }).sort({ bookedAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

// Get Booked Dates (SAME)
app.get('/admin/get-booked-dates', async (req, res) => {
    try {
        const bookings = await Booking.find({ status: { $ne: 'Cancelled' } })
            .select('checkIn checkOut roomType');
        res.json(bookings);
    } catch (error) {
        console.error('Get booked dates error:', error);
        res.status(500).json({ message: 'Failed to fetch dates' });
    }
});

// Cancel Booking (SAME)
app.put('/admin/cancel-booking/:id', async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                status: 'Cancelled',
                cancellationReason: reason,
                cancelledAt: new Date()
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ message: 'Cancellation failed' });
    }
});

// Get Admin Statistics (SAME)
app.get('/admin/stats', async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();
        const confirmedBookings = await Booking.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const totalReviews = await Review.countDocuments();

        res.json({
            totalBookings,
            totalRevenue,
            totalReviews
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
});

// ==================== REVIEW ROUTES ==================== (ALL SAME)

// Add Review (SAME)
app.post('/admin/add-review', async (req, res) => {
    try {
        const { token, rating, country, comment } = req.body;

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const review = new Review({
            username: user.username,
            country,
            rating,
            comment,
            date: new Date()
        });

        await review.save();
        res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ message: 'Failed to submit review' });
    }
});

// Get Reviews (SAME)
app.get('/admin/get-reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// Delete Review (SAME)
app.delete('/admin/delete-review/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
});

// ==================== MESSAGE ROUTES ==================== (ALL SAME)

// Add Message (SAME)
app.post('/api/contact', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

// Get Messages (SAME)
app.get('/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// Delete Message (SAME)
app.delete('/admin/delete-message/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Failed to delete message' });
    }
});

// ==================== PRICE ROUTES ==================== (ALL SAME)

// Update Prices (SAME)
app.post('/admin/update-prices', async (req, res) => {
    try {
        const { room1st, roomGF, roomFull } = req.body;

        await Price.findOneAndUpdate(
            {},
            {
                '1st Floor': room1st,
                'Ground Floor': roomGF,
                'Full Villa': roomFull
            },
            { upsert: true }
        );

        res.json({ message: 'Prices updated successfully' });
    } catch (error) {
        console.error('Update prices error:', error);
        res.status(500).json({ message: 'Failed to update prices' });
    }
});

// Get Prices (SAME)
app.get('/admin/get-prices', async (req, res) => {
    try {
        let prices = await Price.findOne();

        if (!prices) {
            prices = new Price({
                '1st Floor': 150,
                'Ground Floor': 100,
                'Full Villa': 250
            });
            await prices.save();
        }

        res.json(prices);
    } catch (error) {
        console.error('Get prices error:', error);
        res.status(500).json({ message: 'Failed to fetch prices' });
    }
});

// ==================== GALLERY ROUTES ====================

// ═══════════════════════════════════════════════════════
// 🔴🔴🔴 CHANGED: Upload Gallery Photos - Cloudinary 🔴🔴🔴
// ═══════════════════════════════════════════════════════
// කලින්: upload.array('images', 10)  → දැන්: uploadGallery.array('images', 10)
// කලින්: '/uploads/gallery/' + file.filename  → දැන්: file.path (Cloudinary URL)
app.post('/admin/upload-gallery', uploadGallery.array('images', 10), async (req, res) => {
    try {
        const { floor, area } = req.body;
        const photos = [];

        for (const file of req.files) {
            const photo = new GalleryPhoto({
                floor,
                area,
                imageUrl: file.path,              // 🔴 CHANGED: Cloudinary URL
                imagePublicId: file.filename       // 🆕 NEW: delete කරන්න ඕන වෙලාවට
            });
            await photo.save();
            photos.push(photo);
        }

        res.json({ message: 'Photos uploaded successfully', photos });
    } catch (error) {
        console.error('Upload gallery error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Get Gallery Photos (SAME)
app.get('/admin/get-gallery-photos', async (req, res) => {
    try {
        const { floor, area } = req.query;
        const photos = await GalleryPhoto.find({ floor, area });
        res.json(photos);
    } catch (error) {
        console.error('Get gallery error:', error);
        res.status(500).json({ message: 'Failed to fetch photos' });
    }
});

// ═══════════════════════════════════════════════════════
// 🔴🔴🔴 CHANGED: Delete Photo - Cloudinary delete 🔴🔴🔴
// ═══════════════════════════════════════════════════════
// කලින්: fs.unlinkSync(filePath) → දැන්: cloudinary.uploader.destroy()
app.delete('/admin/delete-photo/:id', async (req, res) => {
    try {
        const photo = await GalleryPhoto.findById(req.params.id);

        if (photo) {
            // 🔴 CHANGED: Cloudinary එකෙන් delete කරනවා (local file delete වෙනුවට)
            if (photo.imagePublicId) {
                await cloudinary.uploader.destroy(photo.imagePublicId);
            }

            await GalleryPhoto.findByIdAndDelete(req.params.id);
        }

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ message: 'Failed to delete photo' });
    }
});

// Health Check / Home (SAME)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error Handler (SAME)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

// Start Server (SAME)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
