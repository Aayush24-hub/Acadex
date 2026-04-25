import { handleLogin, handleLogout, updateUIForUser, updateUIForGuest } from './auth-utils.js';

export let currentUser = null;

export function setupAuthentication() {
  // Set up authentication event listeners and initial UI state
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('mobile-login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('modal-login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);

  // Desktop User Dropdown toggle
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', () => {
      userDropdown.classList.toggle('hidden');
    });
    // Close on outside click
    document.addEventListener('click', (event) => {
      if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Listen to authentication state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      updateUIForUser(user);
      await loadBookmarks();
    } else {
      currentUser = null;
      updateUIForGuest();
    }
  });
}

// Authentication Functions
export async function handleLogin() {
  try {
    document.getElementById('login-modal').classList.add('hidden');
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;

    // Save to Firestore
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      name: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      lastLogin: serverTimestamp()
    }, { merge: true });

    showToast("Successfully logged in!");
  } catch (error) {
    console.warn("Firebase Auth Error (Fallback to Demo Mode):", error.message);
    currentUser = 'demo';
    updateUIForUser({ displayName: 'Demo Student', photoURL: 'https://via.placeholder.com/40', email: 'demo@student.edu' });
    showToast("Logged in as Demo User (No DB Configured)");
  }
}

export async function handleLogout() {
  try {
    if (currentUser !== 'demo') {
      await signOut(auth);
    }
    currentUser = null;
    userBookmarks = [];
    updateUIForGuest();
    document.querySelector('[data-target="home-section"]').click();
    showToast("Logged out");
  } catch (error) {
    console.error("Logout error", error);
  }
}

// UI Update Functions
export function updateUIForUser(user) {
  // Desktop
  document.getElementById('login-btn').classList.add('hidden');
  document.getElementById('user-menu').classList.remove('hidden');
  document.getElementById('nav-user-photo').src = user.photoURL || 'https://via.placeholder.com/40';
  document.getElementById('nav-user-name').textContent = user.displayName;

  // Mobile
  document.getElementById('mobile-login-btn').classList.add('hidden');
  document.getElementById('mobile-user-info').classList.remove('hidden');
  document.getElementById('mobile-user-info').classList.add('flex');
  document.getElementById('mobile-user-photo').src = user.photoURL || 'https://via.placeholder.com/40';
  document.getElementById('mobile-user-name').textContent = user.displayName;

  // Profile Page
  const profPhoto = document.getElementById('prof-photo');
  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  if (profPhoto) {
    profPhoto.src = user.photoURL || 'https://via.placeholder.com/100';
  }
  if (profName) {
    profName.textContent = user.displayName;
  }
  if (profEmail) {
    profEmail.textContent = user.email || '';
  }
}

export function updateUIForGuest() {
  document.getElementById('login-btn').classList.remove('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  document.getElementById('mobile-login-btn').classList.remove('hidden');
  document.getElementById('mobile-user-info').classList.add('hidden');
  document.getElementById('mobile-user-info').classList.remove('flex');
}