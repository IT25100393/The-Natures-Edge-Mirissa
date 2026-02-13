require('dotenv').config(); // මේක තමයි මුලින්ම තියෙන්න ඕනේ


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, './')));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/profiles')) {
    fs.mkdirSync('uploads/profiles');
}
if (!fs.existsSync('uploads/gallery')) {
    fs.mkdirSync('uploads/gallery');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/natures-edge';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Email Configuration (use environment variables in production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Import Models
const User = require('./models/User');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const Message = require('./models/Message');
const GalleryPhoto = require('./models/GalleryPhoto');
const Price = require('./models/Price');

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = req.path.includes('profile') ? 'uploads/profiles' : 'uploads/gallery';
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
});

// ==================== AUTH ROUTES ====================

// Register User
app.post('/admin/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate token
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

// Login User
app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            token,
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

// Send OTP for Email Verification
app.post('/admin/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in user document
        await User.findOneAndUpdate(
            { email },
            { otp, otpExpires: Date.now() + 10 * 60 * 1000 } // 10 minutes
        );

        // Send email
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

// Verify OTP
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

// Get User Details
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

// Update Profile
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

// Update Profile Picture
app.post('/admin/update-profile-pic', upload.single('profilePic'), async (req, res) => {
    try {
        const { email } = req.body;
        const imageUrl = '/uploads/profiles/' + req.file.filename;

        await User.findOneAndUpdate({ email }, { profilePic: imageUrl });

        res.json({ message: 'Profile picture updated', imageUrl });
    } catch (error) {
        console.error('Profile pic error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// ==================== BOOKING ROUTES ====================

// Add Booking
app.post('/admin/add-booking', async (req, res) => {
    try {
        const bookingData = req.body;
        const booking = new Booking(bookingData);
        await booking.save();

        res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: 'Booking failed' });
    }
});

// Get All Bookings
app.get('/admin/all-bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookedAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

// Get User Bookings
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

// Get Booked Dates
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

// Cancel Booking
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

// Get Admin Statistics
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

// ==================== REVIEW ROUTES ====================

// Add Review
app.post('/admin/add-review', async (req, res) => {
    try {
        const { token, rating, country, comment } = req.body;

        // Verify token
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

// Get Reviews
app.get('/admin/get-reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// Delete Review
app.delete('/admin/delete-review/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
});

// ==================== MESSAGE ROUTES ====================

// Add Message
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

// Get Messages
app.get('/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// Delete Message
app.delete('/admin/delete-message/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Failed to delete message' });
    }
});

// ==================== PRICE ROUTES ====================

// Update Prices
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

// Get Prices
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

// Upload Gallery Photos
app.post('/admin/upload-gallery', upload.array('images', 10), async (req, res) => {
    try {
        const { floor, area } = req.body;
        const photos = [];

        for (const file of req.files) {
            const photo = new GalleryPhoto({
                floor,
                area,
                imageUrl: '/uploads/gallery/' + file.filename
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

// Get Gallery Photos
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

// Delete Photo
app.delete('/admin/delete-photo/:id', async (req, res) => {
    try {
        const photo = await GalleryPhoto.findById(req.params.id);
        
        if (photo) {
            // Delete file from filesystem
            const filePath = path.join(__dirname, photo.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            await GalleryPhoto.findByIdAndDelete(req.params.id);
        }

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ message: 'Failed to delete photo' });
    }
});

// Health Check


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

