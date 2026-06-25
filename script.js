// --- State Management ---
        let isAdmin = false;
        let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
        let isRegisterMode = false;

        // --- Core UI Logic ---
        function updateUIForRole() {
            const nav = document.getElementById('nav-actions');
            
            if (isAdmin) {
                nav.innerHTML = `
                    <button class="btn-primary" onclick="showEventForm()"><span class="bi bi-plus"></span> Create Event</button>
                    <a class="logout-link" onclick="logout()">Logout Admin</a>`;
            } else if (currentUser) {
                nav.innerHTML = `
                    <span style="color: var(--accent); margin-right:10px">Hello, ${currentUser.username}</span>
                    <button class="btn-secondary" onclick="showBookings()"><span class="bi bi-ticket-perforated"></span> My Bookings</button>
                    <a class="logout-link" onclick="logout()">Logout</a>`;
            } else {
                nav.innerHTML = `
                    <button class="btn-secondary" onclick="showUserModal()" style="margin-right:10px">User Login</button>
                    <button class="btn-primary" onclick="showLoginModal()">Admin Access</button>`;
            }
            renderCards();
        }

        // --- Auth Handlers ---
        function showLoginModal() { closeModals(); document.getElementById('loginModal').style.display = 'block'; }
        function showUserModal() { 
            closeModals();
            isRegisterMode = false;
            updateAuthModalText();
            document.getElementById('userAuthModal').style.display = 'block'; 
        }
        function showEventForm() { document.getElementById('eventform').style.display = 'block'; }

        function toggleAuthMode() {
            isRegisterMode = !isRegisterMode;
            updateAuthModalText();
        }

        function updateAuthModalText() {
            document.getElementById('authTitle').innerText = isRegisterMode ? "Create Account" : "User Login";
            document.getElementById('authSubmitBtn').innerText = isRegisterMode ? "Register" : "Login";
            document.getElementById('authToggleBtn').innerText = isRegisterMode ? "Already have an account? Login" : "Need an account? Register";
        }

        function closeModals() {
            const modals = ['.modal-overlay'];
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('authError').style.display = 'none';
        }

        function attemptAdminLogin() {
            if (document.getElementById('adminPassword').value === "admin123") {
                isAdmin = true;
                currentUser = null;
                sessionStorage.removeItem('currentUser');
                closeModals();
                updateUIForRole();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        }

        function handleUserAuth() {
            const user = document.getElementById('userName').value.trim();
            const pass = document.getElementById('userPassword').value.trim();
            if(!user || !pass) return;

            let users = JSON.parse(localStorage.getItem('eventUsers')) || [];

            if (isRegisterMode) {
                if (users.find(u => u.username === user)) {
                    showAuthError("User already exists");
                    return;
                }
                const newUser = { id: Date.now(), username: user, password: pass, bookings: [] };
                users.push(newUser);
                localStorage.setItem('eventUsers', JSON.stringify(users));
                login(newUser);
            } else {
                const found = users.find(u => u.username === user && u.password === pass);
                if (found) login(found);
                else showAuthError("Invalid credentials");
            }
        }

        function login(userObj) {
            currentUser = userObj;
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
            isAdmin = false;
            closeModals();
            updateUIForRole();
        }

        function logout() {
            isAdmin = false;
            currentUser = null;
            sessionStorage.removeItem('currentUser');
            updateUIForRole();
        }

        function showAuthError(msg) {
            const err = document.getElementById('authError');
            err.innerText = msg;
            err.style.display = 'block';
        }

        // --- Event Management ---
        document.getElementById('eventform').addEventListener('submit', function(e) {
            e.preventDefault();
            const total = parseInt(document.getElementById('totalseats').value);
            const newEvent = {
                id: Date.now(),
                type: document.getElementById('eventtype').value,
                name: document.getElementById('eventname').value,
                date: document.getElementById('eventdate').value,
                location: document.getElementById('eventlocation').value,
                totalSeats: total,
                availableSeats: total,
                desc: document.getElementById('eventdescription').value
            };
            const events = JSON.parse(localStorage.getItem('myEvents')) || [];
            events.push(newEvent);
            localStorage.setItem('myEvents', JSON.stringify(events));
            renderCards();
            this.reset();
            closeModals();
        });

        function renderCards() {
            const events = JSON.parse(localStorage.getItem('myEvents')) || [];
            const container = document.getElementById('cardcontainer');
            container.innerHTML = '';
            document.getElementById('totalcount').innerText = events.length;

            events.forEach(event => {
                const filled = event.totalSeats - event.availableSeats;
                const isBooked = currentUser && currentUser.bookings.includes(event.id);
                
                let btnText = "Reserve Seat";
                let disabled = false;

                if (event.availableSeats <= 0) { btnText = "Sold Out"; disabled = true; }
                if (isAdmin) { btnText = "Admin View"; disabled = true; }
                if (isBooked) { btnText = "Already Reserved"; disabled = true; }

                const card = document.createElement('div');
                card.className = 'cards';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: bold; color: var(--text-dim);">
                        <span>${event.type.toUpperCase()}</span>
                        <span style="color: ${event.availableSeats > 0 ? 'var(--accent)' : 'var(--danger)'}">${event.availableSeats} Left</span>
                    </div>
                    <div style="font-weight: bold; font-size: 1.2rem; margin: 12px 0; color: var(--text-main);">${event.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 10px;">
                        <span class="bi bi-calendar"></span> ${event.date} | <span class="bi bi-geo-alt"></span> ${event.location}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 15px;">${event.desc || ""}</div>
                    <progress value="${filled}" max="${event.totalSeats}"></progress>
                    <button class="btnbook" onclick="bookTicket(${event.id})" ${disabled ? 'disabled' : ''}>${btnText}</button>
                    ${isAdmin ? `<div class="delete-link" onclick="deleteEvent(${event.id})">Remove Event</div>` : ''}
                `;
                container.appendChild(card);
            });
        }

        // --- Booking Logic ---
        function bookTicket(id) {
            if (!currentUser) {
                alert("Please log in to reserve a seat.");
                showUserModal();
                return;
            }

            let events = JSON.parse(localStorage.getItem('myEvents')) || [];
            let users = JSON.parse(localStorage.getItem('eventUsers')) || [];
            
            const event = events.find(e => e.id === id);
            const userIdx = users.findIndex(u => u.id === currentUser.id);

            if (event && event.availableSeats > 0 && !users[userIdx].bookings.includes(id)) {
                event.availableSeats--;
                users[userIdx].bookings.push(id);
                
                localStorage.setItem('myEvents', JSON.stringify(events));
                localStorage.setItem('eventUsers', JSON.stringify(users));
                
                // Sync session
                currentUser = users[userIdx];
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                renderCards();
                alert("Reservation confirmed!");
            }
        }

        function showBookings() {
            const events = JSON.parse(localStorage.getItem('myEvents')) || [];
            const list = document.getElementById('myBookingsList');
            list.innerHTML = '';
            
            const myEvents = events.filter(e => currentUser.bookings.includes(e.id));
            
            if (myEvents.length === 0) {
                list.innerHTML = '<p style="color: var(--text-dim)">No active reservations.</p>';
            } else {
                myEvents.forEach(e => {
                    list.innerHTML += `
                        <div class="booking-item">
                            <div>
                                <div style="font-weight:bold">${e.name}</div>
                                <div style="font-size:0.75rem; color:var(--text-dim)">${e.date}</div>
                            </div>
                            <span class="bi bi-check-circle" style="color:var(--accent)"></span>
                        </div>`;
                });
            }
            document.getElementById('bookingsModal').style.display = 'block';
        }

        function deleteEvent(id) {
            if (!confirm("Are you sure?")) return;
            let events = JSON.parse(localStorage.getItem('myEvents')) || [];
            events = events.filter(e => e.id !== id);
            localStorage.setItem('myEvents', JSON.stringify(events));
            renderCards();
        }

        function filterEvents() {
            const term = document.getElementById('searchInput').value.toLowerCase();
            document.querySelectorAll('.cards').forEach(card => {
                const title = card.querySelector('div:nth-child(2)').innerText.toLowerCase();
                card.style.display = title.includes(term) ? "" : "none";
            });
        }

        // Init
        updateUIForRole();