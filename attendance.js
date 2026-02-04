document.addEventListener('DOMContentLoaded', () => {
    // ===== FIRESTORE PERSISTENCE HELPERS =====
    const STORAGE_MODE = "local"; // "local" disables Firestore persistence
    function getAttendanceUserId() {
        try {
            return STORAGE_MODE === "local" ? 'local' : (firebase?.auth?.().currentUser?.uid || 'public');
        } catch (e) {
            return 'local';
        }
    }

    async function hydrateAttendanceFromFirestore() {
        if (STORAGE_MODE === "local") return;
        const userId = getAttendanceUserId();
        if (typeof db === 'undefined' || !db) {
            console.warn('Firestore not available');
            return;
        }

        try {
            const doc = await db.collection('users').doc(userId).collection('data').doc('attendance').get();
            if (doc.exists) {
                const data = doc.data();
                if (data?.appData && Object.keys(data.appData.sections || {}).length > 0) {
                    const localStored = localStorage.getItem('attendanceApp');
                    const localData = localStored ? JSON.parse(localStored) : null;
                    if (!localData || Object.keys(localData.sections || {}).length === 0) {
                        appData = data.appData;
                        localStorage.setItem('attendanceApp', JSON.stringify(appData));
                        initializeApp();
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to hydrate attendance from Firestore:', e);
        }
    }

    function saveAttendanceToFirestore() {
        if (STORAGE_MODE === "local") return;
        const userId = getAttendanceUserId();
        if (typeof db === 'undefined' || !db) return;

        try {
            db.collection('users').doc(userId).collection('data').doc('attendance').set({
                appData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(e => {
                console.warn('Failed to save attendance to Firestore:', e);
            });
        } catch (e) {
            console.warn('Firestore save error:', e);
        }
    }

    // Initialize Firestore hydration
    hydrateAttendanceFromFirestore();

    const addStudentBtn = document.getElementById('addStudentBtn');
    const studentNameInput = document.getElementById('studentNameInput');
    const studentList = document.getElementById('studentList');
    const attendanceDate = document.getElementById('attendanceDate');
    const monthPicker = document.getElementById('monthPicker');
    const monthlyAbsenceView = document.getElementById('monthlyAbsenceView');
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const editStudentsBtn = document.getElementById('editStudentsBtn');
    const absenceTooltip = document.getElementById('absenceTooltip');
    const addSectionBtn = document.getElementById('addSectionBtn');
    const sectionList = document.getElementById('sectionList');
    const editSectionsBtn = document.getElementById('editSectionsBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const emptyStateContainer = document.getElementById('emptyStateContainer');
    const attendanceContainer = document.getElementById('attendanceContainer');
    const createSectionBtnEmpty = document.getElementById('createSectionBtnEmpty');
    const cancelSectionNameBtn = document.getElementById('cancelSectionName');
    const currentSectionName = document.getElementById('currentSectionName');
    const sectionNameModal = document.getElementById('sectionNameModal');
    const modalTitle = document.getElementById('modalTitle');
    const sectionNameInputModal = document.getElementById('sectionNameInputModal');
    const saveSectionNameBtn = document.getElementById('saveSectionName');

    // Delete section confirmation modal elements
    const deleteSectionModal = document.getElementById('deleteSectionModal');
    const deleteSectionMessage = document.getElementById('deleteSectionMessage');
    const cancelDeleteSection = document.getElementById('cancelDeleteSection');
    const confirmDeleteSection = document.getElementById('confirmDeleteSection');

    let pendingDelete = { sectionId: null, name: '' };

    let appData = JSON.parse(localStorage.getItem('attendanceApp')) || { sections: {}, activeSection: null };
    let datePickerInstance = null;

    function initializeDatePicker() {
        if (datePickerInstance) {
            datePickerInstance.destroy();
        }
        if (attendanceDate) {
            datePickerInstance = flatpickr(attendanceDate, {
                altInput: true,
                altFormat: "F j, Y",
                dateFormat: "Y-m-d",
                defaultDate: "today",
                onReady: function(selectedDates, dateStr, instance) {
                    if (appData.activeSection) {
                        loadAttendanceForDate(dateStr);
                    }
                },
                onChange: function(selectedDates, dateStr, instance) {
                    if (appData.activeSection) {
                        loadAttendanceForDate(dateStr);
                    }
                }
            });
        }
    }

    function initializeApp() {
        if (Object.keys(appData.sections).length === 0) {
            emptyStateContainer.style.display = 'flex';
            if (attendanceContainer) attendanceContainer.style.display = 'none';
        } else {
            if (emptyStateContainer) emptyStateContainer.style.display = 'none';
            if (attendanceContainer) attendanceContainer.style.display = 'block';
            renderSectionTabs();
            if (!appData.activeSection || !appData.sections[appData.activeSection]) {
                appData.activeSection = Object.keys(appData.sections)[0];
            }
            initializeDatePicker();
            loadSection(appData.activeSection);
        }

        if (monthPicker) {
            const today = new Date();
            monthPicker.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        }
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', !isExpanded);
            profileMenu.setAttribute('aria-hidden', isExpanded);
        });

        document.addEventListener('click', (event) => {
            if (!profileBtn.contains(event.target) && !profileMenu.contains(event.target)) {
                profileBtn.setAttribute('aria-expanded', 'false');
                profileMenu.setAttribute('aria-hidden', 'true');
            }
        });
    }

    function openCreateSectionModal() {
        modalTitle.textContent = 'Create New Section';
        sectionNameInputModal.value = '';
        sectionNameModal.style.display = 'flex';
        sectionNameInputModal.focus();
    }

    function closeSectionModal() {
        sectionNameModal.style.display = 'none';
    }

    saveSectionNameBtn.addEventListener('click', () => {
        const sectionName = sectionNameInputModal.value.trim();
        if (sectionName) {
            const wasEmpty = Object.keys(appData.sections).length === 0;
            const sectionId = `section-${Date.now()}`;
            appData.sections[sectionId] = { name: sectionName, students: [], attendance: {} };
            appData.activeSection = sectionId;
            saveData();
            renderSectionTabs();
            
            if (wasEmpty) {
                if (emptyStateContainer) emptyStateContainer.style.display = 'none';
                if (attendanceContainer) attendanceContainer.style.display = 'block';
                initializeDatePicker();
            }

            loadSection(appData.activeSection);
            closeSectionModal();
        }
    });

    cancelSectionNameBtn.addEventListener('click', closeSectionModal);

    // Wire up delete confirmation modal buttons
    if (cancelDeleteSection) {
        cancelDeleteSection.addEventListener('click', () => {
            pendingDelete = { sectionId: null, name: '' };
            if (deleteSectionModal) deleteSectionModal.style.display = 'none';
        });
    }
    if (confirmDeleteSection) {
        confirmDeleteSection.addEventListener('click', () => {
            const sectionId = pendingDelete.sectionId;
            if (!sectionId) return;
            delete appData.sections[sectionId];
            if (appData.activeSection === sectionId) {
                appData.activeSection = Object.keys(appData.sections)[0] || null;
            }
            saveData();
            renderSectionTabs();
            loadSection(appData.activeSection);
            pendingDelete = { sectionId: null, name: '' };
            if (deleteSectionModal) deleteSectionModal.style.display = 'none';
        });
    }
    if (deleteSectionModal) {
        deleteSectionModal.addEventListener('click', (evt) => {
            if (evt.target === deleteSectionModal) {
                pendingDelete = { sectionId: null, name: '' };
                deleteSectionModal.style.display = 'none';
            }
        });
    }

    addSectionBtn.addEventListener('click', openCreateSectionModal);
    if (createSectionBtnEmpty) {
        createSectionBtnEmpty.addEventListener('click', openCreateSectionModal);
    }

    editSectionsBtn.addEventListener('click', () => {
        const isEditing = sectionList.classList.toggle('editing');
        editSectionsBtn.setAttribute('aria-pressed', isEditing);
        editSectionsBtn.title = isEditing ? 'Done editing' : 'Edit sections';
        editSectionsBtn.classList.toggle('active', isEditing);
        renderSectionTabs();
    });

    function renderSectionTabs() {
        sectionList.innerHTML = '';
        for (const sectionId in appData.sections) {
            const section = appData.sections[sectionId];
            const li = document.createElement('li');
            li.className = 'history-item';
            if (sectionId === appData.activeSection) {
                li.classList.add('selected');
                li.style.background = '#e6f9ff';
                li.setAttribute('aria-current', 'true');
            } else {
                li.style.background = 'transparent';
                li.removeAttribute('aria-current');
            }

            // Show editing state class when edit mode is active
            if (sectionList.classList.contains('editing')) {
                li.classList.add('editing');
            } else {
                li.classList.remove('editing');
            }

            li.setAttribute('aria-label', section.name || 'Section');
            li.tabIndex = 0;

            // Icon element
            const iconEl = document.createElement('span');
            iconEl.className = 'icon';
            iconEl.textContent = '📋';
            iconEl.title = section.name || '';

            // Title wrap
            const titleWrap = document.createElement('div');
            titleWrap.style.display = 'flex';
            titleWrap.style.flexDirection = 'column';
            titleWrap.style.minWidth = '0';
            titleWrap.style.alignSelf = 'stretch';

            // Title element
            const titleEl = document.createElement('span');
            titleEl.className = 'history-title';
            titleEl.textContent = section.name || 'Untitled';
            titleEl.title = section.name || '';

            // Subtitle with student count
            const subEl = document.createElement('div');
            subEl.className = 'history-sub';
            subEl.style.color = 'var(--muted-text)';
            subEl.style.fontSize = '13px';
            const studentCount = section.students ? Object.keys(section.students).length : 0;
            subEl.textContent = `${studentCount} student${studentCount !== 1 ? 's' : ''}`;

            // Actions (delete button)
            const actions = document.createElement('div');
            actions.className = 'history-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.setAttribute('title', 'Delete');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.style.display = sectionList.classList.contains('editing') ? 'inline-flex' : 'none';
            deleteBtn.style.padding = '5px';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pendingDelete.sectionId = sectionId;
                pendingDelete.name = section.name;
                if (deleteSectionMessage) {
                    deleteSectionMessage.textContent = `Are you sure to delete the tab of "${section.name}"?`;
                }
                if (deleteSectionModal) {
                    deleteSectionModal.style.display = 'flex';
                }
            });

            actions.appendChild(deleteBtn);

            titleWrap.appendChild(titleEl);
            titleWrap.appendChild(subEl);

            li.appendChild(iconEl);
            li.appendChild(titleWrap);
            li.appendChild(actions);

            // Keyboard support: Enter opens, Delete removes (in edit mode)
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !sectionList.classList.contains('editing')) {
                    appData.activeSection = sectionId;
                    saveData();
                    loadSection(sectionId);
                    renderSectionTabs();
                }
                if (e.key === 'Delete' && sectionList.classList.contains('editing')) {
                    pendingDelete.sectionId = sectionId;
                    pendingDelete.name = section.name;
                    if (deleteSectionMessage) {
                        deleteSectionMessage.textContent = `Are you sure to delete the tab of "${section.name}"?`;
                    }
                    if (deleteSectionModal) {
                        deleteSectionModal.style.display = 'flex';
                    }
                }
            });

            // Click to load section (disabled while editing)
            li.addEventListener('click', () => {
                if (sectionList.classList.contains('editing')) return;
                if (appData.activeSection === sectionId) return;

                appData.activeSection = sectionId;
                saveData();
                loadSection(sectionId);
                renderSectionTabs();
            });

            sectionList.appendChild(li);
        }
    }

    function loadSection(sectionId) {
        if (!sectionId || !appData.sections[sectionId]) {
            if (studentList) studentList.innerHTML = ''; // Clear list if no section
            if (currentSectionName) currentSectionName.textContent = '';
            if (Object.keys(appData.sections).length === 0) {
                if (emptyStateContainer) emptyStateContainer.style.display = 'flex';
                if (attendanceContainer) attendanceContainer.style.display = 'none';
            }
            return;
        }
        if (emptyStateContainer) emptyStateContainer.style.display = 'none';
        if (attendanceContainer) attendanceContainer.style.display = 'block';
        
        const section = appData.sections[sectionId];
        
        if (currentSectionName) {
            currentSectionName.textContent = section.name;
        }
        
        loadStudents(section.students);
        
        // Ensure the date picker has a value before loading attendance
        if (datePickerInstance && datePickerInstance.selectedDates.length > 0) {
            loadAttendanceForDate(datePickerInstance.formatDate(datePickerInstance.selectedDates[0], "Y-m-d"));
        }
    }

    function saveData() {
        localStorage.setItem('attendanceApp', JSON.stringify(appData));
        saveAttendanceToFirestore();
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = document.getElementById(tab.dataset.tab);
            tabContents.forEach(tc => tc.classList.remove('active'));
            target.classList.add('active');

            if (tab.dataset.tab === 'monthly') {
                renderMonthlyView();
            }
        });
    });

    addStudentBtn.addEventListener('click', () => {
        const studentName = studentNameInput.value.trim();
        if (studentName && appData.activeSection) {
            const section = appData.sections[appData.activeSection];
            if (!section.students.includes(studentName)) {
                section.students.push(studentName);
                saveData();
                addStudent(studentName);
                studentNameInput.value = '';
            }
        }
    });

    studentNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addStudentBtn.click();
        }
    });

    editStudentsBtn.addEventListener('click', () => {
        studentList.classList.toggle('editing');
        editStudentsBtn.setAttribute('aria-pressed', studentList.classList.contains('editing'));
    });

    monthPicker.addEventListener('change', renderMonthlyView);

    function addStudent(name) {
        const studentRow = document.createElement('div');
        studentRow.classList.add('student-row');
        studentRow.dataset.studentName = name;

        studentRow.innerHTML = `
            <span class="student-name">${name}</span>
            <div class="attendance-status">
                <button class="status-btn present" data-status="Present"><i class="fas fa-check"></i> Present</button>
                <button class="status-btn absent" data-status="Absent">Absent</button>
                <button class="status-btn late" data-status="Late">Late</button>
                <button class="status-btn excused" data-status="Excused">Excused</button>
            </div>
            <button class="delete-btn"><i class="fa-solid fa-circle-xmark"></i></button>
        `;

        studentList.appendChild(studentRow);
        updateEventListeners(studentRow);
    }

    function updateEventListeners(row) {
        const statusButtons = row.querySelectorAll('.status-btn');
        statusButtons.forEach(button => {
            button.addEventListener('click', () => {
                statusButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                saveAttendance(row.dataset.studentName, button.dataset.status);
            });
        });

        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            const studentName = row.dataset.studentName;
            const section = appData.sections[appData.activeSection];
            section.students = section.students.filter(s => s !== studentName);
            saveData();
            row.remove();
        });
    }

    function saveAttendance(studentName, status) {
        const date = attendanceDate.value;
        const section = appData.sections[appData.activeSection];
        if (!section.attendance[date]) {
            section.attendance[date] = {};
        }
        section.attendance[date][studentName] = status;
        saveData();
    }

    function loadAttendanceForDate(date) {
        const studentRows = document.querySelectorAll('.student-row');
        const section = appData.sections[appData.activeSection];
        const dailyAttendance = section ? section.attendance[date] || {} : {};

        studentRows.forEach(row => {
            const studentName = row.dataset.studentName;
            const savedStatus = dailyAttendance[studentName];

            const statusButtons = row.querySelectorAll('.status-btn');
            statusButtons.forEach(btn => btn.classList.remove('active'));

            if (savedStatus) {
                const activeButton = row.querySelector(`.status-btn[data-status="${savedStatus}"]`);
                if (activeButton) {
                    activeButton.classList.add('active');
                }
            }
        });
    }

    function renderMonthlyView() {
        const [year, month] = monthPicker.value.split('-');
        const monthlyData = {};
        const section = appData.sections[appData.activeSection];

        if (!section) return;

        section.students.forEach(student => {
            monthlyData[student] = {
                absences: { count: 0, dates: [] },
                lates: { count: 0, dates: [] }
            };
        });

        for (const date in section.attendance) {
            if (date.startsWith(`${year}-${month}`)) {
                for (const studentName in section.attendance[date]) {
                    const status = section.attendance[date][studentName];
                    if (status === 'Absent') {
                        if (monthlyData[studentName]) {
                            monthlyData[studentName].absences.count++;
                            monthlyData[studentName].absences.dates.push(date);
                        }
                    } else if (status === 'Late') {
                        if (monthlyData[studentName]) {
                            monthlyData[studentName].lates.count++;
                            monthlyData[studentName].lates.dates.push(date);
                        }
                    }
                }
            }
        }

        monthlyAbsenceView.innerHTML = '<h3>Monthly Report</h3>';
        const list = document.createElement('ul');
        list.classList.add('monthly-report-list');

        for (const studentName in monthlyData) {
            const data = monthlyData[studentName];
            const listItem = document.createElement('li');
            
            let text = `${studentName}: ${data.absences.count} absences`;
            if (data.lates.count > 0) {
                text += `, ${data.lates.count} lates`;
            }
            listItem.textContent = text;

            listItem.dataset.studentName = studentName;
            listItem.dataset.absentDates = JSON.stringify(data.absences.dates);
            listItem.dataset.lateDates = JSON.stringify(data.lates.dates);
            list.appendChild(listItem);
        }
        monthlyAbsenceView.appendChild(list);
        addTooltipEvents();
    }

    function addTooltipEvents() {
        const studentItems = document.querySelectorAll('.monthly-report-list li');

        studentItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const absentDates = JSON.parse(item.dataset.absentDates);
                const lateDates = JSON.parse(item.dataset.lateDates);
                const studentName = item.dataset.studentName;

                let tooltipContent = '';

                if (absentDates.length > 0) {
                    const formattedDates = absentDates.map(d => 
                        `<li>${new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</li>`
                    ).join('');
                    tooltipContent += `<h4>${studentName}'s Absences</h4><ul>${formattedDates}</ul>`;
                }

                if (lateDates.length > 0) {
                    if(tooltipContent) tooltipContent += '<hr>';
                    const formattedDates = lateDates.map(d => 
                        `<li>${new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</li>`
                    ).join('');
                    tooltipContent += `<h4>${studentName}'s Lates</h4><ul>${formattedDates}</ul>`;
                }

                if (tooltipContent) {
                    absenceTooltip.innerHTML = tooltipContent;
                    absenceTooltip.style.display = 'block';
                }
            });

            item.addEventListener('mousemove', (e) => {
                // Position tooltip near the cursor
                absenceTooltip.style.left = `${e.pageX + 15}px`;
                absenceTooltip.style.top = `${e.pageY + 15}px`;
            });

            item.addEventListener('mouseleave', () => {
                absenceTooltip.style.display = 'none';
            });
        });
    }

    function loadStudents(students) {
        studentList.innerHTML = '';
        if (students && students.length > 0) {
            students.forEach(student => addStudent(student));
        }
    }

    initializeApp();
});
