// ============================================
// 🔧 ADMIN PANEL - COMPLETE VERSION
// ============================================

// Global state
let currentUser = null;
let currentSection = 'calendar';
let editingItem = null;
let allSubjects = [];

// Time slots mapping
const TIME_SLOTS = [
    { index: 0, time: "09:00 AM - 10:15 AM", start: "09:00 AM" },
    { index: 1, time: "10:15 AM - 11:30 AM", start: "10:15 AM" },
    { index: 2, time: "11:30 AM - 12:45 PM", start: "11:30 AM" },
    { index: 3, time: "01:00 PM - 02:15 PM", start: "01:00 PM" },
    { index: 4, time: "02:15 PM - 03:30 PM", start: "02:15 PM" },
    { index: 5, time: "03:30 PM - 04:45 PM", start: "03:30 PM" }
];

// Tag colors for announcements
const ANNOUNCEMENT_TAG_COLORS = [
    { name: 'Blue', class: 'bg-blue-100 text-blue-800 border-blue-300' },
    { name: 'Red', class: 'bg-red-100 text-red-800 border-red-300' },
    { name: 'Green', class: 'bg-green-100 text-green-800 border-green-300' },
    { name: 'Orange', class: 'bg-orange-100 text-orange-800 border-orange-300' }
];

// Category colors for assignments
const ASSIGNMENT_CATEGORY_COLORS = [
    { name: 'Blue', class: 'bg-blue-100 text-blue-700' },
    { name: 'Purple', class: 'bg-purple-100 text-purple-700' },
    { name: 'Green', class: 'bg-green-100 text-green-700' },
    { name: 'Pink', class: 'bg-pink-100 text-pink-700' }
];

// ============================================
// 🚀 INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await checkAuth();
        setupEventListeners();
        setupAuthListener();
    }, 200);
});

async function checkAuth() {
    showLoading(true);
    currentUser = await getCurrentUser();
    
    if (currentUser) {
        showAdminDashboard();
        await loadDashboardStats();
    } else {
        showLoginPage();
    }
    
    showLoading(false);
}

function setupAuthListener() {
    onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showAdminDashboard();
            loadDashboardStats();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLoginPage();
        }
    });
}

// ============================================
// 🎨 UI FUNCTIONS
// ============================================

function showLoginPage() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-email').textContent = currentUser.email;
    loadDashboardStats();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

async function loadDashboardStats() {
    try {
        const tables = ['Calendar', 'Announcements', 'Assignments', 'Subjects', 'Schedule', 'Contacts'];
        
        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (!error) {
                const lowerTable = table.toLowerCase();
                const countElement = document.getElementById(`${lowerTable}-count`);
                const statElement = document.getElementById(`stat-${lowerTable}`);
                
                if (countElement) countElement.textContent = count || 0;
                if (statElement) statElement.textContent = count || 0;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function openEditor(section) {
    currentSection = section;
    const modal = document.getElementById('editor-modal');
    const title = document.getElementById('editor-title');
    const subtitle = document.getElementById('editor-subtitle');
    
    const titles = {
        'calendar': 'Calendar Events',
        'announcements': 'Announcements',
        'assignments': 'Assignments',
        'subjects': 'Subjects & Resources',
        'schedule': 'Class Schedule',
        'contacts': 'Contact Information'
    };
    
    title.textContent = titles[section] || 'Editor';
    subtitle.textContent = `Manage your ${titles[section].toLowerCase()}`;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    loadSectionData(section);
}

function closeEditor() {
    document.getElementById('editor-modal').classList.add('hidden');
    document.getElementById('editor-modal').classList.remove('flex');
}

function closeForm() {
    document.getElementById('form-modal').classList.add('hidden');
    document.getElementById('form-modal').classList.remove('flex');
    editingItem = null;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const toastDiv = toast.querySelector('div');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        toastDiv.style.borderColor = '#10b981';
    } else if (type === 'error') {
        toastIcon.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        toastDiv.style.borderColor = '#ef4444';
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

// ============================================
// 🔐 AUTH FUNCTIONS
// ============================================

function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const addNewBtn = document.getElementById('add-new-btn');
    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => openAddModal(currentSection));
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    try {
        await signIn(email, password);
    } catch (error) {
        showToast(error.message, 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

async function handleLogout() {
    showLoading(true);
    try {
        await signOut();
    } catch (error) {
        showToast('Error signing out: ' + error.message, 'error');
    }
    showLoading(false);
}

// ============================================
// 📊 DATA LOADING FUNCTIONS
// ============================================

async function loadSectionData(section) {
    showLoading(true);
    
    try {
        switch(section) {
            case 'calendar':
                await loadCalendar();
                break;
            case 'announcements':
                await loadAnnouncements();
                break;
            case 'assignments':
                await loadAssignments();
                break;
            case 'subjects':
                await loadSubjects();
                break;
            case 'schedule':
                await loadSchedule();
                break;
            case 'contacts':
                await loadContacts();
                break;
        }
    } catch (error) {
        showToast('Error loading data: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// ============================================
// 🗓️ CALENDAR FUNCTIONS
// ============================================

async function loadCalendar() {
    const { data, error } = await supabase
        .from('Calendar')
        .select('*')
        .order('date', { ascending: true });
    
    if (error) throw error;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No events yet</p>';
        return;
    }
    
    data.forEach(event => {
        const eventCard = createCalendarCard(event);
        container.appendChild(eventCard);
    });
}

function createCalendarCard(event) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="text-sm text-blue-600 font-semibold mb-1">${new Date(event.date).toLocaleDateString()}</div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">${event.title}</h3>
                <p class="text-gray-600 text-sm">${event.description}</p>
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('calendar', ${event.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('calendar', ${event.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// 📢 ANNOUNCEMENTS FUNCTIONS
// ============================================

async function loadAnnouncements() {
    const { data, error } = await supabase
        .from('Announcements')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No announcements yet</p>';
        return;
    }
    
    data.forEach(announcement => {
        const card = createAnnouncementCard(announcement);
        container.appendChild(card);
    });
}

function createAnnouncementCard(announcement) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    
    const tagColor = announcement.tagcolor || 'bg-blue-100 text-blue-800 border-blue-300';
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full border ${tagColor} mb-2">
                    ${announcement.category}
                </span>
                <h3 class="text-lg font-bold text-gray-800 mb-2">${announcement.title}</h3>
                <p class="text-gray-600 text-sm">${announcement.description}</p>
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('announcements', ${announcement.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('announcements', ${announcement.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// 📝 ASSIGNMENTS FUNCTIONS
// ============================================

async function loadAssignments() {
    const { data, error } = await supabase
        .from('Assignments')
        .select('*')
        .order('deadline', { ascending: true });
    
    if (error) throw error;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No assignments yet</p>';
        return;
    }
    
    data.forEach(assignment => {
        const card = createAssignmentCard(assignment);
        container.appendChild(card);
    });
}

function createAssignmentCard(assignment) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    
    const categoryColor = assignment.categorycolor || 'bg-blue-100 text-blue-700';
    const links = assignment.relatedlinks ? (typeof assignment.relatedlinks === 'string' ? JSON.parse(assignment.relatedlinks) : assignment.relatedlinks) : [];
    const linksHtml = Array.isArray(links) && links.length > 0 ? 
        `<div class="mt-2"><span class="text-xs text-gray-500">${links.length} related link(s)</span></div>` : '';
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        ${assignment.subjectname || 'N/A'}
                    </span>
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full ${categoryColor}">
                        ${assignment.category || 'N/A'}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">${assignment.title}</h3>
                <p class="text-gray-600 text-sm mb-2">${assignment.description}</p>
                <div class="text-sm text-red-600 font-medium">Due: ${new Date(assignment.deadline).toLocaleDateString()}</div>
                ${linksHtml}
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('assignments', ${assignment.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('assignments', ${assignment.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// 📘 SUBJECTS FUNCTIONS
// ============================================

async function loadSubjects() {
    const { data, error } = await supabase
        .from('Subjects')
        .select('*')
        .order('subjectname', { ascending: true });
    
    if (error) throw error;
    
    allSubjects = data;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No subjects yet</p>';
        return;
    }
    
    data.forEach(subject => {
        const card = createSubjectCard(subject);
        container.appendChild(card);
    });
}

function createSubjectCard(subject) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    
    const resources = subject.resources || {};
    const resourceCount = Object.keys(resources).reduce((acc, key) => acc + (resources[key]?.length || 0), 0);
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        ${subject.coursecode || 'N/A'}
                    </span>
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full ${subject.tag === 'Lab' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}">
                        ${subject.tag || 'N/A'}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">${subject.subjectname}</h3>
                <p class="text-gray-600 text-sm mb-2">${subject.teachername || 'N/A'}</p>
                <div class="text-xs text-gray-500">${resourceCount} resource(s) in ${Object.keys(resources).length} categories</div>
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('subjects', ${subject.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('subjects', ${subject.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// ⏰ SCHEDULE FUNCTIONS
// ============================================

async function loadSchedule() {
    const { data, error } = await supabase
        .from('Schedule')
        .select('*')
        .order('day', { ascending: true })
        .order('timeslot_index', { ascending: true });
    
    if (error) throw error;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No schedule entries yet</p>';
        return;
    }
    
    data.forEach(schedule => {
        const card = createScheduleCard(schedule);
        container.appendChild(card);
    });
}

function createScheduleCard(schedule) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    
    const timeSlot = TIME_SLOTS.find(slot => slot.index === schedule.timeslot_index);
    const timeDisplay = timeSlot ? timeSlot.time : schedule.starttime;
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${schedule.day}
                    </span>
                    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full ${schedule.type === 'Lab' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
                        ${schedule.type}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">${schedule.subjectname}</h3>
                <div class="text-gray-600 text-sm space-y-1">
                    <div>Teacher: ${schedule.teachername}</div>
                    <div>Room: ${schedule.room}</div>
                    <div>Time: ${timeDisplay}</div>
                </div>
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('schedule', ${schedule.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('schedule', ${schedule.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// 📞 CONTACTS FUNCTIONS
// ============================================

async function loadContacts() {
    const { data, error } = await supabase
        .from('Contacts')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) throw error;
    
    const container = document.getElementById('editor-content');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No contacts yet</p>';
        return;
    }
    
    data.forEach(contact => {
        const card = createContactCard(contact);
        container.appendChild(card);
    });
}

function createContactCard(contact) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition';
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-800 mb-1">${contact.name}</h3>
                <p class="text-blue-600 text-sm font-medium mb-2">${contact.designation}</p>
                <div class="text-gray-600 text-sm space-y-1">
                    <div>📧 ${contact.email}</div>
                    <div>📞 ${contact.contactnumber}</div>
                    <div class="text-xs text-gray-500 mt-2">${contact.contactinstructions || 'No instructions'}</div>
                </div>
            </div>
            <div class="flex gap-2 ml-4">
                <button onclick="editItem('contacts', ${contact.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                    Edit
                </button>
                <button onclick="deleteItem('contacts', ${contact.id})" class="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
// ✏️ MODAL & FORM FUNCTIONS
// ============================================

function openAddModal(section) {
    editingItem = null;
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('form-title');
    const modalForm = document.getElementById('item-form');
    
    modalTitle.textContent = `Add ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    modalForm.innerHTML = getFormFields(section, null);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Initialize dynamic forms
    if (section === 'subjects') {
        initSubjectResourceForm();
    } else if (section === 'assignments') {
        initAssignmentLinksForm();
    }
}

async function editItem(section, id) {
    showLoading(true);
    
    const tableName = getTableName(section);
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Error loading item: ' + error.message, 'error');
        showLoading(false);
        return;
    }
    
    editingItem = data;
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('form-title');
    const modalForm = document.getElementById('item-form');
    
    modalTitle.textContent = `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    modalForm.innerHTML = getFormFields(section, data);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    showLoading(false);
    
    // Initialize dynamic forms
    if (section === 'subjects') {
        initSubjectResourceForm();
    } else if (section === 'assignments') {
        initAssignmentLinksForm();
    }
}

function getTableName(section) {
    const tableMap = {
        'calendar': 'Calendar',
        'announcements': 'Announcements',
        'assignments': 'Assignments',
        'subjects': 'Subjects',
        'schedule': 'Schedule',
        'contacts': 'Contacts'
    };
    return tableMap[section];
}

function getFormFields(section, data) {
    let fields = '';
    
    switch(section) {
        case 'calendar':
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input type="date" id="field-date" value="${data?.date || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" id="field-title" value="${data?.title || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea id="field-description" rows="3" required
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${data?.description || ''}</textarea>
                </div>
            `;
            break;
            
        case 'announcements':
            // Build tag color dropdown
            const announcementColorOptions = ANNOUNCEMENT_TAG_COLORS.map(color => 
                `<option value="${color.class}" ${data?.tagcolor === color.class ? 'selected' : ''}>${color.name}</option>`
            ).join('');
            
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input type="text" id="field-category" value="${data?.category || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="e.g., Important, Assignment, General">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tag Color</label>
                    <select id="field-tagcolor" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        ${announcementColorOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" id="field-title" value="${data?.title || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea id="field-description" rows="4" required
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${data?.description || ''}</textarea>
                </div>
            `;
            break;
            
        case 'assignments':
            // Build category color dropdown
            const categoryColorOptions = ASSIGNMENT_CATEGORY_COLORS.map(color => 
                `<option value="${color.class}" ${data?.categorycolor === color.class ? 'selected' : ''}>${color.name}</option>`
            ).join('');
            
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                    <input type="text" id="field-subjectname" value="${data?.subjectname || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input type="text" id="field-category" value="${data?.category || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="e.g., Assignment, Project, Presentation">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category Color</label>
                    <select id="field-categorycolor" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        ${categoryColorOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" id="field-title" value="${data?.title || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea id="field-description" rows="3" required
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${data?.description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                    <input type="datetime-local" id="field-deadline" value="${data?.deadline ? data.deadline.slice(0, 16) : ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Related Links</label>
                    <div id="assignment-links-container" class="space-y-2 mb-2">
                        <!-- Dynamic links will be added here -->
                    </div>
                    <button type="button" onclick="addAssignmentLink()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        + Add Link
                    </button>
                </div>
            `;
            break;
            
        case 'subjects':
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                    <input type="text" id="field-subjectname" value="${data?.subjectname || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                    <input type="text" id="field-coursecode" value="${data?.coursecode || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Teacher Name</label>
                    <input type="text" id="field-teachername" value="${data?.teachername || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                    <select id="field-tag" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="Theory" ${data?.tag === 'Theory' ? 'selected' : ''}>Theory</option>
                        <option value="Lab" ${data?.tag === 'Lab' ? 'selected' : ''}>Lab</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Drive Folder Link</label>
                    <input type="url" id="field-drivefolder" value="${data?.drivefolder || ''}" 
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="https://drive.google.com/...">
                    <p class="text-xs text-gray-500 mt-1">Link to the main Google Drive folder for this subject</p>
                </div>
                <div class="border-t pt-4 mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Resources</label>
                    <div id="subject-resources-container" class="space-y-4">
                        <!-- Dynamic categories will be added here -->
                    </div>
                    <button type="button" onclick="addSubjectCategory()" class="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        + Add Category
                    </button>
                </div>
            `;
            break;
            
        case 'schedule':
            let selectedSlotIndex = 0;
            if (data?.timeslot_index !== undefined) {
                selectedSlotIndex = data.timeslot_index;
            }
            
            const timeSlotOptions = TIME_SLOTS.map(slot => 
                `<option value="${slot.index}" ${selectedSlotIndex === slot.index ? 'selected' : ''}>${slot.time}</option>`
            ).join('');
            
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Day</label>
                    <select id="field-day" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="Sunday" ${data?.day === 'Sunday' ? 'selected' : ''}>Sunday</option>
                        <option value="Monday" ${data?.day === 'Monday' ? 'selected' : ''}>Monday</option>
                        <option value="Tuesday" ${data?.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
                        <option value="Wednesday" ${data?.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
                        <option value="Thursday" ${data?.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
                        <option value="Friday" ${data?.day === 'Friday' ? 'selected' : ''}>Friday</option>
                        <option value="Saturday" ${data?.day === 'Saturday' ? 'selected' : ''}>Saturday</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
                    <select id="field-timeslot" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        ${timeSlotOptions}
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Select the time slot for this class</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                    <input type="text" id="field-subjectname" value="${data?.subjectname || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Teacher Name</label>
                    <input type="text" id="field-teachername" value="${data?.teachername || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Room</label>
                    <input type="text" id="field-room" value="${data?.room || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select id="field-type" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="Theory" ${data?.type === 'Theory' ? 'selected' : ''}>Theory</option>
                        <option value="Lab" ${data?.type === 'Lab' ? 'selected' : ''}>Lab (spans 2 slots)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                    <select id="field-bgcolor" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="white" ${data?.bgcolor === 'white' ? 'selected' : ''}>White</option>
                        <option value="blue" ${data?.bgcolor === 'blue' ? 'selected' : ''}>Blue</option>
                    </select>
                </div>
            `;
            break;
            
        case 'contacts':
            fields = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" id="field-name" value="${data?.name || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <input type="text" id="field-designation" value="${data?.designation || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" id="field-email" value="${data?.email || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <input type="tel" id="field-contactnumber" value="${data?.contactnumber || ''}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contact Instructions</label>
                    <textarea id="field-contactinstructions" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${data?.contactinstructions || ''}</textarea>
                </div>
            `;
            break;
    }
    
    return fields;
}

// ============================================
// 📚 SUBJECT RESOURCES DYNAMIC FORM
// ============================================

function initSubjectResourceForm() {
    const container = document.getElementById('subject-resources-container');
    if (!container) return;
    
    // Load existing resources if editing
    const resources = editingItem?.resources || {};
    
    if (Object.keys(resources).length === 0) {
        // Add one empty category by default
        addSubjectCategory();
    } else {
        // Load existing categories
        Object.keys(resources).forEach(categoryName => {
            const files = resources[categoryName] || [];
            addSubjectCategory(categoryName, files);
        });
    }
}

function addSubjectCategory(categoryName = '', files = []) {
    const container = document.getElementById('subject-resources-container');
    const categoryIndex = container.children.length;
    
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'border border-gray-300 rounded-lg p-4 bg-gray-50';
    categoryDiv.dataset.categoryIndex = categoryIndex;
    
    categoryDiv.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <input type="text" class="category-name flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                   placeholder="Category Name (e.g., Books, Slides)" value="${categoryName}" required>
            <button type="button" onclick="removeSubjectCategory(${categoryIndex})" 
                    class="ml-2 text-red-600 hover:text-red-800 px-3 py-2 rounded bg-red-50 hover:bg-red-100">
                Remove
            </button>
        </div>
        <div class="files-container space-y-2 mb-2" data-category="${categoryIndex}">
            <!-- Files will be added here -->
        </div>
        <button type="button" onclick="addSubjectFile(${categoryIndex})" 
                class="text-sm text-green-600 hover:text-green-800 font-medium">
            + Add File
        </button>
    `;
    
    container.appendChild(categoryDiv);
    
    // Add existing files or one empty file
    if (files.length === 0) {
        addSubjectFile(categoryIndex);
    } else {
        files.forEach(file => {
            addSubjectFile(categoryIndex, file.title || file.name || '', file.url || file.link || '');
        });
    }
}

function addSubjectFile(categoryIndex, fileName = '', fileUrl = '') {
    const filesContainer = document.querySelector(`.files-container[data-category="${categoryIndex}"]`);
    if (!filesContainer) return;
    
    const fileIndex = filesContainer.children.length;
    
    const fileDiv = document.createElement('div');
    fileDiv.className = 'flex gap-2 items-center file-entry';
    fileDiv.dataset.fileIndex = fileIndex;
    
    fileDiv.innerHTML = `
        <input type="text" class="file-name flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
               placeholder="File Name" value="${fileName}" required>
        <input type="url" class="file-url flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
               placeholder="File URL (https://...)" value="${fileUrl}" required>
        <button type="button" onclick="removeSubjectFile(this)" 
                class="text-red-600 hover:text-red-800 text-sm px-2 py-2">
            ✕
        </button>
    `;
    
    filesContainer.appendChild(fileDiv);
}

function removeSubjectCategory(categoryIndex) {
    const container = document.getElementById('subject-resources-container');
    const categoryDiv = container.querySelector(`[data-category-index="${categoryIndex}"]`);
    if (categoryDiv) {
        categoryDiv.remove();
    }
}

function removeSubjectFile(button) {
    button.closest('.file-entry').remove();
}

// ============================================
// 📝 ASSIGNMENT LINKS DYNAMIC FORM
// ============================================

function initAssignmentLinksForm() {
    const container = document.getElementById('assignment-links-container');
    if (!container) return;
    
    // Load existing links if editing
    let links = [];
    if (editingItem?.relatedlinks) {
        try {
            links = typeof editingItem.relatedlinks === 'string' 
                ? JSON.parse(editingItem.relatedlinks) 
                : editingItem.relatedlinks;
        } catch (e) {
            console.error('Error parsing links:', e);
        }
    }
    
    if (links.length === 0) {
        // Add one empty link by default
        addAssignmentLink();
    } else {
        // Load existing links
        links.forEach(link => {
            addAssignmentLink(link);
        });
    }
}

function addAssignmentLink(linkUrl = '') {
    const container = document.getElementById('assignment-links-container');
    if (!container) return;
    
    const linkDiv = document.createElement('div');
    linkDiv.className = 'flex gap-2 items-center link-entry';
    
    linkDiv.innerHTML = `
        <input type="url" class="link-url flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
               placeholder="Enter URL (https://...)" value="${linkUrl}">
        <button type="button" onclick="removeAssignmentLink(this)" 
                class="text-red-600 hover:text-red-800 text-sm px-2 py-2">
            ✕
        </button>
    `;
    
    container.appendChild(linkDiv);
}

function removeAssignmentLink(button) {
    button.closest('.link-entry').remove();
}

// ============================================
// 💾 SAVE FUNCTIONS
// ============================================

async function saveItem() {
    showLoading(true);
    
    try {
        const formData = getFormData(currentSection);
        const tableName = getTableName(currentSection);
        
        if (editingItem) {
            const { error } = await supabase
                .from(tableName)
                .update(formData)
                .eq('id', editingItem.id);
            
            if (error) throw error;
            showToast('Updated successfully!', 'success');
        } else {
            const { error } = await supabase
                .from(tableName)
                .insert([formData]);
            
            if (error) throw error;
            showToast('Added successfully!', 'success');
        }
        
        closeForm();
        await loadSectionData(currentSection);
        await loadDashboardStats();
        
    } catch (error) {
        showToast('Error saving: ' + error.message, 'error');
    }
    
    showLoading(false);
}

function getFormData(section) {
    let formData = {};
    
    switch(section) {
        case 'calendar':
            formData = {
                date: document.getElementById('field-date').value,
                title: document.getElementById('field-title').value,
                description: document.getElementById('field-description').value
            };
            break;
            
        case 'announcements':
            formData = {
                category: document.getElementById('field-category').value,
                tagcolor: document.getElementById('field-tagcolor').value,
                title: document.getElementById('field-title').value,
                description: document.getElementById('field-description').value
            };
            break;
            
        case 'assignments':
            // Collect all links
            const linkInputs = document.querySelectorAll('.link-url');
            const links = Array.from(linkInputs)
                .map(input => input.value.trim())
                .filter(link => link !== '');
            
            formData = {
                subjectname: document.getElementById('field-subjectname').value,
                category: document.getElementById('field-category').value,
                categorycolor: document.getElementById('field-categorycolor').value,
                title: document.getElementById('field-title').value,
                description: document.getElementById('field-description').value,
                deadline: document.getElementById('field-deadline').value,
                relatedlinks: JSON.stringify(links)
            };
            break;
            
        case 'subjects':
            // Collect all categories and their files
            const resources = {};
            const categoryDivs = document.querySelectorAll('[data-category-index]');
            
            categoryDivs.forEach(categoryDiv => {
                const categoryNameInput = categoryDiv.querySelector('.category-name');
                const categoryName = categoryNameInput.value.trim();
                
                if (categoryName) {
                    const fileEntries = categoryDiv.querySelectorAll('.file-entry');
                    const files = [];
                    
                    fileEntries.forEach(fileEntry => {
                        const fileName = fileEntry.querySelector('.file-name').value.trim();
                        const fileUrl = fileEntry.querySelector('.file-url').value.trim();
                        
                        if (fileName && fileUrl) {
                            files.push({
                                title: fileName,
                                url: fileUrl
                            });
                        }
                    });
                    
                    if (files.length > 0) {
                        resources[categoryName] = files;
                    }
                }
            });
            
            formData = {
                subjectname: document.getElementById('field-subjectname').value,
                coursecode: document.getElementById('field-coursecode').value,
                teachername: document.getElementById('field-teachername').value,
                tag: document.getElementById('field-tag').value,
                resources: resources
            };
            break;
            
        case 'schedule':
            const timeslotIndex = parseInt(document.getElementById('field-timeslot').value);
            const timeSlot = TIME_SLOTS.find(slot => slot.index === timeslotIndex);
            
            formData = {
                day: document.getElementById('field-day').value,
                subjectname: document.getElementById('field-subjectname').value,
                teachername: document.getElementById('field-teachername').value,
                room: document.getElementById('field-room').value,
                starttime: timeSlot ? timeSlot.start : '',
                timeslot_index: timeslotIndex,
                type: document.getElementById('field-type').value,
                bgcolor: document.getElementById('field-bgcolor').value
            };
            break;
            
        case 'contacts':
            formData = {
                name: document.getElementById('field-name').value,
                designation: document.getElementById('field-designation').value,
                email: document.getElementById('field-email').value,
                contactnumber: document.getElementById('field-contactnumber').value,
                contactinstructions: document.getElementById('field-contactinstructions').value
            };
            break;
    }
    
    return formData;
}

// ============================================
// 🗑️ DELETE FUNCTIONS
// ============================================

async function deleteItem(section, id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const tableName = getTableName(section);
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Deleted successfully!', 'success');
        await loadSectionData(section);
        await loadDashboardStats();
        
    } catch (error) {
        showToast('Error deleting: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// ============================================
// 🌐 MAKE FUNCTIONS GLOBALLY ACCESSIBLE
// ============================================

window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.closeForm = closeForm;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.saveItem = saveItem;
window.addSubjectCategory = addSubjectCategory;
window.addSubjectFile = addSubjectFile;
window.removeSubjectCategory = removeSubjectCategory;
window.removeSubjectFile = removeSubjectFile;
window.addAssignmentLink = addAssignmentLink;
window.removeAssignmentLink = removeAssignmentLink;
