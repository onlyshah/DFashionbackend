console.log('🔍 Starting DFashion Backend Debug...');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 Node.js version:', process.version);

try {
    console.log('📦 Loading environment variables...');
    require('dotenv').config();
    console.log('✅ Environment variables loaded');
    
    console.log('🔐 JWT_SECRET:', !!process.env.JWT_SECRET);
    console.log('🗄️ MONGODB_URI:', process.env.MONGODB_URI);
    console.log('🌐 PORT:', process.env.PORT);
    
    console.log('📦 Loading Express...');
    const express = require('express');
    console.log('✅ Express loaded');
    
    console.log('📦 Loading Mongoose...');
    const mongoose = require('mongoose');
    console.log('✅ Mongoose loaded');
    
    console.log('🔗 Attempting MongoDB connection...');
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dfashion')
        .then(() => {
            console.log('✅ MongoDB connected successfully');
            
            console.log('🚀 Creating Express app...');
            const app = express();
            
            app.get('/health', (req, res) => {
                res.json({ status: 'OK', message: 'Backend is running' });
            });
            
            const PORT = process.env.PORT || 3001;
            app.listen(PORT, () => {
                console.log(`✅ Server running on port ${PORT}`);
                console.log(`🌐 Health check: http://localhost:${PORT}/health`);
                console.log('🎉 Backend started successfully!');
            });
        })
        .catch(error => {
            console.error('❌ MongoDB connection failed:', error.message);
            console.error('💡 Make sure MongoDB is running on your system');
            process.exit(1);
        });
        
} catch (error) {
    console.error('❌ Error starting backend:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
}
