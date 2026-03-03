require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Cloudinary Configuration Import
const { cloudinary, uploadProfile, uploadGallery } = require('./config/cloudinary');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// MongoDB Connection (Atlas URI from .env)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/natures-edge';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected to Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'natures-edge-secret-key-2026';

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Models Import
const User = require('./models/User');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const Message = require('./models/Message');
const GalleryPhoto = require('./models/GalleryPhoto');
const Price = require('./models/Price');

// ==================== AUTH ROUTES ====================

app.post('/admin/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: 'User registered successfully', token, user: { id: user._id, username, email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        const isAdmin = user.email === process.env.ADMIN_EMAIL;
        res.json({ message: 'Login successful', token, isAdmin, user: { id: user._id, username: user.username, email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await User.findOneAndUpdate({ email }, { otp, otpExpires: Date.now() + 10 * 60 * 1000 });
        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Email Verification OTP',
                html: `<h2>Your OTP Code</h2><p>Your code is: <strong>${otp}</strong></p>`
            });
        }
        res.json({ message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ message: 'OTP failed' });
    }
});

// ==================== USER PROFILE & CLOUDINARY PIC ====================

app.post('/admin/update-profile-pic', uploadProfile.single('profilePic'), async (req, res) => {
    try {
        const { email } = req.body;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findOne({ email });
        if (user && user.profilePicId) {
            await cloudinary.uploader.destroy(user.profilePicId);
        }

        await User.findOneAndUpdate({ email }, {
            profilePic: req.file.path,
            profilePicId: req.file.filename
        });
        res.json({ message: 'Profile picture updated', imageUrl: req.file.path });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed' });
    }
});

app.get('/admin/get-user-details', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email }).select('-password');
        user ? res.json(user) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== BOOKING ROUTES ====================

app.post('/admin/add-booking', async (req, res) => {
    try {
        const booking = new Booking(req.body);
        await booking.save();

        const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+94782363530',
            body: `🏨 *New Booking!*\nGuest: ${req.body.guestDetails.fullName}\nTotal: $${req.body.totalPrice}`
        });

        res.status(201).json({ message: 'Booking created', booking });
    } catch (error) {
        res.status(500).json({ message: 'Booking failed' });
    }
});

app.get('/admin/all-bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookedAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

app.get('/admin/get-booked-dates', async (req, res) => {
    try {
        const bookings = await Booking.find({ status: { $ne: 'Cancelled' } }).select('checkIn checkOut roomType');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

app.put('/admin/cancel-booking/:id', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'Cancelled', cancelledAt: new Date() }, { new: true });
        res.json({ message: 'Cancelled', booking });
    } catch (error) {
        res.status(500).json({ message: 'Cancel failed' });
    }
});

// ==================== REVIEW & MESSAGE ROUTES ====================

app.post('/admin/add-review', async (req, res) => {
    try {
        const review = new Review(req.body);
        await review.save();
        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        res.status(500).json({ message: 'Failed' });
    }
});

app.get('/admin/get-reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();
        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ message: 'Failed' });
    }
});

app.get('/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

// ==================== GALLERY & PRICE ROUTES ====================

app.post('/admin/upload-gallery', uploadGallery.array('images', 10), async (req, res) => {
    try {
        const { floor, area } = req.body;
        const photos = [];
        for (const file of req.files) {
            const photo = new GalleryPhoto({ floor, area, imageUrl: file.path, imagePublicId: file.filename });
            await photo.save();
            photos.push(photo);
        }
        res.json({ message: 'Uploaded', photos });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed' });
    }
});

app.delete('/admin/delete-photo/:id', async (req, res) => {
    try {
        const photo = await GalleryPhoto.findById(req.params.id);
        if (photo && photo.imagePublicId) {
            await cloudinary.uploader.destroy(photo.imagePublicId);
            await GalleryPhoto.findByIdAndDelete(req.params.id);
        }
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
});

app.get('/admin/get-prices', async (req, res) => {
    try {
        let prices = await Price.findOne() || new Price({ '1st Floor': 150, 'Ground Floor': 100, 'Full Villa': 250 });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed' });
    }
});

app.post('/admin/update-prices', async (req, res) => {
    try {
        const { room1st, roomGF, roomFull } = req.body;
        await Price.findOneAndUpdate({}, { '1st Floor': room1st, 'Ground Floor': roomGF, 'Full Villa': roomFull }, { upsert: true });
        res.json({ message: 'Prices updated' });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
});

// ==================== SERVER SETUP ====================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
