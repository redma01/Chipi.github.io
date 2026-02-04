// Assessment Page Handler
const ASSESSMENT_MODEL = 'openai/gpt-3.5-turbo';
const OPENROUTER_URL = 'https://chipiai.redmarizer.workers.dev';
let selectedFile = null;
let assessmentHistory = [];
let currentAssessment = null;
let editMode = false; // For edit/delete functionality

// ===== FIRESTORE PERSISTENCE =====
const STORAGE_MODE = "local"; // "local" disables Firestore persistence
function getAssessmentUserId() {
  try {
    return STORAGE_MODE === "local" ? 'local' : (firebase?.auth?.().currentUser?.uid || 'public');
  } catch (e) {
    return 'local';
  }
}

async function hydrateAssessmentsFromFirestore() {
  if (STORAGE_MODE === "local") return;
  const userId = getAssessmentUserId();
  if (typeof db === 'undefined' || !db) {
    console.warn('Firestore not available');
    return;
  }

  try {
    const doc = await db.collection('users').doc(userId).collection('data').doc('assessments').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.assessments && data.assessments.length > 0) {
        const localStored = localStorage.getItem('assessmentHistory');
        const localAssessments = localStored ? JSON.parse(localStored) : [];
        if (localAssessments.length === 0) {
          assessmentHistory = data.assessments;
        } else {
          assessmentHistory = localAssessments;
        }
        localStorage.setItem('assessmentHistory', JSON.stringify(assessmentHistory));
        renderAssessmentHistory();
      }
    }
  } catch (e) {
    console.warn('Failed to hydrate assessments from Firestore:', e);
  }
}

function saveAssessmentsToFirestore() {
  if (STORAGE_MODE === "local") return;
  const userId = getAssessmentUserId();
  if (typeof db === 'undefined' || !db) return;

  try {
    db.collection('users').doc(userId).collection('data').doc('assessments').set({
      assessments: assessmentHistory,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => {
      console.warn('Failed to save assessments to Firestore:', e);
    });
  } catch (e) {
    console.warn('Firestore save error:', e);
  }
}

// Initialize assessment page
function initAssessmentPage() {
  loadAssessmentHistory();
  renderAssessmentHistory();
  setupProfileMenu();
  setupEditHistoryButton();
  setupChatInterface();

  // Wait for DOM elements to be ready before setting up handlers
  setTimeout(() => {
    setupFileUpload();
    setupTabSwitching();
    setupFormHandling();
  }, 100);

  if (typeof firebase !== 'undefined' && firebase?.auth) {
    firebase.auth().onAuthStateChanged(() => {
      hydrateAssessmentsFromFirestore();
    });
  }
}

// Setup file upload functionality
function setupFileUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const processFileBtn = document.getElementById('processFileBtn');
  const changeFileBtn = document.getElementById('changeFileBtn');

  if (!browseBtn || !fileInput) {
    console.warn('File upload elements not found');
    return;
  }

  // Browse button click
  browseBtn.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      displayFileInfo(selectedFile);
    }
  });

  if (uploadArea) {
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = '#f0f0f0';
      uploadArea.style.borderColor = 'var(--accent-color)';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.backgroundColor = '';
      uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = '';
      uploadArea.style.borderColor = '';
      
      if (e.dataTransfer.files.length > 0) {
        selectedFile = e.dataTransfer.files[0];
        displayFileInfo(selectedFile);
      }
    });
  }

  // Process file button
  if (processFileBtn) {
    processFileBtn.addEventListener('click', async () => {
      if (selectedFile) {
        await processUploadedFile(selectedFile);
      }
    });
  }

  // Change file button
  if (changeFileBtn) {
    changeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      const fileInfo = document.getElementById('fileInfo');
      if (fileInfo) fileInfo.style.display = 'none';
      if (uploadArea) uploadArea.style.display = 'flex';
    });
  }
}

// Display file information
function displayFileInfo(file) {
  const fileInfo = document.getElementById('fileInfo');
  const uploadArea = document.getElementById('uploadArea');
  
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
  
  uploadArea.style.display = 'none';
  fileInfo.style.display = 'block';
}

// Process uploaded file
async function processUploadedFile(file) {
  showToast('Processing file...', 'info');
  
  try {
    let content = '';
    
    if (file.type === 'application/pdf') {
      content = await extractPDFContent(file);
    } else {
      content = await extractTextContent(file);
    }
    
    if (!content) {
      showToast('Could not extract content from file', 'error');
      return;
    }

    // Show extracted content and ask for assessment parameters
    displayExtractedContentForm(content);
  } catch (error) {
    console.error('File processing error:', error);
    showToast('Error processing file: ' + error.message, 'error');
  }
}

// Extract PDF content
async function extractPDFContent(file) {
  // For now, we'll use a simple approach - convert PDF to text
  // In production, you'd use a library like pdf.js or pdfjs-dist
  try {
    const text = await file.text();
    return text;
  } catch (e) {
    console.error('PDF extraction error:', e);
    return null;
  }
}

// Extract text content
async function extractTextContent(file) {
  try {
    return await file.text();
  } catch (e) {
    console.error('Text extraction error:', e);
    return null;
  }
}

// Display form with extracted content
function displayExtractedContentForm(content) {
  const messagesDiv = document.getElementById('messages');
  const contentPreview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
  
  const formHTML = `
    <div class="assessment-result-container">
      <div class="assessment-content-preview">
        <h3>Extracted Content Preview</h3>
        <div class="preview-text">
          <pre>${contentPreview}</pre>
        </div>
        
        <h3>Create Assessment from Content</h3>
        <form id="extractedFileForm" class="assessment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="extractGradeLevelSelect">Grade Level:</label>
              <select id="extractGradeLevelSelect" required>
                <option value="">Select grade level...</option>
                <option value="elementary">Elementary (K-5)</option>
                <option value="middle">Middle School (6-8)</option>
                <option value="high">High School (9-12)</option>
                <option value="college">College/University</option>
              </select>
            </div>

            <div class="form-group">
              <label for="extractQuestionTypeSelect">Question Type:</label>
              <select id="extractQuestionTypeSelect" required>
                <option value="">Select type...</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="short-answer">Short Answer</option>
                <option value="essay">Essay</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="extractQuestionCountInput">Number of Questions:</label>
              <input type="number" id="extractQuestionCountInput" min="1" max="50" value="10" required>
            </div>

            <div class="form-group">
              <label for="extractDifficultySelect">Difficulty:</label>
              <select id="extractDifficultySelect" required>
                <option value="beginner">Beginner</option>
                <option value="intermediate" selected>Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label><input type="checkbox" id="extractIncludeKeyCheckbox"> Include Answer Key</label>
            <label><input type="checkbox" id="extractIncludeRubricCheckbox"> Include Rubric</label>
            <label><input type="checkbox" id="extractRandomizeCheckbox"> Randomize Questions</label>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Assessment from Content
          </button>
        </form>
      </div>
    </div>
  `;
  
  messagesDiv.innerHTML = formHTML;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Store content for later use
  window.extractedContent = content;

  // Setup form handler
  document.getElementById('extractedFileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateAssessmentFromExtractedContent();
  });
}

// Generate assessment from extracted content
async function generateAssessmentFromExtractedContent() {
  const gradeLevel = document.getElementById('extractGradeLevelSelect').value;
  const questionType = document.getElementById('extractQuestionTypeSelect').value;
  const questionCount = parseInt(document.getElementById('extractQuestionCountInput').value);
  const difficulty = document.getElementById('extractDifficultySelect').value;
  const includeKey = document.getElementById('extractIncludeKeyCheckbox').checked;
  const includeRubric = document.getElementById('extractIncludeRubricCheckbox').checked;

  showProgressBar();

  try {
    const assessmentData = await generateAssessmentWithAI(
      window.extractedContent,
      gradeLevel,
      questionType,
      questionCount,
      difficulty,
      includeKey,
      includeRubric,
      true // isFromFile
    );

    currentAssessment = {
      id: Date.now(),
      title: 'Extracted Content Assessment',
      gradeLevel,
      questionType,
      questionCount,
      difficulty,
      timestamp: new Date().toLocaleString(),
      content: assessmentData
    };

    saveAssessmentToHistory(currentAssessment);
    displayAssessmentResult(assessmentData, includeKey, includeRubric);
    renderAssessmentHistory();

  } catch (error) {
    console.error('Assessment generation error:', error);
    showToast('Error generating assessment: ' + error.message, 'error');
  } finally {
    hideProgressBar();
  }
}

// Setup tab switching
function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.assessment-tab-btn');
  const tabContents = document.querySelectorAll('.assessment-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    });
  });
}

// Setup form handling
function setupFormHandling() {
  const form = document.getElementById('assessmentFormPage');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await generateAssessmentFromForm();
    });
  } else {
    console.warn('Assessment form not found');
  }
}

// Generate assessment from form
async function generateAssessmentFromForm() {
  const topic = document.getElementById('topicInput').value;
  const gradeLevel = document.getElementById('gradeLevelSelect').value;
  const questionType = document.getElementById('questionTypeSelect').value;
  const questionCount = parseInt(document.getElementById('questionCountInput').value);
  const difficulty = document.getElementById('difficultySelect').value;
  const context = document.getElementById('contextInput').value;
  const includeKey = document.getElementById('includeKeyCheckbox').checked;
  const includeRubric = document.getElementById('includeRubricCheckbox').checked;

  showProgressBar();

  try {
    const assessmentData = await generateAssessmentWithAI(
      `Topic: ${topic}\n${context}`,
      gradeLevel,
      questionType,
      questionCount,
      difficulty,
      includeKey,
      includeRubric,
      false
    );

    currentAssessment = {
      id: Date.now(),
      title: topic,
      gradeLevel,
      questionType,
      questionCount,
      difficulty,
      timestamp: new Date().toLocaleString(),
      content: assessmentData
    };

    saveAssessmentToHistory(currentAssessment);
    displayAssessmentResult(assessmentData, includeKey, includeRubric);
    renderAssessmentHistory();

  } catch (error) {
    console.error('Assessment generation error:', error);
    showToast('Error generating assessment: ' + error.message, 'error');
  } finally {
    hideProgressBar();
  }
}

// Generate assessment with AI
async function generateAssessmentWithAI(content, gradeLevel, questionType, questionCount, difficulty, includeKey, includeRubric, isFromFile) {
  const prompt = `Based on the following ${isFromFile ? 'lesson content' : 'topic'}:

${content}

Generate ${questionCount} ${questionType} assessment questions for ${gradeLevel} level students with ${difficulty} difficulty.

Format the response as:
Q1: [question text]
[options if multiple choice]
Answer: [correct answer]

${includeKey ? '\nInclude an answer key at the end.' : ''}
${includeRubric ? '\nInclude a scoring rubric.' : ''}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ASSESSMENT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating high-quality assessments. Format questions clearly with proper numbering and answer options.'
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
    return parseAssessmentResponse(data.choices[0].message.content);

  } catch (error) {
    console.error('OpenRouter API error:', error);
    return generateAssessmentLocally();
  }
}

// Parse assessment response
function parseAssessmentResponse(content) {
  const lines = content.split('\n');
  const questions = [];
  let currentQuestion = null;

  lines.forEach(line => {
    if (line.match(/^Q\d+:/)) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        content: line.replace(/^Q\d+:\s*/, ''),
        options: [],
        correct: null
      };
    } else if (currentQuestion && (line.match(/^[A-D]\)/) || line.match(/^[a-d]\)/))) {
      currentQuestion.options.push(line.trim());
    } else if (currentQuestion && line.match(/^Answer:/i)) {
      currentQuestion.correct = line.replace(/^Answer:\s*/i, '').trim();
    }
  });

  if (currentQuestion) questions.push(currentQuestion);

  return {
    questions,
    content,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: ASSESSMENT_MODEL
    }
  };
}

// Generate assessment locally (fallback)
function generateAssessmentLocally() {
  return {
    questions: [
      {
        content: 'What is the main topic of this lesson?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 'Option A'
      }
    ],
    content: 'Fallback assessment generated',
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'local-fallback'
    }
  };
}

// Display assessment result
function displayAssessmentResult(assessmentData, includeKey, includeRubric) {
  const messagesDiv = document.getElementById('messages');
  
  let html = '<div class="assessment-result-container"><div class="assessment-content">';

  // Questions
  html += '<div class="assessment-section"><h3>Assessment Questions</h3>';
  assessmentData.questions.forEach((q, idx) => {
    html += `<div class="question-block">
      <p class="question-text"><strong>Q${idx + 1}:</strong> ${q.content || ''}</p>`;
    
    if (q.options && q.options.length > 0) {
      html += '<div class="question-options">';
      q.options.forEach(opt => {
        const isCorrect = q.correct && opt.includes(q.correct);
        html += `<label class="option ${isCorrect ? 'correct' : ''}">
          <input type="radio" name="q${idx + 1}"> ${opt}
        </label>`;
      });
      html += '</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  // Answer key
  if (includeKey) {
    html += '<div class="assessment-section"><h3>Answer Key</h3><ul>';
    assessmentData.questions.forEach((q, idx) => {
      html += `<li><strong>Q${idx + 1}:</strong> ${q.correct || 'N/A'}</li>`;
    });
    html += '</ul></div>';
  }

  html += '<div class="assessment-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">';
  html += '<button class="btn" onclick="copyAssessmentText()"><i class="fa-solid fa-copy"></i> Copy</button>';
  html += '<button class="btn btn-secondary" onclick="createNewAssessment()"><i class="fa-solid fa-plus"></i> New</button>';
  html += '</div></div></div>';

  messagesDiv.innerHTML = html;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Download assessment as PDF
function downloadAssessmentPDF() {
  if (!currentAssessment) return;
  showToast('PDF download would be implemented with html2pdf library', 'info');
}

// Download assessment as Word
function downloadAssessmentWord() {
  if (!currentAssessment) return;
  const content = document.querySelector('.assessment-content');
  const text = content.innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Assessment-${currentAssessment.title}-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Assessment downloaded!', 'success');
}

// Copy assessment text
function copyAssessmentText() {
  const content = document.querySelector('.assessment-content');
  const text = content.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Assessment copied to clipboard!', 'success');
  });
}

// Create new assessment
function createNewAssessment() {
  const messagesDiv = document.getElementById('messages');
  const introHTML = `
    <div class="assessment-intro-container">
      <div class="assessment-intro">
        <img src="CHIPI DL8.png" alt="Assessment Creator" style="width: 200px; height: auto; margin-bottom: 20px;" />
        <h2>Assessment Creation Tool</h2>
        <p>Create assessments using AI assistance. Upload your lesson content or use the form below.</p>
        
        <div class="assessment-tabs">
          <button class="assessment-tab-btn active" data-tab="upload">
            <i class="fa-solid fa-file-pdf"></i> Upload Content
          </button>
          <button class="assessment-tab-btn" data-tab="form">
            <i class="fa-solid fa-clipboard-list"></i> Create Form
          </button>
        </div>
      </div>
    </div>
  `;
  messagesDiv.innerHTML = introHTML;
  setupTabSwitching();
  setupFormHandling();
}

// Save assessment to history
function saveAssessmentToHistory(assessment) {
  assessmentHistory.unshift(assessment);
  if (assessmentHistory.length > 25) {
    assessmentHistory = assessmentHistory.slice(0, 25);
  }
  localStorage.setItem('assessmentHistory', JSON.stringify(assessmentHistory));
  saveAssessmentsToFirestore();
  renderAssessmentHistory();
}

// Load assessment history
function loadAssessmentHistory() {
  const stored = localStorage.getItem('assessmentHistory');
  assessmentHistory = stored ? JSON.parse(stored) : [];
}

// Render assessment history
function renderAssessmentHistory() {
  const list = document.getElementById('assessmentList');
  if (!list) return;

  if (assessmentHistory.length === 0) {
    list.innerHTML = '<li style="padding: 10px; color: #999; font-size: 13px;">No assessments yet</li>';
    return;
  }

  list.innerHTML = assessmentHistory.map(assessment => {
    const deleteBtn = `<button class="delete-btn" onclick="deleteAssessment(${assessment.id})" style="display: ${editMode ? 'inline-flex' : 'none'};" title="Delete assessment">
      <i class="fa-solid fa-trash"></i>
    </button>`;
    
    return `
    <li class="history-item ${editMode ? 'editing' : ''}" data-id="${assessment.id}">
      <div style="cursor: pointer; flex: 1;" onclick="loadAssessmentFromHistory(${assessment.id})">
        <div class="history-item-title">${assessment.title}</div>
        <div class="history-item-meta">
          <span class="history-item-type">${assessment.gradeLevel}</span>
          <span class="history-item-date">${assessment.timestamp}</span>
        </div>
      </div>
      ${deleteBtn}
    </li>
  `}).join('');
}

// Load assessment from history
function loadAssessmentFromHistory(id) {
  const assessment = assessmentHistory.find(a => a.id === parseInt(id));
  if (assessment) {
    currentAssessment = assessment;
    displayAssessmentResult(assessment.content, true, false);
  }
}

// Setup profile menu
function setupProfileMenu() {
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', () => {
      const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
      profileBtn.setAttribute('aria-expanded', !isExpanded);
      profileMenu.setAttribute('aria-hidden', isExpanded);
    });
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    padding: 15px 20px;
    margin-bottom: 10px;
    background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#4dabf7'};
    color: white;
    border-radius: 4px;
    animation: slideIn 0.3s ease;
    position: relative;
    z-index: 1000;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== AI CHAT INTEGRATION =====

// Setup chat interface
function setupChatInterface() {
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');

  if (!userInput || !sendBtn) {
    console.warn('Chat interface elements not found');
    return;
  }

  // Handle send button click
  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendChatMessage();
  });

  // Handle enter key in textarea
  userInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendChatMessage();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
      return;
    }
  });
}

// Send chat message
async function sendChatMessage() {
  const userInput = document.getElementById('userInput');
  const messagesDiv = document.getElementById('messages');
  const message = userInput.value.trim();

  if (!message) return;

  // Add user message to chat
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'message user';
  userMessageDiv.innerHTML = `<div class="bubble">${escapeHtml(message)}</div>`;
  messagesDiv.appendChild(userMessageDiv);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';

  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Add typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai typing';
  typingDiv.innerHTML = `<div class="bubble">
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  </div>`;
  messagesDiv.appendChild(typingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    // Get AI response using OpenRouter directly
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ASSESSMENT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are CHIPI, a helpful AI assistant for teachers. You help with assessments, lesson planning, and educational content. Be concise and helpful.'
          },
          {
            role: 'user',
            content: message
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Remove typing indicator
    if (typingDiv.parentNode) {
      typingDiv.remove();
    }

    // Add AI response
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai';
    aiMessageDiv.innerHTML = `<div class="bubble">${escapeHtml(aiMessage)}</div>`;
    messagesDiv.appendChild(aiMessageDiv);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;

  } catch (error) {
    console.error('Chat error:', error);
    
    // Remove typing indicator
    if (typingDiv.parentNode) {
      typingDiv.remove();
    }

    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message ai';
    errorDiv.innerHTML = `<div class="bubble error-message">Sorry, I encountered an error. Please try again.</div>`;
    messagesDiv.appendChild(errorDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup edit history button
function setupEditHistoryButton() {
  const editHistoryBtn = document.getElementById('editHistoryBtn');
  if (!editHistoryBtn) return;

  editHistoryBtn.addEventListener('click', () => {
    editMode = !editMode;
    editHistoryBtn.setAttribute('aria-pressed', String(editMode));
    editHistoryBtn.title = editMode ? 'Done editing' : 'Edit assessments';
    editHistoryBtn.classList.toggle('active', editMode);
    renderAssessmentHistory();
  });
}

// Delete assessment from history
function deleteAssessment(id) {
  // Find and remove the assessment
  const index = assessmentHistory.findIndex(a => a.id === id);
  if (index > -1) {
    assessmentHistory.splice(index, 1);
    
    // Save to localStorage
    localStorage.setItem('assessmentHistory', JSON.stringify(assessmentHistory));
    
    // Re-render history
    renderAssessmentHistory();
    
    // If deleted assessment was currently loaded, clear it
    if (currentAssessment && currentAssessment.id === id) {
      currentAssessment = null;
      createNewAssessment();
    }
    
    // Show confirmation
    console.log('Assessment deleted');
  }
}

// Show progress bar
function showProgressBar() {
  const progressDiv = document.getElementById('assessmentProgress');
  if (progressDiv) {
    progressDiv.style.display = 'flex';
    resetProgressBar();
  }
}

// Hide progress bar
function hideProgressBar() {
  const progressDiv = document.getElementById('assessmentProgress');
  if (progressDiv) {
    progressDiv.style.display = 'none';
  }
}

// Reset progress bar for new generation
function resetProgressBar() {
  const progressBar = document.querySelector('.progress-bar');
  const progressPercent = document.getElementById('progressPercent');
  if (progressBar) progressBar.style.width = '0%';
  if (progressPercent) progressPercent.textContent = '0';
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssessmentPage);
} else {
  initAssessmentPage();
}
