import { showToast } from './utils/toast.js';
import { setupDarkMode } from './utils/dark-mode.js';
import { setupNavigation } from './utils/navigation.js';
import { setupModals } from './utils/modals.js';

export function setupUIControllers() {
  setupDarkMode();
  setupNavigation();
  setupModals();
}

// Toast Message Utility Function
//show's toast message
export function showToast(message, isError = false) {
  const toastElement = document.getElementById('toast');
  const iconElement = document.getElementById('toast-icon');
  const messageElement = document.getElementById('toast-message');

  messageElement.textContent = message;

  if (isError) {
    iconElement.className = 'fa-solid fa-circle-xmark text-red-400';
  } else {
    iconElement.className = 'fa-solid fa-circle-check text-green-400';
  }

  toastElement.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toastElement.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// Dark Mode Toggling Functionality
export function setupDarkMode() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleIconMobile = document.getElementById('theme-toggle-icon-mobile');

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('color-theme', isDark ? 'dark' : 'light');

    [themeToggleIcon, themeToggleIconMobile].forEach((icon) => {
      if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
    });
  };

  // Check saved theme
  if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    [themeToggleIcon, themeToggleIconMobile].forEach((icon) => {
      if (icon) {
        icon.className = 'fa-solid fa-sun';
      }
    });
  } else {
    document.documentElement.classList.remove('dark');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  if (themeToggleMobile) {
    themeToggleMobile.addEventListener('click', toggleTheme);
  }
}

// Navigation Setup
export function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  // Mobile menu toggle
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const targetId = link.getAttribute('data-target');
      if (targetId === 'profile-section' && !currentUser && currentUser !== 'demo') {
        document.getElementById('login-modal').classList.remove('hidden');
        return;
      }

      // Hide all sections
      sections.forEach((section) => {
        section.classList.add('hidden');
        section.classList.remove('active');
      });

      // Show target
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        // trigger reflow
        void targetSection.offsetWidth;
        targetSection.classList.add('active');
      }

      // Update active state on desktop menu
      document.querySelectorAll('.md\\:flex .nav-link').forEach((navLink) => {
        navLink.classList.remove('text-navy', 'dark:text-white', 'bg-cream-dark', 'dark:bg-slate-700');
        navLink.classList.add('text-slate-600', 'dark:text-slate-300');
      });
      if (!link.closest('#mobile-menu')) {
        link.classList.add('text-navy', 'dark:text-white', 'bg-cream-dark', 'dark:bg-slate-700');
        link.classList.remove('text-slate-600', 'dark:text-slate-300');
      }

      // Close mobile menu if open
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }

      // Fetch data based on route
      if (targetId === 'forums-section') {
        loadResources();
      }
      if (targetId === 'marketplace-section') {
        loadMarketplace();
      }
      if (targetId === 'notices-section') {
        loadNotices();
      }
      if (targetId === 'profile-section') {
        renderSavedItems();
      }
    });
  });
}

// Modal Handling
export function setupModals() {
  const uploadModal = document.getElementById('upload-modal');
  const marketModal = document.getElementById('market-modal');
  const loginModal = document.getElementById('login-modal');

  document.getElementById('open-upload-modal-btn')?.addEventListener('click', () => {
    if (!currentUser && currentUser !== 'demo') {
      loginModal.classList.remove('hidden');
    } else {
      uploadModal.classList.remove('hidden');
    }
  });

  document.getElementById('open-market-modal-btn')?.addEventListener('click', () => {
    if (!currentUser && currentUser !== 'demo') {
      loginModal.classList.remove('hidden');
    } else {
      marketModal.classList.remove('hidden');
    }
  });

  document.getElementById('close-upload-modal')?.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
  });
  document.getElementById('close-market-modal')?.addEventListener('click', () => {
    marketModal.classList.add('hidden');
  });
  document.getElementById('close-modal-btn')?.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });
}