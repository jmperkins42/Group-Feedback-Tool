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

app.post('/user', (req, res, next) => {
    let strEmail = req.body.email.trim().toLowerCase();
    let strPassword = req.body.password;
    let strFirstName = req.body.firstName;
    let strLastName = req.body.lastName;
    let strTitle = req.body.title;
    let strLastLogin = req.body.lastLogin;

    // Email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strEmail)) {   
        return res.status(400).json({ error: "You must provide a valid email address" });
    }

    // Password validation based on NIST standards
    if (strPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    if (!/[A-Z]/.test(strPassword)) {
        return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
    }
    if (!/[a-z]/.test(strPassword)) {
        return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
    }
    if (!/[0-9]/.test(strPassword)) {
        return res.status(400).json({ error: "Password must contain at least one number" });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(strPassword)) {
        return res.status(400).json({ error: "Password must contain at least one special character" });
    }

    strPassword = bcrypt.hashSync(strPassword, intSalt);

    if (strFirstName.length > 1 || strLastName.length > 1) {
        return res.status(400).json({ error: "You must provide a valid first and last name" });
    }

    // Check if the email already exists in the database
    let strCommand = 'SELECT * FROM tblUsers WHERE Email = ?';
    db.all(strCommand, [strEmail], (err, result) => {
        if (err) {
            console.log(err);
            res.status(400).json({ status:"error", message: err.message });
        } else {
            if (result.length > 0) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }
    });

    // If validations pass
    strCommand = `INSERT INTO tblUsers VALUES (?, ?, ?, ?, ?, ?) `;
    db.run(strCommand, [strEmail, strFirstName, strLastName, strTitle, strPassword, strLastLogin], function (err) {
        if(err){
            console.log(err)
            res.status(400).json({
                status:"error",
                message:err.message
            })
        } else {
            res.status(201).json({
                status:"success"
            })
        }
    })
});

app.post('/sessions', (req, res, next) => {
    const strEmail = req.body.email.trim().toLowerCase();
    const strPassword = req.body.password;

    if (strEmail, strPassword == null) {
        return res.status(400).json({ error: "You must provide an email and password" });
    }
    let strCommand = 'SELECT Password FROM tblUsers WHERE Email = ?';
    db.all(strCommand, [strEmail], (err, result) => {
        if (err) {
            console.log(err);
            res.status(400).json({ status:"error", message: err.message });
        } else {
            if (result.length === 0) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            let strHash = result[0].Password;
            if (bcrypt.compareSync(strPassword, strHash)) {
                // ON success that the passwords match, create a new sessionid using uuid, and inthen insert into tbl sessions
                let strSessionID = uuidv4();
                let strCommand = `INSERT INTO tblSessions VALUES (?, ?, ?) `;
                let datNow = new Date();
                let strNow = datNow.toISOString()
                db.run(strCommand, [strSessionID, strEmail, strNow], function (err,result) {
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
                        res.status(201).json({ 
                            status:"success"
                        });
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