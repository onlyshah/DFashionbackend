# 🔧 DFashion API Troubleshooting Guide

## 🚨 Common API Issues & Solutions

### **Issue 1: Rate Limiting Errors (429 Status)**

**Problem:** Frontend getting "Too many requests" errors, especially for OPTIONS requests.

**Symptoms:**
```
⚠️ HTTP Error: {
  method: 'OPTIONS',
  url: '/login',
  status: 429,
  duration: '1ms'
}
```

**Solution:**
✅ **Fixed** - Updated `basicSecurity.js` to:
- Skip rate limiting for OPTIONS requests (CORS preflight)
- Increased limits for development (1000 general, 50 auth)
- Added proper CORS handling

---

### **Issue 2: Missing /me Endpoint (404 Status)**

**Problem:** Frontend calling `/me` but backend expects `/api/auth/me`.

**Symptoms:**
```
⚠️ HTTP Error: {
  method: 'GET',
  url: '/me',
  status: 401,
  duration: '6ms'
}
```

**Solution:**
✅ **Fixed** - Added redirect endpoints:
- `/me` → `/api/auth/me`
- `/api/me` → `/api/auth/me`
- `/login` → `/api/auth/login`
- `/api/login` → `/api/auth/login`

---

### **Issue 3: Authentication Token Issues**

**Problem:** "No token provided" errors when frontend sends requests.

**Symptoms:**
```
🔐 Auth middleware - Token present: false
🔐 Auth middleware - No token provided
```

**Root Causes:**
1. **Frontend not storing token** after login
2. **Token not being sent** in Authorization header
3. **CORS issues** preventing headers

**Solutions:**

#### **A. Check Frontend Token Storage:**
```typescript
// In auth service, after login:
localStorage.setItem('token', response.token);
// OR
sessionStorage.setItem('token', response.token);
```

#### **B. Check HTTP Interceptor:**
```typescript
// In HTTP interceptor:
const token = localStorage.getItem('token');
if (token) {
  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
```

#### **C. Check CORS Headers:**
Backend now allows these headers:
- `Authorization`
- `Content-Type`
- `Accept`
- `Origin`
- `X-Requested-With`

---

### **Issue 4: Database Connection Issues**

**Problem:** Backend can't connect to MongoDB.

**Symptoms:**
```
❌ MongoDB connection failed: MongoNetworkError
```

**Solutions:**

#### **A. Start MongoDB Service:**
```bash
# Windows Service
net start MongoDB

# Manual Start
mongod --dbpath "C:\data\db"

# MongoDB Compass
# Connect to mongodb://localhost:27017
```

#### **B. Check Connection String:**
```javascript
// In .env file:
MONGODB_URI=mongodb://localhost:27017/dfashion
```

#### **C. Create Data Directory:**
```bash
mkdir C:\data\db
```

---

## 🔍 **API Endpoint Reference**

### **Authentication Endpoints:**
```
POST /api/auth/register    - User registration
POST /api/auth/login       - User login
GET  /api/auth/me          - Get current user
POST /api/auth/logout      - User logout
POST /api/auth/refresh     - Refresh token
```

### **User Endpoints:**
```
GET    /api/users          - Get all users (admin)
GET    /api/users/:id      - Get user by ID
PUT    /api/users/:id      - Update user
DELETE /api/users/:id      - Delete user (admin)
```

### **Product Endpoints:**
```
GET    /api/products       - Get all products
GET    /api/products/:id   - Get product by ID
POST   /api/products       - Create product (admin)
PUT    /api/products/:id   - Update product (admin)
DELETE /api/products/:id   - Delete product (admin)
```

### **E-commerce Endpoints:**
```
GET    /api/cart           - Get user cart
POST   /api/cart           - Add to cart
PUT    /api/cart/:id       - Update cart item
DELETE /api/cart/:id       - Remove from cart

GET    /api/wishlist       - Get user wishlist
POST   /api/wishlist       - Add to wishlist
DELETE /api/wishlist/:id   - Remove from wishlist

GET    /api/orders         - Get user orders
POST   /api/orders         - Create order
GET    /api/orders/:id     - Get order details
```

### **Admin Endpoints:**
```
GET    /api/admin/dashboard     - Admin dashboard data
GET    /api/admin/users         - Manage users
GET    /api/admin/products      - Manage products
GET    /api/admin/orders        - Manage orders
POST   /api/admin/auth/login    - Admin login
```

---

## 🧪 **Testing API Endpoints**

### **1. Health Check:**
```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-09T08:35:46.685Z",
  "message": "DFashion API Server Running",
  "database": "Connected"
}
```

### **2. User Registration:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### **3. User Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### **4. Get Current User (with token):**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔧 **Quick Fixes Applied**

### **1. Rate Limiting Fix:**
```javascript
// Skip OPTIONS requests
skip: (req) => {
  return req.method === 'OPTIONS';
}
```

### **2. Endpoint Redirects:**
```javascript
// Redirect missing endpoints
app.get('/me', (req, res) => {
  res.redirect(301, '/api/auth/me');
});
```

### **3. CORS Configuration:**
```javascript
// Allow necessary headers
allowedHeaders: [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization'
]
```

---

## 🚀 **Restart Instructions**

### **1. Stop Current Backend:**
```bash
# Kill all Node.js processes
taskkill /f /im node.exe
```

### **2. Start Fixed Backend:**
```bash
cd DFashionbackend\backend
restart-backend.bat
# OR
npm run dev
```

### **3. Verify Fix:**
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test CORS
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:4200"
```

---

## 📊 **Expected Log Output**

When backend starts successfully:
```
🚀 Starting DFashion Backend...
🔐 JWT_SECRET loaded: true
✅ All modules loaded successfully
🔒 Applying basic security middleware...
✅ Basic security middleware applied successfully
🌐 Database connected successfully
🚀 Server running on port 3001
✅ Socket.IO server initialized
✅ Auth routes mounted successfully
✅ All routes loaded successfully
```

When frontend connects successfully:
```
📝 Request: {
  method: 'OPTIONS',
  url: '/api/auth/login',
  status: 204,
  duration: '2ms'
}
📝 Request: {
  method: 'POST',
  url: '/api/auth/login',
  status: 200,
  duration: '150ms'
}
```

---

## 🆘 **If Issues Persist**

1. **Clear browser cache** and localStorage
2. **Restart both servers** (backend and frontend)
3. **Check MongoDB** is running
4. **Verify environment variables** in .env file
5. **Check firewall/antivirus** blocking ports 3001/4200

**The API fixes should resolve the authentication and endpoint issues!** 🎉
