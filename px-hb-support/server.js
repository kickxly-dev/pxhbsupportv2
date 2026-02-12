// P.X HB Support - Self-Hosted Server
// Run with: node server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Store messages and staff status
let messages = [];
let staffStatus = {
    isOnline: false,
    staffName: null,
    lastSeen: null
};

// Staff credentials (same as frontend)
const STAFF_CREDENTIALS = {
    'admin': 'pxhb2024',
    'support': 'support123',
    'moderator': 'mod456'
};

// API Routes
app.get('/api/messages', (req, res) => {
    res.json(messages.slice(-50)); // Last 50 messages
});

app.post('/api/messages', (req, res) => {
    const message = {
        id: Date.now(),
        text: req.body.text,
        sender: req.body.sender,
        senderType: req.body.senderType,
        timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    
    // Keep only last 100 messages
    if (messages.length > 100) {
        messages = messages.slice(-100);
    }
    
    // Broadcast to all connected clients
    io.emit('newMessage', message);
    
    res.json({ success: true, message });
});

app.get('/api/staff-status', (req, res) => {
    res.json(staffStatus);
});

app.post('/api/staff-status', (req, res) => {
    staffStatus = {
        ...staffStatus,
        ...req.body,
        lastSeen: new Date().toISOString()
    };
    
    // Broadcast staff status change
    io.emit('staffStatusUpdate', staffStatus);
    
    res.json({ success: true, staffStatus });
});

app.post('/api/staff-login', (req, res) => {
    const { username, password } = req.body;
    
    if (STAFF_CREDENTIALS[username] && STAFF_CREDENTIALS[username] === password) {
        res.json({ 
            success: true, 
            username,
            message: 'Login successful'
        });
    } else {
        res.json({ 
            success: false, 
            message: 'Invalid credentials' 
        });
    }
});

// Socket.IO for real-time communication
io.on('connection', (socket) => {
    console.log('🔗 User connected:', socket.id);
    
    // Send current messages and staff status
    socket.emit('messages', messages.slice(-50));
    socket.emit('staffStatusUpdate', staffStatus);
    
    // Handle new messages
    socket.on('sendMessage', (messageData) => {
        const message = {
            id: Date.now(),
            text: messageData.text,
            sender: messageData.sender,
            senderType: messageData.senderType,
            timestamp: new Date().toISOString()
        };
        
        messages.push(message);
        
        // Keep only last 100 messages
        if (messages.length > 100) {
            messages = messages.slice(-100);
        }
        
        // Broadcast to all clients
        io.emit('newMessage', message);
    });
    
    // Handle staff status updates
    socket.on('updateStaffStatus', (status) => {
        staffStatus = {
            ...staffStatus,
            ...status,
            lastSeen: new Date().toISOString()
        };
        
        // Broadcast to all clients
        io.emit('staffStatusUpdate', staffStatus);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Routes for Admin Panel
app.get('/api/admin/stats', (req, res) => {
    res.json({
        activeUsers: Math.floor(Math.random() * 20) + 5,
        onlineStaff: staffStatus.isOnline ? 1 : 0,
        totalMessages: messages.length,
        avgResponseTime: Math.floor(Math.random() * 60) + 30
    });
});

app.get('/api/admin/staff', (req, res) => {
    res.json([
        { username: 'admin', role: 'Administrator', online: staffStatus.isOnline, lastSeen: staffStatus.lastSeen },
        { username: 'support', role: 'Support Agent', online: false, lastSeen: new Date() },
        { username: 'moderator', role: 'Moderator', online: false, lastSeen: new Date() }
    ]);
});

app.get('/api/admin/messages', (req, res) => {
    res.json(messages.slice(-50));
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 P.X HB Support Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
    console.log(`🔧 Staff login: Type Konami Code (↑↑↓↓←→←→BA)`);
    console.log(`👮 Staff credentials: admin/pxhb2024, support/support123, moderator/mod456`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
