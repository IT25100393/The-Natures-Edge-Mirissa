# 🌿 The Nature's Edge Mirissa - Villa Booking System

A complete full-stack web application for villa booking and management in Mirissa, Sri Lanka.

## 📋 Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)

## ✨ Features

### Guest Features
- 👤 User Registration & Authentication
- 🏠 Villa Booking System (1st Floor, Ground Floor, Full Villa)
- 📅 Interactive Calendar with Date Selection
- 💰 Real-time Price Calculation
- 📧 Email Verification with OTP
- 👤 User Profile Management
- ⭐ Review & Rating System
- 📱 WhatsApp Notifications
- 📄 Booking Invoice Generation

### Admin Features
- 📊 Dashboard with Statistics
- 📅 Booking Management
- 💰 Revenue Reports (Monthly Breakdown)
- 📧 Guest Message Management
- 💵 Dynamic Pricing System
- 🖼️ Gallery Management
- ⭐ Review Moderation
- 📱 WhatsApp Integration for New Bookings

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript
- Flatpickr (Date Picker)
- Font Awesome Icons
- jsPDF (PDF Generation)

### Backend
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose ODM

### Services & APIs
- Nodemailer (Email)
- Twilio (WhatsApp)
- JWT (Authentication)
- Bcrypt (Password Hashing)
- Multer (File Upload)

## 📁 Project Structure

```
villa-booking-system/
│
├── models/
│   ├── User.js          # User schema
│   ├── Booking.js       # Booking schema
│   └── Review.js        # Review schema
│
├── uploads/
│   ├── gallery/         # Gallery images
│   └── profiles/        # User profile pictures
│
├── Frontend Files/
│   ├── index.html           # Homepage
│   ├── login.html           # Login page
│   ├── signup.html          # Registration page
│   ├── dashboard.html       # Guest dashboard
│   ├── profile.html         # User profile
│   ├── gallery.html         # Photo gallery
│   ├── contact.html         # Contact form
│   ├── invoice.html         # Booking invoice
│   ├── forgot-password.html # Password reset
│   │
│   ├── admin-dashboard.html # Admin panel
│   ├── admin-invoice.html   # Revenue reports
│   └── admin-reviews.html   # Review management
│
├── server.js            # Main server file
├── package.json         # Dependencies
└── README.md           # Documentation
```

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas Account
- Gmail Account (for email)
- Twilio Account (for WhatsApp)

### Step 1: Clone or Download
```bash
# Clone the repository
git clone [repository-url]

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies
```bash
cd villa-booking-system
npm install express mongoose cors body-parser bcryptjs jsonwebtoken nodemailer multer twilio
```

### Step 3: Configure Environment
Edit `server.js` and update these values:

```javascript
// MongoDB Connection
const dbURI = 'YOUR_MONGODB_CONNECTION_STRING';

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL@gmail.com',
        pass: 'YOUR_APP_PASSWORD'
    }
});

// Twilio Configuration
const accountSid = 'YOUR_TWILIO_SID';
const authToken = 'YOUR_TWILIO_TOKEN';
```

### Step 4: Create Required Folders
```bash
mkdir -p uploads/gallery
mkdir -p uploads/profiles
```

### Step 5: Start the Server
```bash
node server.js
```

Server will run on: `http://localhost:3000`

## ⚙️ Configuration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in `server.js`

### Twilio Setup
1. Create Twilio Account
2. Get Sandbox WhatsApp Number
3. Add your WhatsApp number
4. Update credentials in `server.js`

### MongoDB Atlas Setup
1. Create cluster
2. Add database user
3. Whitelist IP address (0.0.0.0/0 for development)
4. Copy connection string

## 🔌 API Endpoints

### Authentication
```
POST   /register              - User registration
POST   /login                 - User login (Admin/Guest)
POST   /send-otp              - Send OTP to email
POST   /verify-otp            - Verify OTP code
POST   /reset-password        - Reset password with OTP
```

### Bookings
```
POST   /add-booking           - Create new booking
GET    /user-bookings         - Get user bookings
GET    /get-booked-dates      - Get unavailable dates
PUT    /cancel-booking/:id    - Cancel booking
GET    /admin/all-bookings    - Get all bookings (Admin)
```

### Reviews
```
POST   /add-review            - Submit review
GET    /get-reviews           - Get all reviews
DELETE /admin/delete-review/:id - Delete review (Admin)
```

### Profile
```
POST   /update-profile        - Update user profile
POST   /update-profile-pic    - Upload profile picture
GET    /get-user-details      - Get user information
```

### Gallery
```
POST   /admin/upload-gallery  - Upload photos (Admin)
GET    /get-gallery-photos    - Get photos by floor/area
DELETE /admin/delete-photo/:id - Delete photo (Admin)
```

### Pricing
```
POST   /admin/update-prices   - Update villa prices (Admin)
GET    /get-prices            - Get current prices
```

### Contact & Messages
```
POST   /contact               - Submit contact form
GET    /admin/messages        - Get messages (Admin)
DELETE /admin/delete-message/:id - Delete message (Admin)
```

### Statistics
```
GET    /admin/stats           - Get dashboard statistics
```

## 💾 Database Schema

### User Collection
```javascript
{
    username: String,
    email: String (unique),
    password: String (hashed),
    phone: String,
    isEmailVerified: Boolean,
    otp: String,
    otpExpires: Date,
    profilePic: String,
    createdAt: Date,
    updatedAt: Date
}
```

### Booking Collection
```javascript
{
    email: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    roomType: String (enum),
    totalPrice: Number,
    status: String (enum: Confirmed/Cancelled),
    cancellationReason: String,
    guestDetails: {
        fullName: String,
        phone: String,
        nationality: String,
        specialRequest: String
    },
    bookedAt: Date,
    createdAt: Date,
    updatedAt: Date
}
```

### Review Collection
```javascript
{
    user: ObjectId (ref: User),
    username: String,
    country: String,
    rating: Number (1-5),
    comment: String,
    date: Date,
    createdAt: Date,
    updatedAt: Date
}
```

### Price Collection
```javascript
{
    roomType: String (unique),
    price: Number
}
```

### Message Collection
```javascript
{
    name: String,
    email: String,
    subject: String,
    message: String,
    date: Date
}
```

### Gallery Collection
```javascript
{
    imageUrl: String,
    floor: String,
    area: String,
    date: Date
}
```

## 🔐 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Email verification with OTP
- Session expiration
- Input validation
- Protected admin routes

## 📱 Features in Detail

### Booking System
- Real-time availability checking
- Automatic price calculation
- Date range selection
- Guest count validation
- Room type restrictions

### Admin Panel
- Comprehensive dashboard
- Booking overview
- Revenue tracking
- Message management
- Gallery control
- Price management
- Review moderation

### Email Notifications
- Welcome emails
- Booking confirmations
- Cancellation notices
- OTP verification codes
- Password reset links

### WhatsApp Integration
- Instant booking notifications
- Guest details
- Booking summary
- Contact information

## 🌐 Access Credentials

### Admin Login
```
Email: admin@natureedge.com
Password: Admin@123
```

### Test Guest Account
Create via signup page or use MongoDB to insert test data.

## 📞 Support

For issues or questions:
- Email: tharushajayod1@gmail.com
- Phone: +94 71 752 6757

## 📄 License

This project is for educational and commercial use for The Nature's Edge Mirissa.

---

**Built with ❤️ for The Nature's Edge Mirissa**
