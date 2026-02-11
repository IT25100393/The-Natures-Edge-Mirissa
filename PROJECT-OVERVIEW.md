# 📊 Project Overview - The Nature's Edge Mirissa

## 🎯 Project Summary

**Project Name:** The Nature's Edge Mirissa Villa Booking System
**Type:** Full-Stack Web Application
**Purpose:** Online booking and management system for a villa in Mirissa, Sri Lanka

## 📁 File Structure Overview

### Backend (Server-Side)
```
server.js               → Main server file (Express.js)
models/
  ├── User.js          → User database schema
  ├── Booking.js       → Booking database schema
  └── Review.js        → Review database schema
```

### Frontend (Client-Side)

#### Public Pages
```
index.html             → Homepage with reviews, gallery preview
gallery.html           → Photo gallery (Ground & 1st Floor)
contact.html           → Contact form
login.html             → User login
signup.html            → User registration
forgot-password.html   → Password reset with OTP
```

#### User Pages (Requires Login)
```
dashboard.html         → Guest booking dashboard
profile.html           → User profile management
invoice.html           → Booking invoice/receipt
```

#### Admin Pages (Requires Admin Login)
```
admin-dashboard.html   → Main admin panel
admin-invoice.html     → Revenue reports
admin-reviews.html     → Review management
```

## 🔑 Key Features Breakdown

### 1. User Management
- ✅ Registration with email
- ✅ Login authentication (JWT)
- ✅ Email verification (OTP)
- ✅ Password reset
- ✅ Profile picture upload
- ✅ Profile information update

### 2. Booking System
- ✅ Villa selection (3 options)
- ✅ Date range picker
- ✅ Guest count selection
- ✅ Real-time price calculation
- ✅ Booking confirmation
- ✅ Invoice generation
- ✅ Booking history
- ✅ Cancellation with reason

### 3. Admin Features
- ✅ Dashboard statistics
- ✅ Booking management
- ✅ Revenue tracking (monthly)
- ✅ Message inbox
- ✅ Gallery upload/delete
- ✅ Price management
- ✅ Review moderation

### 4. Review System
- ✅ Star rating (1-5)
- ✅ Written comments
- ✅ Country selection
- ✅ Public display
- ✅ Statistics calculation

### 5. Communication
- ✅ Contact form
- ✅ Email notifications
- ✅ WhatsApp alerts (admin)
- ✅ OTP verification

## 💾 Database Collections

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| users | User accounts | email, password, phone, profilePic |
| bookings | Reservations | dates, roomType, price, status |
| reviews | Guest reviews | rating, comment, country |
| prices | Room pricing | roomType, price |
| messages | Contact inquiries | name, email, message |
| galleries | Photo uploads | floor, area, imageUrl |

## 🔐 Security Implementation

1. **Password Security**
   - Bcrypt hashing (10 salt rounds)
   - No plain text storage

2. **Authentication**
   - JWT tokens (1 hour expiry)
   - Protected routes

3. **Email Verification**
   - 6-digit OTP
   - 10-minute expiration

4. **Admin Access**
   - Separate admin credentials
   - Role-based routing

## 📊 Workflow Examples

### Booking Flow (Guest)
```
1. User registers → 2. Verify email → 3. Login → 
4. Select villa & dates → 5. Fill guest info → 
6. Confirm booking → 7. Receive invoice → 8. WhatsApp to admin
```

### Admin Management Flow
```
1. Admin login → 2. View dashboard → 
3. Check new bookings → 4. Manage prices → 
5. Upload gallery photos → 6. Review messages → 
7. Generate revenue reports
```

## 🎨 Design Features

### UI/UX Elements
- Glassmorphism effects
- Smooth animations
- Responsive design
- Modal popups
- Loading states
- Error handling

### Color Scheme
```css
Primary Green: #2d5a27
Dark Blue: #003366
Light Blue: #e7f1ff
Gold: #ffcc00
Background: Nature image with overlay
```

## 📈 Statistics Tracked

| Metric | Description |
|--------|-------------|
| Total Bookings | Active reservations |
| Total Revenue | Confirmed bookings only |
| Total Reviews | Guest feedback count |
| Average Rating | Calculated from all reviews |

## 🔧 Technologies Used

### Frontend
- HTML5, CSS3, JavaScript
- Flatpickr (Date picker)
- Font Awesome (Icons)
- jsPDF (PDF generation)

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT + Bcrypt
- Nodemailer + Twilio
- Multer (File uploads)

## 📱 Responsive Design

- ✅ Desktop (1920px+)
- ✅ Laptop (1024px - 1919px)
- ✅ Tablet (768px - 1023px)
- ✅ Mobile (320px - 767px)

## 🚀 Deployment Considerations

### Required Services
1. **Hosting:** Node.js server (Heroku, Railway, Vercel)
2. **Database:** MongoDB Atlas
3. **Email:** Gmail with App Password
4. **WhatsApp:** Twilio account
5. **Storage:** Server storage for uploads

### Environment Variables (Production)
```javascript
DB_URI
JWT_SECRET
EMAIL_USER
EMAIL_PASS
TWILIO_SID
TWILIO_TOKEN
PORT
```

## 📞 Contact & Support

**Developer:** Tharusha Jayoditha
**Email:** tharushajayod1@gmail.com
**Phone:** +94 71 752 6757
**Location:** Mirissa, Sri Lanka

## 📝 Future Enhancement Ideas

- [ ] Online payment integration
- [ ] Multiple language support
- [ ] Chat support system
- [ ] Advanced analytics
- [ ] Mobile app version
- [ ] Social media integration
- [ ] Automated email reminders
- [ ] Dynamic pricing based on season

---

**Status:** Production Ready ✅
**Last Updated:** 2026
**Version:** 1.0.0
