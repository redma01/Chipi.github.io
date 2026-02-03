// DepEd Daily Teaching Log Generator
const LESSON_PLAN_MODEL = 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://asia-southeast1-chipi-d90e8.cloudfunctions.net/openrouter';
const MAX_STORED_LESSON_PLANS = 25;

let currentLessonPlan = null;
let lessonPlanHistory = [];
let editMode = false;


// Initialize Lesson Planning Page
function initLessonPlanningPage() {
  loadLessonPlanHistory();
  renderLessonPlanHistory();
  setupProfileMenu();
  setupEditHistoryButton();
  setupNewLessonPlanButton();
  setupFormHandling();
  setupWizardSteps();
}

// Setup form handling
function setupFormHandling() {
  const form = document.getElementById('lessonPlanForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await generateDepEdDailyTeachingLog();
    });
  }
}

// Setup wizard steps navigation
function setupWizardSteps() {
  const nextButtons = document.querySelectorAll('.btn-primary');
  const prevButtons = document.querySelectorAll('.btn-secondary');
}

// Navigate to next step in wizard
function nextLessonPlanStep() {
  const currentStep = document.querySelector('.form-step.active');
  const steps = document.querySelectorAll('.form-step');
  const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
  
  if (currentStepNum < steps.length) {
    currentStep.classList.remove('active');
    const nextStep = document.querySelector(`.form-step[data-step="${currentStepNum + 1}"]`);
    if (nextStep) {
      nextStep.classList.add('active');
      updateStepIndicator(currentStepNum + 1);
      if (currentStepNum + 1 === 3) {
        updateSummary();
      }
    }
  }
}

// Navigate to previous step in wizard
function prevLessonPlanStep() {
  const currentStep = document.querySelector('.form-step.active');
  const steps = document.querySelectorAll('.form-step');
  const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
  
  if (currentStepNum > 1) {
    currentStep.classList.remove('active');
    const prevStep = document.querySelector(`.form-step[data-step="${currentStepNum - 1}"]`);
    if (prevStep) {
      prevStep.classList.add('active');
      updateStepIndicator(currentStepNum - 1);
    }
  }
}

// Update step indicator
function updateStepIndicator(stepNum) {
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    if (index + 1 <= stepNum) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

// Update summary on step 3
function updateSummary() {
  const teacher = document.getElementById('lessonTeacherName').value || 'Not specified';
  const grade = document.getElementById('lessonGradeLevel').value || 'Not selected';
  const section = document.getElementById('lessonSection').value || 'Not specified';
  const subject = document.getElementById('lessonSubject').value || 'Not selected';
  const week = document.getElementById('lessonWeekCovered').value || 'Not specified';
  const topic = document.getElementById('lessonMainTopic').value || 'Not specified';
  const time = document.getElementById('lessonTime').value || 'Not specified';

  document.getElementById('reviewTeacher').textContent = teacher;
  document.getElementById('reviewGradeSection').textContent = `${grade} - ${section}`;
  document.getElementById('reviewSubject').textContent = subject;
  document.getElementById('reviewWeek').textContent = week;
  document.getElementById('reviewTopic').textContent = topic;
  
  const reviewTime = document.getElementById('reviewTime');
  if (reviewTime) reviewTime.textContent = time;
}

// Generate DepEd Daily Teaching Log
async function generateDepEdDailyTeachingLog() {
  const teacher = document.getElementById('lessonTeacherName').value;
  const gradeLevel = document.getElementById('lessonGradeLevel').value;
  const section = document.getElementById('lessonSection').value;
  const subject = document.getElementById('lessonSubject').value;
  const schoolYear = document.getElementById('lessonSchoolYear').value;
  const weekCovered = document.getElementById('lessonWeekCovered').value;
  const classTime = document.getElementById('lessonTime').value;
  const mainTopic = document.getElementById('lessonMainTopic').value;
  const competencies = document.getElementById('lessonCompetencies').value;
  const strategies = document.getElementById('lessonTeachingStrategies').value;
  const additionalNotes = document.getElementById('lessonAdditionalNotes').value;
  
  const includeQuiz = document.getElementById('lessonIncludeQuiz').checked;
  const includePerformanceTask = document.getElementById('lessonIncludePerformanceTask').checked;
  const includeReflection = document.getElementById('lessonIncludeReflection').checked;
  const includeCodeIntegration = document.getElementById('lessonIncludeCodeIntegration').checked;

  // Show progress
  const progressDiv = document.getElementById('lessonProgress');
  if (progressDiv) progressDiv.classList.remove('hidden');

  try {
    const logData = await generateDepEdLogWithOpenRouter(
      teacher, gradeLevel, section, subject, schoolYear, weekCovered, classTime, mainTopic,
      competencies, strategies, additionalNotes, includeQuiz, includePerformanceTask, 
      includeReflection, includeCodeIntegration
    );

    currentLessonPlan = {
      id: Date.now(),
      title: `${subject} - Week of ${weekCovered}`,
      gradeLevel: `${gradeLevel} ${section}`,
      subject,
      timestamp: new Date().toLocaleString(),
      content: logData
    };

    saveLessonPlanToHistory(currentLessonPlan);
    displayLessonPlanResults(logData);

  } catch (error) {
    console.error('Daily Teaching Log generation failed:', error);
    alert('Error generating Daily Teaching Log. Please try again.');
  } finally {
    if (progressDiv) progressDiv.classList.add('hidden');
  }
}

// Call OpenRouter API for DepEd Daily Teaching Log
async function generateDepEdLogWithOpenRouter(teacher, gradeLevel, section, subject, schoolYear, 
  weekCovered, classTime, mainTopic, competencies, strategies, additionalNotes, includeQuiz, 
  includePerformanceTask, includeReflection, includeCodeIntegration) {
  
  const prompt = buildDepEdDailyLogPrompt(
    teacher, gradeLevel, section, subject, schoolYear, weekCovered, classTime, mainTopic,
    competencies, strategies, additionalNotes, includeQuiz, includePerformanceTask,
    includeReflection, includeCodeIntegration
  );

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LESSON_PLAN_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert DepEd curriculum specialist and teacher. Generate comprehensive, accurate Daily Teaching Logs (DLLs) following the official DepEd format for the Philippine K-12 Curriculum. Ensure all lessons are aligned with DepEd learning competencies, age-appropriate, and ready for classroom use. Use clear, concise, and teacher-friendly language. The output must be in a format ready for printing or copying into official DepEd templates.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

// Build DepEd Daily Teaching Log prompt
function buildDepEdDailyLogPrompt(teacher, gradeLevel, section, subject, schoolYear, 
  weekCovered, classTime, mainTopic, competencies, strategies, additionalNotes, includeQuiz, 
  includePerformanceTask, includeReflection, includeCodeIntegration) {
  
  let prompt = `Generate a complete DepEd Daily Teaching Log (DLL) with the following details:

TEACHER INFORMATION:
- Teacher Name: ${teacher}
- Grade Level & Section: ${gradeLevel} - ${section}
- Subject / Learning Area: ${subject}
- School Year: ${schoolYear}
- Week Covered: ${weekCovered}
- Class Time: ${classTime}
- Main Lesson Topic / Unit: ${mainTopic}

LEARNING COMPETENCIES:
${competencies}

TEACHING PREFERENCES:
${strategies}

ADDITIONAL REQUIREMENTS:
- Include Daily Quizzes: ${includeQuiz ? 'Yes' : 'No'}
- Include Performance Tasks: ${includePerformanceTask ? 'Yes' : 'No'}
- Include Teacher Reflections: ${includeReflection ? 'Yes' : 'No'}
- Include DepEd Competency Codes: ${includeCodeIntegration ? 'Yes' : 'No'}

${additionalNotes ? `\nSpecial Notes/Instructions:\n${additionalNotes}` : ''}

REQUIRED OUTPUT FORMAT:

=== DAILY TEACHING LOG ===

Teacher: ${teacher}
Grade & Section: ${gradeLevel} - ${section}
Subject: ${subject}
Week of: ${weekCovered}
School Year: ${schoolYear}

[Generate a detailed lesson table for Monday through Friday with the following structure for EACH day:]

**DAY (Date):**
Time: [Class Period]
Learning Area/Subject: ${subject}
Lesson/Topic: [Specific topic for the day]
Learning Competencies: [List competencies, include codes if requested]

**A. Teaching & Learning Activities**
   i. Introduction/Motivation: [Engaging warm-up activity]
   ii. Lesson Proper: [Core instructional content]
   iii. Guided/Independent Practice: [Student practice activities]
   
**B. Assessment/Evaluation:** [Quiz, PT, Oral recitation, or exit ticket as requested]

${includeReflection ? '**C. Remarks/Reflection:** [Teacher reflection on: student participation, difficulties encountered, improvement plans]' : ''}

QUALITY GUIDELINES:
1. Activities must be age-appropriate and realistic for classroom use
2. Assessments must align with lesson objectives
3. Reflections should sound authentic, not generic
4. Vary teaching strategies and activities across the week
5. Ensure progression from Monday to Friday
6. Use DepEd curriculum framework terminology
7. All output must be ready for printing or official DepEd template submission`;

  return prompt;
}

// Display lesson plan results
function displayLessonPlanResults(content) {
  const resultsDiv = document.getElementById('lessonResults');
  const previewDiv = document.getElementById('lessonPreview');
  const formContainer = document.querySelector('.lesson-plan-form-container');

  if (formContainer) formContainer.classList.add('hidden');
  if (resultsDiv) resultsDiv.classList.remove('hidden');
  if (previewDiv) previewDiv.innerHTML = `<div class="lesson-plan-content">${formatContent(content)}</div>`;
}

// Format content for display
function formatContent(content) {
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/\n\*\s/g, '<br>• ');
}

// Reset lesson plan view
function resetLessonPlanView() {
  const resultsDiv = document.getElementById('lessonResults');
  const formContainer = document.querySelector('.lesson-plan-form-container');
  const form = document.getElementById('lessonPlanForm');

  if (resultsDiv) resultsDiv.classList.add('hidden');
  if (formContainer) formContainer.classList.remove('hidden');
  if (form) form.reset();

  document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
  document.querySelector('.form-step[data-step="1"]').classList.add('active');
  updateStepIndicator(1);
}

// Edit lesson plan
function editLessonPlan() {
  resetLessonPlanView();
}

// Download lesson plan as PDF
function downloadLessonPlanPDF() {
  if (!currentLessonPlan) return;

  const element = document.getElementById('lessonPreview');
  const text = element.innerText;

  const blob = new Blob([text], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DLL-${currentLessonPlan.title}-${Date.now()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// Download lesson plan as Word
function downloadLessonPlanWord() {
  if (!currentLessonPlan) return;

  const element = document.getElementById('lessonPreview');
  const text = element.innerText;

  const blob = new Blob([text], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DLL-${currentLessonPlan.title}-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy lesson plan text to clipboard
function copyLessonPlanText() {
  if (!currentLessonPlan) return;
  const element = document.getElementById('lessonPreview');
  if (!element) return;

  const text = element.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Daily Teaching Log copied to clipboard!');
  });
}

// Load lesson plan history from localStorage
function loadLessonPlanHistory() {
  const stored = localStorage.getItem('lessonPlanHistory');
  if (stored) {
    try {
      lessonPlanHistory = JSON.parse(stored);
    } catch (e) {
      lessonPlanHistory = [];
    }
  }
}

// Save lesson plan to history
function saveLessonPlanToHistory(lessonPlan) {
  lessonPlanHistory.unshift(lessonPlan);
  if (lessonPlanHistory.length > MAX_STORED_LESSON_PLANS) {
    lessonPlanHistory.pop();
  }
  localStorage.setItem('lessonPlanHistory', JSON.stringify(lessonPlanHistory));
  renderLessonPlanHistory();
}

// Render lesson plan history
function renderLessonPlanHistory() {
  const list = document.getElementById('lessonPlanHistory');
  if (!list) return;

  if (lessonPlanHistory.length === 0) {
    list.innerHTML = '<li style="padding: 10px; color: #999; font-size: 13px;">No lesson plans yet</li>';
    return;
  }

  list.innerHTML = lessonPlanHistory.map(plan => {
    const deleteBtn = `<button class="delete-btn" onclick="deleteLessonPlan(${plan.id})" style="display: ${editMode ? 'inline-flex' : 'none'};" title="Delete lesson plan">
      <i class="fa-solid fa-trash"></i>
    </button>`;

    return `
    <li class="history-item ${editMode ? 'editing' : ''}" data-id="${plan.id}">
      <div style="cursor: pointer; flex: 1;" onclick="loadLessonPlanFromHistory(${plan.id})">
        <div class="history-item-title">${plan.title}</div>
        <div class="history-item-meta">
          <span class="history-item-type">${plan.gradeLevel}</span>
          <span class="history-item-date">${plan.timestamp}</span>
        </div>
      </div>
      ${deleteBtn}
    </li>
  `}).join('');
}

// Load lesson plan from history
function loadLessonPlanFromHistory(id) {
  const plan = lessonPlanHistory.find(p => p.id === id);
  if (plan) {
    currentLessonPlan = plan;
    displayLessonPlanResults(plan.content);
  }
}

// Delete lesson plan from history
function deleteLessonPlan(id) {
  const index = lessonPlanHistory.findIndex(p => p.id === id);
  if (index > -1) {
    lessonPlanHistory.splice(index, 1);
    localStorage.setItem('lessonPlanHistory', JSON.stringify(lessonPlanHistory));
    renderLessonPlanHistory();

    if (currentLessonPlan && currentLessonPlan.id === id) {
      currentLessonPlan = null;
      resetLessonPlanView();
    }
  }
}

// Setup edit history button
function setupEditHistoryButton() {
  const editHistoryBtn = document.getElementById('editHistoryBtn');
  if (!editHistoryBtn) return;

  editHistoryBtn.addEventListener('click', () => {
    editMode = !editMode;
    editHistoryBtn.setAttribute('aria-pressed', String(editMode));
    editHistoryBtn.title = editMode ? 'Done editing' : 'Edit lesson plans';
    editHistoryBtn.classList.toggle('active', editMode);
    renderLessonPlanHistory();
  });
}

// Setup new lesson plan button
function setupNewLessonPlanButton() {
  const addTabBtn = document.getElementById('addTabBtn');
  if (!addTabBtn) return;

  addTabBtn.addEventListener('click', () => {
    // Reset the form and show the form container
    const formContainer = document.querySelector('.lesson-plan-form-container');
    const resultsDiv = document.getElementById('lessonResults');
    
    if (formContainer) formContainer.classList.remove('hidden');
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    // Reset all form fields
    const form = document.getElementById('lessonPlanForm');
    if (form) form.reset();
    
    // Reset to step 1
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const firstStep = document.querySelector('.form-step[data-step="1"]');
    if (firstStep) firstStep.classList.add('active');
    
    // Reset step indicator
    updateStepIndicator(1);
    
    // Clear current lesson plan
    currentLessonPlan = null;
  });
}

// Setup profile menu
function setupProfileMenu() {
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', () => {
      profileMenu.classList.toggle('open');
      profileBtn.setAttribute('aria-expanded', profileMenu.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.profile')) {
        profileMenu.classList.remove('open');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLessonPlanningPage);
} else {
  initLessonPlanningPage();
}
