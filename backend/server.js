/*
    good grade pls we tried
*/


const express = require('express')
const cors = require('cors')
const {v4: uuidv4} = require('uuid')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const intSalt = 10

const dbSource = "backend/feedbacktool.db"
const HTTP_PORT = 8000
const db = new sqlite3.Database(dbSource)

var app = express()
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Replace with your frontend origin
    credentials: true // Allow cookies
}));
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
                let strCommand = `INSERT INTO tblSessions VALUES (?, ?, ?, ?, ?, ?)`;
                let datNow = new Date();
                let strNow = datNow.toISOString()
                let datLater = new Date(datNow.getTime() + 12 * 60 * 60 * 1000); // Add 12 hours
                let strLater = datLater.toISOString();
                db.run(strCommand, [strSessionID, strEmail, strNow, strLater, null, 'Active'], function (err,result) {
                    if (err) {
                        console.log(err);
                        res.status(400).json({
                            status:"error", 
                            message: err.message 
                        });
                    } else {
                        res.cookie('sessionID', strSessionID, {
                            httpOnly: true,
                            secure: false, // <--- allow over HTTP for localhost testing
                            sameSite: 'Strict',
                            maxAge: 12 * 60 * 60 * 1000
                        });
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
        const sql = 'SELECT user_id FROM tblSessions WHERE id = ?';
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

    // Route to get courses
    app.get('/courses', (req, res) => {
        const strEmail = req.userEmail;
        const sql = 'SELECT * FROM tblCourses INNER JOIN tblEnrollments WHERE tblCourses.id == tblEnrollments.course_id AND tblEnrollments.user_email = ?';
    
        // fetch courses for user
        db.all(sql, [strEmail], (err, result) => {
            if (err) {
                console.error('Database error fetching courses:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!result || result.length === 0) {
                return res.status(400).json({ error: 'No courses found for this user' })
            }
            // If courses are found, send them back to the client
            res.status(200).json({
                courses: result
            })
        })
    });
    
    // Route to add a course
    app.post('/courses', (req, res) => {
        const strEmail = req.userEmail;
        const strCourseName = req.body.courseName;
        const strCourseID = uuidv4();
        const strEnrollmentID = uuidv4();

        // Inserts a course
        const strInsertCourses = `INSERT INTO tblCourses VALUES (?, ?, ?, ?, ?)`;
        db.run(strInsertCourses, [strCourseID, strCourseName, null, null, null], function (err) {
            if (err) {
                console.error('Database error inserting course:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }

            // Inserts an enrollment with an instructor
            const strInsertEnrollments = `INSERT INTO tblEnrollments (id, course_id, user_email, role) VALUES (?, ?, ?, ?)`;
            db.run(strInsertEnrollments, [strEnrollmentID, strCourseID, strEmail, 'Instructor'], function (err) {
                if (err) {
                    console.error('Database error inserting enrollment:', err.message);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                // If the enrollment is added successfully, send a success response
                res.status(201).json({ status: 'success', message: `Course ${strCourseName} created and instructor enrolled.` });
            })
        });
    });
    
    // Route to get students
    app.get('/students', (req, res, next) => {
        const strCourseID = req.query.courseID; // Get course ID from query parameters
        const sql = 'SELECT tblEnrollments.user_email, tblUsers.firstname, tblUsers.lastname FROM tblEnrollments JOIN tblUsers ON tblEnrollments.user_email = tblUsers.email WHERE tblEnrollments.course_id = ?';
    
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
            res.status(200).json({ students: result })
        })
    });

// Route to add a student
app.post('/students', (req, res) => {
    const strCourseID = req.body.courseID;
    const strEmail = req.body.email;
    const strEnrollmentID = uuidv4();

    const strSelectStudent = 'SELECT email FROM tblUsers WHERE email = ?';
    db.get(strSelectStudent, [strEmail], (err, row) => {
        if (err) {
            console.error('Database error checking user existence:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(400).json({ error: `User '${strEmail}' does not exist. Please have them register first.` });
        }
        
        const strInsertStudent = `INSERT INTO tblEnrollments (id, course_id, user_email, role) VALUES (?, ?, ?, ?)`;
        db.run(strInsertStudent, [strEnrollmentID, strCourseID, strEmail, 'Student'], function (err) {
            if (err) {
                console.error('Database error inserting student:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }

            // If the student is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Student '${strEmail}' added to course '${strCourseID}'.` });
        })
    })
});

    // Route to get course groups
    app.get('/groups', (req, res, next) => {
        const strCourseID = req.query.courseID; // Get course ID from query parameters
        const sql = 'SELECT * FROM tblCourseGroups WHERE course_id = ?';
    
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
            res.status(200).json({
                groups: result
            })
        })
    });

// Route to add a course group
app.post('/groups', (req, res, next) => {
    const strCourseID = req.body.courseID;
    const strGroupName = req.body.groupName;
    const strGroupID = uuidv4();

    const strInsertGroup = `INSERT INTO tblCourseGroups VALUES (?, ?, ?)`;
    db.run(strInsertGroup, [strGroupID, strGroupName, strCourseID], function (err) {
        if (err) {
            console.error('Database error inserting group:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // If the group is added successfully, send a success response
        res.status(201).json({ status: 'success', groupID: strGroupID, message: `Group '${strGroupName}' added to course '${strCourseID}'.` });
    })
});

    // Route to get group members
    app.get('/groupmembers', (req, res, next) => {
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
            res.status(200).json({
                groupMembers: result
            })
        })
    });

    // Route to add group members
    app.post('/groupmembers', (req, res, next) => {
        const strGroupID = req.body.groupID;
        const strEmail = req.body.email;

        const strInsertMembers = `INSERT INTO tblGroupMembers VALUES (?, ?)`;
        db.run(strInsertMembers, [strGroupID, strEmail], function (err) {
            if (err) {
                console.error('Database error inserting group member:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }

            // If the group member is added successfully, send a success response
            res.status(201).json({ status: 'success', message: `Student '${strEmail}' added to group '${strGroupID}'.` });
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

// Endpoint to Create an Assessment (Review)
app.post('/assessments', async (req, res) => {
    // Data from frontend (validated client-side, but re-validate here)
    const { course_id, title, questions, status, type } = req.body;
    const userEmail = req.userEmail; // From requireAuth middleware

    // --- Server-side Validation ---
    if (!course_id || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields: course_id, title, and at least one question are required.' });
    }
    if (!title.trim()) {
        return res.status(400).json({ status: 'error', message: 'Review title cannot be empty.' });
    }
    for (const q of questions) {
        if (!q.type || !q.text || !q.text.trim()) {
            return res.status(400).json({ status: 'error', message: 'Each question must have a type and non-empty text.' });
        }
        // Add validation for options if implementing MC/Likert later
    }
    // Basic validation for status and type (optional, depends on requirements)
    const validStatus = ['Draft', 'Active', 'Closed']; // Example valid statuses
    const validTypes = ['Individual', 'Team', 'Self']; // Example valid types
    const assessmentStatus = status && validStatus.includes(status) ? status : 'Active'; // Default to Active
    const assessmentType = type && validTypes.includes(type) ? type : 'Individual'; // Default to Individual

    // --- Database Interaction ---
    // Use db.serialize to ensure sequential execution for the transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;', (err) => {
            if (err) {
                console.error('Begin Transaction Error:', err.message);
                return res.status(500).json({ status: 'error', message: 'Database error starting transaction.' });
            }
        });

        // 1. Insert into tblAssessments
        // Note: Using AUTOINCREMENT means we don't provide the ID.
        // Note: Assuming start_date/end_date are nullable or handled elsewhere
        const assessmentSql = `
            INSERT INTO tblAssessments (course_id, name, status, type, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        // Use current date as placeholder for start/end dates if needed, or NULL
        const startDate = null; // Or new Date().toISOString().split('T')[0];
        const endDate = null;

        // Use function() to access this.lastID
        db.run(assessmentSql, [course_id, title.trim(), assessmentStatus, assessmentType, startDate, endDate], function(assessmentErr) {
            if (assessmentErr) {
                console.error('Insert Assessment Error:', assessmentErr.message);
                db.run('ROLLBACK;'); // Rollback on error
                return res.status(500).json({ status: 'error', message: 'Failed to create assessment record.' });
            }

            const assessmentId = this.lastID; // Get the ID of the inserted assessment

            // 2. Insert into tblAssessmentQuestions
            const questionSql = `
                INSERT INTO tblAssessmentQuestions (assessment_id, question_narrative, question_type, helper_text, options)
                VALUES (?, ?, ?, ?, ?)
            `;
            let questionInsertError = null;
            let questionsInserted = 0;

            // Prepare statement for efficiency if inserting many questions (optional but good practice)
            const stmt = db.prepare(questionSql, (prepErr) => {
                if (prepErr) {
                    questionInsertError = prepErr;
                }
            });

            if (questionInsertError) {
                console.error('Prepare Question Statement Error:', questionInsertError.message);
                db.run('ROLLBACK;');
                return res.status(500).json({ status: 'error', message: 'Database error preparing questions.' });
            }

            // Loop and run the prepared statement
            for (const question of questions) {
                // For now, helper_text and options are null. Adjust if needed.
                // If options are sent, stringify them: JSON.stringify(question.options)
                stmt.run([assessmentId, question.text.trim(), question.type, null, null], function(questionErr) {
                    if (questionErr) {
                        questionInsertError = questionErr; // Capture the first error
                        // Stop processing further questions on error
                        return;
                    }
                    questionsInserted++;
                });
                if (questionInsertError) break; // Exit loop if an error occurred
            }

            // Finalize the statement after the loop
            stmt.finalize((finalizeErr) => {
                if (finalizeErr) {
                    // Log this error, but the main error handling is below
                    console.error('Finalize Question Statement Error:', finalizeErr.message);
                     if (!questionInsertError) questionInsertError = finalizeErr; // Capture if no other error happened
                }

                // 3. Commit or Rollback based on question insertion results
                if (questionInsertError) {
                    console.error('Insert Question Error:', questionInsertError.message);
                    db.run('ROLLBACK;');
                    return res.status(500).json({ status: 'error', message: 'Failed to insert one or more questions.' });
                } else {
                    db.run('COMMIT;', (commitErr) => {
                        if (commitErr) {
                            console.error('Commit Transaction Error:', commitErr.message);
                            // Attempt rollback just in case commit failed mid-way (though unlikely)
                            db.run('ROLLBACK;');
                            return res.status(500).json({ status: 'error', message: 'Database error committing transaction.' });
                        } else {
                            // --- Success ---
                            console.log(`Assessment ${assessmentId} created successfully for course ${course_id} by ${userEmail}`);
                            return res.status(201).json({
                                status: 'success',
                                message: 'Assessment created successfully.',
                                assessmentId: assessmentId
                            });
                        }
                    });
                }
            }); // End stmt.finalize
        }); // End db.run for assessment insert
    }); // End db.serialize
});


























// logout route
app.post('/logout', async (req, res) => {
    const sessionID = req.cookies.sessionID;

    if (!sessionID) {
        return res.status(400).json({ error: 'No session to log out from.' });
    }

    const sql = 'UPDATE tblSessions SET status = "Inactive", end_date = ? WHERE SessionID = ?';
    const endDate = new Date().toISOString();

    db.run(sql, [endDate, sessionID], function (err) {
        if (err) {
            console.error('Database error ending session:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.clearCookie('sessionID');
        res.status(200).json({ message: 'Logged out successfully.' });
    });
});




    app.listen(HTTP_PORT, () => {
        console.log(`Server running on port ${HTTP_PORT}`);
    });