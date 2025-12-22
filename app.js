// DOM Elements
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const registerPasswordInput = document.getElementById('register-password');
const strengthLevel = document.querySelector('.strength-level');
const strengthText = document.querySelector('.strength-text');
const toastContainer = document.getElementById('toast-container');

// Terms & Conditions elements
const termsModal = document.getElementById('terms-modal');
const showTermsLink = document.getElementById('show-terms');
const closeTermsBtn = termsModal?.querySelector('.close-modal');
const agreeTermsBtn = document.getElementById('agree-terms-btn');
const termsCheckbox = document.getElementById('terms-checkbox');

// Toggle between login and register forms
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
    registerContainer.classList.add('fade-in');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    loginContainer.classList.add('fade-in');
});

// Password strength checker
registerPasswordInput.addEventListener('input', () => {
    const password = registerPasswordInput.value;
    const strength = checkPasswordStrength(password);

    strengthLevel.style.width = `${strength.score * 25}%`;

    if (password.length === 0) {
        strengthText.textContent = 'Password strength';
        strengthLevel.style.backgroundColor = '#f0f0f0';
    } else {
        strengthText.textContent = strength.text;
        switch(strength.score) {
            case 1: strengthLevel.style.backgroundColor = '#f44336'; break;
            case 2: strengthLevel.style.backgroundColor = '#ff9800'; break;
            case 3: strengthLevel.style.backgroundColor = '#ffc107'; break;
            case 4: strengthLevel.style.backgroundColor = '#4caf50'; break;
        }
    }
});

function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    score = Math.min(score, 4);

    const texts = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score, text: texts[score] };
}

// Toast helper globally accessible
window.showToast = function(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => toastContainer.removeChild(toast), 3000);
};

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.5s ease forwards; }
`;
document.head.appendChild(style);

// Login password toggle
document.getElementById('login-show-password').addEventListener('change', function() {
    const pwd = document.getElementById('login-password');
    pwd.type = this.checked ? 'text' : 'password';
});

// Register password toggle
document.getElementById('register-show-password').addEventListener('change', function() {
    const pwd = document.getElementById('register-password');
    pwd.type = this.checked ? 'text' : 'password';
});

// Register confirm password toggle
document.getElementById('register-show-confirm-password').addEventListener('change', function() {
    const pwd = document.getElementById('confirm-password');
    pwd.type = this.checked ? 'text' : 'password';
});

// --------------------- TERMS & CONDITIONS LOGIC ---------------------
if (showTermsLink && termsModal && agreeTermsBtn && termsCheckbox) {
    const termsContent = termsModal.querySelector('.terms-content');

    // Open modal
    showTermsLink.addEventListener('click', function(e) {
        e.preventDefault();
        termsModal.style.display = 'block';

        // No need to disable the button anymore
        agreeTermsBtn.disabled = false;
    });

    // Close modal
    closeTermsBtn.addEventListener('click', () => termsModal.style.display = 'none');
    window.addEventListener('click', e => {
        if (e.target === termsModal) termsModal.style.display = 'none';
    });

    // Click "I Agree" button
    agreeTermsBtn.addEventListener('click', function() {
        termsCheckbox.checked = true;
        termsCheckbox.disabled = false; // keep enabled so user can uncheck if needed
        termsModal.style.display = 'none';
    });

    // Prevent register if terms not agreed (optional, still respects checkbox)
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', function(e) {
        if (!termsCheckbox.checked) {
            e.preventDefault();
            Swal.fire({
                icon: 'warning',
                title: 'Terms and Conditions',
                text: 'You must agree to the Terms and Conditions to register.'
            });
        }
    });
}
