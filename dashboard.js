    // THIS IS FOR TEACHER DASHBOARD PAGE DASHBOARD.HTML

    // Start Global Variables
    const regEmail =
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    const strBaseURL = "http://127.0.0.1:8000/"; // testing URL
    // End Global Variables


    function loadStudents(courseID) {
        fetch(strBaseURL + `students?courseID=${courseID}`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('studentsTableBody');
            tbody.innerHTML = ''; // Clear existing rows
            data.students.forEach((student, index) => {
                const strFullName = `${student.firstname} ${student.lastname}`;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${strFullName || 'N/A'}</td>
                    <td>${student.user_email}</td>
                    <td>${student.grade || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(err => {
            console.error('Error loading students:', err);
        });
    }

    // Event listener for the "Create Review" button in the modal
    document.querySelector("#btnCreateReview").addEventListener("click", async function () {
        const reviewTitle = document.querySelector("#txtReviewTitle").value.trim();
        const questionRows = document.querySelectorAll("#tblQuestions tbody tr");
        const questions = [];
        let validationError = false;
        let errorMessage = "";

        // Make sure we have a course ID
        if (!strCurrentCourseID) {
            Swal.fire('Error', 'Cannot create review. Please select a course first.', 'error');
            return;
        }

        if (!reviewTitle) {
            Swal.fire("Warning", "Please enter a Review Title.", "warning");
            return;
        }

        questionRows.forEach((row, index) => {
            const typeSelect = row.querySelector(".question-type");
            const textInput = row.querySelector(".question-text");
            const optionsInput = row.querySelector(".question-options");

            const questionType = typeSelect ? typeSelect.value : "Unknown";
            const questionText = textInput ? textInput.value.trim() : "";
            let questionOptions = null;

            if (!textInput || !questionText) {
                validationError = true;
                errorMessage += `<p>Question ${index + 1} text cannot be empty.</p>`;
                return;
            }

            if (questionType === "Multiple Choice" || questionType === "Likert") {
                if (!optionsInput || !optionsInput.value.trim()) {
                    validationError = true;
                    errorMessage += `<p>Question ${index + 1} ('${questionType}') requires options. Please enter one option per line.</p>`;
                } else {
                    const optionsArray = optionsInput.value
                        .split("\n")
                        .map((opt) => opt.trim())
                        .filter((opt) => opt !== "");
                    if (optionsArray.length < 2) {
                        validationError = true;
                        errorMessage += `<p>Question ${index + 1} ('${questionType}') requires at least two valid options.</p>`;
                    } else {
                        questionOptions = JSON.stringify(optionsArray);
                    }
                }
            }

            if (questionText) {
                questions.push({
                    type: questionType,
                    text: questionText,
                    options: questionOptions,
                });
            }
        });

        if (validationError) {
            Swal.fire({
                icon: "error",
                title: "Validation Errors",
                html: errorMessage,
            });
            return;
        }

        if (questions.length === 0 && !validationError) {
            Swal.fire("Warning", "Please add at least one valid question.", "warning");
            return;
        }

        const reviewData = {
            course_id: strCurrentCourseID, // This was the key missing piece
            title: reviewTitle,
            questions: questions,
            status: "Active",
            type: "Individual",
        };

        console.log("Sending review data:", reviewData);

        try {
            const response = await fetch(strBaseURL + "assessments", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reviewData),
            });

            if (!response.ok) {
                let errorMsg = `HTTP Error: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorMsg = errorResult.message || errorResult.error || errorMsg;
                } catch (e) {
                    errorMsg = response.statusText || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();

            if (result.status === "success") {
                Swal.fire({
                    icon: "success",
                    title: "Review Created!",
                    text: `Review "${reviewTitle}" has been created successfully.`,
                });
                clearCreateReviewModal();
                const reviewModalEl = document.getElementById("createReviewModal");
                if (reviewModalEl) {
                    bootstrap.Modal.getInstance(reviewModalEl)?.hide();
                }
            } else {
                throw new Error(result.message || "Review creation failed.");
            }
        } catch (error) {
            console.error("Error creating review:", error);
            Swal.fire({
                icon: "error",
                title: "Creation Failed",
                text: error.message || "Could not create the review. Please try again.",
            });
        }
    });

    // Initialize DataTables for Students and Teams tables
    $(document).ready(function () {
    $("#tblStudents").DataTable({
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        lengthChange: true,
    });
    $("#tblTeams").DataTable({
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        lengthChange: true,
    });
    $("#tblReviews").DataTable({
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        lengthChange: true,
    });
    });


    document.addEventListener('DOMContentLoaded', () => {
        fetch(strBaseURL + 'courses', {
            method: 'GET',
            credentials: 'include'
        }).then(res => {
            if (!res.ok) {
                throw new Error('Failed to fetch courses.');
            }

            return res.json();
        }).then(data => {
            const container = document.querySelector('#divCourseCards .row');
            data.courses.forEach((course, index) => {
                const card = document.createElement('div');
                card.className = 'col';
                card.innerHTML = `
                    <div class="card h-100 shadow-lg">
                        <div class="card-body">
                            <h5 class="card-title">${course.coursename}</h5>
                            <p class="card-text">No description yet.</p>
                            <button class="btn btn-primary btn-view-course-details" data-id="${course.id}">View Details</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);

                // Handle "View Details" button click
                document.querySelectorAll('.btn-view-course-details').forEach(button => {
                    button.addEventListener('click', () => {
                        const courseID = button.getAttribute('data-id');
                        strCurrentCourseID = courseID;

                        const courseCard = button.closest('.card');
                        const courseName = courseCard.querySelector('.card-title').textContent;
                        const courseDescription = courseCard.querySelector('.card-text').textContent;

                        // Populate course details
                        document.getElementById('courseName').textContent = courseName;
                        document.getElementById('courseDescription').textContent = courseDescription;
                        loadStudents(courseID);

                        // Hide dashboard and show course details view
                        document.getElementById('divCourseCards').classList.add('d-none');
                        document.getElementById('courseDetailsView').classList.remove('d-none');
                    });
                });
            });
        })
        .catch(err => {
            console.error('Error loading courses:', err);
        });
    });

    // Show password fields when "Change Password" button is clicked
    document.getElementById("btnChangePassword").addEventListener("click", () => {
    const passwordFields = document.getElementById("passwordFields");
    if (passwordFields.style.display === "none") {
        passwordFields.style.display = "block";
    } else {
        passwordFields.style.display = "none";
    }
    });

    // Edit Student Grade autofill
    document.querySelectorAll("#tblStudents .btn-light").forEach((button) => {
    button.addEventListener("click", () => {
        const row = button.closest("tr");
        const studentName = row.cells[1].textContent;
        const studentGrade = row.cells[3].textContent;

        document.getElementById("editStudentName").value = studentName;
        document.getElementById("editStudentGrade").value = studentGrade;
    });
    });

    // Edit Team Modal autofill and functionality
    document.querySelectorAll(".btn-edit-team").forEach((button) => {
    button.addEventListener("click", () => {
        const row = button.closest("tr");
        const teamName = row.cells[1].textContent;
        const teamMembers = row.cells[2].textContent.split(", ");

        document.getElementById("editTeamName").value = teamName;

        // Clear existing members
        const tableBody = document.querySelector("#tblEditTeamMembers tbody");
        tableBody.innerHTML = "";

        // Populate team members
        teamMembers.forEach((member) => {
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
                    <td><input type="text" class="form-control" value="${member}" required></td>
                    <td><input type="email" class="form-control" placeholder="Enter member email" required></td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger btnRemoveMember">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </td>
                `;
        tableBody.appendChild(newRow);

        // Add event listener to the remove button
        newRow.querySelector(".btnRemoveMember").addEventListener("click", () => {
            newRow.remove();
        });
        });
    });
    });

    // Add Team Member in Edit Team Modal
    document
    .getElementById("btnEditAddTeamMember")
    .addEventListener("click", () => {
        const tableBody = document.querySelector("#tblEditTeamMembers tbody");
        const newRow = document.createElement("tr");

        newRow.innerHTML = `
                <td><input type="text" class="form-control" placeholder="Enter member name" required></td>
                <td><input type="email" class="form-control" placeholder="Enter member email" required></td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger btnRemoveMember">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </td>
            `;

        tableBody.appendChild(newRow);

        // Add event listener to the remove button
        newRow.querySelector(".btnRemoveMember").addEventListener("click", () => {
        newRow.remove();
        });
    });

    // Handle "View Details" button click
    document.querySelectorAll(".btn-view-course-details").forEach((button) => {
    button.addEventListener("click", () => {
        const courseCard = button.closest(".card");
        const courseName = courseCard.querySelector(".card-title").textContent;
        const courseDescription =
        courseCard.querySelector(".card-text").textContent;

        // Populate course details
        document.getElementById("courseName").textContent = courseName;
        document.getElementById("courseDescription").textContent =
        courseDescription;

        // Hide dashboard and show course details view
        document.getElementById("divCourseCards").classList.add("d-none");
        document.getElementById("courseDetailsView").classList.remove("d-none");
    });
    });

    // Back to Dashboard button
    document.getElementById("backToDashboard").addEventListener("click", () => {
    document.getElementById("courseDetailsView").classList.add("d-none");
    document.getElementById("divCourseCards").classList.remove("d-none");
    });

    // Add New Course Form Submission
    // Add New Course Form Submission
    document.getElementById('btnAddNewCourse').addEventListener('click', () => {
        const strCourseName = document.getElementById('courseNameInput').value;
        const strCourseDescription = document.getElementById('courseDescriptionInput').value;

        // Validate form inputs
        if (strCourseName && strCourseDescription) {
            fetch(strBaseURL + 'courses', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseName: strCourseName,
                    courseDescription: strCourseDescription
                })
            })
            // Then show success message
            Swal.fire({
                icon: 'success',
                title: 'Course Added',
                text: `Course "${strCourseName}" has been added successfully!`,
            });

            // Reset form and close modal
            document.getElementById('addCourseForm').reset();
            const addCourseModal = bootstrap.Modal.getInstance(document.getElementById('addCourseModal'));
            addCourseModal.hide();
        } else {
            // Show error message
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please fill in all fields.',
            });
        }
    });

    // Add Team Member Button Click (in Create Team Modal)
    document.getElementById("btnAddTeamMember").addEventListener("click", () => {
    const tableBody = document.querySelector("#tblTeamMembers tbody");
    const newRow = document.createElement("tr");

    newRow.innerHTML = `
            <td><input type="text" class="form-control" placeholder="Enter member name" required></td>
            <td><input type="email" class="form-control" placeholder="Enter member email" required></td>
            <td>
                <button type="button" class="btn btn-sm btn-danger btnRemoveMember">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </td>
        `;

    tableBody.appendChild(newRow);

    // Add event listener to the remove button
    newRow.querySelector(".btnRemoveMember").addEventListener("click", () => {
        newRow.remove();
    });
    });

    // --- START: Corrected Add Question Logic ---

    // Helper function to show/hide options based on question type
    function handleQuestionTypeChange(event) {
    const selectElement = event.target;
    // Find the closest ancestor row (tr)
    const row = selectElement.closest("tr");
    if (!row) return; // Should not happen, but safety check
    // Find the options textarea *within that specific row*
    const optionsTextarea = row.querySelector(".question-options");
    if (!optionsTextarea) return; // Safety check

    // Show options only for Multiple Choice and Likert
    if (
        selectElement.value === "Multiple Choice" ||
        selectElement.value === "Likert"
    ) {
        optionsTextarea.style.display = "block";
    } else {
        optionsTextarea.style.display = "none";
    }
    }

    // Add Question Button Click (in Create Review Modal)
    document.getElementById("btnAddQuestion").addEventListener("click", () => {
    const tableBody = document.querySelector("#tblQuestions tbody");
    const newRow = document.createElement("tr");

    // Use innerHTML for easier structure, but ensure classes are correct
    newRow.innerHTML = `
            <td>
                <select class="form-select question-type"> <!-- Added 'question-type' class -->
                    <option value="Text">Text</option> <!-- Changed values to match validation -->
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="Likert">Likert</option>
                    <option value="Numeric">Numeric Scale (1-10)</option>
                </select>
            </td>
            <td>
                <!-- Using textarea for potentially longer questions -->
                <textarea class="form-control question-text" placeholder="Enter question text" rows="2" required></textarea> <!-- Added 'question-text' class -->
                <!-- Textarea for options, hidden by default -->
                <textarea class="form-control question-options" placeholder="Enter options, one per line" rows="3" style="display: none; margin-top: 5px;"></textarea> <!-- Added 'question-options' class -->
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-danger btnRemoveQuestion">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </td>
        `;

    tableBody.appendChild(newRow);

    // Add event listener to the *newly created* select element for this row
    const newSelect = newRow.querySelector(".question-type");
    if (newSelect) {
        newSelect.addEventListener("change", handleQuestionTypeChange);
    }

    // Add event listener to the *newly created* remove button for this row
    const removeButton = newRow.querySelector(".btnRemoveQuestion");
    if (removeButton) {
        removeButton.addEventListener("click", () => {
        newRow.remove();
        });
    }
    });

    // --- END: Corrected Add Question Logic ---

    // logout button functionality
    document.getElementById("btnLogout").addEventListener("click", () => {
    Swal.fire({
        title: "Are you sure?",
        text: "You will be logged out.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, log me out!",
    }).then((result) => {
        if (result.isConfirmed) {
        // Perform logout action here
        fetch(strBaseURL + "/logout", {
            // Ensure this endpoint is correct
            method: "POST",
            credentials: "include",
            headers: {
            "Content-Type": "application/json",
            // Add any necessary CSRF token headers if required by your backend
            },
        })
            .then((response) => {
            if (response.ok) {
                // Logout successful, redirect to login page
                Swal.fire("Logged Out!", "You have been logged out.", "success");
                // Add a small delay before redirecting
                setTimeout(() => {
                window.location.href = "index.html"; // Redirect to your login page
                }, 1500);
            } else {
                // Handle logout error
                response.json().then((data) => {
                Swal.fire({
                    icon: "error",
                    title: "Logout Failed",
                    text: data.message || "Please try again.",
                });
                });
            }
            })
            .catch((error) => {
            console.error("Logout network error:", error);
            Swal.fire({
                icon: "error",
                title: "Logout Failed",
                text: "Could not connect to the server. Please try again.",
            });
            });
        }
    });
    });

    // Add a function to clear the create review modal (called on successful creation)
    function clearCreateReviewModal() {
    document.getElementById("txtReviewTitle").value = "";
    const questionsTbody = document.querySelector("#tblQuestions tbody");
    questionsTbody.innerHTML = ""; // Clear all added questions
    // You might want to reset other fields if necessary
    }

