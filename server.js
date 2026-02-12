// ===========================================
// THE NATURE'S EDGE MIRISSA - BACKEND SERVER
// ===========================================

// Required Packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const twilio = require('twilio');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000; 

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN; 
const client = new twilio(accountSid, authToken);

// ===========================================
// MIDDLEWARE SETUP
// ===========================================
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// ===========================================
// DATABASE CONNECTION
// ===========================================
const dbURI = process.env.DB_URI;

mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
    .catch((err) => console.log('❌ Database connection error:', err));

// ===========================================
// DATA MODELS (SCHEMAS)
// ===========================================
const User = require('./models/User');
const Booking = require('./models/Booking');
const Review = require('./models/Review');

// Message Schema
const messageSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Price Schema
const priceSchema = new mongoose.Schema({
    roomType: { type: String, required: true, unique: true },
    price: { type: Number, required: true }
});
const Price = mongoose.model('Price', priceSchema);

// Gallery Schema
const gallerySchema = new mongoose.Schema({
    imageUrl: String,
    floor: String,
    area: String,
    date: { type: Date, default: Date.now }
});
const Gallery = mongoose.model('Gallery', gallerySchema);

// ===========================================
// IMAGE UPLOAD CONFIGURATION (MULTER)
// ===========================================
const storage = multer.diskStorage({
    destination: './uploads/gallery',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Profile Picture Storage
const profileStorage = multer.diskStorage({
    destination: './uploads/profiles',
    filename: (req, file, cb) => {
        cb(null, 'user-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadProfile = multer({ storage: profileStorage });

// ===========================================
// EMAIL CONFIGURATION (NODEMAILER)
// ===========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tharushajayod1@gmail.com',
        pass: 'lrpfphpuvqiepkkb' 
    }
});

// ===========================================
// ROUTES - AUTHENTICATION
// ===========================================

/**
 * User Registration
 * POST /register
 */
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                message: "Email already exists! Please use another email." 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({ 
            username, 
            email: email.toLowerCase(), 
            password: hashedPassword,
            phone: ""
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Registration failed due to server error." });
    }
});

/**
 * User Login
 * POST /login
 */
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if admin
        if (email === "admin@natureedge.com" && password === "Admin@123") {
            const token = jwt.sign({ role: 'admin' }, 'my_secret_key', { expiresIn: '1h' });
            return res.json({ 
                token, 
                message: 'Admin Login Successful!', 
                redirectUrl: 'admin-dashboard.html'
            });
        }

        // Check if guest user exists
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid Email or Password!' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, username: user.username, email: user.email }, 
            'my_secret_key', 
            { expiresIn: '1h' }
        );

        res.json({ 
            token, 
            username: user.username, 
            email: user.email, 
            message: 'Login Successful!',
            redirectUrl: 'dashboard.html'
        });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// ===========================================
// ROUTES - BOOKING MANAGEMENT
// ===========================================

/**
 * Add New Booking
 * POST /add-booking
 */
app.post('/add-booking', async (req, res) => {
    const { checkIn, checkOut, roomType, guests, email, totalPrice, guestDetails } = req.body;
    
    try {
        const newBooking = new Booking({
            checkIn, checkOut, roomType, guests, email, totalPrice, guestDetails
        });
        await newBooking.save();

        // Send WhatsApp notification
        const messageBody = `🏨 *New Booking Received!*\n\n` +
                          `👤 *Guest:* ${guestDetails.fullName}\n` +
                          `🏠 *Villa:* ${roomType}\n` +
                          `📅 *Dates:* ${new Date(checkIn).toLocaleDateString()} - ${new Date(checkOut).toLocaleDateString()}\n` +
                          `💰 *Total Price:* $${totalPrice}\n` +
                          `📞 *Phone:* ${guestDetails.phone}`;

        client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+94782363530',
            body: messageBody
        })
        .then(message => console.log("✅ WhatsApp sent: " + message.sid))
        .catch(err => console.error("❌ WhatsApp Error: ", err));

        res.status(201).json({ message: "Booking confirmed and WhatsApp sent!" });
    } catch (err) {
        res.status(500).json({ error: "Booking failed" });
    }
});

/**
 * Get User Bookings
 * GET /user-bookings?email=
 */
app.get('/user-bookings', async (req, res) => {
    const userEmail = req.query.email;
    try {
        const bookings = await Booking.find({ email: userEmail });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user bookings" });
    }
});

/**
 * Get Booked Dates (Excluding Cancelled)
 * GET /get-booked-dates
 */
app.get('/get-booked-dates', async (req, res) => {
    try {
        const bookings = await Booking.find(
            { status: { $ne: 'Cancelled' } }, 
            'checkIn checkOut roomType'
        );
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch dates" });
    }
});

/**
 * Cancel Booking
 * PUT /cancel-booking/:id
 */
app.put('/cancel-booking/:id', async (req, res) => {
    try {
        const { reason } = req.body;
        const bookingId = req.params.id;

        // Update booking status
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId, 
            { status: 'Cancelled', cancellationReason: reason }, 
            { new: true }
        );
        
        if (!updatedBooking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // Send cancellation email
        const mailOptions = {
            from: 'tharushajayod1@gmail.com',
            to: ['tharushajayod1@gmail.com', updatedBooking.email],
            subject: `Booking Cancellation: ${updatedBooking.guestDetails.fullName}`,
            text: `Booking for ${updatedBooking.roomType} was cancelled.\nReason: ${reason}`
        };
        transporter.sendMail(mailOptions);

        res.json({ message: "Booking marked as cancelled" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update booking" });
    }
});

// ===========================================
// ROUTES - ADMIN
// ===========================================

/**
 * Get Admin Statistics
 * GET /admin/stats
 */
app.get('/admin/stats', async (req, res) => {
    try {
        const allBookings = await Booking.find();
        
        // Calculate revenue (excluding cancelled)
        const totalRevenue = allBookings.reduce((sum, b) => {
            if (b.status !== 'Cancelled') {
                return sum + (Number(b.totalPrice) || 0);
            }
            return sum;
        }, 0);

        const activeBookingsCount = allBookings.filter(
            b => b.status !== 'Cancelled'
        ).length;

        const totalReviews = await Review.countDocuments({});

        res.json({
            totalBookings: activeBookingsCount,
            totalRevenue: totalRevenue, 
            totalReviews: totalReviews 
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/**
 * Get All Bookings (Admin)
 * GET /admin/all-bookings
 */
app.get('/admin/all-bookings', async (req, res) => {
    try {
        const allBookings = await Booking.find().sort({ bookedAt: -1 });
        res.json(allBookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get All Messages (Admin)
 * GET /admin/messages
 */
app.get('/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

/**
 * Delete Message (Admin)
 * DELETE /admin/delete-message/:id
 */
app.delete('/admin/delete-message/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        await Message.findByIdAndDelete(messageId);
        res.status(200).json({ message: "Message deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete message" });
    }
});

// ===========================================
// ROUTES - REVIEWS
// ===========================================

/**
 * Add Review
 * POST /add-review
 */
app.post('/add-review', async (req, res) => {
    try {
        const { token, rating, comment, country } = req.body;
        const decoded = jwt.verify(token, 'my_secret_key');
        
        const newReview = new Review({ 
            user: decoded.id, 
            username: decoded.username, 
            country, 
            rating, 
            comment 
        });
        
        await newReview.save();
        res.status(201).json({ message: "Review added successfully!" });
    } catch (err) {
        res.status(500).json({ 
            message: "Session expired or error. Please login again." 
        });
    }
});

/**
 * Get All Reviews
 * GET /get-reviews
 */
app.get('/get-reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Delete Review (Admin)
 * DELETE /admin/delete-review/:id
 */
app.delete('/admin/delete-review/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete review" });
    }
});

// ===========================================
// ROUTES - GALLERY MANAGEMENT
// ===========================================

/**
 * Upload Gallery Images (Admin)
 * POST /admin/upload-gallery
 */
app.post('/admin/upload-gallery', upload.array('images', 10), async (req, res) => {
    try {
        const { floor, area } = req.body;
        const files = req.files;
        
        const savePromises = files.map(file => {
            const imageUrl = `/uploads/gallery/${file.filename}`;
            const newImage = new Gallery({ imageUrl, floor, area });
            return newImage.save();
        });
        
        await Promise.all(savePromises);
        res.status(200).json({ message: "Images uploaded successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload images" });
    }
});

/**
 * Delete Photo (Admin)
 * DELETE /admin/delete-photo/:id
 */
app.delete('/admin/delete-photo/:id', async (req, res) => {
    try {
        const photo = await Gallery.findById(req.params.id);
        
        if (photo) {
            const filePath = path.join(__dirname, photo.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ message: "Photo deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete photo" });
    }
});

/**
 * Get Gallery Photos
 * GET /get-gallery-photos?floor=&area=
 */
app.get('/get-gallery-photos', async (req, res) => {
    try {
        const { floor, area } = req.query;
        const photos = await Gallery.find({ floor, area }).sort({ date: -1 });
        res.json(photos);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch images" });
    }
});

// ===========================================
// ROUTES - CONTACT & MESSAGES
// ===========================================

/**
 * Submit Contact Form
 * POST /contact
 */
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    try {
        const newMessage = new Message({ name, email, subject, message });
        await newMessage.save();

        const mailOptions = {
            from: email,
            to: 'tharushajayod1@gmail.com',
            subject: `New Inquiry: ${subject}`,
            text: `From: ${name}\n\n${message}`
        };
        
        transporter.sendMail(mailOptions);
        res.json({ message: "Message sent and saved!" });
    } catch (err) {
        res.status(500).json({ error: "Error handling message" });
    }
});

// ===========================================
// ROUTES - PRICING
// ===========================================

/**
 * Update Prices (Admin)
 * POST /admin/update-prices
 */
app.post('/admin/update-prices', async (req, res) => {
    try {
        const { room1st, roomGF, roomFull } = req.body;
        
        await Price.findOneAndUpdate(
            { roomType: '1st Floor' }, 
            { price: room1st }, 
            { upsert: true }
        );
        
        await Price.findOneAndUpdate(
            { roomType: 'Ground Floor' }, 
            { price: roomGF }, 
            { upsert: true }
        );
        
        await Price.findOneAndUpdate(
            { roomType: 'Full Villa' }, 
            { price: roomFull }, 
            { upsert: true }
        );
        
        res.status(200).json({ message: "Prices updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update prices" });
    }
});

/**
 * Get Prices
 * GET /get-prices
 */
app.get('/get-prices', async (req, res) => {
    try {
        const prices = await Price.find();
        const priceMap = {};
        prices.forEach(p => { 
            priceMap[p.roomType] = p.price; 
        });
        res.json(priceMap);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch prices" });
    }
});

// ===========================================
// ROUTES - PROFILE MANAGEMENT
// ===========================================

/**
 * Update Profile
 * POST /update-profile
 */
app.post('/update-profile', async (req, res) => {
    try {
        const { email, username, phone, newPassword } = req.body;
        let updateData = { username, phone };

        // Hash new password if provided
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
        }

        const updatedUser = await User.findOneAndUpdate(
            { email: email },
            updateData,
            { new: true }
        );

        res.json({ 
            message: "Profile updated successfully!", 
            user: updatedUser 
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

/**
 * Update Profile Picture
 * POST /update-profile-pic
 */
app.post('/update-profile-pic', uploadProfile.single('profilePic'), async (req, res) => {
    try {
        const { email } = req.body;
        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        const updatedUser = await User.findOneAndUpdate(
            { email: email }, 
            { profilePic: imageUrl },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Profile picture updated!", imageUrl });
    } catch (err) {
        res.status(500).json({ error: "Upload failed" });
    }
});

/**
 * Get User Details
 * GET /get-user-details?email=
 */
app.get('/get-user-details', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            username: user.username,
            email: user.email,
            phone: user.phone,
            profilePic: user.profilePic,
            isEmailVerified: user.isEmailVerified
        });
    } catch (err) {
        res.status(500).json({ error: "Server error fetching user details" });
    }
});

// ===========================================
// ROUTES - OTP & PASSWORD RESET
// ===========================================

/**
 * Send OTP
 * POST /send-otp
 */
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    
    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 600000; // 10 minutes

        const user = await User.findOneAndUpdate(
            { email }, 
            { otp: otpCode, otpExpires: expires }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const mailOptions = {
            from: 'tharushajayod1@gmail.com',
            to: email,
            subject: 'Verification Code - The Nature\'s Edge',
            text: `Your verification code is: ${otpCode}`
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(500).json({ error: "Failed to send email" });
            }
            res.json({ message: "OTP sent to your email!" });
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * Verify OTP
 * POST /verify-otp
 */
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    
    try {
        const user = await User.findOne({ email });

        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP!" });
        }

        await User.findOneAndUpdate(
            { email }, 
            { isEmailVerified: true, otp: null, otpExpires: null }
        );
        
        res.json({ message: "Email verified successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Verification failed" });
    }
});

/**
 * Reset Password
 * POST /reset-password
 */
app.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    try {
        const user = await User.findOne({ email });

        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findOneAndUpdate(
            { email }, 
            { password: hashedPassword, otp: null, otpExpires: null }
        );

        res.json({ message: "Password reset successful!" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ===========================================
// SERVER START
// ===========================================
app.get('/', (req, res) => res.send('🌿 Nature\'s Edge Server Running!'));

app.listen(PORT, () => {
    console.log(`\n✅ Server is running on http://localhost:${PORT}`);
    console.log(`📊 Database: Connected to MongoDB Atlas`);
    console.log(`🌐 CORS: Enabled`);
    console.log(`📧 Email: Configured with Gmail`);
    console.log(`📱 WhatsApp: Configured with Twilio\n`);
});
