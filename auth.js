// Use auth and database from firebase-config.js via window

// ================== DOM ELEMENTS ==================
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// ================== SWEETALERT HELPER ==================
function showAlert(icon, title, text, confirmButtonText = 'OK') {
    return Swal.fire({
        icon,
        title,
        text,
        background: '#2c3e50',
        color: '#fff',
        iconColor:
            icon === 'error'
                ? '#f44336'
                : icon === 'success'
                ? '#4caf50'
                : icon === 'warning'
                ? '#ff9800'
                : '#2196f3',
        confirmButtonText,
        confirmButtonColor: '#6e8efb'
    });
}

// ================== CLOUDINARY UPLOAD ==================
async function uploadToCloudinary(file) {
    if (!window.cloudinaryConfig) {
        throw new Error('Cloudinary config not found');
    }

    const { cloudName, uploadPreset } = window.cloudinaryConfig;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'government_ids');

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error('Cloudinary upload failed');
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id
    };
}

// ================== REGISTER ==================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const idFile = document.getElementById('register-id-image')?.files[0];

        if (!name || !email || password !== confirmPassword) {
            showAlert('error', 'Error', 'Please complete all fields correctly.');
            return;
        }

        if (!idFile) {
            showAlert('error', 'Missing ID', 'Government ID image is required.');
            return;
        }

        const registerBtn = document.getElementById('register-btn');
        registerBtn.classList.add('loading');

        try {
            // 🔐 Create Firebase Auth user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 📧 Send Firebase email verification
            await user.sendEmailVerification();

            // ☁️ Upload ID to Cloudinary
            const uploadResult = await uploadToCloudinary(idFile);

            const userData = {
                name,
                email,
                role: 'member',
                isVerified: false, // Admin approval
                isArchived: false,
                createdAt: new Date().toISOString(),

                governmentId: {
                    frontImageUrl: uploadResult.url,
                    publicId: uploadResult.publicId,
                    verified: false
                },

                permissions: {
                    canAnnounce: false,
                    canVerifyUsers: false,
                    canAppointSchedules: false,
                    canInitializeMeetings: false,
                    canUploadResources: false,
                    canPromoteUsers: false
                }
            };

            // 💾 Save to RTDB
            await database.ref(`users/${user.uid}`).set(userData);

            // 📝 Log activity
            await database.ref('activity_table').push({
                type: 'registration',
                userId: user.uid,
                name,
                email,
                role: 'member',
                solved: false,
                timestamp: Date.now()
            });

            showAlert(
                'success',
                'Verify Your Email',
                'Account created! Please verify your email, then wait for admin approval.'
            );

            auth.signOut(); // ⛔ Force logout until verified

        } catch (error) {
            console.error('Register error:', error);
            showAlert('error', 'Registration Failed', error.message);
        } finally {
            registerBtn.classList.remove('loading');
        }
    });
}

// ================== LOGIN ==================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        const loginBtn = document.getElementById('login-btn');
        loginBtn.classList.add('loading');

        try {
            // Set Firebase persistence
            const persistence = rememberMe
                ? firebase.auth.Auth.Persistence.LOCAL
                : firebase.auth.Auth.Persistence.SESSION;

            await auth.setPersistence(persistence);

            // Sign in user
            const cred = await auth.signInWithEmailAndPassword(email, password);
            const user = cred.user;

            // Fetch user data
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            if (!userData) throw new Error('User data not found.');

            // ================= ARCHIVED USER CHECK =================
            if (userData.role !== 'admin' && userData.isArchived === true) {

                sessionStorage.setItem(
                    'authUser',
                    JSON.stringify({ uid: user.uid, ...userData })
                );

                await Swal.fire(
                    'Account Restored',
                    'Your account has been reactivated successfully.',
                    'success'
                );

                await clearArchiveAndRedirect(user.uid, userData.role);
                return;
            }
            // ======================================================

            // If NOT admin and not verified / email not verified → pending page
            if (userData.role !== 'admin' && (!userData.isVerified || !user.emailVerified)) {
                sessionStorage.setItem(
                    'authUser',
                    JSON.stringify({ uid: user.uid, ...userData })
                );
                window.location.href = 'pending.html';
                return;
            }

            // Save user session
            sessionStorage.setItem(
                'authUser',
                JSON.stringify({ uid: user.uid, ...userData })
            );

            // Show welcome alert
            await Swal.fire('Welcome!', 'Logging in!', 'success');

            // Admin OTP handling
            if (userData.role === 'admin') {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();

                sessionStorage.setItem(
                    'adminOTP',
                    JSON.stringify({ otp, timestamp: Date.now(), uid: user.uid })
                );

                try {
                    await emailjs.send(
                        'service_admin_otp',
                        'admin_login_otp',
                        { otp_code: otp }
                    );

                    window.location.href = 'admin-otp.html';
                    return;
                } catch (error) {
                    console.error('OTP send failed:', error);
                    showAlert('error', 'OTP Error', 'Failed to send OTP. Try again.');
                    return;
                }
            }

            // Staff / Member routing
            if (userData.role === 'staff') {
                window.location.href = '../staff/dashboard.html';
            } else {
                window.location.href = '../member/dashboard.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            showAlert('error', 'Login Failed', error.message);
        } finally {
            loginBtn.classList.remove('loading');
        }
    });
}

async function clearArchiveAndRedirect(uid, role) {
    await database.ref(`users/${uid}/isArchived`).remove();

    if (role === 'staff') {
        window.location.href = '../staff/dashboard.html';
    } else {
        window.location.href = '../member/dashboard.html';
    }
}

// ================== PASSWORD RESET ==================
const forgotPassword = document.getElementById('forgot-password');
if (forgotPassword) {
    forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            showAlert('warning', 'Email Required', 'Enter your email first.');
            return;
        }

        auth.sendPasswordResetEmail(email)
            .then(() => {
                showAlert('success', 'Email Sent', 'Password reset email sent.');
            })
            .catch(() => {
                showAlert('error', 'Error', 'Failed to send reset email.');
            });
    });
}
