/*

DISCLAIMER:
This is transplanted code, some of which is probably not realistic
Feel free to delete stuff if it doesn't make sense to have

*/

// Start Global Variables
const regEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/

// End Global Variables



// Check if already logged in 
// if (sessionStorage.getItem('SessionID')){
//     document.querySelector('#frmLogin').style.display = 'none'
//     document.querySelector('#divDashboard').style.display = 'block'
// }
//End check if already logged in


// Start click handlers

// click event for btnSwapLogin to hide frmChooseRole and show frmLogin
document.querySelector('#btnBackToLogin').addEventListener('click', function(){
    document.querySelector('#frmChooseRole').style.display = 'none'
    document.querySelector('#frmLogin').style.display = 'block'
})

// click event for btnSwapRegister to hide frmLogin and show frmRegister
document.querySelector('#btnSwapRegister').addEventListener('click', function(){
    document.querySelector('#frmLogin').style.display = 'none'
    document.querySelector('#frmChooseRole').style.display = 'block'
})

// click event for btnSwapLogin to hide frmRegister and show frmLogin
document.querySelector('#btnSwapLoginTop').addEventListener('click', function(){
    document.querySelector('#frmStudentRegister').style.display = 'none'
    document.querySelector('#frmLogin').style.display = 'block'
})

document.querySelector('#btnSwapLoginBottom').addEventListener('click', function(){
    document.querySelector('#frmStudentRegister').style.display = 'none'
    document.querySelector('#frmLogin').style.display = 'block'
})

// click event for Student Registration
document.querySelector('#btnStudent').addEventListener('click', function(){
    document.querySelector('#frmChooseRole').style.display = 'none'
    document.querySelector('#frmStudentRegister').style.display = 'block'
})

// click event for Instructor Registration
document.querySelector('#btnInstructor').addEventListener('click', function(){
    document.querySelector('#frmChooseRole').style.display = 'none'
    document.querySelector('#frmInstructorRegister').style.display = 'block'
})


// click event for btnLogin
document.querySelector('#btnLogin').addEventListener('click', function(){
    // async function createSession(strUserEmail,strUserPassword){
    //     try{
    //         const objResponse = await fetch(strBaseURL + 'sessions.php',{
    //             method:'POST',
    //             headers: {
    //                 'Content-Type':'application/json'
    //             },
    //             //makes json object a string
    //             body: JSON.stringify({Email:strUserEmail,Password:strUserPassword}) 
    //         })

    //         if (!objResponse.ok){
    //             throw new Error('HTTP Error Status', objResponse.status)
    //         }

    //         const objData = await objResponse.json()
    //         if(objData.SessionID){
    //             //Sweetalert for success
    //             Swal.fire({
    //                 position: "top-end",
    //                 icon: "success",
    //                 title: "Login Successful",
    //                 showConfirmButton: false,
    //                 timer: 1500
    //             })
    //             // Save the SessionID to sessionStorage
    //             sessionStorage.setItem('SessionID',objData.SessionID)
    //             //clear our form
    //             document.querySelector('#txtLoginUsername').value = ""
    //             document.querySelector('#txtLoginPassword').value = ""
    //             //swap login
    //             document.querySelector('#frmLogin').style.display = 'none'
    //             document.querySelector('#divDashboard').style.display = 'block'
    //         } else{
    //             //Sweetalert for failure
    //         }
    //     } catch(objError){
    //         console.log('Error fetching objData', objError)
    //         // create sweetalert for user indicating failure
    //     }
    // }

    // Retrieve the values from your login form
    const strEmail = document.querySelector('#txtUsernameLogin').value.trim().toLowerCase()
    const strPassword = document.querySelector('#txtPasswordLogin').value
    // Validate the data
    let blnError = false
    let strMessage = ''

    if (!regEmail.test(strEmail)){
        blnError = true
        strMessage += '<p>You must enter a valid email</p>'
    }

    if (strPassword.length < 6){
        blnError = true
        strMessage += '<p>You must enter a password</p>'
    }

    if(blnError == true){
        Swal.fire({
            title:'Look a little closer, there are errors',
            html:strMessage,
            icon:'error'
        })
    } else {
        Swal.fire({
            title:'Logging In!',
            icon:'success'
        })
        // Call our function to create the account
        //createSession(strEmail,strPassword) 
    }


    // Evaluate the response to ensure it worked
    // Save session information to sessionStorage 
})

// click event for btnRegister
document.querySelector('#btnRegister').addEventListener('click', function(){
    // Define a function to create a user
    // async function createUser(strUserEmail,strUserPassword,strUserFirstName,strUserLastName){
    //     try{
    //         const objResponse = await fetch(strBaseURL + 'users.php',{
    //             method:'POST',
    //             headers: {
    //                 'Content-Type':'application/json'
    //             },
    //             //makes json object a string
    //             body: JSON.stringify({Email:strUserEmail,FirstName:strUserFirstName,LastName:strUserLastName,Password:strUserPassword}) 
    //         })

    //         if (!objResponse.ok){
    //             throw new Error('HTTP Error Status', objResponse.status)
    //         }

    //         const objData = await objResponse.json()
    //         if(objData.Outcome){
    //             //Sweetalert for success
    //             Swal.fire({
    //                 position: "top-end",
    //                 icon: "success",
    //                 title: "Registration Successful",
    //                 showConfirmButton: false,
    //                 timer: 1500
    //             })
    //             //clear our form
    //             document.querySelector('#txtUsername').value = ""
    //             document.querySelector('#txtPassword').value = ""
    //             document.querySelector('#txtFirstName').value = ""
    //             document.querySelector('#txtLastName').value = ""
    //             //swap login
    //             document.querySelector('#frmRegister').style.display = 'none'
    //             document.querySelector('#frmLogin').style.display = 'block'
    //         } else{
    //             //Sweetalert for failure
    //         }
    //     } catch(objError){
    //         console.log('Error fetching objData', objError)
    //         // create sweetalert for user indicating failure
    //     }
    // }

    
    // Retrieve the values from your registration form
    const strEmail = document.querySelector('#txtUsernameRegister').value.trim().toLowerCase()
    const strPassword = document.querySelector('#txtPasswordRegister').value
    const strFirstName = document.querySelector('#txtFirstName').value
    const strLastName = document.querySelector('#txtLastName').value
    const strPhoneNumber = document.querySelector('#txtPhoneNumber').value
    const strOrgType = document.querySelector('#cboOrgType').value
    const strOrgName = document.querySelector('#txtOrgName').value
    const strGroupCode = document.querySelector('#txtGroupCode').value

    let blnError = false
    let strMessage = ''

    // Validate the data
    if (!regEmail.test(strEmail)){
        blnError = true
        strMessage += '<p>Email is invalid</p>'
    }

    if (strPassword.length < 6){
        blnError = true
        strMessage += '<p>Password must be at least 6 characters</p>'
    }

    if (strFirstName.length < 2){
        blnError = true
        strMessage += '<p>First name must be at least 2 characters</p>'
    }

    if (strLastName.length < 2){
        blnError = true
        strMessage += '<p>Last name must be at least 2 characters</p>'
    }

    if (strPhoneNumber.length < 10){
        blnError = true
        strMessage += '<p>Phone Number is invalid</p>'
    }

    if (strOrgType.length < 1){
        blnError = true
        strMessage += '<p>Must select an organization type</p>'
    }

    if (strOrgName.length < 2){
        blnError = true
        strMessage += '<p>Organization name length must be at least 2 characters</p>'
    }

    if (strGroupCode.length < 2){
        blnError = true
        strMessage += '<p>Group code invalid</p>'
    }

    if(blnError == true){
        Swal.fire({
            title:'Look a little closer, there may be errors',
            html:strMessage,
            icon:'error'
        })
    } else {
        Swal.fire({
            title:'Account Created!',
            icon:'success'
        })
        // Call our function to create the account
        //createUser(strEmail,strPassword,strFirstName,strLastName)
    }
})