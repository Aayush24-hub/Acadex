import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==========================================
// 1. FIREBASE CONFIGURATION & INIT
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// ==========================================
// 2. STATE & MOCK DATA (Hackathon Fallback)
// ==========================================
let currentUser = null;
let userBookmarks = [];
let allResources = [];
let allMarketplace = [];
let allNotices = [];

const mockResources = [
  { id: '1', title: 'Data Structures Midterm', subject: 'CS201', year: '2', category: 'Notes', subcategory: 'Student Notes', fileUrl: '#', uploaderName: 'Alice', typeIcon: 'fa-file-lines' },
  { id: '2', title: 'Calculus Final 2023', subject: 'MATH101', year: '1', category: 'Past Paper', subcategory: 'N/A', fileUrl: '#', uploaderName: 'Bob', typeIcon: 'fa-file-pdf' }
];

const mockMarketplace = [
  { id: '1', name: 'Physics Textbook 10th Ed', price: '45.00', contact: '555-0198', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400' }
];

const mockNotices = [
  { id: '1', title: 'CS201 Lecture Cancelled', category: 'Course', content: 'Todays lecture is cancelled due to weather.', date: 'Today' },
  { id: '2', title: 'Hackathon 2026 Registration', category: 'Event', content: 'Join the annual hackathon! Prizes up to $5k.', date: 'Yesterday' }
];

// ==========================================
// 3. UI CONTROLLERS & UTILS
// ==========================================
const showToast = (msg, isError = false) => {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  document.getElementById('toast-msg').textContent = msg;
  
  if (isError) {
    icon.className = 'fa-solid fa-circle-xmark text-red-400';
  } else {
    icon.className = 'fa-solid fa-circle-check text-green-400';
  }

  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
};

const setupDarkMode = () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleIconMobile = document.getElementById('theme-toggle-icon-mobile');

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
    
    [themeToggleIcon, themeToggleIconMobile].forEach(icon => {
      if(icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
    });
  };

  // Check saved theme
  if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    [themeToggleIcon, themeToggleIconMobile].forEach(icon => {
      if(icon) icon.className = 'fa-solid fa-sun';
    });
  } else {
    document.documentElement.classList.remove('dark');
  }

  if(themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if(themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
};

const setupNavigation = () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  // Mobile menu toggle
  if(mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('data-target');
      if(targetId === 'profile-section' && !currentUser && currentUser !== 'demo') {
        document.getElementById('login-modal').classList.remove('hidden');
        return;
      }

      // Hide all sections
      sections.forEach(s => s.classList.add('hidden'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Show target
      const targetSection = document.getElementById(targetId);
      if(targetSection) {
        targetSection.classList.remove('hidden');
        // trigger reflow
        void targetSection.offsetWidth;
        targetSection.classList.add('active');
      }

      // Update active state on desktop menu
      document.querySelectorAll('.md\\:flex .nav-link').forEach(n => {
        n.classList.remove('text-navy', 'dark:text-white', 'bg-cream-dark', 'dark:bg-slate-700');
        n.classList.add('text-slate-600', 'dark:text-slate-300');
      });
      if(!link.closest('#mobile-menu')) {
        link.classList.add('text-navy', 'dark:text-white', 'bg-cream-dark', 'dark:bg-slate-700');
        link.classList.remove('text-slate-600', 'dark:text-slate-300');
      }

      // Close mobile menu if open
      if(mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }

      // Fetch data based on route
      if(targetId === 'forums-section') loadResources();
      if(targetId === 'marketplace-section') loadMarketplace();
      if(targetId === 'notices-section') loadNotices();
      if(targetId === 'profile-section') renderSavedItems();
    });
  });
};

const setupModals = () => {
  const uploadModal = document.getElementById('upload-modal');
  const marketModal = document.getElementById('market-modal');
  const loginModal = document.getElementById('login-modal');

  document.getElementById('open-upload-modal-btn')?.addEventListener('click', () => {
    if(!currentUser && currentUser !== 'demo') {
      loginModal.classList.remove('hidden');
    } else {
      uploadModal.classList.remove('hidden');
    }
  });
  
  document.getElementById('open-market-modal-btn')?.addEventListener('click', () => {
    if(!currentUser && currentUser !== 'demo') {
      loginModal.classList.remove('hidden');
    } else {
      marketModal.classList.remove('hidden');
    }
  });

  document.getElementById('close-upload-modal')?.addEventListener('click', () => uploadModal.classList.add('hidden'));
  document.getElementById('close-market-modal')?.addEventListener('click', () => marketModal.classList.add('hidden'));
  document.getElementById('close-modal-btn')?.addEventListener('click', () => loginModal.classList.add('hidden'));
};

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================
const handleLogin = async () => {
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
};

const handleLogout = async () => {
  try {
    if(currentUser !== 'demo') {
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
};

const updateUIForUser = (user) => {
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
  if(profPhoto) profPhoto.src = user.photoURL || 'https://via.placeholder.com/100';
  if(profName) profName.textContent = user.displayName;
  if(profEmail) profEmail.textContent = user.email || '';
};

const updateUIForGuest = () => {
  document.getElementById('login-btn').classList.remove('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  document.getElementById('mobile-login-btn').classList.remove('hidden');
  document.getElementById('mobile-user-info').classList.add('hidden');
  document.getElementById('mobile-user-info').classList.remove('flex');
};

const setupAuth = () => {
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('mobile-login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('modal-login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);

  // Desktop User Dropdown toggle
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if(userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', () => {
      userDropdown.classList.toggle('hidden');
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if(!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Listen to Auth State changes
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
};

// ==========================================
// 5. DATA FETCHING & RENDERING (RESOURCES)
// ==========================================
const getCategoryIcon = (cat) => {
  if(cat === 'Notes') return 'fa-file-lines text-blue-500';
  if(cat === 'Past Paper') return 'fa-file-pdf text-red-500';
  if(cat === 'Project') return 'fa-laptop-code text-purple-500';
  return 'fa-file-alt text-slate-500';
};

const renderResources = (data) => {
  const container = document.getElementById('resources-grid');
  container.innerHTML = '';
  
  if (data.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">No resources found matching your filters.</div>';
    return;
  }

  data.forEach(res => {
    const isSaved = userBookmarks.includes(res.id);
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 p-5 flex flex-col h-full hover:shadow-lg transition-shadow';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-navy dark:bg-blue-900 dark:text-blue-200">
          ${res.category}
        </span>
        <button class="bookmark-btn text-slate-400 hover:text-navy dark:hover:text-white transition-colors" data-id="${res.id}">
          <i class="${isSaved ? 'fa-solid text-navy dark:text-white' : 'fa-regular'} fa-bookmark text-lg"></i>
        </button>
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${res.title}</h3>
      <div class="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-4">
        <span><i class="fa-solid fa-book mr-1"></i> ${res.subject}</span>
        <span>Year ${res.year}</span>
      </div>
      <div class="mt-auto flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
        <span class="text-xs text-slate-500 dark:text-slate-400">By ${res.uploaderName}</span>
        <a href="${res.fileUrl}" target="_blank" class="text-navy dark:text-blue-400 hover:underline text-sm font-medium flex items-center gap-1">
          <i class="fa-solid fa-download"></i> View
        </a>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach bookmark events
  container.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', toggleBookmark);
  });
};

const loadResources = async () => {
  try {
    const q = query(collection(db, "resources"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    allResources = [];
    querySnapshot.forEach((doc) => {
      allResources.push({ id: doc.id, ...doc.data() });
    });
    if(allResources.length === 0) allResources = mockResources;
    filterResources();
  } catch (error) {
    console.warn("Using mock resources (Firebase not configured)");
    allResources = mockResources;
    filterResources();
  }
};

const filterResources = () => {
  const searchTerm = document.getElementById('resource-search').value.toLowerCase();
  const cat = document.getElementById('filter-category').value;
  const year = document.getElementById('filter-year').value;

  const filtered = allResources.filter(res => {
    const matchSearch = res.title.toLowerCase().includes(searchTerm) || res.subject.toLowerCase().includes(searchTerm);
    const matchCat = cat === 'all' || res.category === cat;
    const matchYear = year === 'all' || res.year === year;
    return matchSearch && matchCat && matchYear;
  });

  renderResources(filtered);
};

// ==========================================
// 6. MARKETPLACE & NOTICES
// ==========================================
const renderMarketplace = (data) => {
  const container = document.getElementById('market-grid');
  container.innerHTML = '';
  
  if (data.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">No items available.</div>';
    return;
  }

  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-lg transition-shadow';
    card.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.name}" class="h-48 w-full object-cover">
      <div class="p-4 flex flex-col flex-grow">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${item.name}</h3>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">$${item.price}</div>
        <a href="tel:${item.contact}" class="mt-auto w-full block text-center bg-cream hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2 rounded-md transition-colors text-sm font-medium border border-slate-200 dark:border-slate-600">
          <i class="fa-solid fa-phone mr-1"></i> Contact Seller
        </a>
      </div>
    `;
    container.appendChild(card);
  });
};

const loadMarketplace = async () => {
  try {
    const q = query(collection(db, "marketplace"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    allMarketplace = [];
    querySnapshot.forEach((doc) => {
      allMarketplace.push({ id: doc.id, ...doc.data() });
    });
    if(allMarketplace.length === 0) allMarketplace = mockMarketplace;
    renderMarketplace(allMarketplace);
  } catch (error) {
    allMarketplace = mockMarketplace;
    renderMarketplace(allMarketplace);
  }
};

const renderNotices = (category = 'all') => {
  const container = document.getElementById('notices-feed');
  container.innerHTML = '';
  
  const filtered = category === 'all' ? allNotices : allNotices.filter(n => n.category === category);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-500">No notices in this category.</div>';
    return;
  }

  filtered.forEach(notice => {
    const bgColors = {
      'Course': 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      'Student': 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      'Club': 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
      'Recruitment': 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
      'Event': 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
    };
    const bgClass = bgColors[notice.category] || 'bg-slate-50 dark:bg-slate-800 border-slate-200';

    const card = document.createElement('div');
    card.className = `rounded-lg p-5 border ${bgClass}`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">${notice.category}</span>
        <span class="text-xs text-slate-400 dark:text-slate-500">${notice.date}</span>
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">${notice.title}</h3>
      <p class="text-slate-700 dark:text-slate-300 text-sm">${notice.content}</p>
    `;
    container.appendChild(card);
  });
};

const loadNotices = async () => {
  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    allNotices = [];
    querySnapshot.forEach((doc) => {
      allNotices.push({ id: doc.id, ...doc.data() });
    });
    if(allNotices.length === 0) allNotices = mockNotices;
    renderNotices();
  } catch (error) {
    allNotices = mockNotices;
    renderNotices();
  }
};

// ==========================================
// 7. BOOKMARKS & PROFILE
// ==========================================
const toggleBookmark = async (e) => {
  if(!currentUser && currentUser !== 'demo') {
    document.getElementById('login-modal').classList.remove('hidden');
    return;
  }

  const btn = e.currentTarget;
  const resourceId = btn.getAttribute('data-id');
  const icon = btn.querySelector('i');
  
  const isSaved = icon.classList.contains('fa-solid');
  
  // Optimistic UI Update
  if (isSaved) {
    icon.classList.remove('fa-solid', 'text-navy', 'dark:text-white');
    icon.classList.add('fa-regular');
    userBookmarks = userBookmarks.filter(id => id !== resourceId);
  } else {
    icon.classList.remove('fa-regular');
    icon.classList.add('fa-solid', 'text-navy', 'dark:text-white');
    if(!userBookmarks.includes(resourceId)) userBookmarks.push(resourceId);
  }

  // Actual DB Call
  if(currentUser && currentUser.uid) {
    try {
      const bookmarkRef = doc(db, 'users', currentUser.uid, 'bookmarks', resourceId);
      if(isSaved) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, { savedAt: serverTimestamp() });
      }
    } catch (err) {
      console.warn("DB not connected for bookmark.");
    }
  }

  if(document.getElementById('profile-section').classList.contains('active')) {
    renderSavedItems();
  }
};

const loadBookmarks = async () => {
  if(!currentUser || currentUser === 'demo') return;
  try {
    const q = query(collection(db, 'users', currentUser.uid, 'bookmarks'));
    const querySnapshot = await getDocs(q);
    userBookmarks = [];
    querySnapshot.forEach((doc) => {
      userBookmarks.push(doc.id);
    });
  } catch (error) {
    console.warn("Could not fetch bookmarks.");
  }
};

const renderSavedItems = () => {
  const container = document.getElementById('saved-grid');
  if(!container) return;
  
  const savedResources = allResources.filter(res => userBookmarks.includes(res.id));
  
  container.innerHTML = '';
  if (savedResources.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white dark:bg-slate-800 p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center">
        <i class="fa-regular fa-bookmark text-4xl text-slate-300 dark:text-slate-600 mb-3"></i>
        <p class="text-slate-500 dark:text-slate-400">You haven't saved any resources yet.</p>
      </div>`;
    return;
  }

  // Re-use rendering logic but append to saved-grid
  savedResources.forEach(res => {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 p-4 flex flex-col h-full relative';
    card.innerHTML = `
      <button class="bookmark-btn absolute top-4 right-4 text-navy dark:text-white transition-colors" data-id="${res.id}">
        <i class="fa-solid fa-bookmark text-lg"></i>
      </button>
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-navy dark:bg-blue-900 dark:text-blue-200 w-max mb-2">
        ${res.category}
      </span>
      <h3 class="text-md font-bold text-slate-900 dark:text-white mb-1 pr-6">${res.title}</h3>
      <div class="text-xs text-slate-500 dark:text-slate-400 mb-4">${res.subject} • Year ${res.year}</div>
      <a href="${res.fileUrl}" target="_blank" class="mt-auto text-navy dark:text-blue-400 hover:underline text-sm font-medium">View Resource &rarr;</a>
    `;
    container.appendChild(card);
  });

  // Attach unbookmark event specific to profile view
  container.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      toggleBookmark(e);
      // Remove card immediately from DOM for snappiness
      e.currentTarget.closest('.bg-white').remove();
      if(container.children.length === 0) renderSavedItems(); // show empty state
    });
  });
};


// ==========================================
// 8. FORM SUBMISSIONS & UPLOADS
// ==========================================
const uploadFile = async (file, path) => {
  if(currentUser === 'demo') {
    // Return mock URL
    return new Promise(resolve => setTimeout(() => resolve('https://via.placeholder.com/150'), 1000));
  }

  const uniqueFileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${path}/${uniqueFileName}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed', null, reject, async () => {
      try {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      } catch (err) {
        reject(err);
      }
    });
  });
};

const setupForms = () => {
  // Filters
  document.getElementById('resource-search')?.addEventListener('input', filterResources);
  document.getElementById('filter-category')?.addEventListener('change', filterResources);
  document.getElementById('filter-year')?.addEventListener('change', filterResources);

  // Notice Filters
  document.querySelectorAll('.notice-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.notice-filter-btn').forEach(b => {
        b.classList.remove('bg-navy', 'text-white');
        b.classList.add('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-300');
      });
      e.target.classList.remove('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-300');
      e.target.classList.add('bg-navy', 'text-white');
      renderNotices(e.target.getAttribute('data-category'));
    });
  });

  // Resource Upload Form
  document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('up-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Uploading...';

    try {
      const title = document.getElementById('up-title').value;
      const subject = document.getElementById('up-subject').value;
      const year = document.getElementById('up-year').value;
      const category = document.getElementById('up-category').value;
      const subcategory = document.getElementById('up-subcategory').value;
      const file = document.getElementById('up-file').files[0];

      const fileUrl = await uploadFile(file, `resources/${subject}`);

      const data = {
        title, subject, year, category, subcategory, fileUrl,
        uploaderId: currentUser?.uid || 'demo_id',
        uploaderName: currentUser?.displayName || 'Demo User',
      };

      if(currentUser !== 'demo') {
        await addDoc(collection(db, "resources"), { ...data, createdAt: serverTimestamp() });
      } else {
        allResources.unshift({ id: 'mock_'+Date.now(), ...data });
      }

      showToast("Resource uploaded successfully!");
      document.getElementById('upload-modal').classList.add('hidden');
      e.target.reset();
      filterResources(); // Re-render

    } catch (error) {
      showToast("Failed to upload: " + error.message, true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Submit Resource';
    }
  });

  // Marketplace Add Form
  document.getElementById('market-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('mkt-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Posting...';

    try {
      const name = document.getElementById('mkt-name').value;
      const price = document.getElementById('mkt-price').value;
      const contact = document.getElementById('mkt-contact').value;
      const file = document.getElementById('mkt-file').files[0];

      const imageUrl = await uploadFile(file, 'marketplace');

      const data = {
        name, price, contact, imageUrl,
        sellerId: currentUser?.uid || 'demo_id'
      };

      if(currentUser !== 'demo') {
        await addDoc(collection(db, "marketplace"), { ...data, createdAt: serverTimestamp() });
      } else {
        allMarketplace.unshift({ id: 'mock_'+Date.now(), ...data });
      }

      showToast("Item listed successfully!");
      document.getElementById('market-modal').classList.add('hidden');
      e.target.reset();
      renderMarketplace(allMarketplace);

    } catch (error) {
      showToast("Failed to list item: " + error.message, true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Post Listing';
    }
  });

  // Profile Update Mock
  document.getElementById('save-prof-btn')?.addEventListener('click', () => {
    showToast("Profile information updated!");
  });

  // Add Notice Mock
  document.getElementById('add-notice-mock-btn')?.addEventListener('click', () => {
    allNotices.unshift({
      id: 'mock_'+Date.now(),
      title: 'New Mock Event',
      category: 'Club',
      content: 'This is a mock notice added by admin.',
      date: 'Just now'
    });
    renderNotices();
    showToast("Notice added.");
  });
};

// ==========================================
// 9. INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupNavigation();
  setupAuth();
  setupModals();
  setupForms();
});
