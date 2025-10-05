// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const memberNameEl = document.getElementById("member-name");
    const logoutBtn = document.getElementById("logout-btn");

    const upcomingEventsEl = document.getElementById("upcoming-events");
    const resourcesCountEl = document.getElementById("resources-count");
    const meetingsCountEl = document.getElementById("meetings-count");
    const announcementsCountEl = document.getElementById("announcements-count");

    const activityListEl = document.getElementById("activity-list");
    const eventsListEl = document.getElementById("events-list");

    const notificationsDropdown = document.getElementById("notifications-dropdown");
    const notificationBtn = document.getElementById("notification-btn");

    // --- LOGOUT FUNCTION ---
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        firebase.auth().signOut()
            .then(() => {
                Swal.fire({
                    icon: "success",
                    title: "Logged Out",
                    text: "You have been logged out successfully",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = "../index.html"; // redirect to login page
                });
            })
            .catch((error) => {
                console.error("Logout Error:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to logout. Try again."
                });
            });
    });

    // --- FETCH MEMBER DATA ---
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Get member name from sessionStorage
            let authUser = sessionStorage.getItem("authUser");
            try {
                authUser = JSON.parse(authUser);
                memberNameEl.textContent = authUser?.name || "Member";
            } catch (err) {
                console.warn("Failed to parse authUser from sessionStorage:", err);
                memberNameEl.textContent = "Member";
            }

            const db = firebase.database();
            const eventsRef = db.ref("events");
            const resourcesRef = db.ref("resources");
            const meetingsRef = db.ref("meetings");
            const announcementsRef = db.ref("announcements");
            const activityRef = db.ref("activity");

            // Count upcoming events
            eventsRef.orderByChild("date").startAt(new Date().toISOString()).once("value", (snapshot) => {
                upcomingEventsEl.textContent = snapshot.numChildren();
                populateEvents(snapshot);
            });

            // Count resources
            resourcesRef.once("value", (snapshot) => {
                resourcesCountEl.textContent = snapshot.numChildren();
            });

            // Count meetings
            meetingsRef.once("value", (snapshot) => {
                meetingsCountEl.textContent = snapshot.numChildren();
            });

            // Count announcements
            announcementsRef.once("value", (snapshot) => {
                announcementsCountEl.textContent = snapshot.numChildren();
            });

            // Populate recent activity
            activityRef.limitToLast(5).once("value", (snapshot) => {
                activityListEl.innerHTML = ""; // Clear previous
                snapshot.forEach((childSnap) => {
                    const activity = childSnap.val();
                    const activityItem = document.createElement("div");
                    activityItem.classList.add("activity-item");
                    activityItem.innerHTML = `
                        <div class="activity-icon">
                            <i class="${activity.icon || "fas fa-info-circle"}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${activity.text}</p>
                            <span class="activity-time">${activity.time}</span>
                        </div>
                    `;
                    activityListEl.prepend(activityItem); // newest first
                });
            });

        } else {
            // No user logged in
            window.location.href = "../index.html"; // redirect to login
        }
    });

    // --- POPULATE UPCOMING EVENTS ---
    function populateEvents(snapshot) {
        eventsListEl.innerHTML = ""; // Clear previous events
        snapshot.forEach((childSnap) => {
            const event = childSnap.val();
            const eventItem = document.createElement("div");
            eventItem.classList.add("event-item");
            const eventDate = new Date(event.date);
            const day = eventDate.getDate();
            const month = eventDate.toLocaleString("default", { month: "short" }).toUpperCase();

            eventItem.innerHTML = `
                <div class="event-date">
                    <span class="event-day">${day}</span>
                    <span class="event-month">${month}</span>
                </div>
                <div class="event-details">
                    <h4>${event.title}</h4>
                    <p>${event.startTime} - ${event.endTime}</p>
                    <span class="event-location">${event.location}</span>
                </div>
                <button class="event-action">RSVP</button>
            `;
            eventsListEl.appendChild(eventItem);
        });
    }

    // --- NOTIFICATIONS DROPDOWN ---
    notificationBtn.addEventListener("click", () => {
        notificationsDropdown.classList.toggle("active");
    });
});
