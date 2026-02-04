// ===== SLIDES PRESENTATION SYSTEM WITH AI =====

// API Configuration (same as mainpage.js)
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_URL = "https://asia-southeast1-chipi-d90e8.cloudfunctions.net/openrouter";

let currentSlideIndex = 0;
let slidesData = [];
let isEditMode = false;

// ===== FIRESTORE PERSISTENCE =====
function getSlidesUserId() {
  try {
    const user = firebase?.auth?.().currentUser;
    return user?.uid || 'public';
  } catch (e) {
    return 'public';
  }
}

async function hydrateSlidesFromFirestore() {
  const userId = getSlidesUserId();
  if (typeof db === 'undefined' || !db) {
    console.warn('Firestore not available');
    return null;
  }

  try {
    const doc = await db.collection('users').doc(userId).collection('data').doc('slidesHistory').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.history && data.history.length > 0) {
        const localStored = localStorage.getItem('chipi_slides_history');
        const localSlides = localStored ? JSON.parse(localStored) : [];
        if (localSlides.length === 0) {
          return data.history;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to hydrate slides from Firestore:', e);
  }
  return null;
}

function saveSlidesToFirestore(history) {
  const userId = getSlidesUserId();
  if (typeof db === 'undefined' || !db) return;

  try {
    db.collection('users').doc(userId).collection('data').doc('slidesHistory').set({
      history,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => {
      console.warn('Failed to save slides to Firestore:', e);
    });
  } catch (e) {
    console.warn('Firestore save error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firestore hydration
    hydrateSlidesFromFirestore().then(remoteHistory => {
        if (remoteHistory) {
            localStorage.setItem('chipi_slides_history', JSON.stringify(remoteHistory));
        }
    });

    // PDF Upload Handler
    const pdfUpload = document.getElementById('pdf-upload');
    const lessonContent = document.getElementById('lesson-content');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const generateBtn = document.getElementById('generate-btn');
    const gradeLevel = document.getElementById('grade-level');
    const aiInstructions = document.getElementById('ai-instructions');

    // Initialize PDF.js
    if (pdfUpload && lessonContent) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

        pdfUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                const fileReader = new FileReader();

                fileReader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                    lessonContent.value = 'Reading PDF...';
                    progressContainer.style.display = 'block';
                    progressBar.style.width = '0%';
                    progressPercentage.textContent = '0';

                    const loadingTask = pdfjsLib.getDocument(typedarray);
                    loadingTask.promise.then(pdf => {
                        let fullText = '';
                        const numPages = pdf.numPages;
                        let pagesProcessed = 0;

                        for (let i = 1; i <= numPages; i++) {
                            pdf.getPage(i).then(page => {
                                page.getTextContent().then(textContent => {
                                    const pageText = textContent.items.map(item => item.str).join(' ');
                                    fullText += pageText + '\n\n';
                                    pagesProcessed++;

                                    const progress = Math.round((pagesProcessed / numPages) * 100);
                                    progressBar.style.width = progress + '%';
                                    progressPercentage.textContent = progress;

                                    if (pagesProcessed === numPages) {
                                        lessonContent.value = fullText.trim();
                                        setTimeout(() => {
                                            progressContainer.style.display = 'none';
                                        }, 1500);
                                    }
                                });
                            });
                        }
                    }).catch(error => {
                        console.error('Error parsing PDF:', error);
                        lessonContent.value = 'Error: Could not read the PDF file.';
                        progressContainer.style.display = 'none';
                    });
                };

                fileReader.readAsArrayBuffer(file);
            } else {
                lessonContent.value = 'Please upload a valid PDF file.';
            }
        });
    }

    // Generate Slides Button Handler
    generateBtn.addEventListener('click', () => {
        const content = lessonContent.value.trim();
        const grade = gradeLevel.value.trim();
        const aiInst = aiInstructions.value.trim();

        if (!content) {
            alert('Please enter lesson content');
            return;
        }

        // Generate slides with AI analysis
        generateSlidesWithAI(content, grade, aiInst);
    });

    // Slides Navigation Handlers
    document.getElementById('back-to-form-btn').addEventListener('click', backToForm);
    document.getElementById('prev-slide-btn').addEventListener('click', previousSlide);
    document.getElementById('next-slide-btn').addEventListener('click', nextSlide);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('edit-slide-btn').addEventListener('click', openEditModal);
    document.getElementById('close-edit-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    document.getElementById('save-edit-btn').addEventListener('click', saveEditChanges);
    document.getElementById('save-slides-btn').addEventListener('click', saveCurrentSlides);
    document.getElementById('history-slides-btn').addEventListener('click', showSlidesHistory);
    document.getElementById('back-to-form-from-history').addEventListener('click', backToFormFromHistory);

    // Sidebar handlers
    document.getElementById('newSlidesBtn').addEventListener('click', showSlidesHistory);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('slides-presentation-container').style.display !== 'none') {
            if (e.key === 'ArrowLeft') previousSlide();
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'Escape') {
                if (isEditMode) {
                    closeEditModal();
                } else {
                    backToForm();
                }
            }
        }
    });
});

function showSlidesHistory() {
    const formContainer = document.getElementById('slides-form-container');
    const presentationContainer = document.getElementById('slides-presentation-container');
    const historyContainer = document.getElementById('slides-history-container');

    formContainer.style.display = 'none';
    presentationContainer.style.display = 'none';
    historyContainer.style.display = 'block';

    loadSlidesHistory();
}

function backToFormFromHistory() {
    const formContainer = document.getElementById('slides-form-container');
    const historyContainer = document.getElementById('slides-history-container');

    historyContainer.style.display = 'none';
    formContainer.style.display = 'block';
}

function saveCurrentSlides() {
    if (slidesData.length === 0) {
        alert('No slides to save.');
        return;
    }

    const history = getSlidesHistory();
    const newHistoryItem = {
        id: `slides_${Date.now()}`,
        title: slidesData[0]?.title || 'Untitled Presentation',
        timestamp: new Date().toISOString(),
        slides: slidesData
    };

    history.unshift(newHistoryItem);
    localStorage.setItem('slidesHistory', JSON.stringify(history));
    alert('Slides saved to history!');
}

function getSlidesHistory() {
    return JSON.parse(localStorage.getItem('slidesHistory')) || [];
}

function loadSlidesHistory() {
    const history = getSlidesHistory();
    const historyList = document.getElementById('slides-history-list');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #999; padding: 40px 20px;">No saved slides found.</p>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const slideCount = item.slides ? item.slides.length : 0;
        historyItem.innerHTML = `
            <div class="history-item-preview">
                ${slideCount} slide${slideCount !== 1 ? 's' : ''}
            </div>
            <div class="history-item-info">
                <div class="history-item-date"><strong>${item.title}</strong></div>
                <div>Saved on: ${new Date(item.timestamp).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
                <button class="history-item-action-btn history-item-load" data-id="${item.id}" title="View slides">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="history-item-action-btn history-item-delete" data-id="${item.id}" title="Delete slides">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        historyList.appendChild(historyItem);
    });

    // Add event listeners for view and delete buttons
    historyList.querySelectorAll('.history-item-load').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.getAttribute('data-id');
            viewSavedSlides(id);
        });
    });

    historyList.querySelectorAll('.history-item-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this presentation?')) {
                deleteSlidesFromHistory(id);
            }
        });
    });
}

function viewSavedSlides(id) {
    const history = getSlidesHistory();
    const item = history.find(item => item.id === id);

    if (item) {
        slidesData = item.slides;
        currentSlideIndex = 0;

        const historyContainer = document.getElementById('slides-history-container');
        const presentationContainer = document.getElementById('slides-presentation-container');
        
        historyContainer.style.display = 'none';
        presentationContainer.style.display = 'flex';

        renderSlide();
        renderThumbnails();
    }
}

function deleteSlidesFromHistory(id) {
    let history = getSlidesHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem('slidesHistory', JSON.stringify(history));
    loadSlidesHistory(); // Refresh the list
}

// ===== AI INTEGRATION =====

async function generateSlidesWithAI(content, gradeLevel, aiInstructions) {
    const formContainer = document.getElementById('slides-form-container');
    const presentationContainer = document.getElementById('slides-presentation-container');
    const loadingIndicator = document.getElementById('slides-loading');

    formContainer.style.display = 'none';
    presentationContainer.style.display = 'flex';
    loadingIndicator.style.display = 'flex';

    try {
        // Use OpenRouter AI to analyze content
        const aiAnalysis = await analyzeContentWithOpenRouter(content, gradeLevel, aiInstructions);
        slidesData = aiAnalysis.slides;
        
        loadingIndicator.style.display = 'none';
        currentSlideIndex = 0;
        renderSlide();
        renderThumbnails();
    } catch (error) {
        console.error('AI Error:', error);
        // Fallback to local analysis if AI fails
        slidesData = generateSlidesLocally(content, gradeLevel, aiInstructions).slides;
        loadingIndicator.style.display = 'none';
        currentSlideIndex = 0;
        renderSlide();
        renderThumbnails();
    }
}

async function analyzeContentWithOpenRouter(content, gradeLevel, aiInstructions) {
    const systemPrompt = `You are Chipi, an AI-powered Teacher Assistant. Your CRITICAL task is to analyze lesson content and extract EVERY single important detail into comprehensive educational slides.

IMPORTANT: Return a valid JSON object with this exact structure:
{
  "slides": [
    {
      "type": "title",
      "title": "string",
      "subtitle": "string",
      "category": "string",
      "instructions": "string"
    },
    {
      "type": "content",
      "title": "string (major topic - will be bolded)",
      "content": "string (comprehensive, 5-8 sentences with all details)",
      "bulletPoints": ["point1", "point2", "point3", "point4", "point5"],
      "category": "string",
      "classification": "string"
    },
    {
      "type": "summary",
      "title": "string",
      "points": ["point1", "point2"],
      "category": "string",
      "classification": "string"
    }
  ]
}

ABSOLUTELY CRITICAL REQUIREMENTS - DO NOT SKIP ANYTHING:
- Extract and create slides for EVERY SINGLE ELEMENT mentioned in content
- Create dedicated slides for EVERY TYPE, FORM, VARIETY, GENRE, and CLASSIFICATION
- Extract and explain EVERY EXAMPLE provided in content with full details
- Identify and describe EVERY MAJOR PART, COMPONENT, SECTION, UNIT, and SUBSECTION
- Identify and explain EVERY GROUP, CATEGORY, FAMILY, ORDER, CLASS, and SUBDIVISION
- Include ALL GENRES, STYLES, VARIANTS, SUBSPECIES, SUBCATEGORIES, and SUBTYPES
- Use simple but COMPREHENSIVE language for grade level: ${gradeLevel || 'General'}
- Each content slide MUST have 5-8 sentences of DETAILED explanation with specific information
- INCLUDE BULLETED INFORMATION when there are multiple types, forms, varieties, classifications, parts, groups, genres, or examples
- Create 18-25+ content slides to comprehensively cover ALL information
- INCLUDE BULLETED INFORMATION when there are multiple types, forms, varieties, classifications, parts, groups, genres, or examples
- Create 18-25+ content slides to comprehensively cover ALL information
- DO NOT summarize or minimize content - include EVERYTHING and ALL details
- For each element/part/group/genre: explain what it is, its function, characteristics, features, examples, and importance
- Organize hierarchically: Main Categories → Genres → Groups → Types → Subtypes → Elements → Examples
- Every important detail from the source material must appear somewhere in the slides
- Return ONLY valid JSON, no markdown formatting`;

    const userPrompt = `ANALYZE THIS LESSON CONTENT COMPLETELY AND EXTRACT EVERYTHING - ALL ELEMENTS, PARTS, GROUPS, EXAMPLES, GENRES, CLASSIFICATIONS, AND VARIETIES.

Grade Level: ${gradeLevel || 'Not specified'}
Special Instructions: ${aiInstructions || 'Extract and explain EVERY detail comprehensively with bulleted information for multi-element topics'}

Create slides for:
1. EVERY single element mentioned
2. EVERY type, form, variety, genre, and classification
3. EVERY example provided with full context
4. EVERY major part, component, and section
5. EVERY group, category, family, and subdivision
6. EVERY genre, style, and variant
7. Detailed explanations with characteristics and functions

Content:
${content}

CRITICAL: Create 18-25+ content slides covering ALL information. Include bulleted lists for topics with multiple elements (types, genres, groups, forms, classifications, parts). DO NOT skip ANY detail. Extract and explain EVERYTHING in the content.`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });

        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Invalid JSON from API:', responseText);
            throw new Error('Failed to parse API response.');
        }

        if (!response.ok) {
            const msg = data?.error?.message || `HTTP ${response.status}`;
            throw new Error(`API error: ${msg}`);
        }

        const aiContent = data?.choices?.[0]?.message?.content || '';
        
        // Parse the JSON response from AI
        let aiAnalysis;
        try {
            aiAnalysis = JSON.parse(aiContent);
        } catch (e) {
            console.error('Failed to parse AI JSON:', aiContent);
            // Try to extract JSON from the response
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiAnalysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not extract JSON from AI response');
            }
        }

        // Ensure all slides have required fields
        if (aiAnalysis.slides) {
            aiAnalysis.slides = aiAnalysis.slides.map(slide => ({
                ...slide,
                isEditable: true,
                bulletPoints: slide.bulletPoints || [],
                points: slide.points || []
            }));
        }

        return aiAnalysis;
    } catch (error) {
        console.error('OpenRouter AI Error:', error);
        throw error;
    }
}

function generateSlidesLocally(content, gradeLevel, aiInstructions) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const slides = [];

    // Extract categories and classifications
    const { categories, classifications, concepts, parts, groups, examples } = analyzeContentStructure(content);

    // Title slide
    slides.push({
        type: 'title',
        title: extractTitle(content) || 'Lesson Presentation',
        subtitle: gradeLevel || 'Grade Level Not Specified',
        category: categories[0] || 'General',
        instructions: aiInstructions || '',
        isEditable: true
    });

    // Content slides with more detailed content per slide
    const maxLinesPerSlide = 5; // Increased from 3 to 5 for more detailed content
    let currentSlideContent = [];
    let slideNumber = 1;

    // Create introduction slide
    if (sentences.length > 0) {
        const introContent = sentences.slice(0, 2).map(s => s.trim()).filter(s => s.length > 0);
        if (introContent.length > 0) {
            slides.push({
                type: 'content',
                title: 'Overview',
                content: simplifyText(introContent.join(' ')),
                bulletPoints: generateIntelligentBulletPoints(introContent.join(' '), concepts),
                category: categories[0] || 'General',
                classification: 'Introduction',
                slideNumber: slideNumber,
                isEditable: true
            });
            slideNumber++;
        }
    }

    // Create slides for examples
    if (examples.length > 0) {
        examples.forEach((example, idx) => {
            if (slides.length < 15) { // Limit total slides
                slides.push({
                    type: 'content',
                    title: `Example: ${example.length > 30 ? example.substring(0, 30) + '...' : example}`,
                    content: simplifyText(`This is an example of the key concepts discussed. ${example}`),
                    bulletPoints: [`Example: ${example}`, `This shows practical application of the concept`, `It helps understand the topic better`],
                    category: 'Examples',
                    classification: 'Exemplification',
                    slideNumber: slideNumber,
                    isEditable: true
                });
                slideNumber++;
            }
        });
    }

    // Create slides for different groups/categories
    if (groups.length > 0) {
        const groupContent = extractDetailsByKeyword(sentences, groups);
        groupContent.forEach((content, idx) => {
            if (content.length > 0 && slides.length < 18) {
                slides.push({
                    type: 'content',
                    title: `${groups[idx] || 'Category ' + (idx + 1)}`,
                    content: simplifyText(content),
                    bulletPoints: generateIntelligentBulletPoints(content, concepts),
                    category: 'Groups',
                    classification: 'Categorization',
                    slideNumber: slideNumber,
                    isEditable: true
                });
                slideNumber++;
            }
        });
    }

    // Create slides for major parts if applicable
    if (parts.length > 0) {
        const partsContent = extractDetailsByKeyword(sentences, parts);
        partsContent.forEach((content, idx) => {
            if (content.length > 0 && slides.length < 18) {
                slides.push({
                    type: 'content',
                    title: `${parts[idx] || 'Part ' + (idx + 1)}`,
                    content: simplifyText(content),
                    bulletPoints: generateIntelligentBulletPoints(content, concepts),
                    category: 'Components',
                    classification: 'Parts/Components',
                    slideNumber: slideNumber,
                    isEditable: true
                });
                slideNumber++;
            }
        });
    }

    // Create detailed content slides
    for (let i = 0; i < sentences.length && slides.length < 18; i += maxLinesPerSlide) {
        const slideContent = sentences.slice(i, i + maxLinesPerSlide)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .join(' ');

        if (slideContent && slideContent.length > 20) {
            const simplified = simplifyText(slideContent);
            const bulletPoints = generateIntelligentBulletPoints(slideContent, concepts);
            const slideCategory = categorizeSlideContent(slideContent, categories);
            const classification = classifyContentType(slideContent);

            slides.push({
                type: 'content',
                title: slideCategory && slideCategory !== 'Content' ? slideCategory : '',
                content: simplified,
                bulletPoints: bulletPoints,
                category: slideCategory,
                classification: classification,
                slideNumber: slideNumber,
                isEditable: true
            });

            slideNumber++;
        }
    }

    // Summary slide with key concepts
    slides.push({
        type: 'summary',
        title: 'Key Takeaways',
        points: extractKeyPoints(content, concepts),
        category: 'Review',
        classification: 'Conclusion',
        isEditable: true
    });

    return { slides };
}

function extractDetailsByKeyword(sentences, keywords) {
    const results = [];
    
    keywords.forEach(keyword => {
        const relatedSentences = sentences.filter(sent => 
            sent.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (relatedSentences.length > 0) {
            results.push(relatedSentences.slice(0, 3).join(' '));
        }
    });
    
    return results;
}

function extractKeyInfo(content, maxLines) {
    // Extract comprehensive information with detailed explanation
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
    
    // Take more sentences for comprehensive content
    const importantSentences = sentences
        .slice(0, Math.min(maxLines + 2, sentences.length))
        .map(s => simplifyText(s))
        .join(' ');

    return importantSentences.length > 0 ? importantSentences : content.substring(0, 300);
}

function analyzeContentStructure(content) {
    const categories = new Set();
    const classifications = new Set();
    const concepts = [];
    const parts = [];
    const groups = [];
    const examples = [];

    // Extended keywords for common categories
    const categoryKeywords = {
        'Biology': ['cell', 'organism', 'species', 'evolution', 'genetics', 'biology', 'life', 'living', 'ecosystem', 'photosynthesis', 'respiration', 'dna', 'protein', 'metabolism', 'reproduction', 'adaptation', 'membrane', 'mitochondria', 'chloroplast'],
        'Chemistry': ['element', 'compound', 'molecule', 'reaction', 'acid', 'base', 'chemistry', 'atom', 'periodic', 'bond', 'chemical', 'substance', 'mixture', 'solution', 'oxidation', 'reduction', 'catalyst', 'electrolyte'],
        'Physics': ['force', 'energy', 'motion', 'gravity', 'velocity', 'physics', 'wave', 'light', 'sound', 'momentum', 'acceleration', 'mass', 'weight', 'pressure', 'friction', 'thermal', 'quantum'],
        'History': ['century', 'war', 'revolution', 'empire', 'historical', 'period', 'era', 'civilization', 'ancient', 'medieval', 'modern', 'historical event', 'dynasty', 'era', 'conflict'],
        'Literature': ['author', 'character', 'novel', 'poem', 'story', 'plot', 'theme', 'narrative', 'fiction', 'verse', 'protagonist', 'antagonist', 'literary', 'metaphor', 'symbolism'],
        'Mathematics': ['equation', 'formula', 'theorem', 'number', 'calculate', 'algebra', 'geometry', 'calculus', 'fraction', 'ratio', 'function', 'variable', 'trigonometry', 'matrix', 'vector'],
        'Geography': ['continent', 'country', 'region', 'climate', 'map', 'terrain', 'location', 'latitude', 'longitude', 'population', 'landscape', 'natural', 'geographic', 'biome', 'geology'],
        'Economics': ['market', 'supply', 'demand', 'trade', 'economics', 'price', 'profit', 'revenue', 'cost', 'investment', 'currency', 'economy', 'finance', 'inflation'],
        'Medicine': ['disease', 'treatment', 'medicine', 'health', 'patient', 'symptom', 'diagnosis', 'therapy', 'drug', 'organ', 'virus', 'bacteria', 'immune', 'antibody'],
        'Technology': ['computer', 'software', 'hardware', 'network', 'internet', 'data', 'technology', 'digital', 'algorithm', 'system', 'code', 'programming', 'database', 'encryption']
    };

    const lowerContent = content.toLowerCase();

    // Identify categories
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerContent.includes(keyword))) {
            categories.add(category);
        }
    }

    // Extract noun phrases as concepts - COMPREHENSIVE
    const nounRegex = /\b(?:the\s+)?[A-Z][a-zA-Z]+(?:\s+[a-z]+)*\b/g;
    const matches = content.match(nounRegex) || [];
    concepts.push(...new Set(matches.filter(m => m.length > 3).slice(0, 25)));

    // Extract examples
    const exampleRegex = /(?:example|for instance|such as|e\.g\.|like|including)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:[,.]|and)/gi;
    let exampleMatch;
    while ((exampleMatch = exampleRegex.exec(content)) !== null) {
        const example = exampleMatch[1].trim();
        if (example.length > 3 && example.length < 100 && !examples.includes(example)) {
            examples.push(example);
        }
    }

    // Extract major parts/components - MORE AGGRESSIVE
    const partKeywords = ['part', 'component', 'element', 'section', 'unit', 'layer', 'phase', 'stage', 'system', 'region', 'area', 'zone', 'portion', 'division', 'segment'];
    const partRegex = /(?:the\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:part|component|element|section|unit|layer|phase|stage|system|region|area|zone|portion|division|segment)/gi;
    let partMatch;
    while ((partMatch = partRegex.exec(content)) !== null) {
        const part = partMatch[1].trim();
        if (part.length > 2 && !parts.includes(part)) {
            parts.push(part);
        }
    }

    // Also extract parts mentioned with "includes" or "consists of"
    const partsWithIncludes = /(?:includes?|consists of|made of|contains|comprises)\s+(?:the\s+)?([a-z]+(?:\s+[a-z]+)?)/gi;
    let includeMatch;
    while ((includeMatch = partsWithIncludes.exec(content)) !== null) {
        const part = includeMatch[1].trim();
        if (part.length > 2 && !parts.includes(part) && parts.length < 12) {
            parts.push(part);
        }
    }

    // Extract groups/categories/types - MORE AGGRESSIVE
    const groupKeywords = ['type', 'kind', 'form', 'variety', 'group', 'class', 'category', 'classification', 'species', 'order', 'family', 'genus', 'phylum', 'kingdom'];
    const groupRegex = /(?:the\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:type|kind|form|variety|group|class|category|classification|species|order|family|genus|phylum|kingdom)/gi;
    let groupMatch;
    while ((groupMatch = groupRegex.exec(content)) !== null) {
        const group = groupMatch[1].trim();
        if (group.length > 2 && !groups.includes(group)) {
            groups.push(group);
        }
    }

    // Also extract from "there are" patterns
    const thereAreRegex = /there\s+(?:are|is)\s+([a-z]+(?:\s+[a-z]+)?)/gi;
    let thereMatch;
    while ((thereMatch = thereAreRegex.exec(content)) !== null) {
        const group = thereMatch[1].trim();
        if (group.length > 2 && !groups.includes(group) && groups.length < 12) {
            groups.push(group);
        }
    }

    // Classification types with more specific patterns
    const classificationKeywords = {
        'Definition': ['is', 'means', 'defined as', 'refers to', 'term', 'called'],
        'Process': ['process', 'steps', 'method', 'how to', 'procedure', 'stages', 'phases'],
        'Comparison': ['similar', 'different', 'like', 'unlike', 'versus', 'compared to', 'contrast'],
        'Cause-Effect': ['because', 'caused', 'result', 'leads to', 'effect', 'consequence', 'due to'],
        'Example': ['example', 'such as', 'for instance', 'illustration', 'case study'],
        'Classification': ['types', 'categories', 'groups', 'kinds', 'varieties', 'taxonomy'],
        'Structure': ['structure', 'components', 'parts', 'elements', 'composition', 'organization'],
        'Function': ['function', 'purpose', 'role', 'serves', 'used for', 'operates']
    };

    for (const [classif, keywords] of Object.entries(classificationKeywords)) {
        if (keywords.some(keyword => lowerContent.includes(keyword))) {
            classifications.add(classif);
        }
    }

    return {
        categories: Array.from(categories).slice(0, 5),
        classifications: Array.from(classifications).slice(0, 5),
        concepts: concepts.slice(0, 25),
        parts: parts.slice(0, 12),
        groups: groups.slice(0, 12),
        examples: examples.slice(0, 10)
    };
}

function generateIntelligentBulletPoints(content, concepts) {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    const bulletPoints = [];
    const maxLines = 8; // Increased to 8 for more comprehensive coverage

    // Use sentences as bullet points, simplified and explained
    sentences.forEach(sentence => {
        if (bulletPoints.length < maxLines && sentence.length > 15) {
            const simplified = simplifyText(sentence);
            bulletPoints.push(simplified);
        }
    });

    // If we don't have enough points, create additional ones from key concepts
    if (bulletPoints.length < 5 && concepts.length > 0) {
        concepts.slice(0, 3).forEach(concept => {
            if (bulletPoints.length < maxLines && !bulletPoints.some(bp => bp.toLowerCase().includes(concept.toLowerCase()))) {
                bulletPoints.push(`${concept} - A key concept in this topic`);
            }
        });
    }

    return bulletPoints.length > 0 ? bulletPoints : [];
}

function simplifyText(text) {
    // Remove extra complexity and make text more understandable
    const simplifications = {
        'therefore': 'so',
        'furthermore': 'also',
        'subsequently': 'then',
        'particularly': 'especially',
        'approximately': 'about',
        'demonstrate': 'show',
        'utilize': 'use',
        'facilitate': 'help',
        'implement': 'set up',
        'numerous': 'many',
        'obtain': 'get',
        'acquire': 'get',
        'commence': 'start',
        'initiate': 'begin',
        'terminate': 'end',
        'significant': 'important',
        'facilitate': 'make easier',
        'constitute': 'make up'
    };

    let simplified = text;
    for (const [complex, simple] of Object.entries(simplifications)) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        simplified = simplified.replace(regex, simple);
    }

    // Capitalize first letter
    return simplified.charAt(0).toUpperCase() + simplified.slice(1);
}

function categorizeSlideContent(content, categories) {
    if (categories && categories.length > 0) {
        return categories[Math.floor(Math.random() * categories.length)];
    }

    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('introduction') || lowerContent.includes('overview')) return 'Introduction';
    if (lowerContent.includes('conclusion') || lowerContent.includes('summary')) return 'Summary';
    if (lowerContent.includes('example') || lowerContent.includes('illustration')) return 'Examples';
    if (lowerContent.includes('detail') || lowerContent.includes('specific')) return 'Details';

    return 'Content';
}

function classifyContentType(content) {
    const lowerContent = content.toLowerCase();

    if (/definition|means|is a|refers to/.test(lowerContent)) return 'Definition';
    if (/process|step|method|how to/.test(lowerContent)) return 'Process';
    if (/similar|different|like|unlike|versus/.test(lowerContent)) return 'Comparison';
    if (/because|caused|result|leads to|effect/.test(lowerContent)) return 'Cause-Effect';
    if (/example|such as|for instance/.test(lowerContent)) return 'Example';

    return '';
}

function determineDifficulty(content, gradeLevel) {
    const wordCount = content.split(/\s+/).length;
    const complexity = content.split(/[,;:]/).length;

    if (wordCount < 50) return 'Easy';
    if (wordCount < 150 || complexity < 5) return 'Medium';
    return 'Hard';
}

function extractTitle(content) {
    const lines = content.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.length > 5 && line.length < 100) {
            return line.slice(0, 80);
        }
    }
    return null;
}

function extractKeyPoints(content, concepts) {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    const keyPoints = [];

    const step = Math.ceil(sentences.length / 5);
    for (let i = 0; i < sentences.length; i += step) {
        if (keyPoints.length < 5 && sentences[i].length > 10) {
            keyPoints.push(sentences[i]);
        }
    }

    return keyPoints.length > 0 ? keyPoints : ['Complete the lesson', 'Review key concepts', 'Practice exercises'];
}

// ===== SLIDE RENDERING =====

function renderSlide() {
    if (slidesData.length === 0) return;

    const slide = slidesData[currentSlideIndex];
    const slideContent = document.getElementById('current-slide-content');
    const currentSlideSpan = document.getElementById('current-slide');
    const totalSlidesSpan = document.getElementById('total-slides');
    const prevBtn = document.getElementById('prev-slide-btn');
    const nextBtn = document.getElementById('next-slide-btn');

    totalSlidesSpan.textContent = slidesData.length;
    currentSlideSpan.textContent = currentSlideIndex + 1;

    slideContent.innerHTML = '';

    let html = '';

    if (slide.type === 'title') {
        html = `
            <div class="slide-title">${escapeHtml(slide.title)}</div>
            <div style="flex: 1;"></div>
            <div class="slide-metadata">
                <div class="metadata-label">GRADE LEVEL</div>
                <div class="slide-subtitle">${escapeHtml(slide.subtitle)}</div>
            </div>
            ${slide.category ? `<span class="slide-category-badge">${escapeHtml(slide.category)}</span>` : ''}
            ${slide.instructions ? `<div class="slide-content" style="font-style: italic; color: #666; margin-top: 20px;">💡 ${escapeHtml(slide.instructions)}</div>` : ''}
            <div class="slide-footer">Powered by CHIPI AI</div>
        `;
    } else if (slide.type === 'content') {
        // Only show bullet points if slide has classifications/categories/parts/groups (indicating multiple elements)
        const hasMultipleElements = slide.classification && 
                                   (slide.classification.toLowerCase().includes('types') ||
                                    slide.classification.toLowerCase().includes('categor') ||
                                    slide.classification.toLowerCase().includes('part') ||
                                    slide.classification.toLowerCase().includes('group') ||
                                    slide.classification.toLowerCase().includes('form') ||
                                    slide.classification.toLowerCase().includes('example') ||
                                    slide.category === 'Components' ||
                                    slide.category === 'Groups' ||
                                    slide.category === 'Examples');
        
        const showBulletPoints = hasMultipleElements && slide.bulletPoints.length > 0;
        
        html = `
            ${slide.classification ? `<div class="slide-metadata">${escapeHtml(slide.classification)}</div>` : ''}
            ${slide.title ? `<div class="slide-subtitle"><strong>${escapeHtml(slide.title)}</strong></div>` : ''}
            ${slide.content ? `<div class="slide-content">${escapeHtml(slide.content)}</div>` : ''}
            ${showBulletPoints ? `
                <ul class="slide-bullet-list">
                    ${slide.bulletPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                </ul>
            ` : ''}
        `;
    } else if (slide.type === 'summary') {
        html = `
            <div class="slide-title">${escapeHtml(slide.title)}</div>
            <span class="slide-category-badge">${escapeHtml(slide.classification)}</span>
            <ul class="slide-bullet-list">
                ${slide.points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
            </ul>
            <div class="slide-footer">Great job! 🎉</div>
        `;
    }

    slideContent.innerHTML = html;

    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slidesData.length - 1;

    updateActiveThumbnail();

    // Auto-scroll to current slide horizontally
    setTimeout(() => {
        const slidesMainArea = document.querySelector('.slides-main-area');
        if (slidesMainArea) {
            const scrollLeft = (currentSlideIndex) * (900 + 20); // width + gap
            slidesMainArea.scrollLeft = scrollLeft;
        }
    }, 100);
}

function renderThumbnails() {
    const thumbnailsContainer = document.getElementById('slides-thumbnails');
    thumbnailsContainer.innerHTML = '';

    slidesData.forEach((slide, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail' + (index === 0 ? ' active' : '');
        thumbnail.dataset.index = index;

        let title = '';
        if (slide.type === 'title') {
            title = slide.title.slice(0, 15);
        } else if (slide.type === 'content') {
            title = `${slide.category || 'Slide'} ${index}`;
        } else if (slide.type === 'summary') {
            title = 'Summary';
        }

        thumbnail.innerHTML = `<span class="thumbnail-text">${escapeHtml(title)}</span>`;
        thumbnail.addEventListener('click', () => {
            currentSlideIndex = index;
            renderSlide();
        });

        thumbnailsContainer.appendChild(thumbnail);
    });
}

function updateActiveThumbnail() {
    document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
        if (index === currentSlideIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// ===== EDIT FUNCTIONALITY =====

function openEditModal() {
    const slide = slidesData[currentSlideIndex];
    const editModalBody = document.getElementById('edit-modal-body');
    const editModal = document.getElementById('edit-modal');

    isEditMode = true;
    let editForm = '';

    if (slide.type === 'title') {
        editForm = `
            <div class="edit-form-group">
                <label>Title</label>
                <input type="text" id="edit-title" value="${escapeHtml(slide.title)}" />
            </div>
            <div class="edit-form-group">
                <label>Subtitle</label>
                <input type="text" id="edit-subtitle" value="${escapeHtml(slide.subtitle)}" />
            </div>
            <div class="edit-form-group">
                <label>Category</label>
                <input type="text" id="edit-category" value="${escapeHtml(slide.category || '')}" />
            </div>
            <div class="edit-form-group">
                <label>Instructions</label>
                <textarea id="edit-instructions">${escapeHtml(slide.instructions || '')}</textarea>
            </div>
        `;
    } else if (slide.type === 'content') {
        editForm = `
            <div class="edit-form-group">
                <label>Title</label>
                <input type="text" id="edit-title" value="${escapeHtml(slide.title || '')}" />
            </div>
            <div class="edit-form-group">
                <label>Content</label>
                <textarea id="edit-content">${escapeHtml(slide.content)}</textarea>
            </div>
            <div class="edit-form-group">
                <label>Category</label>
                <input type="text" id="edit-category" value="${escapeHtml(slide.category || '')}" />
            </div>
            <div class="edit-form-group">
                <label>Classification</label>
                <input type="text" id="edit-classification" value="${escapeHtml(slide.classification || '')}" />
            </div>
            <div class="edit-form-group">
                <label>Bullet Points</label>
                <div id="bullet-points-container">
                    ${slide.bulletPoints.map((point, idx) => `
                        <div class="edit-bullet-item">
                            <input type="text" class="edit-bullet" value="${escapeHtml(point)}" />
                            <button class="remove-bullet-btn" onclick="removeBulletPoint(${idx})">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button class="add-bullet-btn" onclick="addBulletPoint()">+ Add Bullet Point</button>
            </div>
        `;
    } else if (slide.type === 'summary') {
        editForm = `
            <div class="edit-form-group">
                <label>Title</label>
                <input type="text" id="edit-title" value="${escapeHtml(slide.title)}" />
            </div>
            <div class="edit-form-group">
                <label>Key Points</label>
                <div id="summary-points-container">
                    ${slide.points.map((point, idx) => `
                        <div class="edit-bullet-item">
                            <input type="text" class="edit-summary-point" value="${escapeHtml(point)}" />
                            <button class="remove-bullet-btn" onclick="removeSummaryPoint(${idx})">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button class="add-bullet-btn" onclick="addSummaryPoint()">+ Add Point</button>
            </div>
        `;
    }

    editModalBody.innerHTML = editForm;
    editModal.style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    isEditMode = false;
}

function saveEditChanges() {
    const slide = slidesData[currentSlideIndex];

    if (slide.type === 'title') {
        slide.title = document.getElementById('edit-title').value;
        slide.subtitle = document.getElementById('edit-subtitle').value;
        slide.category = document.getElementById('edit-category').value;
        slide.instructions = document.getElementById('edit-instructions').value;
    } else if (slide.type === 'content') {
        slide.title = document.getElementById('edit-title').value;
        slide.content = document.getElementById('edit-content').value;
        slide.category = document.getElementById('edit-category').value;
        slide.classification = document.getElementById('edit-classification').value;
        
        const bulletInputs = document.querySelectorAll('.edit-bullet');
        slide.bulletPoints = Array.from(bulletInputs).map(input => input.value).filter(v => v.trim());
    } else if (slide.type === 'summary') {
        slide.title = document.getElementById('edit-title').value;
        
        const summaryInputs = document.querySelectorAll('.edit-summary-point');
        slide.points = Array.from(summaryInputs).map(input => input.value).filter(v => v.trim());
    }

    closeEditModal();
    renderSlide();
    renderThumbnails();
}

function addBulletPoint() {
    const container = document.getElementById('bullet-points-container');
    const index = container.children.length;
    const html = `
        <div class="edit-bullet-item">
            <input type="text" class="edit-bullet" value="" placeholder="Enter bullet point" />
            <button class="remove-bullet-btn" onclick="removeBulletPoint(${index})">Remove</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function removeBulletPoint(index) {
    const container = document.getElementById('bullet-points-container');
    container.children[index].remove();
}

function addSummaryPoint() {
    const container = document.getElementById('summary-points-container');
    const index = container.children.length;
    const html = `
        <div class="edit-bullet-item">
            <input type="text" class="edit-summary-point" value="" placeholder="Enter key point" />
            <button class="remove-bullet-btn" onclick="removeSummaryPoint(${index})">Remove</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function removeSummaryPoint(index) {
    const container = document.getElementById('summary-points-container');
    container.children[index].remove();
}

// ===== NAVIGATION =====

function nextSlide() {
    if (currentSlideIndex < slidesData.length - 1) {
        currentSlideIndex++;
        renderSlide();
    }
}

function previousSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlide();
    }
}

function backToForm() {
    const formContainer = document.getElementById('slides-form-container');
    const presentationContainer = document.getElementById('slides-presentation-container');

    presentationContainer.style.display = 'none';
    formContainer.style.display = 'flex';
    slidesData = [];
    isEditMode = false;
}

function toggleFullscreen() {
    const container = document.getElementById('slides-presentation-container');
    const mainContent = document.querySelector('.main-content');
    const header = document.querySelector('header');
    const sidebar = document.querySelector('aside');
    const app = document.querySelector('.app');
    const body = document.body;
    
    if (container.classList.contains('maximized-view')) {
        // Exit maximized view
        container.classList.remove('maximized-view');
        if (header) header.style.display = '';
        if (sidebar) sidebar.style.display = '';
        if (mainContent) mainContent.style.display = '';
        body.style.overflow = '';
    } else {
        // Enter maximized view - hide header and sidebar
        container.classList.add('maximized-view');
        if (header) header.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        body.style.overflow = 'hidden';
    }
}

// ===== SLIDES HISTORY AND SAVE FUNCTIONALITY =====

// Load saved slides from localStorage
function loadSlidesHistory() {
    try {
        const history = localStorage.getItem('chipi_slides_history');
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('Error loading slides history:', e);
        return [];
    }
}

// Save current slides to history
function saveCurrentSlides() {
    if (slidesData.length === 0) {
        alert('No slides to save. Generate slides first.');
        return;
    }

    const slideTitle = slidesData[0]?.title || 'Untitled Slides';
    const timestamp = new Date().toLocaleString();
    
    const slidesHistoryEntry = {
        id: Date.now().toString(),
        title: slideTitle,
        timestamp: timestamp,
        slideCount: slidesData.length,
        data: JSON.parse(JSON.stringify(slidesData)), // Deep copy
        thumbnail: slidesData[0]?.title || 'Slides'
    };

    // Get existing history and add new entry
    let history = loadSlidesHistory();
    history.unshift(slidesHistoryEntry); // Add to beginning
    
    // Limit history to 50 entries
    if (history.length > 50) {
        history = history.slice(0, 50);
    }

    // Save to localStorage
    try {
        localStorage.setItem('chipi_slides_history', JSON.stringify(history));
        saveSlidesToFirestore(history);
        alert(`✅ Slides saved successfully!\nTitle: ${slideTitle}\nTime: ${timestamp}`);
        renderSlidesHistory();
    } catch (e) {
        alert('Error saving slides. Storage limit may be reached.');
        console.error('Storage error:', e);
    }
}

// Render slides history
function renderSlidesHistory() {
    const historyList = document.getElementById('slides-history-list');
    const history = loadSlidesHistory();

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">📚</div>
                <p>No saved slides yet</p>
                <p style="font-size: 12px;">Generate slides and click the save button to store them here.</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-item-preview">${escapeHtml(item.thumbnail.substring(0, 50))}</div>
            <div class="history-item-info">
                <div class="history-item-date">${escapeHtml(item.title)}</div>
                <div class="history-item-stats">
                    <span>📅 ${item.timestamp}</span>
                </div>
                <div class="history-item-stats">
                    <span>📊 ${item.slideCount} slides</span>
                </div>
            </div>
            <div class="history-item-actions">
                <button class="history-item-action-btn history-item-load" onclick="loadSlidesFromHistory('${item.id}')">
                    <i class="fas fa-folder-open"></i> Open
                </button>
                <button class="history-item-action-btn history-item-delete" onclick="deleteSlidesFromHistory('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Load specific slides from history
function loadSlidesFromHistory(id) {
    const history = loadSlidesHistory();
    const entry = history.find(item => item.id === id);
    
    if (!entry) {
        alert('Slides not found');
        return;
    }

    // Load the slides data
    slidesData = JSON.parse(JSON.stringify(entry.data)); // Deep copy
    currentSlideIndex = 0;

    // Show presentation
    document.getElementById('slides-form-container').style.display = 'none';
    document.getElementById('slides-history-container').style.display = 'none';
    document.getElementById('slides-presentation-container').style.display = 'flex';

    renderSlide();
    renderThumbnails();
}

// Delete slides from history
function deleteSlidesFromHistory(id) {
    if (!confirm('Are you sure you want to delete this saved slides?')) {
        return;
    }

    let history = loadSlidesHistory();
    history = history.filter(item => item.id !== id);

    try {
        localStorage.setItem('chipi_slides_history', JSON.stringify(history));
        saveSlidesToFirestore(history);
        renderSlidesHistory();
        alert('Slides deleted successfully');
    } catch (e) {
        alert('Error deleting slides');
        console.error('Delete error:', e);
    }
}

// Show history view
function showSlidesHistory() {
    document.getElementById('slides-form-container').style.display = 'none';
    document.getElementById('slides-presentation-container').style.display = 'none';
    document.getElementById('slides-history-container').style.display = 'flex';
    renderSlidesHistory();
}

// Back to form from history
function backToFormFromHistory() {
    document.getElementById('slides-history-container').style.display = 'none';
    document.getElementById('slides-form-container').style.display = 'block';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
