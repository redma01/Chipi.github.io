// Lesson Planning Feature - Create structured lesson plans with AI assistance
const LESSON_PLAN_MODEL = 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://asia-southeast1-chipi-d90e8.cloudfunctions.net/openrouter';
const MAX_STORED_LESSON_PLANS = 25;

let currentLessonPlan = null;
let lessonPlanHistory = [];


// Initialize Lesson Planning
function initLessonPlanning() {
  loadLessonPlanHistory();
  attachLessonPlanEventListeners();
}

// Attach event listeners for lesson planning form
function attachLessonPlanEventListeners() {
  const form = document.getElementById('lessonPlanningForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await generateLessonPlan();
    });
  }
}

// Generate lesson plan with AI
async function generateLessonPlan() {
  const topic = document.getElementById('lessonTopic').value;
  const gradeLevel = document.getElementById('lessonGradeLevel').value;
  const duration = document.getElementById('lessonDuration').value;
  const subject = document.getElementById('lessonSubject').value;
  const objectives = document.getElementById('lessonObjectives').value;
  const materials = document.getElementById('lessonMaterials').value;
  const standards = document.getElementById('lessonStandards').value;
  const notes = document.getElementById('lessonNotes').value;
  const warmup = document.getElementById('lessonIncludeWarmup').checked;
  const closing = document.getElementById('lessonIncludeClosing').checked;
  const differentiation = document.getElementById('lessonIncludeDifferentiation').checked;
  const assessment = document.getElementById('lessonIncludeAssessment').checked;
  const timeline = document.getElementById('lessonIncludeTimeline').checked;
  const extension = document.getElementById('lessonIncludeExtension').checked;
  const resources = document.getElementById('lessonIncludeResources').checked;

  // Close the modal
  const modal = document.getElementById('lessonPlanningModal');
  if (modal) modal.style.display = 'none';

  // Show loading message in chat
  addLessonChatMessage('Generating your lesson plan...', 'ai');

  try {
    const lessonData = await generateLessonPlanWithOpenRouter(
      topic, gradeLevel, duration, subject, objectives, materials, standards, 
      notes, warmup, closing, differentiation, assessment, timeline, extension, resources
    );

    currentLessonPlan = {
      id: Date.now(),
      topic,
      gradeLevel,
      subject,
      duration,
      timestamp: new Date().toLocaleString(),
      content: lessonData
    };

    saveLessonPlanToHistory(currentLessonPlan);
    displayLessonPlanInChat(lessonData, currentLessonPlan);

  } catch (error) {
    console.error('Lesson plan generation failed:', error);
    addLessonChatMessage('Error generating lesson plan. Please try again.', 'ai');
  }
}

// Call OpenRouter API for lesson plan generation
async function generateLessonPlanWithOpenRouter(topic, gradeLevel, duration, subject, objectives, materials, standards, notes, warmup, closing, differentiation, assessment, timeline, extension, resources) {
  const prompt = buildLessonPlanPrompt(topic, gradeLevel, duration, subject, objectives, materials, standards, notes, warmup, closing, differentiation, assessment, timeline, extension, resources);

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
            content: 'You are an expert curriculum designer and teacher. Create comprehensive, well-structured lesson plans that are engaging, standards-aligned, and include practical classroom activities.'
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
    return parseLessonPlanResponse(data.choices[0].message.content);
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return generateLessonPlanLocally(topic, gradeLevel, duration, subject);
  }
}

// Build prompt for lesson plan
function buildLessonPlanPrompt(topic, gradeLevel, duration, subject, objectives, materials, standards, notes, warmup, closing, differentiation, assessment, timeline, extension, resources) {
  let prompt = `Create a comprehensive lesson plan for ${topic} for ${gradeLevel} grade students in ${subject}.

Duration: ${duration}
${standards ? `Standards: ${standards}` : ''}

${objectives ? `Specific Learning Objectives:\n${objectives}` : 'Generate appropriate learning objectives for this topic.'}

${materials ? `Required Materials:\n${materials}` : 'Suggest appropriate materials needed.'}

${notes ? `\nAdditional Notes:\n${notes}` : ''}

Lesson Plan Components to Include:
- Overview/Introduction
${warmup ? '- Warm-Up Activity' : ''}
- Main Teaching Content (with key concepts and explanations)
- Instructional Strategies and Activities
${closing ? '- Closing/Summary Activity' : ''}
${timeline ? '- Detailed Timeline with time allocations' : ''}
${differentiation ? '- Differentiation Strategies (for different learning levels)' : ''}
${assessment ? '- Assessment Strategy (formative and/or summative)' : ''}
${extension ? '- Extension Activities for advanced learners' : ''}
${resources ? '- Additional Resources and References' : ''}

Create a detailed, practical, and engaging lesson plan that a teacher can implement immediately.`;

  return prompt;
}

// Parse lesson plan response
function parseLessonPlanResponse(content) {
  const sections = content.split(/(?=##\s|###\s|---)/);
  
  return {
    content: content,
    sections: sections.map(s => s.trim()).filter(s => s.length > 0),
    metadata: {
      generatedAt: new Date().toISOString(),
      model: LESSON_PLAN_MODEL
    }
  };
}

// Download lesson plan as PDF
function downloadLessonPlanPDF() {
  if (!currentLessonPlan) return;
  
  const element = document.getElementById('lessonPreview');
  const opt = {
    margin: 10,
    filename: `LessonPlan-${currentLessonPlan.topic}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save();
  } else {
    alert('PDF export requires html2pdf library');
  }
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
  a.download = `LessonPlan-${currentLessonPlan.topic}-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy lesson plan text to clipboard
function copyLessonPlanText() {
  const element = document.getElementById('lessonPreview');
  const text = element.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Lesson plan copied to clipboard!');
  });
}

// Edit lesson plan (show in editable format)
function editLessonPlan() {
  const preview = document.getElementById('lessonPreview');
  const isEditable = preview.contentEditable === 'true';
  
  if (isEditable) {
    preview.contentEditable = 'false';
    event.target.textContent = 'Edit';
  } else {
    preview.contentEditable = 'true';
    preview.focus();
    event.target.textContent = 'Done Editing';
  }
}

// Generate lesson plan locally (fallback)
function generateLessonPlanLocally(topic, gradeLevel, duration, subject) {
  const template = `
# Lesson Plan: ${topic}

**Grade Level:** ${gradeLevel}
**Subject:** ${subject}
**Duration:** ${duration}

## Overview
This lesson introduces students to ${topic}, covering key concepts and providing hands-on learning experiences.

## Learning Objectives
By the end of this lesson, students will be able to:
- Understand the fundamental concepts of ${topic}
- Apply knowledge to real-world scenarios
- Analyze and evaluate information related to ${topic}

## Materials Needed
- Textbook or reference materials
- Visual aids/presentation materials
- Activity worksheets
- Classroom materials specific to the topic

## Instructional Sequence

### Introduction (10 minutes)
- Hook/Attention grabber
- Review prior knowledge
- Introduce learning objectives

### Direct Instruction (15-20 minutes)
- Explain key concepts
- Use examples and demonstrations
- Connect to prior knowledge

### Guided Practice (15 minutes)
- Whole-class practice activities
- Teacher-led problem solving
- Student questions and clarification

### Independent Practice (10-15 minutes)
- Individual or small group activities
- Application exercises
- Skill practice

### Closure (5 minutes)
- Summarize main points
- Connect to next lesson
- Preview upcoming content

## Assessment
- Formative: Observation, class participation, guided practice
- Summative: Independent practice completion, exit ticket

## Differentiation
- For struggling learners: Simplified materials, peer support, additional examples
- For advanced learners: Extension activities, challenge problems, research tasks

## Additional Notes
- Adapt activities based on student needs
- Provide multiple means of engagement
- Allow for flexible pacing
  `;

  return {
    content: template,
    sections: template.split('\n## '),
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'local-fallback'
    }
  };
}

// Save lesson plan to history
function saveLessonPlanToHistory(lessonPlan) {
  lessonPlanHistory.unshift(lessonPlan);
  
  if (lessonPlanHistory.length > MAX_STORED_LESSON_PLANS) {
    lessonPlanHistory = lessonPlanHistory.slice(0, MAX_STORED_LESSON_PLANS);
  }

  localStorage.setItem('lessonPlanHistory', JSON.stringify(lessonPlanHistory));
}

// Load lesson plan history
function loadLessonPlanHistory() {
  const stored = localStorage.getItem('lessonPlanHistory');
  lessonPlanHistory = stored ? JSON.parse(stored) : [];
}

// Display lesson plan in chat
function displayLessonPlanInChat(lessonData, lessonPlan) {
  let html = '<div class="lesson-plan-content">';

  // Lesson header
  html += `<div class="lesson-plan-header" style="margin-bottom: 20px;">
    <h4>${lessonPlan.topic}</h4>
    <p style="color: #666; font-size: 13px;">Grade: ${lessonPlan.gradeLevel} | Duration: ${lessonPlan.duration} | Subject: ${lessonPlan.subject}</p>
  </div>`;

  // Main content
  html += '<div class="lesson-plan-text">';
  html += lessonData.content.split('\n').map(line => {
    if (line.startsWith('##')) {
      return `<h4>${line.replace(/^##\s/, '')}</h4>`;
    } else if (line.startsWith('#')) {
      return `<h5>${line.replace(/^#\s/, '')}</h5>`;
    } else if (line.trim().length === 0) {
      return '<br>';
    } else {
      return `<p>${line}</p>`;
    }
  }).join('');
  html += '</div>';

  html += '<div class="lesson-actions" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">';
  html += `<button class="btn" onclick="downloadLessonPlanPDF()" style="font-size: 13px; padding: 6px 12px;">📥 Download PDF</button>`;
  html += `<button class="btn" onclick="downloadLessonPlanWord()" style="font-size: 13px; padding: 6px 12px;">📄 Download Word</button>`;
  html += `<button class="btn" onclick="copyLessonPlanText()" style="font-size: 13px; padding: 6px 12px;">📋 Copy Text</button>`;
  html += '</div>';

  html += '</div>';

  addLessonChatMessage(html, 'ai', true);
}

// Add lesson chat message (helper function to integrate with mainpage chat)
function addLessonChatMessage(content, role = 'ai', isHTML = false) {
  const messagesContainer = document.getElementById('messages');
  if (!messagesContainer) return;

  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  
  if (isHTML) {
    bubble.innerHTML = content;
  } else {
    bubble.textContent = content;
  }
  
  messageEl.appendChild(bubble);
  messagesContainer.appendChild(messageEl);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Download lesson plan as PDF
function downloadLessonPlanPDF() {
  if (!currentLessonPlan) return;
  
  const element = document.querySelector('.lesson-plan-content');
  const opt = {
    margin: 10,
    filename: `LessonPlan-${currentLessonPlan.topic}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save();
  } else {
    alert('PDF export requires html2pdf library');
  }
}

// Download lesson plan as Word
function downloadLessonPlanWord() {
  if (!currentLessonPlan) return;

  const element = document.querySelector('.lesson-plan-content');
  const text = element.innerText;
  
  const blob = new Blob([text], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LessonPlan-${currentLessonPlan.topic}-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy lesson plan text to clipboard
function copyLessonPlanText() {
  if (!currentLessonPlan) return;
  const element = document.querySelector('.lesson-plan-content');
  if (!element) return;
  
  const text = element.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Lesson plan copied to clipboard!');
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLessonPlanning);
} else {
  initLessonPlanning();
}
