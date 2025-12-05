const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory data store (for demo purposes)
let users = [
    { id: 1, username: 'admin', email: 'admin@example.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', createdAt: new Date().toISOString() },
    { id: 2, username: 'john_doe', email: 'john@example.com', password: bcrypt.hashSync('password123', 10), role: 'user', createdAt: new Date().toISOString() },
    { id: 3, username: 'jane_smith', email: 'jane@example.com', password: bcrypt.hashSync('password123', 10), role: 'user', createdAt: new Date().toISOString() },
    { id: 4, username: 'bob_wilson', email: 'bob@example.com', password: bcrypt.hashSync('password123', 10), role: 'user', createdAt: new Date().toISOString() },
];
let nextUserId = 5;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'rezervacny-web-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user available to all views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.error = req.session.error || null;
    res.locals.success = req.session.success || null;
    delete req.session.error;
    delete req.session.success;
    next();
});

// Auth middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    req.session.error = 'Please login to access this page';
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.session.error = 'Access denied. Admin privileges required.';
    res.redirect('/');
}

// Validation helpers
function validateUserData(data, isUpdate = false, currentUserId = null) {
    const errors = [];
    
    // Username validation
    if (!data.username || data.username.trim().length < 3) {
        errors.push('Username must be at least 3 characters long');
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    } else {
        // Check for duplicate username
        const existingUser = users.find(u => 
            u.username.toLowerCase() === data.username.toLowerCase() && 
            u.id !== currentUserId
        );
        if (existingUser) {
            errors.push('Username already exists');
        }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.push('Please enter a valid email address');
    } else {
        // Check for duplicate email
        const existingEmail = users.find(u => 
            u.email.toLowerCase() === data.email.toLowerCase() && 
            u.id !== currentUserId
        );
        if (existingEmail) {
            errors.push('Email already exists');
        }
    }
    
    // Password validation (only for new users or when password is provided)
    if (!isUpdate || (data.password && data.password.length > 0)) {
        if (!data.password || data.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
            errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
        }
    }
    
    // Role validation
    if (data.role && !['admin', 'user'].includes(data.role)) {
        errors.push('Invalid role selected');
    }
    
    return errors;
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome' });
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Login' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Server-side validation
    if (!username || !password) {
        req.session.error = 'Please provide both username and password';
        return res.redirect('/login');
    }
    
    const user = users.find(u => u.username === username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        req.session.error = 'Invalid username or password';
        return res.redirect('/login');
    }
    
    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    
    req.session.success = 'Login successful!';
    res.redirect(user.role === 'admin' ? '/admin' : '/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Admin routes
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin/dashboard', { 
        title: 'Admin Dashboard',
        users: users.filter(u => u.id !== req.session.user.id)
    });
});

// API routes for CRUD operations
app.get('/api/users', isAuthenticated, isAdmin, (req, res) => {
    const { search, role } = req.query;
    let filteredUsers = users.filter(u => u.id !== req.session.user.id);
    
    if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(u => 
            u.username.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
    }
    
    if (role && role !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    
    // Return users without passwords
    const safeUsers = filteredUsers.map(({ password, ...user }) => user);
    res.json(safeUsers);
});

app.get('/api/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

app.post('/api/users', isAuthenticated, isAdmin, (req, res) => {
    const { username, email, password, role } = req.body;
    
    // Server-side validation
    const errors = validateUserData({ username, email, password, role });
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    const newUser = {
        id: nextUserId++,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: bcrypt.hashSync(password, 10),
        role: role || 'user',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ message: 'User created successfully', user: safeUser });
});

app.put('/api/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent admin from editing themselves through API
    if (userId === req.session.user.id) {
        return res.status(403).json({ error: 'Cannot modify your own account through admin panel' });
    }
    
    const { username, email, password, role } = req.body;
    
    // Server-side validation
    const errors = validateUserData({ username, email, password, role }, true, userId);
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    users[userIndex] = {
        ...users[userIndex],
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role: role || users[userIndex].role
    };
    
    // Only update password if provided
    if (password && password.length > 0) {
        users[userIndex].password = bcrypt.hashSync(password, 10);
    }
    
    const { password: _, ...safeUser } = users[userIndex];
    res.json({ message: 'User updated successfully', user: safeUser });
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent admin from deleting themselves
    if (userId === req.session.user.id) {
        return res.status(403).json({ error: 'Cannot delete your own account' });
    }
    
    users.splice(userIndex, 1);
    res.json({ message: 'User deleted successfully' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
