# 🚀 Quick Setup Guide

## Step-by-Step Installation

### 1️⃣ Install Node.js
Download and install from: https://nodejs.org/
```bash
# Check installation
node --version
npm --version
```

### 2️⃣ Install Dependencies
```bash
cd [your-project-folder]
npm install
```

### 3️⃣ Configure MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Database Access → Add User
5. Network Access → Add IP (0.0.0.0/0)
6. Get connection string
7. Update in `server.js`:
```javascript
const dbURI = 'mongodb+srv://username:password@cluster.mongodb.net/VillaDB';
```

### 4️⃣ Configure Gmail

1. Enable 2-Factor Authentication
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
3. Update in `server.js`:
```javascript
auth: {
    user: 'youremail@gmail.com',
    pass: 'your-app-password'
}
```

### 5️⃣ Configure Twilio (WhatsApp)

1. Sign up at https://www.twilio.com/
2. Get phone number
3. Activate WhatsApp sandbox
4. Update in `server.js`:
```javascript
const accountSid = 'YOUR_ACCOUNT_SID';
const authToken = 'YOUR_AUTH_TOKEN';
```

### 6️⃣ Create Upload Folders
```bash
mkdir uploads
mkdir uploads/gallery
mkdir uploads/profiles
```

### 7️⃣ Start Server
```bash
node server.js
```

### 8️⃣ Access Application
```
Frontend: Open index.html in browser
API: http://localhost:3000
Admin: Login with admin@natureedge.com / Admin@123
```

## 📝 Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Error
- Check internet connection
- Verify connection string
- Whitelist IP address
- Check database user credentials

### Email Not Sending
- Verify Gmail app password
- Check 2FA is enabled
- Try different email service

### File Upload Issues
- Verify folders exist
- Check folder permissions
- Ensure multer is installed

## 🔧 Development Tips

### Use Nodemon for Auto-Restart
```bash
npm install -g nodemon
nodemon server.js
```

### Check Logs
- Console logs appear in terminal
- Check browser console (F12)
- MongoDB logs in Atlas dashboard

### Test API Endpoints
Use Postman or Thunder Client to test:
```
GET http://localhost:3000/get-prices
POST http://localhost:3000/register
```

## 📱 Admin Access

```
URL: http://localhost:3000/admin-dashboard.html
Email: admin@natureedge.com
Password: Admin@123
```

## 🌐 Deployment

### For Production:
1. Use environment variables
2. Enable HTTPS
3. Restrict CORS
4. Use production MongoDB cluster
5. Set secure JWT secret
6. Enable rate limiting

---

Need help? Contact: tharushajayod1@gmail.com
