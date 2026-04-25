document.addEventListener('DOMContentLoaded', () => {
    // Input floating label functionality
    const inputs = document.querySelectorAll('.input-group input');
    
    inputs.forEach(input => {
        // Check initial state (e.g. browser autofill)
        if (input.value) {
            input.classList.add('has-value');
        }

        input.addEventListener('input', () => {
            if (input.value) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });

    // Toggle Password Visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = togglePassword.querySelector('.eye-icon');
    const eyeOffIcon = togglePassword.querySelector('.eye-off-icon');

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        if (type === 'text') {
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
        } else {
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
        }
    });

    // Card Mouse Tracking Glow Effect
    const loginCard = document.getElementById('loginCard');
    const cardGlow = document.getElementById('cardGlow');

    loginCard.addEventListener('mousemove', (e) => {
        const rect = loginCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        cardGlow.style.left = `${x}px`;
        cardGlow.style.top = `${y}px`;
    });

    loginCard.addEventListener('mouseleave', () => {
        cardGlow.style.opacity = '0';
        setTimeout(() => {
            // Reset position when out
            cardGlow.style.left = '50%';
            cardGlow.style.top = '50%';
        }, 300);
    });

    // Form Submit Simulation
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Basic validation
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email && password) {
            // Simulate loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            setTimeout(() => {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                
                // Add success animation
                submitBtn.innerHTML = '<span class="btn-text">Success!</span>';
                submitBtn.style.background = '#0BC5EA';
                
                setTimeout(() => {
                    // Redirect to the Acadex home page
                    window.location.href = '../acadex/index.html';
                }, 1000);
                
            }, 1500);
        }
    });

    // Connect social buttons to the home page as well
    const socialBtns = document.querySelectorAll('.social-btn');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = '../acadex/index.html';
        });
    });
});
