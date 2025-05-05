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



// SESSION N SHIT THAT NEEDS TO BE AUTHENTICATED FOR--------------------------------------------------------------------------------->

// Enhanced verifySession - resolves with user email or null
function verifySession(sessionID) {
    // Renamed parameter for clarity
    return new Promise((resolve, reject) => {
        // Select the user_id (email) associated with the session
        // Also good practice to check session status/expiry later
        const sql = 'SELECT user_id FROM tblSessions WHERE SessionID = ?';
        // Use db.get as SessionID should be unique, more efficient
        db.get(sql, [sessionID], (err, row) => {
            if (err) {
            console.error('Database error verifying session:', err.message);
            // Reject with the error for centralized handling
            reject(err);
            } else {
                if (row && row.user_id) {
                    // Session found and has a user_id, resolve with the user's email
                    resolve(row.user_id);
                } else {
                    // Session not found or invalid, resolve with null
                    resolve(null);
                }
            }
        });
    });
}
    

        // Middleware function to check for a valid session
    async function requireAuth(req, res, next) {
        // 1. Get the session ID from the cookies
        const sessionID = req.cookies.sessionID; // Requires 'cookie-parser' middleware
    
        // 2. Check if the session ID cookie exists
        if (!sessionID) {
        console.log('Auth Middleware: No sessionID cookie found.');
        // If no cookie, definitely not authenticated
        return res.status(401).json({ error: 'Authentication required.' });
        }
    
        try {
        // 3. Verify the session ID using our enhanced function
        const userEmail = await verifySession(sessionID);
    
        // 4. Check the verification result
        if (userEmail) {
            // Session is valid!
            // Attach user email to the request object for later use in route handlers
            req.userEmail = userEmail;
            console.log(`Auth Middleware: Access granted for user ${userEmail}`);
            // Proceed to the next middleware or route handler
            next();
        } else {
            // Session ID is invalid (not found in DB or expired later)
            console.log(
            `Auth Middleware: Invalid sessionID received: ${sessionID}`
            );
            // Clear the invalid cookie from the browser (optional but good practice)
            res.clearCookie('sessionID');
            return res.status(401).json({ error: 'Invalid session. Please log in again.' });
        }
        } catch (error) {
        // Handle potential errors during database verification
        console.error('Auth Middleware: Error during session verification:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
        }
    }
    
    // Apply the requireAuth middleware to all routes that need authentication
    app.use(requireAuth);
        // --- Protected Routes (Require Authentication) ---

    // Route to get courses (might not be finished)
    app.get('/courses', (req, res) => {
        // Thanks to the middleware, we know the user is authenticated
        // We can access the user's email via req.userEmail
        const strEmail = req.email;
        const sql = 'SELECT * FROM tblCourses WHERE instructor_email = ?';
    
        // fetch courses for loggedInUserEmail
        db.all(sql, [strEmail], (err, result) => {
            if (err) {
                console.error('Database error fetching courses:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result || result.length === 0) {
                return res.status(400).json({ error: 'No courses found for this user' })
            }
            // If courses are found, send them back to the client
            res.status(201).json({
                courses: result
            })
        })
    });
    
    // Route to add a course (might not be finished)
    app.post('/courses', (req, res) => {
        const strEmail = req.userEmail; // Get the user's email from the request object
        const strCourseName = req.body.coursename; // Get data from request body
        const strCourseNumber = req.body.course_number; // Get data from request body
        let strSectionNumber = null; // Initialize section number
        // get a count of courses with that course_number to determine the section number
        const sqlCount = 'SELECT COUNT(*) as count FROM tblCourses WHERE course_number = ?';
        db.get(sqlCount, [strCourseNumber], (err, row) => {
            if (err) {
                console.error('Database error counting courses:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If no courses found, set section number to 1
            let sectionNumber = row.count > 0 ? row.count + 1 : 1;
            // Now we can insert the course
            strSectionNumber = sectionNumber;
        })
        // need to fix the db to include everything here
        const sqlCourses = `INSERT INTO tblCourses 
                (coursename, course_number, section_number, term_code, start_date, end_date, number_of_groups) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
        
        db.run(sqlCourses, [strCourseName, strCourseNumber, strSectionNumber, null, null, null], function (err) {
            if (err) {
                console.error('Database error inserting course:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If the course is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Course '${strCourseName}' added.` });
        });
        const sqlEnrollments = `INSERT INTO tblEnrollments
                (course_id, user_email, role) 
                VALUES (?, ?, ?)
                `;
        // Use the course ID from the last inserted row
        const courseID = this.lastID; // Use 'this' to access the last inserted ID
        db.run(sqlEnrollments, [courseID, strEmail, 'Instructor'], function (err) {
            if (err) {
                console.error('Database error inserting enrollment:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If the enrollment is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Enrollment for course '${strCourseName}' added.` });
        })
    });
    
    // Route to get students (might not be finished)
    app.get('/students', (req, res) => {
        const strCourseID = req.query.courseID; // Get course ID from query parameters
        const sql = 'SELECT * FROM tblEnrollments WHERE course_id = ?';
    
        // fetch students for loggedInUserEmail
        db.all(sql, [strCourseID], (err, result) => {
            if (err) {
                console.error('Database error fetching students:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result) {
                return res.status(400).json({ error: 'No students found for this course' })
            }
            // If students are found, send them back to the client
            res.status(201).json({
                students: result
            })
        })
    });

    // Route to add a student (might not be finished)
    app.post('/students', (req, res) => {
        const strCourseID = req.body.courseID; // Get course ID from request body
        const strEmail = req.body.email; // Get student email from request body
        const sql = `INSERT INTO tblEnrollments 
                (course_id, student_email, role) 
                VALUES (?, ?, ?)
                `;
        db.run(sql, [strCourseID, strEmail, 'Student'], function (err) {
            if (err) {
                console.error('Database error inserting student:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If the student is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Student '${strEmail}' added to course '${strCourseID}'.` });
        })
    });

    // Route to get course groups (might not be finished)
    app.get('/groups', (req, res) => {
        const strCourseID = req.query.courseID; // Get course ID from query parameters
        const sql = 'SELECT * FROM tblGroups WHERE course_id = ?';
    
        // fetch groups for loggedInUserEmail
        db.all(sql, [strCourseID], (err, result) => {
            if (err) {
                console.error('Database error fetching groups:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result) {
                return res.status(400).json({ error: 'No groups found for this course' })
            }
            // If groups are found, send them back to the client
            res.status(201).json({
                groups: result
            })
        })
    });

    // Route to add a course group (might not be finished)
    app.post('/groups', (req, res) => {
        const strCourseID = req.body.courseID; // Get course ID from request body
        const strGroupName = req.body.groupName; // Get group name from request body
        const sql = `INSERT INTO tblGroups 
                (course_id, group_name) 
                VALUES (?, ?)
                `;
        db.run(sql, [strCourseID, strGroupName], function (err) {
            if (err) {
                console.error('Database error inserting group:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If the group is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Group '${strGroupName}' added to course '${strCourseID}'.` });
        })
    });

    // Route to get group members (might not be finished)
    app.get('/groupmembers', (req, res) => {
        const strGroupID = req.query.groupID; // Get group ID from query parameters
        const sql = 'SELECT * FROM tblGroupMembers WHERE group_id = ?';
    
        // fetch group members for loggedInUserEmail
        db.all(sql, [strGroupID], (err, result) => {
            if (err) {
                console.error('Database error fetching group members:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result) {
                return res.status(400).json({ error: 'No group members found for this group' })
            }
            // If group members are found, send them back to the client
            res.status(201).json({
                groupMembers: result
            })
        })
    });

    // Route to add group members (might not be finished)
    app.post('/groupmembers', (req, res) => {
        const strGroupID = req.body.groupID; // Get group ID from request body
        const strEmail = req.body.email; // Get student email from request body
        const sql = `INSERT INTO tblGroupMembers 
                (group_id, user_id) 
                VALUES (?, ?)
                `;
        db.run(sql, [strGroupID, strEmail], function (err) {
            if (err) {
                console.error('Database error inserting group member:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            // If the group member is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Student '${studentEmail}' added to group '${groupID}'.` });
        })
    });

    // Route to get assessments (might not be finished)
    app.get('/assessments', (req, res) => {
        const strGroupID = req.query.groupID; // Get group ID from query parameters
        const sql = 'SELECT * FROM tblFeedback WHERE group_id = ?';
    
        // fetch feedback for loggedInUserEmail
        db.all(sql, [strGroupID], (err, result) => {
            if (err) {
                console.error('Database error fetching feedback:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result) {
                return res.status(400).json({ error: 'No feedback found for this group' })
            }
            // If feedback is found, send it back to the client
            res.status(201).json({
                feedback: result
            })
        })
    });

    // Need to add the rest, im just doing this at 3am so im gts
    
    // Add other protected routes here (e.g., GET /students, POST /teams, etc.)

    
    // --- Error Handling and Server Start (Keep these at the end) ---
    app.use((req, res, next) => {
        // 404 Handler for routes not matched above
        res.status(404).json({ message: 'Resource not found' });
    });
    
    app.use((err, req, res, next) => {
        // General Error Handler
        console.error(err.stack);
        res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        });
    });
    
    app.listen(HTTP_PORT, () => {
        console.log(`Server running on http://localhost:${HTTP_PORT}`);
    });