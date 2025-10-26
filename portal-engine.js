// ============================================
// 🚀 PORTAL ENGINE - SUPABASE VERSION (FIXED)
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://etgvonekaspphivuniiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Z3ZvbmVrYXNwcGhpdnVuaWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NTczOTMsImV4cCI6MjA3NjMzMzM5M30.VDUlouLBIAtmznCkmHXsoecN-MRTUQhgN1m6zfdwtDk';

let supabase;
let currentMonthOffset = 0;
let calendarCache = {};
let currentFilter = 'all';
let allSubjectsData = [];

// Data storage
let announcementsData = [];
let assignmentsData = [];
let subjectsData = [];
let calendarEvents = {};
let contactData = [];
let scheduleData = null;

// ============================================
// INITIALIZE SUPABASE
// ============================================

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
    } else {
        console.error('Supabase library not loaded');
    }
}

// ============================================
// WEEKLY STATISTICS CALCULATION (FIXED)
// ============================================

function calculateWeeklyStats() {
    const now = new Date();
    
    // Get current week's Sunday and Thursday
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    
    const thursday = new Date(sunday);
    thursday.setDate(sunday.getDate() + 4); // Thursday is 4 days after Sunday
    thursday.setHours(23, 59, 59, 999);
    
    console.log('=== WEEKLY STATS DEBUG ===');
    console.log('Today:', now.toDateString());
    console.log('Week range:', sunday.toDateString(), 'to', thursday.toDateString());
    
    // Count events from Calendar
    let eventsCount = 0;
    console.log('\n--- Calendar Events ---');
    console.log('Total calendar dates:', Object.keys(calendarEvents).length);
    
    Object.keys(calendarEvents).forEach(dateStr => {
        const eventDate = new Date(dateStr);
        console.log('Checking date:', dateStr, 'EventDate:', eventDate.toDateString());
        
        if (eventDate >= sunday && eventDate <= thursday) {
            const events = calendarEvents[dateStr];
            console.log('  → Date is in this week! Events:', events);
            
            events.forEach(event => {
                console.log('    Event:', event.title, 'Category:', event.category);
                // Check if category is "Events" (case insensitive)
                const category = (event.category || '').toLowerCase().trim();
                if (category === 'events') {
                    eventsCount++;
                    console.log('    ✓ COUNTED as Event');
                } else {
                    console.log('    ✗ Not counted (category is:', event.category, ')');
                }
            });
        } else {
            console.log('  → Date NOT in this week (skipped)');
        }
    });
    
    // Count tests and assignments from Assignments table
    let testsCount = 0;
    let assignmentsCount = 0;
    
    console.log('\n--- Assignments ---');
    console.log('Total assignments:', assignmentsData.length);
    
    assignmentsData.forEach(assignment => {
        const deadline = new Date(assignment.deadline);
        console.log('Assignment:', assignment.title, 'Deadline:', deadline.toDateString(), 'Category:', assignment.type);
        
        if (deadline >= sunday && deadline <= thursday) {
            console.log('  → Deadline is in this week!');
            const category = (assignment.type || '').toLowerCase().trim();
            
            if (category === 'test') {
                testsCount++;
                console.log('    ✓ COUNTED as Test');
            } else if (category === 'assignment') {
                assignmentsCount++;
                console.log('    ✓ COUNTED as Assignment');
            } else {
                console.log('    ✗ Not counted (category is:', assignment.type, ')');
            }
        } else {
            console.log('  → Deadline NOT in this week (skipped)');
        }
    });
    
    console.log('\n=== FINAL COUNTS ===');
    console.log('Events:', eventsCount);
    console.log('Tests:', testsCount);
    console.log('Assignments:', assignmentsCount);
    console.log('======================\n');
    
    return {
        events: eventsCount,
        tests: testsCount,
        assignments: assignmentsCount
    };
}

function updateWeeklyStats() {
    console.log('updateWeeklyStats() called');
    
    const stats = calculateWeeklyStats();
    
    const eventsElement = document.getElementById('weekly-events-count');
    const testsElement = document.getElementById('weekly-tests-count');
    const assignmentsElement = document.getElementById('weekly-assignments-count');
    
    console.log('Updating DOM elements...');
    console.log('Events element:', eventsElement);
    console.log('Tests element:', testsElement);
    console.log('Assignments element:', assignmentsElement);
    
    if (eventsElement) {
        eventsElement.textContent = stats.events;
        console.log('✓ Events updated to:', stats.events);
    } else {
        console.error('✗ Could not find element: weekly-events-count');
    }
    
    if (testsElement) {
        testsElement.textContent = stats.tests;
        console.log('✓ Tests updated to:', stats.tests);
    } else {
        console.error('✗ Could not find element: weekly-tests-count');
    }
    
    if (assignmentsElement) {
        assignmentsElement.textContent = stats.assignments;
        console.log('✓ Assignments updated to:', stats.assignments);
    } else {
        console.error('✗ Could not find element: weekly-assignments-count');
    }
    
    console.log('updateWeeklyStats() complete\n');
}

// ============================================
// LOAD DATA FROM SUPABASE
// ============================================

async function loadAllData() {
    try {
        showLoadingState();
        
        // Load Announcements
        const { data: announcements, error: announcementsError } = await supabase
            .from('Announcements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (announcementsError) throw announcementsError;
        
        announcementsData = announcements.map(a => ({
            id: a.id,
            category: a.category || 'General',
            categoryColor: a.tagcolor || 'bg-blue-100 text-blue-800 border-blue-300',
            title: a.title,
            description: a.description,
            date: a.created_at
        }));
        
        // Load Assignments
        const { data: assignments, error: assignmentsError } = await supabase
            .from('Assignments')
            .select('*')
            .order('deadline', { ascending: true });
        
        if (assignmentsError) throw assignmentsError;
        
        assignmentsData = assignments.map(a => {
            let links = [];
            try {
                links = a.relatedlinks ? (typeof a.relatedlinks === 'string' ? JSON.parse(a.relatedlinks) : a.relatedlinks) : [];
            } catch (e) {
                console.error('Error parsing links:', e);
            }
            
            // Create categories object from links
            const categories = {
                'Related Links': Array.isArray(links) ? links.map((link, idx) => ({
                    name: `Link ${idx + 1}`,
                    link: link
                })) : []
            };
            
            return {
                id: a.id,
                subject: a.subjectname || 'General',
                subjectColor: 'bg-purple-600',
                type: a.category || 'Assignment',
                categoryColor: a.categorycolor || 'bg-blue-100 text-blue-700',
                title: a.title,
                description: a.description,
                deadline: a.deadline,
                categories: categories,
                isNew: false
            };
        });
        
        // Load Subjects
        const { data: subjects, error: subjectsError } = await supabase
            .from('Subjects')
            .select('*')
            .order('subjectname', { ascending: true });
        
        if (subjectsError) throw subjectsError;
        
        subjectsData = subjects.map((s, idx) => {
            const colors = [
                'bg-blue-600', 'bg-blue-600', 'bg-blue-600', 
                'bg-blue-600', 'bg-blue-600', 'bg-blue-600'
            ];
            const icons = [
                'zap', 'circuit-board', 'book', 'atom', 'code', 'terminal'
            ];
            
            let resources = {};
            try {
                resources = s.resources || {};
            } catch (e) {
                console.error('Error parsing resources:', e);
            }
            
            // Convert resources to categories format
            const categories = {};
            for (const [catName, items] of Object.entries(resources)) {
                if (Array.isArray(items)) {
                    categories[catName] = items.map(item => ({
                        name: item.title || item.name || 'Untitled',
                        link: item.url || item.link || '#'
                    }));
                }
            }
            
            return {
                id: s.id,
                name: s.subjectname,
                fullName: s.coursecode || s.subjectname,
                teacher: s.teachername || 'TBA',
                type: s.tag === 'Lab' ? 'lab' : 'theory',
                color: colors[idx % colors.length],
                icon: icons[idx % icons.length],
                categories: categories,
                driveFolder: s.drivefolder || '#'
            };
        });
        
        // Load Calendar
        const { data: calendar, error: calendarError } = await supabase
            .from('Calendar')
            .select('*')
            .order('date', { ascending: true });
        
        if (calendarError) throw calendarError;
        
        calendarEvents = {};
        calendar.forEach(event => {
            const dateStr = event.date;
            if (!calendarEvents[dateStr]) {
                calendarEvents[dateStr] = [];
            }
            calendarEvents[dateStr].push({
                title: event.title,
                description: event.description,
                category: event.category || 'Events'
            });
        });
        
        console.log('Calendar events loaded:', calendarEvents);
        
        // Load Contacts
        const { data: contacts, error: contactsError } = await supabase
            .from('Contacts')
            .select('*')
            .order('name', { ascending: true });
        
        if (contactsError) throw contactsError;
        
        contactData = contacts.map(c => ({
            name: c.name,
            designation: c.designation,
            email: c.email,
            phone: c.contactnumber,
            howToContact: c.contactinstructions,
            profileImage: ''
        }));
        
        // Load Schedule from Supabase (with fallback to static data)
        const { data: schedule, error: scheduleError } = await supabase
            .from('Schedule')
            .select('*')
            .order('timeslot_index', { ascending: true });
        
        // If Supabase has schedule data, use it
        if (!scheduleError && schedule && schedule.length > 0) {
            scheduleData = {
                timeSlots: [
                    "09:00 AM - 10:15 AM",
                    "10:15 AM - 11:30 AM",
                    "11:30 AM - 12:45 PM",
                    "01:00 PM - 02:15 PM",
                    "02:15 PM - 03:30 PM",
                    "03:30 PM - 04:45 PM"
                ],
                days: []
            };
            
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
            dayNames.forEach(dayName => {
                scheduleData.days.push({
                    day: dayName,
                    bgColor: 'white',
                    classes: [null, null, null, null, null, null]
                });
            });
            
            schedule.forEach(item => {
                const dayIndex = dayNames.indexOf(item.day);
                if (dayIndex === -1) return;
                
                const dayObj = scheduleData.days[dayIndex];
                
                if (dayObj.bgColor === 'white' && item.bgcolor) {
                    dayObj.bgColor = item.bgcolor;
                }
                
                const slotIndex = item.timeslot_index;
                if (slotIndex < 0 || slotIndex > 5) return;
                
                const classEntry = {
                    name: item.subjectname,
                    instructor: item.teachername,
                    room: item.room,
                    colspan: item.type === 'Lab' ? 2 : 1
                };
                
                dayObj.classes[slotIndex] = classEntry;
                
                if (item.type === 'Lab' && slotIndex < 5) {
                    dayObj.classes[slotIndex + 1] = 'SKIP';
                }
            });
            
            console.log('Schedule loaded from Supabase');
        } else {
            // FALLBACK
            console.log('No schedule in Supabase, using static fallback data');
            scheduleData = {
                timeSlots: [
                    "09:00 AM - 10:15 AM",
                    "10:15 AM - 11:30 AM",
                    "11:30 AM - 12:45 PM",
                    "01:00 PM - 02:15 PM",
                    "02:15 PM - 03:30 PM",
                    "03:30 PM - 04:45 PM"
                ],
                days: [
                    {
                        day: "SUNDAY",
                        bgColor: "white",
                        classes: [
                            { name: "ENG II", instructor: "NHS", room: "508", colspan: 1 },
                            { name: "BEE", instructor: "FHR", room: "508", colspan: 1 },
                            null, null, null, null
                        ]
                    },
                    {
                        day: "MONDAY",
                        bgColor: "blue",
                        classes: [
                            null, null,
                            { name: "PHY II", instructor: "SUA", room: "GL-2", colspan: 1 },
                            null,
                            { name: "SP", instructor: "GMN", room: "506", colspan: 1 },
                            { name: "ENG II", instructor: "NHS", room: "506", colspan: 1 }
                        ]
                    },
                    {
                        day: "TUESDAY",
                        bgColor: "white",
                        classes: [
                            { name: "BEE Lab", instructor: "FHR", room: "108", colspan: 2 },
                            'SKIP', null, null, null, null
                        ]
                    },
                    {
                        day: "WEDNESDAY",
                        bgColor: "blue",
                        classes: [
                            null, null,
                            { name: "PHY II", instructor: "SUA", room: "GL-1", colspan: 1 },
                            { name: "SP", instructor: "GMN", room: "408", colspan: 1 },
                            null,
                            { name: "BEE", instructor: "FHR", room: "502", colspan: 1 }
                        ]
                    },
                    {
                        day: "THURSDAY",
                        bgColor: "white",
                        classes: [
                            { name: "SP Lab", instructor: "GMN", room: "309", colspan: 2 },
                            'SKIP', null, null, null, null
                        ]
                    }
                ]
            };
        }
        
        console.log('All data loaded successfully');
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data. Please refresh the page.', 'error');
    }
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    showFullScreenLoading(); // Show full-screen loader immediately
    lucide.createIcons();
    
    let attempts = 0;
    const maxAttempts = 50;
    
    const waitForSupabase = setInterval(async () => {
        attempts++;
        
        if (window.supabase && window.supabase.createClient) {
            clearInterval(waitForSupabase);
            initSupabase();
            await loadAllData();
            renderPortalContent();
            updateWeeklyStats();
            initializeEnhancements();
            hideLoadingState(); // Hide the full-screen loader
        } else if (attempts >= maxAttempts) {
            clearInterval(waitForSupabase);
            console.error('Supabase library failed to load');
            showToast('Failed to initialize. Please refresh the page.', 'error');
        }
    }, 100);
});

// ============================================
// LOADING STATE
// ============================================

function showLoadingState() {
    // Show skeleton loaders in containers (NOT full-screen overlay)
    const containers = ['announcements-container', 'assignments-container', 'subjects-container'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = Array(3).fill(0).map(() => `
                <div class="skeleton h-48 rounded-xl"></div>
            `).join('');
        }
    });
}

function showFullScreenLoading() {
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoadingState() {
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
}

// ============================================
// AUTO-HIDE LOGIC (24 HOURS)
// ============================================

function shouldShowAnnouncement(dateString) {
    const announcementDate = new Date(dateString);
    const now = new Date();
    const hours24Ago = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return announcementDate >= hours24Ago;
}

function shouldShowAssignment(deadline) {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hours24AfterDeadline = new Date(deadlineDate.getTime() + (24 * 60 * 60 * 1000));
    return now < hours24AfterDeadline;
}

// ============================================
// COUNTDOWN TIMER
// ============================================

function calculateTimeRemaining(deadline) {
    const now = new Date().getTime();
    const deadlineTime = new Date(deadline).getTime();
    const difference = deadlineTime - now;
    
    if (difference <= 0) {
        return { expired: true };
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return { expired: false, days, hours, minutes, seconds };
}

function updateCountdown(assignmentId, deadline) {
    const countdownElement = document.getElementById(`countdown-${assignmentId}`);
    if (!countdownElement) return;
    
    const timeData = calculateTimeRemaining(deadline);
    
    if (timeData.expired) {
        countdownElement.innerHTML = `
            <div class="text-red-600 font-bold text-center py-2 flex items-center justify-center gap-2">
                <i data-lucide="alert-circle" class="w-5 h-5"></i>
                <span>Time's Up</span>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    let urgencyClass = '';
    if (timeData.days === 0) {
        urgencyClass = 'countdown-urgent-red';
    } else if (timeData.days <= 2) {
        urgencyClass = 'countdown-urgent-orange';
    }
    
    countdownElement.innerHTML = `
        <div class="flex justify-center gap-2 text-center ${urgencyClass}">
            <div class="countdown-box bg-gray-100 rounded-lg p-2">
                <div class="text-xl font-bold text-gray-800">${timeData.days}</div>
                <div class="text-xs text-gray-500">Days</div>
            </div>
            <div class="countdown-box bg-gray-100 rounded-lg p-2">
                <div class="text-xl font-bold text-gray-800">${String(timeData.hours).padStart(2, '0')}</div>
                <div class="text-xs text-gray-500">Hours</div>
            </div>
            <div class="countdown-box bg-gray-100 rounded-lg p-2">
                <div class="text-xl font-bold text-gray-800">${String(timeData.minutes).padStart(2, '0')}</div>
                <div class="text-xs text-gray-500">Mins</div>
            </div>
            <div class="countdown-box bg-gray-100 rounded-lg p-2">
                <div class="text-xl font-bold text-gray-800">${String(timeData.seconds).padStart(2, '0')}</div>
                <div class="text-xs text-gray-500">Secs</div>
            </div>
        </div>
    `;
}

// ============================================
// ANNOUNCEMENT CARD GENERATOR
// ============================================

function createAnnouncementCard(announcement) {
    const date = new Date(announcement.date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Dhaka'
    });
    
    return `
        <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg transition hover:shadow-xl">
            <span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${announcement.categoryColor}">
                ${announcement.category}
            </span>
            <p class="text-xs text-gray-500 mt-2">${date}</p>
            <h4 class="mt-2 text-lg font-bold text-gray-800">${announcement.title}</h4>
            <p class="mt-2 text-sm text-gray-600">${announcement.description}</p>
        </div>
    `;
}

// ============================================
// ASSIGNMENT CARD GENERATOR
// ============================================

function createAssignmentCard(assignment) {
    const deadlineDate = new Date(assignment.deadline).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka'  // Force Bangladesh time
});
    
    const isNew = assignment.isNew || false;
    
    return `
        <div class="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 transition hover:shadow-2xl hover:border-blue-600 relative" data-type="${assignment.type.toLowerCase()}">
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <div class="flex justify-between items-start mb-3">
                <span class="text-xs font-semibold text-white px-3 py-1 rounded-full ${assignment.subjectColor}">
                    ${assignment.subject}
                </span>
                <span class="text-xs font-semibold px-3 py-1 rounded-full ${assignment.categoryColor}">
                    ${assignment.type}
                </span>
            </div>
            
            <h3 class="text-lg font-bold text-gray-800 mb-2">${assignment.title}</h3>
            <p class="text-sm text-gray-600 mb-4">${assignment.description}</p>
            
            <div class="mb-4">
                <div class="flex items-center text-xs text-gray-500 mb-2">
                    <i data-lucide="calendar" class="w-4 h-4 mr-1"></i>
                    Due: ${deadlineDate}
                </div>
                <div id="countdown-${assignment.id}" class="mt-3">
                    <!-- Countdown will be inserted here -->
                </div>
            </div>
            
            <div class="border-t pt-4">
                <button onclick="openAssignmentDetails('${assignment.id}')" 
                   class="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition flex items-center justify-center gap-2">
                    <i data-lucide="external-link" class="w-4 h-4"></i>
                    View Details
                </button>
            </div>
        </div>
    `;
}

// ============================================
// ASSIGNMENT QUICK STATS
// ============================================

function renderAssignmentStats(assignments) {
    const statsContainer = document.getElementById('assignment-stats');
    if (!statsContainer) return;
    
    const now = new Date();
    const total = assignments.length;
    const dueToday = assignments.filter(a => {
        const deadline = new Date(a.deadline);
        return deadline.toDateString() === now.toDateString();
    }).length;
    
    const dueTomorrow = assignments.filter(a => {
        const deadline = new Date(a.deadline);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return deadline.toDateString() === tomorrow.toDateString();
    }).length;
    
    statsContainer.innerHTML = `
        <div class="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div class="flex items-center gap-2">
                <i data-lucide="clipboard-list" class="w-5 h-5 text-blue-600"></i>
                <span class="font-semibold text-gray-700">${total} Active</span>
            </div>
            ${dueToday > 0 ? `
                <div class="flex items-center gap-2">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
                    <span class="font-semibold text-red-600">${dueToday} Due Today</span>
                </div>
            ` : ''}
            ${dueTomorrow > 0 ? `
                <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-5 h-5 text-orange-600"></i>
                    <span class="font-semibold text-orange-600">${dueTomorrow} Due Tomorrow</span>
                </div>
            ` : ''}
        </div>
    `;
    lucide.createIcons();
}

// ============================================
// ASSIGNMENT DETAILS MODAL
// ============================================

function openAssignmentDetails(assignmentId) {
    const assignment = assignmentsData.find(a => a.id.toString() === assignmentId.toString());
    if (!assignment) return;
    
    const modal = document.getElementById('assignment-details-modal');
    const modalTitle = document.getElementById('assignment-modal-title');
    const modalBody = document.getElementById('assignment-modal-body');
    
    modalTitle.textContent = assignment.title;
    document.title = `${assignment.title} - CSE 63B Portal`;
    
    let categoriesHTML = '';
    Object.keys(assignment.categories).forEach((categoryName, index) => {
        const items = assignment.categories[categoryName];
        if (items.length === 0) return;
        
        categoriesHTML += `
            <div class="mb-6 border rounded-lg overflow-hidden">
                <button class="category-toggle w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                        data-category-index="${index}">
                    <div class="flex items-center gap-3">
                        <i data-lucide="folder" class="w-5 h-5 text-blue-600"></i>
                        <span class="font-bold text-gray-800">${categoryName}</span>
                        <span class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">${items.length}</span>
                    </div>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-500 transition-transform category-arrow"></i>
                </button>
                <div class="dropdown-content bg-white" id="assign-category-${index}">
                    <div class="p-4 space-y-3">
                        ${items.map(item => `
                            <a href="${item.link}" target="_blank"
                               class="block p-3 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition group">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium text-gray-700 group-hover:text-blue-600">${item.name}</span>
                                    <i data-lucide="external-link" class="w-4 h-4 text-gray-400 group-hover:text-blue-600"></i>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    if (categoriesHTML === '') {
        categoriesHTML = '<p class="text-gray-500 text-center py-8">No related links available</p>';
    }
    
    modalBody.innerHTML = categoriesHTML;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    lucide.createIcons();
    
    document.querySelectorAll('.category-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.dataset.categoryIndex;
            const content = document.getElementById(`assign-category-${index}`);
            const arrow = this.querySelector('.category-arrow');
            
            content.classList.toggle('open');
            if (content.classList.contains('open')) {
                arrow.style.transform = 'rotate(180deg)';
            } else {
                arrow.style.transform = 'rotate(0deg)';
            }
        });
    });
}

// ============================================
// SUBJECT MODAL WITH RESOURCE SEARCH
// ============================================

function openSubjectModal(subjectId) {
    const subject = subjectsData.find(s => s.id.toString() === subjectId.toString());
    if (!subject) return;
    
    const modal = document.getElementById('subject-modal');
    const modalIcon = document.getElementById('subject-modal-icon');
    const modalTitle = document.getElementById('subject-modal-title');
    const modalSubtitle = document.getElementById('subject-modal-subtitle');
    const modalBody = document.getElementById('subject-modal-body');
    const driveLink = document.getElementById('drive-folder-link');
    const breadcrumbName = document.getElementById('subject-breadcrumb-name');
    
    modalIcon.className = `w-12 h-12 rounded-full flex items-center justify-center text-white ${subject.color}`;
    modalIcon.innerHTML = `<i data-lucide="${subject.icon}" class="w-6 h-6"></i>`;
    modalTitle.textContent = subject.name;
    modalSubtitle.textContent = subject.fullName;
    driveLink.href = subject.driveFolder;
    breadcrumbName.textContent = subject.name;
    
    document.title = `${subject.name} - CSE 63B Portal`;
    
    let categoriesHTML = '';
    Object.keys(subject.categories).forEach((categoryName, index) => {
        const items = subject.categories[categoryName];
        if (items.length === 0) return;
        
        categoriesHTML += `
            <div class="mb-6 border rounded-lg overflow-hidden resource-category">
                <button class="category-toggle w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                        data-category-index="${index}">
                    <div class="flex items-center gap-3">
                        <i data-lucide="folder" class="w-5 h-5 text-blue-600"></i>
                        <span class="font-bold text-gray-800">${categoryName}</span>
                        <span class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">${items.length}</span>
                    </div>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-500 transition-transform category-arrow"></i>
                </button>
                <div class="dropdown-content bg-white" id="subject-category-${index}">
                    <div class="p-4 space-y-3">
                        ${items.map(item => `
                            <a href="${item.link}" target="_blank"
                               class="resource-item block p-3 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition group"
                               data-name="${item.name.toLowerCase()}">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium text-gray-700 group-hover:text-blue-600">${item.name}</span>
                                    <i data-lucide="external-link" class="w-4 h-4 text-gray-400 group-hover:text-blue-600"></i>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    if (categoriesHTML === '') {
        categoriesHTML = '<p class="text-gray-500 text-center py-8">No resources available yet</p>';
    }
    
    modalBody.innerHTML = categoriesHTML;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
    
    initModalResourceSearch();
    
    document.querySelectorAll('.category-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.dataset.categoryIndex;
            const content = document.getElementById(`subject-category-${index}`);
            const arrow = this.querySelector('.category-arrow');
            
            content.classList.toggle('open');
            if (content.classList.contains('open')) {
                arrow.style.transform = 'rotate(180deg)';
            } else {
                arrow.style.transform = 'rotate(0deg)';
            }
        });
    });
}

function initModalResourceSearch() {
    const searchInput = document.getElementById('modal-resource-search');
    if (!searchInput) return;
    
    searchInput.value = '';
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const categories = document.querySelectorAll('.resource-category');
        
        categories.forEach(category => {
            const items = category.querySelectorAll('.resource-item');
            let hasVisibleItems = false;
            
            items.forEach(item => {
                const name = item.getAttribute('data-name');
                if (name.includes(searchTerm)) {
                    item.style.display = '';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            if (searchTerm && hasVisibleItems) {
                category.style.display = '';
                const dropdown = category.querySelector('.dropdown-content');
                dropdown.classList.add('open');
                category.querySelector('.category-arrow').style.transform = 'rotate(180deg)';
            } else if (searchTerm && !hasVisibleItems) {
                category.style.display = 'none';
            } else {
                category.style.display = '';
            }
        });
    });
}

// ============================================
// SCHEDULE TABLE GENERATOR
// ============================================

function renderSchedule() {
    const headerRow = document.getElementById('schedule-header');
    const tbody = document.getElementById('schedule-body');
    
    if (!scheduleData || !headerRow || !tbody) return;
    
    let headerHTML = '<th class="py-3 px-4 rounded-tl-xl min-w-[100px]">Day</th>';
    scheduleData.timeSlots.forEach((slot, index) => {
        const roundClass = index === scheduleData.timeSlots.length - 1 ? 'rounded-tr-xl' : '';
        headerHTML += `<th class="py-3 px-2 text-xs sm:text-sm min-w-[140px] ${roundClass}">${slot}</th>`;
    });
    headerRow.innerHTML = headerHTML;
    
    let bodyHTML = '';
    scheduleData.days.forEach(dayData => {
        bodyHTML += `<tr class="bg-white rounded-xl shadow-md">`;
        bodyHTML += `<td class="font-bold text-blue-600 py-4 px-3 rounded-l-xl text-sm sm:text-base whitespace-nowrap">${dayData.day}</td>`;
        
        for (let i = 0; i < 6; i++) {
            const classData = dayData.classes[i];
            const isLast = i === 5;
            const roundClass = isLast ? 'rounded-r-xl' : '';
            
            if (classData === 'SKIP') {
                continue;
            }
            
            if (classData === null) {
                bodyHTML += `<td class="py-3 px-2 ${roundClass}"></td>`;
            } else {
                const colspanAttr = classData.colspan > 1 ? `colspan="${classData.colspan}"` : '';
                
                bodyHTML += `<td class="py-3 px-2 ${roundClass}" ${colspanAttr}>
                    <div class="bg-white border-2 border-blue-600 rounded-xl p-2 w-11/12 mx-auto shadow-md hover:shadow-lg transition-shadow">
                        <p class="font-bold text-blue-600 text-xs sm:text-sm">${classData.name}</p>
                        <p class="italic text-blue-800 text-xs">${classData.instructor}</p>
                        <p class="text-xs text-gray-600">(${classData.room})</p>
                    </div>
                </td>`;
            }
        }
        
        bodyHTML += '</tr>';
    });
    
    tbody.innerHTML = bodyHTML;
}

// ============================================
// EXPORT SCHEDULE
// ============================================

function exportSchedule() {
    const scheduleImageUrl = 'https://drive.google.com/uc?export=download&id=19zx8t0FE02QAwTTGAdBv5VMrsj84MpNI';
    
    const link = document.createElement('a');
    link.href = scheduleImageUrl;
    link.download = 'CSE_63B_Schedule.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// SUBJECT CARD GENERATOR
// ============================================

function createSubjectCard(subject) {
    const typeColor = subject.type === 'lab' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';
    const typeText = subject.type === 'lab' ? 'Lab' : 'Theory';
    
    const categoryCount = Object.keys(subject.categories).length;
    
    return `
        <div class="subject-card cursor-pointer bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden transition hover:shadow-2xl hover:border-blue-600 transform hover:scale-105"
             data-subject-id="${subject.id}"
             data-subject-name="${subject.name.toLowerCase()}"
             data-subject-teacher="${subject.teacher.toLowerCase()}">
            <div class="${subject.color} p-6 text-white relative">
                <div class="absolute top-4 right-4">
                    <span class="text-xs font-semibold px-3 py-1 rounded-full ${typeColor}">
                        ${typeText}
                    </span>
                </div>
                <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                    <i data-lucide="${subject.icon}" class="w-7 h-7"></i>
                </div>
                <h3 class="text-2xl font-bold">${subject.name}</h3>
                <p class="text-sm opacity-90 mt-1">${subject.fullName}</p>
                <p class="text-xs opacity-75 mt-2">${subject.teacher}</p>
            </div>
            <div class="p-4 bg-white">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <i data-lucide="folder" class="w-4 h-4"></i>
                        <span class="font-medium">${categoryCount} Categories</span>
                    </div>
                    <i data-lucide="chevron-right" class="w-5 h-5 text-blue-600"></i>
                </div>
                <button onclick="openSubjectModal('${subject.id}'); event.stopPropagation();" 
                        class="w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2">
                    <i data-lucide="folder-open" class="w-4 h-4"></i>
                    View Resources
                </button>
            </div>
        </div>
    `;
}

// ============================================
// CONTACT CARD GENERATOR
// ============================================

function createContactCard(contact) {
    const hasImage = contact.profileImage && contact.profileImage !== '';
    
    return `
        <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-md transition hover:shadow-lg">
            <div class="flex items-start gap-4">
                <div class="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 ${hasImage ? '' : 'bg-blue-100 border-4 border-blue-600'}">
                    ${hasImage 
                        ? `<img src="${contact.profileImage}" alt="${contact.name}" class="w-full h-full rounded-full object-cover" loading="lazy">`
                        : `<i data-lucide="user" class="w-10 h-10 text-blue-600"></i>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-bold text-gray-800">${contact.name}</h3>
                    <p class="text-sm text-blue-600 font-semibold">${contact.designation}</p>
                    <div class="mt-3 space-y-2 text-sm text-gray-600">
                        <div class="flex items-center gap-2">
                            <i data-lucide="mail" class="w-4 h-4 text-gray-500 flex-shrink-0"></i>
                            <a href="mailto:${contact.email}" class="hover:underline hover:text-blue-600 break-all">${contact.email}</a>
                        </div>
                        <div class="flex items-center gap-2">
                            <i data-lucide="phone" class="w-4 h-4 text-gray-500 flex-shrink-0"></i>
                            <a href="tel:${contact.phone}" class="hover:underline hover:text-blue-600">${contact.phone}</a>
                        </div>
                        ${contact.howToContact ? `
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <div class="flex items-start gap-2">
                                    <div class="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <i data-lucide="info" class="w-3 h-3 text-blue-600"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-semibold text-gray-700 text-xs mb-1">How to Contact</p>
                                        <p class="text-xs text-gray-600 leading-relaxed">${contact.howToContact}</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// CALENDAR GENERATOR (FIXED - COLOR-CODED TOOLTIPS)
// ============================================

function generateCalendar(monthOffset = 0) {
    const cacheKey = `calendar-${monthOffset}`;
    if (calendarCache[cacheKey]) {
        return calendarCache[cacheKey];
    }
    
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
    
    let calendarHTML = `
        <div class="grid grid-cols-7 gap-2 mb-2">
            <div class="text-center font-semibold text-gray-600 py-2">Sun</div>
            <div class="text-center font-semibold text-gray-600 py-2">Mon</div>
            <div class="text-center font-semibold text-gray-600 py-2">Tue</div>
            <div class="text-center font-semibold text-gray-600 py-2">Wed</div>
            <div class="text-center font-semibold text-gray-600 py-2">Thu</div>
            <div class="text-center font-semibold text-red-600 py-2">Fri</div>
            <div class="text-center font-semibold text-red-600 py-2">Sat</div>
        </div>
        <div class="grid grid-cols-7 gap-2">
    `;
    
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div></div>';
    }
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvent = calendarEvents[dateStr] && calendarEvents[dateStr].length > 0;
        const isToday = isCurrentMonth && day === today.getDate();
        
        const currentDate = new Date(year, month, day);
        const dayOfWeek = currentDate.getDay();
        const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
        
        let colorClass = '';
        if (hasEvent) {
            const event = calendarEvents[dateStr][0];
            if (event.category === 'Test') {
                colorClass = 'has-event-purple';
            } else if (event.category === 'Off Day') {
                colorClass = 'has-event-red';
            } else {
                colorClass = 'has-event';
            }
        } else if (isFridayOrSaturday) {
            colorClass = 'weekend-day';
        }
        
        calendarHTML += `
            <div class="calendar-day ${colorClass} ${isToday ? 'today' : ''}" 
                 data-date="${dateStr}"
                 ${hasEvent ? `onmouseenter="showEventTooltip(event, '${dateStr}')" onmouseleave="hideEventTooltip()"` : ''}>
                ${day}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    
    calendarCache[cacheKey] = calendarHTML;
    
    return calendarHTML;
}

function showEventTooltip(event, dateStr) {
    const tooltip = document.getElementById('event-tooltip');
    const events = calendarEvents[dateStr];
    
    if (!events || events.length === 0) return;
    
    let tooltipHTML = '';
    events.forEach(evt => {
        // Determine title color based on category
        let titleColor = 'text-blue-600'; // Default for Events
        if (evt.category === 'Test') {
            titleColor = 'text-purple-600';
        } else if (evt.category === 'Off Day') {
            titleColor = 'text-red-600';
        }
        
        tooltipHTML += `
            <div class="mb-2 last:mb-0">
                <div class="font-bold ${titleColor} text-sm">${evt.title}</div>
                <div class="text-xs text-gray-600">${evt.description}</div>
            </div>
        `;
    });
    
    tooltip.innerHTML = tooltipHTML;
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY + 10 + 'px';
    tooltip.classList.add('show');
}

function hideEventTooltip() {
    const tooltip = document.getElementById('event-tooltip');
    tooltip.classList.remove('show');
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

function renderPortalContent() {
    const announcementsContainer = document.getElementById('announcements-container');
    const visibleAnnouncements = announcementsData.filter(a => shouldShowAnnouncement(a.date));
    
    if (visibleAnnouncements.length === 0) {
        announcementsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="inbox" class="w-16 h-16 mx-auto text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg font-medium">No recent announcements</p>
                <p class="text-gray-400 text-sm mt-2">Check back later for updates</p>
            </div>
        `;
    } else {
        announcementsContainer.innerHTML = visibleAnnouncements
            .map(createAnnouncementCard)
            .join('');
    }
    
    const assignmentsContainer = document.getElementById('assignments-container');
    const visibleAssignments = assignmentsData
        .filter(a => shouldShowAssignment(a.deadline))
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    if (visibleAssignments.length === 0) {
        assignmentsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="check-circle" class="w-16 h-16 mx-auto text-green-500 mb-4"></i>
                <p class="text-gray-500 text-lg font-medium">No active assignments</p>
                <p class="text-gray-400 text-sm mt-2">You're all caught up! 🎉</p>
            </div>
        `;
        const statsDiv = document.getElementById('assignment-stats');
        if (statsDiv) statsDiv.style.display = 'none';
    } else {
        assignmentsContainer.innerHTML = visibleAssignments.map(createAssignmentCard).join('');
        renderAssignmentStats(visibleAssignments);
        
        visibleAssignments.forEach(assignment => {
            updateCountdown(assignment.id, assignment.deadline);
            setInterval(() => updateCountdown(assignment.id, assignment.deadline), 1000);
        });
    }
    
    renderSchedule();
    
    const subjectsContainer = document.getElementById('subjects-container');
    allSubjectsData = subjectsData;
    subjectsContainer.innerHTML = subjectsData.map(createSubjectCard).join('');
    
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', function() {
            openSubjectModal(this.dataset.subjectId);
        });
    });
    
    const contactContainer = document.getElementById('contact-container');
    contactContainer.innerHTML = contactData.map(createContactCard).join('');
    
    lucide.createIcons();
}

// ============================================
// ENHANCEMENTS INITIALIZATION
// ============================================

function initializeEnhancements() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('open');
            const icon = this.querySelector('i');
            if (mobileMenu.classList.contains('open')) {
                icon.setAttribute('data-lucide', 'x');
            } else {
                icon.setAttribute('data-lucide', 'menu');
            }
            lucide.createIcons();
        });
    }
    
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu) {
                mobileMenu.classList.remove('open');
                const icon = mobileMenuBtn.querySelector('i');
                icon.setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            }
        });
    });
    
    window.addEventListener('scroll', function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = scrolled + '%';
    });
    
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
                const sectionName = current.charAt(0).toUpperCase() + current.slice(1);
                document.title = `${sectionName} - CSE 63B Portal`;
            }
        });
    });
    
    const fab = document.getElementById('scroll-to-top');
    if (fab) {
        fab.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                fab.style.opacity = '1';
                fab.style.pointerEvents = 'auto';
            } else {
                fab.style.opacity = '0';
                fab.style.pointerEvents = 'none';
            }
        });
    }
    
    // Admin button - always visible
    const adminBtn = document.getElementById('admin-button');
    if (adminBtn) {
        adminBtn.addEventListener('click', function() {
            window.location.href = 'admin.html';
        });
        adminBtn.style.opacity = '1';
        adminBtn.style.pointerEvents = 'auto';
    }
    
    const exportBtn = document.getElementById('export-schedule-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSchedule);
    }
    
    initSwipeToClose();
    initModalHandlers();
}

// ============================================
// SWIPE TO CLOSE MODALS
// ============================================

function initSwipeToClose() {
    const modals = document.querySelectorAll('[id$="-modal"]');
    
    modals.forEach(modal => {
        let startY = 0;
        let currentY = 0;
        const modalContent = modal.querySelector('.modal-content-animate');
        
        if (!modalContent) return;
        
        modalContent.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        modalContent.addEventListener('touchmove', function(e) {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0) {
                modalContent.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: true });
        
        modalContent.addEventListener('touchend', function() {
            const diff = currentY - startY;
            
            if (diff > 100) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                document.title = 'CSE 63B - Web Portal';
            }
            
            modalContent.style.transform = '';
            startY = 0;
            currentY = 0;
        });
    });
}

// ============================================
// MODAL HANDLERS
// ============================================

function initModalHandlers() {
    // Calendar Modal
    const openCalendarBtn = document.getElementById('open-calendar-btn');
    if (openCalendarBtn) {
        openCalendarBtn.addEventListener('click', function() {
            const modal = document.getElementById('calendar-modal');
            const calendarView = document.getElementById('calendar-view');
            currentMonthOffset = 0;
            calendarView.innerHTML = generateCalendar(currentMonthOffset);
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.title = 'Calendar - CSE 63B Portal';
            lucide.createIcons();
        });
    }
    
    const closeCalendarBtn = document.getElementById('close-calendar-btn');
    if (closeCalendarBtn) {
        closeCalendarBtn.addEventListener('click', function() {
            document.getElementById('calendar-modal').classList.add('hidden');
            document.getElementById('calendar-modal').classList.remove('flex');
            document.title = 'CSE 63B - Web Portal';
        });
    }
    
    // Month Navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            currentMonthOffset--;
            document.getElementById('calendar-view').innerHTML = generateCalendar(currentMonthOffset);
            lucide.createIcons();
        });
    }
    
    const nextMonthBtn = document.getElementById('next-month-btn');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            currentMonthOffset++;
            document.getElementById('calendar-view').innerHTML = generateCalendar(currentMonthOffset);
            lucide.createIcons();
        });
    }
    
    // Announcement History Modal
    const openAnnouncementHistoryBtn = document.getElementById('open-announcement-history-btn');
    if (openAnnouncementHistoryBtn) {
        openAnnouncementHistoryBtn.addEventListener('click', function() {
            const modal = document.getElementById('announcement-history-modal');
            const body = document.getElementById('announcement-history-body');
            const allAnnouncements = announcementsData.filter(a => !shouldShowAnnouncement(a.date));
            
            if (allAnnouncements.length === 0) {
                body.innerHTML = `
                    <div class="text-center py-12">
                        <i data-lucide="inbox" class="w-16 h-16 mx-auto text-gray-300 mb-4"></i>
                        <p class="text-gray-500 text-lg font-medium">No announcement history yet</p>
                        <p class="text-gray-400 text-sm mt-2">Past announcements will appear here</p>
                    </div>
                `;
            } else {
                body.innerHTML = '<div class="grid md:grid-cols-2 gap-6">' + 
                    allAnnouncements.map(createAnnouncementCard).join('') + 
                    '</div>';
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.title = 'Announcement History - CSE 63B Portal';
            lucide.createIcons();
        });
    }
    
    const closeAnnouncementHistoryBtn = document.getElementById('close-announcement-history-btn');
    if (closeAnnouncementHistoryBtn) {
        closeAnnouncementHistoryBtn.addEventListener('click', function() {
            document.getElementById('announcement-history-modal').classList.add('hidden');
            document.getElementById('announcement-history-modal').classList.remove('flex');
            document.title = 'CSE 63B - Web Portal';
        });
    }
    
    // Assignment History Modal
    const openAssignmentHistoryBtn = document.getElementById('open-assignment-history-btn');
    if (openAssignmentHistoryBtn) {
        openAssignmentHistoryBtn.addEventListener('click', function() {
            const modal = document.getElementById('assignment-history-modal');
            const body = document.getElementById('assignment-history-body');
            const allAssignments = assignmentsData.filter(a => !shouldShowAssignment(a.deadline));
            
            if (allAssignments.length === 0) {
                body.innerHTML = `
                    <div class="text-center py-12">
                        <i data-lucide="inbox" class="w-16 h-16 mx-auto text-gray-300 mb-4"></i>
                        <p class="text-gray-500 text-lg font-medium">No assignment history yet</p>
                        <p class="text-gray-400 text-sm mt-2">Completed assignments will appear here</p>
                    </div>
                `;
            } else {
                body.innerHTML = '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">' + 
                    allAssignments.map(createAssignmentCard).join('') + 
                    '</div>';
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.title = 'Assignment History - CSE 63B Portal';
            lucide.createIcons();
        });
    }
    
    const closeAssignmentHistoryBtn = document.getElementById('close-assignment-history-btn');
    if (closeAssignmentHistoryBtn) {
        closeAssignmentHistoryBtn.addEventListener('click', function() {
            document.getElementById('assignment-history-modal').classList.add('hidden');
            document.getElementById('assignment-history-modal').classList.remove('flex');
            document.title = 'CSE 63B - Web Portal';
        });
    }
    
    // Assignment Details Modal
    const closeAssignmentDetailsBtn = document.getElementById('close-assignment-details-btn');
    if (closeAssignmentDetailsBtn) {
        closeAssignmentDetailsBtn.addEventListener('click', function() {
            document.getElementById('assignment-details-modal').classList.add('hidden');
            document.getElementById('assignment-details-modal').classList.remove('flex');
            document.title = 'CSE 63B - Web Portal';
        });
    }
    
    // Subject Modal
    const closeSubjectModalBtn = document.getElementById('close-subject-modal-btn');
    if (closeSubjectModalBtn) {
        closeSubjectModalBtn.addEventListener('click', function() {
            document.getElementById('subject-modal').classList.add('hidden');
            document.getElementById('subject-modal').classList.remove('flex');
            document.title = 'CSE 63B - Web Portal';
        });
    }
    
    // Close modals on outside click
    [
        'calendar-modal',
        'announcement-history-modal',
        'assignment-history-modal',
        'assignment-details-modal',
        'subject-modal'
    ].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.add('hidden');
                    this.classList.remove('flex');
                    document.title = 'CSE 63B - Web Portal';
                }
            });
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('[id$="-modal"]').forEach(modal => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
            document.title = 'CSE 63B - Web Portal';
        }
    });
}

// Make functions globally accessible
window.openAssignmentDetails = openAssignmentDetails;
window.openSubjectModal = openSubjectModal;
window.showEventTooltip = showEventTooltip;
window.hideEventTooltip = hideEventTooltip;

// Auto-refresh every hour
setInterval(async () => {
    await loadAllData();
    renderPortalContent();
    updateWeeklyStats();
}, 3600000);
