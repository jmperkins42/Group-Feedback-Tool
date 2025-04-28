-- Users Table
CREATE TABLE tblUsers (
    email VARCHAR(255) PRIMARY KEY,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    title VARCHAR(50),
    password VARCHAR(255), -- hashed password
    last_login_date DATETIME,
    account_created DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE tblCourses (
    id SERIAL PRIMARY KEY,
    coursename VARCHAR(255),
    course_number VARCHAR(50),
    section_number VARCHAR(50),
    term_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    number_of_groups INT
);

-- Enrollments Table
CREATE TABLE tblEnrollments (
    course_id INT,
    user_email VARCHAR(255),
    role VARCHAR(50),
    PRIMARY KEY(course_id, user_email),
    FOREIGN KEY(course_id) REFERENCES tblCourses(id),
    FOREIGN KEY(user_email) REFERENCES tblUsers(email)
);

-- Socials Table
CREATE TABLE tblSocials (
    user_email VARCHAR(255) PRIMARY KEY,
    social_type VARCHAR(50),
    username VARCHAR(255),
    FOREIGN KEY(user_email) REFERENCES tblUsers(email)
);

-- Phone Table
CREATE TABLE tblPhone (
    id SERIAL PRIMARY KEY,
    nation_code VARCHAR(5),
    area_code VARCHAR(5),
    phone_number VARCHAR(20),
    status VARCHAR(20) NULL,
    user_email VARCHAR(255),
    FOREIGN KEY(user_email) REFERENCES tblUsers(email)
);

-- Assessments Table
CREATE TABLE tblAssessments (
    id SERIAL PRIMARY KEY,
    course_id INT,
    name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    type VARCHAR(50),
    FOREIGN KEY(course_id) REFERENCES tblCourses(id)
);

-- Assessment Questions Table
CREATE TABLE tblAssessmentQuestions (
    id SERIAL PRIMARY KEY,
    assessment_id INT,
    question_narrative TEXT,
    helper_text TEXT,
    question_type VARCHAR(50),
    options TEXT,
    FOREIGN KEY(assessment_id) REFERENCES tblAssessments(id)
);

-- Assessment Responses Table
CREATE TABLE tblAssessmentResponses (
    id SERIAL PRIMARY KEY,
    assessment_id INT,
    user_id VARCHAR(255),
    question_id INT,
    response TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    target_user_id VARCHAR(255),
    status VARCHAR(50),
    FOREIGN KEY(assessment_id) REFERENCES tblAssessments(id),
    FOREIGN KEY(user_id) REFERENCES tblUsers(email),
    FOREIGN KEY(question_id) REFERENCES tblAssessmentQuestions(id),
    FOREIGN KEY(target_user_id) REFERENCES tblUsers(email)
);

-- Course Groups Table
CREATE TABLE tblCourseGroups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(255),
    course_id INT,
    FOREIGN KEY(course_id) REFERENCES tblCourses(id)
);

-- Group Members Table
CREATE TABLE tblGroupMembers (
    group_id INT,
    user_id VARCHAR(255),
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES tblCourseGroups(group_id),
    FOREIGN KEY(user_id) REFERENCES tblUsers(email)
);

-- Sessions Table
CREATE TABLE tblSessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    start_datetime DATETIME,
    last_used_time DATETIME,
    status VARCHAR(50),
    FOREIGN KEY(user_id) REFERENCES tblUsers(email)
);

-- Logs Table
CREATE TABLE tblLogs (
    id SERIAL PRIMARY KEY,
    description TEXT,
    type VARCHAR(50),
    log_datetime DATETIME DEFAULT CURRENT_TIMESTAMP
);
