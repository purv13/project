// Import required modules
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

// Create an Express app
const app = express();
const port = 3000;

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (like HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day expiration
}));

// MySQL database connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'purvvv',
    database: 'city_navigator'
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

// ===============================
// Multer Setup for File Uploads
// ===============================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// ===============================
// Middleware to check if user is logged in
// ===============================
function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) {
        next(); // User is logged in, proceed
    } else {
        res.redirect('/login.html'); // Redirect to login page if not logged in
    }
}

// ===============================
// Contact Form Functionality
// ===============================
app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.post('/submit-form', (req, res) => {
    const { name, surname, email, message, theatre, shopping, food, apartment, hotel } = req.body;

    const sql = `INSERT INTO contact_form (name, surname, email, message, theatre, shopping, food, apartment, hotel)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(sql, [
        name, surname, email, message,
        theatre ? 1 : 0,
        shopping ? 1 : 0,
        food ? 1 : 0,
        apartment ? 1 : 0,
        hotel ? 1 : 0
    ], (err, result) => {
        if (err) {
            console.error('Error inserting data into the database:', err);
            res.send('Sorry, there was an error: ' + err.message);
            return;
        }

        console.log('Data inserted successfully:', result);
        res.send('Thank you for your submission!');
    });
});

// ===============================
// User Registration and Login System
// ===============================
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword !== trimmedConfirmPassword) {
        return res.send('Passwords do not match');
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(trimmedPassword)) {
        return res.send('Password must be at least 8 characters long and include letters and numbers');
    }

    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (err, result) => {
        if (err) {
            return res.send('Error checking user: ' + err.message);
        }

        if (result.length > 0) {
            return res.send('User already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

        const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        connection.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                return res.send('Error registering user: ' + err.message);
            }
            res.redirect('/login.html');
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (err, result) => {
        if (err) {
            return res.json({ success: false, message: 'Error during login: ' + err.message });
        }

        if (result.length === 0) {
            // Send JSON message indicating the user needs to register
            return res.json({ success: false, message: 'User not found. Please register first.' });
        }

        const user = result[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            req.session.loggedIn = true;
            req.session.user = email;
            return res.json({ success: true, redirectUrl: '/index.html' });
        } else {
            res.json({ success: false, message: 'Incorrect password' });
        }
    });
});



app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Logout error: ' + err.message);
        }
        res.redirect('/');
    });
});

app.get('/check-session', (req, res) => {
    res.json({ loggedIn: req.session.loggedIn || false });
});



// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
