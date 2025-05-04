const express = require('express')
const cors = require('cors')
const {v4: uuidv4} = require('uuid')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const intSalt = 10

const dbSource = "feedbacktool.db"
const HTTP_PORT = 8000
const db = new sqlite3.Database(dbSource)

var app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

// Start the server
app.listen(HTTP_PORT, () => {
    console.log(`Server running on http://localhost:${HTTP_PORT}`);
});


app.post('/user', (req, res, next) => {
    // --- 1. Read required inputs from request body ---
    const strEmail = req.body.email ? req.body.email.trim().toLowerCase() : null;
    const strPassword = req.body.password;
    const strFirstName = req.body.firstName;
    const strLastName = req.body.lastName;
    const strTitle = req.body.title;
    // We DO NOT read lastLogin from req.body for registration

    // --- 2. Server-side Validations ---
    if (!strEmail) {
        return res.status(400).json({ error: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strEmail)) {
        return res
        .status(400)
        .json({ error: 'You must provide a valid email address' });
    }

    if (!strPassword) {
        return res.status(400).json({ error: 'Password is required' });
    }

    // Password complexity checks
    if (strPassword.length < 8) {
        return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/[A-Z]/.test(strPassword)) {
        return res
        .status(400)
        .json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/[a-z]/.test(strPassword)) {
        return res
        .status(400)
        .json({ error: 'Password must contain at least one lowercase letter' });
    }

    if (!/[0-9]/.test(strPassword)) {
        return res
        .status(400)
        .json({ error: 'Password must contain at least one number' });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(strPassword)) {
        return res
        .status(400)
        .json({ error: 'Password must contain at least one special character' });
    }

    if (!strFirstName || strFirstName.length < 1) {
        return res.status(400).json({ error: 'First name is required' });
    }

    if (!strLastName || strLastName.length < 1) {
        return res.status(400).json({ error: 'Last name is required' });
    }

    if (!strTitle) {
        return res.status(400).json({ error: 'User title is required' });
    }
    // --- End Validations ---

    // --- 3. Hash Password (only after validation passes) ---
    const hashedPassword = bcrypt.hashSync(strPassword, intSalt);

    // --- 4. Check if Email Exists (Fixing Race Condition) ---
    const checkEmailCommand = 'SELECT Email FROM tblUsers WHERE Email = ?';
    db.get(checkEmailCommand, [strEmail], (err, row) => {
        // Use db.get which is better for checking unique existence
        if (err) {
        console.error('Database error checking email:', err.message);
        // Don't expose detailed DB errors to client in production
        return res
            .status(500)
            .json({ status: 'error', message: 'Error checking user data.' });
        }

        // Email already exists
        if (row) {
            return res.status(400).json({ error: 'Email already exists' });
        } else {
            // --- 5. Email does NOT exist - Proceed with INSERT ---

            // Prepare the INSERT command:
            // - List columns explicitly.
            // - OMIT `account_created` so the DEFAULT CURRENT_TIMESTAMP is used.
            // - Include `last_login_date`.
            const insertCommand = `
                        INSERT INTO tblUsers
                        (email, firstname, lastname, title, password, last_login_date)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `; // 6 placeholders

            // Prepare the parameters for the INSERT command:
            // - Match the order of columns listed above.
            // - Use the hashed password.
            // - Use NULL for last_login_date.
            const params = [
                strEmail,
                strFirstName,
                strLastName,
                strTitle,
                hashedPassword, // Use the hashed password
                null, // Set last_login_date to NULL for new registration
            ]; // 6 parameters

            // Run the INSERT command
            db.run(insertCommand, params, function (insertErr) {
                // Use 'function' to access 'this.lastID' if needed later
                if (insertErr) {
                console.error('Database error inserting user:', insertErr.message);
                return res.status(400).json({
                    status: 'error',
                    // Consider a generic message in production: "Failed to create account."
                    message: 'Failed to register user: ' + insertErr.message,
                });
                } else {
                    // --- 6. Success ---
                    console.log(`User ${strEmail} created successfully.`);
                    // Send success response
                    return res.status(201).json({
                        status: 'success',
                        // You could optionally return the email or user ID (this.lastID)
                        // message: `User ${strEmail} created.`
                    });
                }
            });
        }
    });
});

app.post('/sessions', (req, res, next) => {
    const strEmail = req.body.email.trim().toLowerCase();
    const strPassword = req.body.password;

    if (!strEmail || !strPassword) {
        return res.status(400).json({ error: "You must provide an email and password" });
    }
    let strCommand = 'SELECT password, title FROM tblUsers WHERE email = ?';
    db.all(strCommand, [strEmail], (err, result) => {
        if (err) {
            console.log(err);
            res.status(400).json({ status:"error", message: err.message });
        } else {
            if (result.length === 0) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            let strTitle = result[0].title;
            let strHash = result[0].password;
            if (bcrypt.compareSync(strPassword, strHash)) {
                // ON success that the passwords match, create a new sessionid using uuid, and inthen insert into tbl sessions
                let strSessionID = uuidv4();
                let strCommand = `INSERT INTO tblSessions VALUES (?, ?, ?, ?, ?) `;
                let datNow = new Date();
                let strNow = datNow.toISOString()
                db.run(strCommand, [strSessionID, strEmail, strNow, null, 'Active'], function (err,result) {
                    if (err) {
                        console.log(err);
                        res.status(400).json({
                            status:"error", 
                            message: err.message 
                        });
                    } else {
                        res.cookie('sessionID', strSessionID, {
                            httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
                            secure: true, // Ensures the cookie is sent over HTTPS only
                            sameSite: 'Strict', // Prevents CSRF attacks by ensuring the cookie is sent only to the same site
                            maxAge: 12 * 60 * 60 * 1000 // Cookie expiration time (12 hours)
                        })
                        res.status(201).json({ status:"success", SessionID: strSessionID, title: strTitle });
                    }
                });
            } else {
                res.status(401).json({ error: "Invalid email or password" });
            }
        }
    })
}) 

function verifySession(strSessionID){
    return new Promise((resolve, reject) => {
        let strCommand = 'SELECT * FROM tblSessions WHERE SessionID = ?';
        db.all(strCommand, [strSessionID], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                if (result.length === 0) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            }
        });
    });
}