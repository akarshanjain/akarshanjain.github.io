let user = null; // Stores the current user data
let users = JSON.parse(localStorage.getItem("users")) || []; // Mock users database
let googleCalendarEvents = [];
let todoList = JSON.parse(localStorage.getItem("todoList")) || []; // To-Do list items
let notes = [];
const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
const allNotes = JSON.parse(localStorage.getItem("notes")) || {};
let selectedDate = null; // Store the selected date globally
let gapiLoaded = false;
let isSignedIn = false;

if (loggedInUser && allNotes[loggedInUser.email]) {
    notes = allNotes[loggedInUser.email];
}
let currentNote = { title: "", content: "", styles: { font: "Arial", size: "16px" } };

function toggleLoginSignUp() {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("signup-page").style.display = "block";
}

function toggleSignUpLogin() {
    document.getElementById("signup-page").style.display = "none";
    document.getElementById("login-page").style.display = "block";
}

// Handle sign-up form submission
document.getElementById("signup-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    // Check if the email is already registered
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        alert("Email is already registered. Please log in.");
        toggleSignUpLogin(); // Redirect to login page
        return;
    }

    // Save the new user
    users.push({ name, email, password });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Account created successfully! Please log in.");
    toggleSignUpLogin(); // Redirect to login page
});

// Handle login form submission
document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    loginUser(email, password);
});

// Simulate a login function
function loginUser(email, password) {
    const userData = users.find(user => user.email === email && user.password === password);
    if (userData) {
        user = userData;
        sessionStorage.setItem("loggedInUser", JSON.stringify(user)); // Save session
        document.getElementById("login-page").style.display = "none";
        document.getElementById("signup-page").style.display = "none";
        showDashboard();
    } else {
        alert("Invalid credentials");
    }
}


// Show Dashboard
function showDashboard() {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("signup-page").style.display = "none";
    document.getElementById("main-navbar").style.display = "flex"; // Show navbar
    document.getElementById("page-title-container").style.display = "flex"; // Show page title
    showPage('dashboard-page'); // Show default page after login
    renderDashboard();
    updatePageTitle("Dashboard");
}

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';

    // Call specific rendering functions for the To-Do List tab
    if (pageId === 'todo-list-page') {
        renderTodoListTab();
    }

    if (pageId === 'calendar-page') {
        renderFullCalendar(); // Render FullCalendar when the "Calendar" tab is shown
    }
    
    if (pageId === "dashboard-page") {
        renderMiniCalendar(); // Render the mini calendar for the dashboard
    }

    localStorage.setItem("currentPage", pageId); // Save the current page to localStorage
    updatePageTitle(pageId.replace('-page', '').replace(/-/g, ' '));
}




function updatePageTitle(title) {
    const pageTitle = document.getElementById("page-title");
    pageTitle.innerText = title.charAt(0).toUpperCase() + title.slice(1);
}

// Render Dashboard
function renderDashboard() {
    renderDeadlines();
    renderCalendar();
    renderTodoList();
}

// Render Upcoming Deadlines
function renderDeadlines() {
    const upcomingDeadlines = googleCalendarEvents.slice(0, 5);
    const deadlinesList = document.getElementById("upcoming-deadlines");
    deadlinesList.innerHTML = upcomingDeadlines.map(event => `
        <li class="list-group-item">
            <strong>${event.summary}</strong><br>
            ${new Date(event.start.dateTime || event.start.date).toLocaleString()}
        </li>
    `).join('') || '<li class="list-group-item">No upcoming deadlines</li>';
}

function renderCalendar() {
    const calendarDiv = document.getElementById("dashboard-calendar");
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let calendarHtml = "<table class='calendar-grid'><tr>";
    for (let day = monthStart.getDate(); day <= monthEnd.getDate(); day++) {
        const currentDate = new Date(today.getFullYear(), today.getMonth(), day);
        const events = googleCalendarEvents.filter((event) =>
            event.start.dateTime
                ? new Date(event.start.dateTime).toDateString() === currentDate.toDateString()
                : new Date(event.start.date).toDateString() === currentDate.toDateString()
        );

        calendarHtml += `
            <td>
                <div>${currentDate.toDateString()}</div>
                <ul>
                    ${events.map((event) => `<li>${event.summary}</li>`).join("")}
                </ul>
            </td>
        `;

        if (currentDate.getDay() === 6) calendarHtml += "</tr><tr>"; // Start a new row for each week
    }
    calendarHtml += "</tr></table>";

    calendarDiv.innerHTML = calendarHtml;
}

function renderFullCalendar() {
    const calendarEl = document.getElementById("full-calendar");

    // Retrieve saved events from localStorage
    const savedEvents = JSON.parse(localStorage.getItem("savedCalendarEvents")) || [];

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        editable: true, // Allow events to be draggable
        selectable: true, // Allow creating events by clicking
        events: savedEvents, // Load saved events
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        dateClick: function (info) {
            selectedDate = info.dateStr; // Store the clicked date
            document.getElementById("eventTitleInput").value = ""; // Reset the input field
            $('#eventTitleModal').modal('show'); // Show the modal
        },
        eventContent: function (arg) {
            // Create a custom event element with a delete button
            const eventEl = document.createElement("div");
            eventEl.className = "fc-event-main";

            // Event title
            const titleEl = document.createElement("span");
            titleEl.textContent = arg.event.title;

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "×";
            deleteButton.className = "delete-button";
            deleteButton.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering the event click
                arg.event.remove(); // Remove the event from the calendar
                deleteEvent(arg.event.id); // Remove the event from localStorage
            };

            // Append the title and delete button to the event
            eventEl.appendChild(titleEl);
            eventEl.appendChild(deleteButton);

            return { domNodes: [eventEl] };
        },
    });

    calendar.render();
}

function addEventToCalendar() {
    const eventTitle = document.getElementById("eventTitleInput").value.trim();

    if (!eventTitle) {
        alert("Event title cannot be empty."); // Optional validation
        return;
    }

    const newEvent = {
        id: Date.now().toString(), // Unique ID for the event
        title: eventTitle,
        start: selectedDate, // Use the globally stored selected date
    };

    // Access the calendar instance and add the event
    const calendarEl = document.getElementById("full-calendar");
    const calendar = FullCalendar.getCalendar(calendarEl); // Get the calendar instance
    calendar.addEvent(newEvent); // Add the event to the calendar

    // Save the event to localStorage
    saveEvent(newEvent);

    // Close the modal
    $('#eventTitleModal').modal('hide');
}




function saveEvent(event) {
    const savedEvents = JSON.parse(localStorage.getItem("savedCalendarEvents")) || [];
    savedEvents.push(event); // Add new event to the list
    localStorage.setItem("savedCalendarEvents", JSON.stringify(savedEvents)); // Save back to localStorage
}

function deleteEvent(eventId) {
    const savedEvents = JSON.parse(localStorage.getItem("savedCalendarEvents")) || [];
    const updatedEvents = savedEvents.filter(event => event.id !== eventId); // Remove the event
    localStorage.setItem("savedCalendarEvents", JSON.stringify(updatedEvents)); // Save back to localStorage
}




function renderTodoList() {
    const todoListElement = document.getElementById("todo-list");
    todoListElement.innerHTML = todoList.map((todo, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>${todo.text} : Priority ${todo.priority}</span>
            <button class="btn btn-danger btn-sm" onclick="removeTodoItem(${index})">&times;</button>
        </li>
    `).join('') || '<li class="list-group-item">No to-do items</li>';
}

function renderTodoListTab() {
    const todoListTabContainer = document.getElementById("todo-list-tab-container");
    todoListTabContainer.innerHTML = todoList.map((todo, index) => `
        <div class="card mb-3">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="card-title">To-Do Item: ${todo.text}</h5>
                    <p class="card-text"><strong>Priority:</strong> ${todo.priority}</p>
                    <p class="card-text"><strong>Description:</strong> ${todo.description || "No description provided"}</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeTodoItem(${index})">&times;</button>
            </div>
        </div>
    `).join('') || '<p>No to-do items</p>';
}

function renderMiniCalendar() {
    const calendarEl = document.getElementById("dashboard-calendar");

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        headerToolbar: false, // Disable toolbar for mini version
        height: "auto",       // Automatically adjust height
        aspectRatio: 1,       // Adjust ratio for a smaller display
        events: googleCalendarEvents.map((event) => ({
            title: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
        })),
    });

    calendar.render();
}






function addTodoItem() {
    document.getElementById("newTodoInput").value = "";
    document.getElementById("priorityInput").value = ""; // Default to highest priority
    document.getElementById("descriptionInput").value = ""; // Reset the description input
    $('#todoModal').modal('show');
}



function addTodoItemFromModal() {
    const newItemText = document.getElementById("newTodoInput").value.trim();
    const priority = parseInt(document.getElementById("priorityInput").value);
    const description = document.getElementById("descriptionInput").value.trim();

    if (!newItemText) {
        alert("To-Do item cannot be empty.");
        return;
    }

    if (isNaN(priority) || priority < 1 || priority > 5) {
        alert("Please select a valid priority between 1 and 5.");
        return;
    }

    // If no description is provided, set it to a default value
    const taskDescription = description || "No description provided";

    // Add the new item to the to-do list
    todoList.push({ text: newItemText, priority, description: taskDescription });

    // Sort the to-do list by priority (lower numbers have higher priority)
    todoList.sort((a, b) => a.priority - b.priority);

    // Save to localStorage
    localStorage.setItem("todoList", JSON.stringify(todoList));

    // Re-render the to-do list on both the dashboard and the tab
    renderTodoList();
    renderTodoListTab();

    // Close the modal
    $('#todoModal').modal('hide');
}


// listener for the + button in the to do list tab
document.getElementById("add-todo-btn-tab").addEventListener("click", addTodoItem);


document.getElementById("add-todo-btn").addEventListener("click", addTodoItem);

function removeTodoItem(index) {
    // Remove the item from the to-do list
    todoList.splice(index, 1);

    // Save the updated list to localStorage
    localStorage.setItem("todoList", JSON.stringify(todoList));

    // Re-render the to-do list on both the dashboard and the tab
    renderTodoList();
    renderTodoListTab();
}



// Logout User
function logoutUser() {
    sessionStorage.removeItem("loggedInUser"); // Clear sessionStorage
    localStorage.removeItem("currentPage"); // Clear the saved page
    user = null;
    document.getElementById("main-navbar").style.display = "none"; // Hide navbar
    document.getElementById("page-title-container").style.display = "none"; // Hide title
    showPage("login-page"); // Redirect to login page
}


// Show Edit Profile Page
function showEditProfile() {
    document.getElementById("dashboard-page").style.display = "none";
    document.getElementById("edit-profile-page").style.display = "block";
    const savedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (savedUser) {
        const nameField = document.getElementById("edit-name");
        const emailField = document.getElementById("edit-email");

        nameField.value = savedUser.name || "";
        emailField.value = savedUser.email || "";

        // Add the 'prefilled' class if fields are not empty
        nameField.classList.toggle("prefilled", !!savedUser.name);
        emailField.classList.toggle("prefilled", !!savedUser.email);
    }
    updatePageTitle("Edit Profile");
}


// Handle Profile Update
document.getElementById("edit-profile-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const newName = document.getElementById("edit-name").value;
    const newEmail = document.getElementById("edit-email").value;

    if (user) {
        // Update user data
        user.name = newName;
        user.email = newEmail;

        // Update users array
        const userIndex = users.findIndex(u => u.email === user.email);
        if (userIndex !== -1) {
            users[userIndex] = { ...user, name: newName, email: newEmail };
        }
        localStorage.setItem("users", JSON.stringify(users)); // Save updated users
        localStorage.setItem("loggedInUser", JSON.stringify(user)); // Save logged-in user
        alert("Profile updated successfully!");
        showDashboard();
    }
});

// Google Calendar API initialization
function initializeGoogleCalendar() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            clientId: "153359750619-bp3fg1877mjpg7rafo9dprmt66epehe0.apps.googleusercontent.com",
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar.readonly"
        }).then(() => {
            // Check if the user is already signed in
            if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                fetchGoogleCalendarEvents();
            }
        });
    });
}


function fetchGoogleCalendarEvents() {
    if (!isSignedIn || !gapiLoaded) {
        console.log("Google API not ready or user not signed in.");
        return;
    }

    gapi.client.calendar.events
        .list({
            calendarId: "primary",
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: "startTime",
        })
        .then((response) => {
            googleCalendarEvents = response.result.items;
            renderCalendar();
        })
        .catch((err) => console.error("Error fetching calendar events:", err));
}

// Check for logged-in user on page load
document.addEventListener("DOMContentLoaded", () => {
    renderNotesList();
    const savedUser = sessionStorage.getItem("loggedInUser"); // Check sessionStorage for user
    const savedPage = localStorage.getItem("currentPage") || "dashboard-page"; // Default to dashboard-page

    if (savedUser) {
        // If a user session exists
        user = JSON.parse(savedUser); // Retrieve and assign the logged-in user
        document.getElementById("main-navbar").style.display = "flex"; // Show navbar
        document.getElementById("page-title-container").style.display = "flex"; // Show title
        showPage(savedPage); // Redirect to the last visited page
        document.getElementById("login-page").style.display = "none";
        document.getElementById("signup-page").style.display = "none";
    } else {
        // No logged-in user; redirect to login page
        document.getElementById("main-navbar").style.display = "none"; // Hide navbar
        document.getElementById("page-title-container").style.display = "none"; // Hide title
        showPage("login-page"); // Show login page
    }
});




document.getElementById("edit-name").addEventListener("input", function () {
    this.classList.remove("prefilled");
});

document.getElementById("edit-email").addEventListener("input", function () {
    this.classList.remove("prefilled");
});


function createNewNote() {
    currentNote = { title: "", content: "", styles: { font: "Arial", size: "16px" } };
    document.getElementById("notes-text").value = "";
    document.getElementById("font-select").value = "Arial";
    document.getElementById("font-size-select").value = "16px";
    document.getElementById("notes-text").style.fontFamily = "Arial";
    document.getElementById("notes-text").style.fontSize = "16px";
}

function saveNote() {
    const noteContent = document.getElementById("notes-text").value;

    if (!noteContent.trim()) {
        alert("Cannot save an empty note.");
        return;
    }

    // Open the modal for entering the note title
    document.getElementById("noteTitleInput").value = ""; // Reset the input field
    $('#noteTitleModal').modal('show');
}


function saveNoteWithTitle() {
    const noteTitle = document.getElementById("noteTitleInput").value.trim();
    const noteContent = document.getElementById("notes-text").value;

    if (!noteTitle) {
        alert("Title is required to save the note."); // Optional fallback if empty
        return;
    }

    // Save the note with title, content, and styles
    currentNote.title = noteTitle;
    currentNote.content = noteContent;
    currentNote.styles.font = document.getElementById("font-select").value;
    currentNote.styles.size = document.getElementById("font-size-select").value;

    // Add the note to the notes array
    notes.push({ ...currentNote });

    // Update localStorage for the current user
    const allNotes = JSON.parse(localStorage.getItem("notes")) || {};
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

    if (loggedInUser) {
        allNotes[loggedInUser.email] = notes;
        localStorage.setItem("notes", JSON.stringify(allNotes));
    }

    // Re-render the notes list
    renderNotesList();

    // Close the modal
    $('#noteTitleModal').modal('hide');

    // Optionally notify the user (e.g., with a non-intrusive toast)
    console.log("Note saved successfully!");
}



function renderNotesList() {
    const notesList = document.getElementById("notes-list");
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

    if (!loggedInUser) {
        notesList.innerHTML = '<li>No saved notes</li>';
        return;
    }

    if (notes.length === 0) {
        notesList.innerHTML = '<li>No saved notes</li>';
        return;
    }

    // Dynamically generate the list of saved notes with a delete button
    notesList.innerHTML = notes.map((note, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span onclick="loadNote(${index})" style="cursor: pointer;">${note.title}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteNote(${index})">&times;</button>
        </li>
    `).join('');
}



function loadNote(index) {
    const note = notes[index];
    document.getElementById("notes-text").value = note.content;
    document.getElementById("font-select").value = note.styles.font;
    document.getElementById("font-size-select").value = note.styles.size;
    document.getElementById("notes-text").style.fontFamily = note.styles.font;
    document.getElementById("notes-text").style.fontSize = note.styles.size;
    currentNote = { ...note };
}

function deleteNote(index) {
    // Remove the note from the notes array
    notes.splice(index, 1);

    // Update localStorage for the current user
    const allNotes = JSON.parse(localStorage.getItem("notes")) || {};
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

    if (loggedInUser) {
        allNotes[loggedInUser.email] = notes;
        localStorage.setItem("notes", JSON.stringify(allNotes));
    }

    // Re-render the notes list
    renderNotesList();
}



function toggleBold() {
    const textBox = document.getElementById("notes-text");
    textBox.style.fontWeight = textBox.style.fontWeight === "bold" ? "normal" : "bold";
}

function toggleItalic() {
    const textBox = document.getElementById("notes-text");
    textBox.style.fontStyle = textBox.style.fontStyle === "italic" ? "normal" : "italic";
}

function toggleBulletPoints() {
    const textBox = document.getElementById("notes-text");
    const lines = textBox.value.split("\n");
    textBox.value = lines.map(line => line.startsWith("• ") ? line.slice(2) : `• ${line}`).join("\n");
}

// Apply font changes dynamically
document.getElementById("font-select").addEventListener("change", function () {
    document.getElementById("notes-text").style.fontFamily = this.value;
});

document.getElementById("font-size-select").addEventListener("change", function () {
    document.getElementById("notes-text").style.fontSize = this.value;
});


// Load the Google API client
function initializeGapi() {
    gapi.load("client:auth2", () => {
        gapi.client
            .init({
                clientId: "YOUR_CLIENT_ID", // Replace with your Client ID
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
                scope: "https://www.googleapis.com/auth/calendar",
            })
            .then(() => {
                gapiLoaded = true;
                isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
                renderAuthButton();
            });
    });
}

// Render the Google Sign-In button
function renderAuthButton() {
    const authButton = document.getElementById("google-auth-btn");
    authButton.textContent = isSignedIn ? "Sign Out of Google" : "Sign In with Google";
    authButton.style.display = "block";

    authButton.onclick = () => {
        if (isSignedIn) {
            gapi.auth2.getAuthInstance().signOut();
            isSignedIn = false;
        } else {
            gapi.auth2.getAuthInstance().signIn().then(() => {
                isSignedIn = true;
                fetchGoogleCalendarEvents();
            });
        }
        renderAuthButton();
    };
}
