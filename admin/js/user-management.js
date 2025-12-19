// User Management JavaScript with Real-Time Updates
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const usersGrid = document.getElementById('users-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noUsersMessage = document.getElementById('no-users-message');
    const searchInput = document.getElementById('user-search');
    const roleFilter = document.getElementById('role-filter');
    const statusFilter = document.getElementById('status-filter');
    
    // Statistics elements
    const totalUsersEl = document.getElementById('total-users');
    const verifiedUsersEl = document.getElementById('verified-users');
    const pendingUsersEl = document.getElementById('pending-users');
    const staffUsersEl = document.getElementById('staff-users');
    
    // Modals
    const userDetailModal = document.getElementById('user-detail-modal');
    const permissionsModal = document.getElementById('permissions-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    // User data
    let users = [];
    let currentEditingUser = null;
    
    // Firebase references
    let usersRef;
    let usersListener;
    
    // Initialize
    initUserManagement();
    
    function initUserManagement() {
        setupEventListeners();

        // Wait until Firebase Auth confirms the logged-in user
        auth.onAuthStateChanged(user => {
            if (!user) {
                console.error("No authenticated user. Access denied.");
                showAlert("error", "Unauthorized", "You must be logged in as an admin.");
                setTimeout(() => {
                window.location.href = '/index.html'; // Redirect to login
                }, 2000);
                return;
            }

            // Check user role in DB
            database.ref(`users/${user.uid}`).once("value")
                .then(snapshot => {
                    const currentUser = snapshot.val();
                    console.log("Authenticated user:", user);
                    console.log("Current user data:", currentUser);
                    if (!currentUser || currentUser.role !== "admin") {
                        console.error("User is not admin:", currentUser);
                        showAlert("error", "Access Denied", "You do not have admin privileges.");
                        return;
                    }

                    // Admin confirmed -> setup listener
                    usersRef = database.ref("users");
                    setupRealtimeUsersListener();
                })
                .catch(err => {
                    console.error("Error checking current user role:", err);
                    showAlert("error", "Error", "Failed to verify admin access.");
                });
        });
    }
    
    function setupEventListeners() {
        searchInput.addEventListener('input', filterUsers);
        roleFilter.addEventListener('change', filterUsers);
        statusFilter.addEventListener('change', filterUsers);

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                userDetailModal.style.display = 'none';
                permissionsModal.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === userDetailModal) {
                userDetailModal.style.display = 'none';
            }
            if (e.target === permissionsModal) {
                permissionsModal.style.display = 'none';
            }
        });
    }
    
    function setupRealtimeUsersListener() {
        loadingIndicator.style.display = 'flex';
        usersGrid.innerHTML = '';

        if (usersListener) {
            usersRef.off('value', usersListener);
        }

        usersListener = usersRef.on('value', snapshot => {
            users = [];
            let staffCount = 0;

            snapshot.forEach(userSnapshot => {
                const userData = userSnapshot.val();

                // ❌ Skip admins only
                if (userData.role === 'admin') return;

                users.push({
                    id: userSnapshot.key,
                    ...userData
                });

                if (userData.role === 'staff' && userData.isArchived !== true) {
                    staffCount++;
                }
            });

            filterUsers(); // ✅ apply filters immediately
            updateStatistics(
                users.filter(u => !u.isArchived),
                staffCount
            );

            loadingIndicator.style.display = 'none';
        }, error => {
            console.error('Error loading users:', error);
            showAlert('error', 'Error', 'Failed to load users. Check database rules.');
            loadingIndicator.style.display = 'none';
        });
    }
    
    function renderUsers(usersToRender) {
        usersGrid.innerHTML = '';
        if (usersToRender.length === 0) {
            noUsersMessage.style.display = 'block';
            return;
        }
        noUsersMessage.style.display = 'none';
        usersToRender.forEach(user => {
            usersGrid.appendChild(createUserCard(user));
        });
    }
    
    function createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.dataset.userId = user.id;

        const initials = user.name
            ? user.name.split(' ').length > 1
                ? (user.name.split(' ')[0][0] + user.name.split(' ').slice(-1)[0][0]).toUpperCase()
                : user.name.substring(0, 2).toUpperCase()
            : 'UU';

        const isVerified = user.isVerified || false;
        const statusText = isVerified ? 'Verified' : 'Pending';
        const statusClass = isVerified ? 'status-verified' : 'status-pending';

        const archivedBadge = user.isArchived
            ? `<span class="status-badge status-archived">Archived</span>`
            : '';

        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar-large">${initials}</div>
                <div class="user-card-info">
                    <h3>${user.name || 'Unknown'}</h3>
                    <p>
                        ${user.role || 'No role'}
                        • <span class="status-badge ${statusClass}">${statusText}</span>
                        ${archivedBadge}
                    </p>
                </div>
            </div>
            <div class="user-card-details">
                <div class="user-detail-item">
                    <span class="user-detail-label">Joined:</span>
                    <span class="user-detail-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
            </div>
            <div class="user-card-actions">
                ${!isVerified ? `
                    <button class="user-action-btn btn-verify" data-userid="${user.id}" data-action="verify">
                        <i class="fas fa-check-circle"></i> Verify User
                    </button>` : ''}

                ${user.role === 'member' && isVerified ? `
                    <button class="user-action-btn btn-promote" data-userid="${user.id}" data-action="promote">
                        <i class="fas fa-level-up-alt"></i> Promote User
                    </button>
                    <button class="user-action-btn btn-archive"
                            data-userid="${user.id}"
                            data-action="archive">
                        <i class="fas fa-archive"></i> Archive User
                    </button>` : user.role === 'staff' && isVerified ? `
                    <button class="user-action-btn btn-permissions" data-userid="${user.id}" data-action="permissions">
                        <i class="fas fa-key"></i> Manage Permissions
                    </button>
                    <button class="user-action-btn btn-archive"
                            data-userid="${user.id}"
                            data-action="archive">
                        <i class="fas fa-archive"></i> Archive User
                    </button>
                    <button class="user-action-btn btn-demote" data-userid="${user.id}" data-action="demote">
                        <i class="fas fa-level-down-alt"></i> Demote User
                    </button>` : ''}
            </div>
        `;

        setTimeout(() => {
            card.querySelectorAll('.user-action-btn').forEach(button => {
                button.addEventListener('click', handleUserAction);
            });
        }, 0);

        return card;
    }
    
    function handleUserAction(e) {
        const userId = e.currentTarget.dataset.userid;
        const action = e.currentTarget.dataset.action;
        const user = users.find(u => u.id === userId);

        if (!user) return;

        switch(action) {
            case 'verify':
                verifyUser(user);
                break;
            case 'promote':
                promoteUser(user);
                break;
            case 'demote':
                demoteUser(user);
                break;
            case 'permissions':
                showPermissions(user);
                break;
            case 'archive':
                archiveUser(user);
                break;
        }
    }

    function archiveUser(user) {
        Swal.fire({
            title: 'Archive User',
            text: `Are you sure you want to archive ${user.name || user.email}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff9800',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, archive'
        }).then((result) => {
            if (result.isConfirmed) {
                database.ref(`users/${user.id}/isArchived`).set(true)
                    .then(() => {
                        showAlert(
                            'success',
                            'Archived',
                            `${user.name || user.email} has been archived.`
                        );
                    })
                    .catch(error => {
                        console.error('Error archiving user:', error);
                        showAlert(
                            'error',
                            'Error',
                            'Failed to archive user. Please try again.'
                        );
                    });
            }
        });
    }

    function verifyUser(user) {
        const imageUrl = user.governmentId?.frontImageUrl || 'placeholder-image.png';

        Swal.fire({
            title: `Verify ${user.name}`,
            html: `
                <div style="text-align:center;">
                    <img src="${imageUrl}" alt="${user.name}'s ID" style="max-width:400px; max-height:400px; border-radius:8px; margin-bottom:1rem; border:2px solid #6e8efb;">
                    <p>Email: <strong>${user.email}</strong></p>
                    <p>Date & Time Registered: <strong>${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</strong></p>
                    <p>Are you sure you want to verify this user?</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, verify!'
        }).then((result) => {
            if (result.isConfirmed) {
                const updates = {};
                updates[`users/${user.id}/isVerified`] = true;
                updates[`users/${user.id}/governmentId`] = null; // Delete governmentId node

                database.ref().update(updates)
                    .then(() => {
                        showAlert('success', 'Success!', 'User has been verified and government ID deleted.');
                    })
                    .catch(error => {
                        console.error('Error verifying user:', error);
                        showAlert('error', 'Error', 'Failed to verify user. Please try again.');
                    });
            }
        });
    }
    
    function promoteUser(user) {
        showPromotionModal(user);
    }
    
    function demoteUser(user) {
        Swal.fire({
            title: 'Demote User',
            text: `Are you sure you want to demote ${user.name} to Member role?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, demote!'
        }).then((result) => {
            if (result.isConfirmed) {
                const updates = {};
                updates[`users/${user.id}/role`] = 'member';
                updates[`users/${user.id}/permissions`] = {
                    canAnnounce: false,
                    canAppointSchedules: false,
                    canInitializeMeetings: false,
                    canPromoteUsers: false,
                    canUploadResources: false,
                    canVerifyUsers: false
                };

                database.ref().update(updates)
                    .then(() => {
                        showAlert('success', 'Success!', 'User has been demoted to Member.');
                    })
                    .catch(error => {
                        console.error('Error demoting user:', error);
                        showAlert('error', 'Error', 'Failed to demote user. Please try again.');
                    });
            }
        });
    }
    
    function showPermissions(user) {
        currentEditingUser = user;
        
        database.ref(`users/${user.id}/permissions`).once('value')
            .then(snapshot => {
                const permissions = snapshot.val() || {};
                
                let permissionsHTML = `
                    <h3>Permissions for ${user.name || user.email}</h3>
                    <p class="permissions-subtitle">Toggle permissions for this staff member:</p>
                    <div class="permissions-list">
                `;
                
                for (const [key, value] of Object.entries(permissions)) {
                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const isChecked = value === true;
                    
                    permissionsHTML += `
                        <div class="permission-item">
                            <label class="switch">
                                <input type="checkbox" id="perm-${key}" ${isChecked ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                            <span class="permission-label">${formattedKey}</span>
                        </div>
                    `;
                }
                
                permissionsHTML += `</div>
                    <div class="modal-actions">
                        <button class="btn-secondary" id="cancel-permissions">Cancel</button>
                        <button class="btn-primary" id="save-permissions">Save Changes</button>
                    </div>
                `;
                
                document.getElementById('permissions-content').innerHTML = permissionsHTML;
                permissionsModal.style.display = 'block';
                
                document.getElementById('save-permissions').addEventListener('click', savePermissions);
                document.getElementById('cancel-permissions').addEventListener('click', () => {
                    permissionsModal.style.display = 'none';
                });
            })
            .catch(error => {
                console.error('Error fetching permissions:', error);
                showAlert('error', 'Error', 'Failed to load permissions. Please try again.');
            });
    }
    
    function savePermissions() {
        if (!currentEditingUser) return;
        
        const permissionCheckboxes = document.querySelectorAll('#permissions-content input[type="checkbox"]');
        const updatedPermissions = {};
        
        permissionCheckboxes.forEach(checkbox => {
            const permissionId = checkbox.id.replace('perm-', '');
            updatedPermissions[permissionId] = checkbox.checked;
        });
        
        database.ref(`users/${currentEditingUser.id}/permissions`).set(updatedPermissions)
            .then(() => {
                showAlert('success', 'Success!', 'Permissions updated successfully.');
                permissionsModal.style.display = 'none';
            })
            .catch(error => {
                console.error('Error updating permissions:', error);
                showAlert('error', 'Error', 'Failed to update permissions. Please try again.');
            });
    }
    
    function filterUsers() {
        const searchTerm = searchInput.value.toLowerCase();
        const roleFilterValue = roleFilter.value;
        const statusFilterValue = statusFilter.value;

        const filteredUsers = users.filter(user => {
            const matchesSearch =
                user.email.toLowerCase().includes(searchTerm) ||
                (user.name && user.name.toLowerCase().includes(searchTerm));

            const matchesRole =
                roleFilterValue === 'all' || user.role === roleFilterValue;

            let matchesStatus = true;

            if (statusFilterValue === 'verified') {
                matchesStatus = user.isVerified === true && user.isArchived !== true;
            } else if (statusFilterValue === 'pending') {
                matchesStatus = user.isVerified !== true && user.isArchived !== true;
            } else if (statusFilterValue === 'archived') {
                matchesStatus = user.isArchived === true;
            } else {
                // "all"
                matchesStatus = true;
            }

            return matchesSearch && matchesRole && matchesStatus;
        });

        renderUsers(filteredUsers);
    }
    
    function updateStatistics(usersList, staffCount) {
        const total = usersList.length;
        const verified = usersList.filter(user => user.isVerified).length;
        const pending = total - verified;

        totalUsersEl.textContent = total;
        verifiedUsersEl.textContent = verified;
        pendingUsersEl.textContent = pending;
        staffUsersEl.textContent = staffCount;
    }
    
    window.addEventListener('beforeunload', () => {
        if (usersListener) usersRef.off('value', usersListener);
    });

    function showAlert(icon, title, text, confirmButtonText = 'OK') {
        return Swal.fire({
            icon,
            title,
            text,
            background: '#2c3e50',
            color: '#fff',
            iconColor: icon === 'error' ? '#f44336' : (icon === 'success' ? '#4caf50' : (icon === 'warning' ? '#ff9800' : '#2196f3')),
            confirmButtonText,
            confirmButtonColor: '#6e8efb'
        });
    }
});
