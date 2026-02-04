// ===== ACCESS KEY =====
let accessKey = sessionStorage.getItem("chipi_access_key");
if (!accessKey) {
    accessKey = "PUBLIC";
    sessionStorage.setItem("chipi_access_key", accessKey);
}

// API Configuration
const OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_URL = "https://chipiai.redmarizer.workers.dev";

// Get user-specific API key or fallback to default


// Firebase is initialized in HTML
const auth = firebase.auth();
const db = firebase.firestore();
const STORAGE_MODE = "local"; // "local" disables Firestore persistence

// ===== ELEMENTS =====
// Elements will be defined inside attachUIHandlers to ensure DOM is loaded
let appRoot, sidebar, historyList, addTabBtn, editHistoryBtn, messagesEl, userInputEl, sendBtn;
let profileBtn, profileMenu, profileEmail, profileLogout;


// ===== STATE =====
let currentChatId = null;
let chats = {}; // Start with empty chats
let tabCounter = 0;
let editMode = false; // when true, history titles are editable and delete buttons are visible
let isSending = false;
// ===== AUTH CHECK =====
// GitHub Pages: allow public session by default
// Check if DOM is already loaded or wait for it
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

function initializeApp() {
    // Define elements after DOM is loaded
    appRoot = document.querySelector(".app");
    sidebar = document.getElementById("sidebar");
    historyList = document.getElementById("historyList");
    addTabBtn = document.getElementById("addTabBtn");
    editHistoryBtn = document.getElementById("editHistoryBtn");
    messagesEl = document.getElementById("messages");
    welcomeEl = document.getElementById("welcome");
    userInputEl = document.getElementById("userInput");
    sendBtn = document.getElementById("sendBtn");
    profileBtn = document.getElementById('profileBtn');
    profileMenu = document.getElementById('profileMenu');
        profileEmail = document.getElementById('profileEmail');
        profileLogout = document.getElementById('profileLogout');

    chats = loadChats();
    tabCounter = computeInitialTabCounter(chats);
    renderHistory();
    applySidebarLayout();
    clearChatContent();
    restoreLastChat();
    attachUIHandlers();
    validateDOM();

    if (firebase?.auth) {
        firebase.auth().onAuthStateChanged(() => {
            setProfileEmail();
            hydrateChatsFromFirestore();
        });
    } else {
        setProfileEmail();
        hydrateChatsFromFirestore();
    }
}

// Clear all content in the chat section
function clearChatContent() {
  messagesEl.innerHTML = "";
  const introTpl = document.getElementById("introductionTemplate");
  if (introTpl) {
    const introClone = introTpl.content.cloneNode(true);
    messagesEl.appendChild(introClone);
    // Ensure the introduction is visible on load, accounting for images
    ensureScrollAfterAssets(messagesEl, true);
  }
}

// restore last opened chat if available
function restoreLastChat(){
  try {
    const last = localStorage.getItem(`chipi_last_chat_${accessKey}`);
    if (last && chats[last]) {
      currentChatId = last;
      renderChat(currentChatId);
      renderHistory();
    }
  } catch (e) { console.warn('Could not restore last chat', e); }
}

// Attach UI handlers after DOM is loaded
function attachUIHandlers() {
    // Attach keyboard handlers for input/textarea
    if (userInputEl) {
      userInputEl.addEventListener('keydown', (e) => {
        // Ctrl/Cmd+Enter sends regardless of element type
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
          return;
        }

        // For TEXTAREA: Enter sends message, Shift+Enter creates new line
        if (userInputEl.tagName === 'TEXTAREA' && e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
          return;
        }

        // For INPUT elements: Enter sends message
        if (userInputEl.tagName === 'INPUT' && e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
          return;
        }
      });
    } else {
      reportRuntimeError('Input element missing (#userInput) — cannot send messages.');
    }

    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => { e.preventDefault(); sendMessage(); });
    } else {
      reportRuntimeError('Send button missing (#sendBtn) — cannot send messages.');
    }

    function handleAddTab() {
      const newId = createTabChat();
      currentChatId = newId;
      // persist the selection immediately
      saveCurrentChatId(newId);
      editMode = false;
      renderHistory();
      renderChat(newId);
      showToast('New conversation created');
    }

    if (addTabBtn) {
      addTabBtn.type = 'button';
      addTabBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleAddTab(); });
    } else {
      reportRuntimeError('Add-tab button missing (#addTabBtn) — cannot create new conversations.');
    }

    // Edit History button toggles edit/delete mode
    editHistoryBtn?.addEventListener("click", () => {
      editMode = !editMode;
      editHistoryBtn.setAttribute('aria-pressed', String(editMode));
      editHistoryBtn.title = editMode ? 'Done editing' : 'Edit conversations';
      editHistoryBtn.classList.toggle('active', editMode);
      // ensure we blur any active element
      document.activeElement.blur();
      renderHistory();
    });


    function toggleProfileMenu(open) {
      if (!profileBtn || !profileMenu) return;
      const shouldOpen = typeof open === 'boolean' ? open : !profileMenu.classList.contains('open');
      profileMenu.classList.toggle('open', shouldOpen);
      profileBtn.setAttribute('aria-expanded', String(shouldOpen));
      profileMenu.setAttribute('aria-hidden', String(!shouldOpen));
      if (shouldOpen) {
        const first = profileMenu.querySelector('[role="menuitem"]');
        if (first) first.focus();
      } else {
        profileBtn.focus();
      }
    }

    profileBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleProfileMenu(); });
    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu || !profileMenu.classList.contains('open')) return;
      if (!e.target.closest || !e.target.closest('.profile')) toggleProfileMenu(false);
    });
    // close on escape
    document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && profileMenu && profileMenu.classList.contains('open')) toggleProfileMenu(false);
    });

    // Menu item actions
    profileLogout?.addEventListener('click', () => {
      toggleProfileMenu(false);
      sessionStorage.removeItem("chipi_access_key");
      if (firebase?.auth) {
        firebase.auth().signOut().finally(() => {
          window.location.href = "index.html";
        });
      } else {
        window.location.href = "index.html";
      }
    });

    // Profile display
    setProfileEmail();

    // Keyboard activation for menu items
    profileMenu?.addEventListener && profileMenu.addEventListener('keydown', (e) => {
      const { key } = e;
      if (key === 'Enter' || key === ' ') {
        const el = document.activeElement;
        if (el && el.getAttribute && el.getAttribute('role') === 'menuitem') el.click();
      }
    });
}

// ===== DEBUG HELPERS =====
// Show runtime errors and unhandled rejections as toasts and console output
function reportRuntimeError(message, detail) {
  console.error(message, detail);
  try { showToast(message, null, null, 8000); } catch (e) {}
}

window.addEventListener('error', (e) => {
  const msg = e?.message || 'Runtime error';
  reportRuntimeError('Runtime error: ' + msg, e.error || e);
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || 'Unhandled promise rejection';
  reportRuntimeError('Unhandled rejection: ' + msg, e.reason || e);
});

// Validate that critical DOM elements exist and inform the user if not
function validateDOM() {
  const required = ['addTabBtn', 'sendBtn', 'historyList', 'userInput', 'messages'];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length) {
    reportRuntimeError('Missing UI elements: ' + missing.join(', '));
  }
}

function setProfileEmail() {
  if (!profileEmail) return;

  const currentUser = firebase?.auth?.().currentUser;
  if (currentUser?.email) {
    profileEmail.textContent = currentUser.email;
  } else {
    profileEmail.textContent = 'Signed in';
  }
}

// ===== FIRESTORE PERSISTENCE =====
function getUserDocPath() {
  const user = firebase?.auth?.().currentUser;
  return user?.uid || 'public';
}

async function hydrateChatsFromFirestore() {
  if (STORAGE_MODE === "local") return;
  const userId = getUserDocPath();
  if (!db) {
    console.warn('Firestore not available');
    return;
  }

  try {
    const doc = await db.collection('users').doc(userId).collection('data').doc('chats').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.chats) {
        const localChats = loadChats();
        if (Object.keys(localChats).length === 0) {
          chats = data.chats;
          saveChats();
        } else {
          chats = localChats;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to hydrate chats from Firestore:', e);
  }
}

function saveChatsToFirestore() {
  if (STORAGE_MODE === "local") return;
  const userId = getUserDocPath();
  if (!db) return;

  try {
    db.collection('users').doc(userId).collection('data').doc('chats').set({
      chats,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => {
      console.warn('Failed to save chats to Firestore:', e);
    });
  } catch (e) {
    console.warn('Firestore save error:', e);
  }
}

function saveChats() {
  const key = `chipi_chats_${accessKey}`;
  localStorage.setItem(key, JSON.stringify(chats));
  saveChatsToFirestore();
}

// ===== CHAT FUNCTIONS =====
async function sendMessage() {
  if (isSending) return;
  const text = userInputEl.value.trim();
  if (!text) return;

  // Disable input and send button to prevent multiple sends
  isSending = true;
  userInputEl.disabled = true;
  sendBtn.disabled = true;

  if (!currentChatId) {
    const newId = createTabChat();
    currentChatId = newId;
    // persist the selection so reloads restore this conversation
    saveCurrentChatId(newId);
    renderHistory();
  }

  addMessage("user", escapeHtml(text)); // render user safely

  const typingNode = showTyping();

  try {
    let aiText = await callAI(text);

    console.log("AI response:", aiText); // Debug log

    aiText = teacherFilter(aiText);

    if (!aiText || !aiText.trim()) {
      aiText = "I'm sorry, I couldn't generate a response. Please try again.";
      console.log("Using fallback message");
    }

    const formatted = formatAIText(aiText);
    console.log("Formatted AI text:", formatted); // Debug log

    hideTyping(typingNode);
    addMessage("ai", formatted);
  } catch (err) {
    hideTyping(typingNode);
    addMessage("ai", "Sorry, I couldn’t get a response right now.");
    console.error("AI error:", err);
    // Surface the error as a toast so the user knows something went wrong
    try { showToast('AI request failed: ' + (err?.message || err), 'Details', null, 8000); } catch (e) {}
  } finally {
    userInputEl.value = "";
    userInputEl.disabled = false;
    sendBtn.disabled = false;
    isSending = false; // Reset sending state
    isSending = false;
  }
}

function addMessage(role, text = "") {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  if (role === "ai") {
    const avatar = document.createElement("img");
    avatar.className = "msg-avatar";
    avatar.src = "CHIPI CHATLOGO.png";
    avatar.alt = "Chipi Logo";
    msg.appendChild(avatar);
  } else if (role === "user") {
    const avatar = document.createElement("img");
    avatar.className = "msg-avatar";
    avatar.src = "USERLOGO.png";
    avatar.alt = "User Avatar";
    msg.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = text; // Use innerHTML to support formatted content
  msg.appendChild(bubble);

  messagesEl.appendChild(msg);
  scrollMessagesToBottom(true);


  // Save plain text version for persistence
  if (currentChatId) {
    if (!chats[currentChatId]) chats[currentChatId] = { title: "New chat", messages: [] };
    chats[currentChatId].messages.push({ role, content: text, ts: Date.now() });
    saveChats();
  }

  return msg;
}

function showTyping() {
  const typingMsg = document.createElement("div");
  typingMsg.className = "message ai typing";
  const tpl = document.getElementById("typingTemplate");
  const node = tpl.content.cloneNode(true);
  messagesEl.appendChild(node);
 
  return messagesEl.lastElementChild;
}

function hideTyping(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

// ===============================
function scrollMessagesToBottom(force = false) {
  if (!messagesEl) return;

  // Determine if user is already near the bottom to avoid hijacking scroll
  const nearBottom = () => {
    const threshold = 64; // px tolerance
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= threshold;
  };

  const doScroll = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // Only auto-scroll if forced or user is near the bottom
  if (!force && !nearBottom()) return;

  // Use RAFs + micro-timeouts to account for late layout/asset loads
  requestAnimationFrame(() => {
    doScroll();
    requestAnimationFrame(() => {
      doScroll();
      setTimeout(() => { doScroll(); }, 0);
      setTimeout(() => { doScroll(); }, 100);
    });
  });
}

// Ensure scrolling after images/assets in a container finish loading
function ensureScrollAfterAssets(container, force = true) {
  if (!container) return;
  const imgs = Array.from(container.querySelectorAll('img'));
  let pending = imgs.filter(img => !img.complete).length;

  const trigger = () => scrollMessagesToBottom(force);

  if (pending === 0) {
    // Immediate scroll attempts
    trigger();
    requestAnimationFrame(trigger);
    setTimeout(trigger, 0);
    setTimeout(trigger, 100);
    return;
  }

  const onDone = () => {
    pending--;
    if (pending <= 0) {
      trigger();
      requestAnimationFrame(trigger);
      setTimeout(trigger, 0);
      setTimeout(trigger, 100);
      imgs.forEach(img => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
      });
    }
  };

  imgs.forEach(img => {
    img.addEventListener('load', onDone);
    img.addEventListener('error', onDone);
  });
}

// ===============================
// BACKEND OPENROUTER CALL
// ===== AI CALL =====
async function callAI(userPrompt) {
  const systemPrompt = "You are Chipi, an AI-powered Teacher Assistant and EdTech Support system. Your role is to support teachers in instructional, administrative, and technical tasks, improving efficiency and quality. You are a supportive tool, not a decision-maker, maintaining professionalism, accuracy, and ethics.\n\nAlways maintain a professional, supportive tone. Provide guidance without replacing judgment. Respect privacy, avoid sensitive data. Do not override policies or make final decisions. Responses are clear, structured, actionable.\n\nKey functions:\n- Lesson planning: Generate plans aligned with standards, suggest strategies, materials, and activities for various environments.\n- Assessment: Create quizzes, exams, rubrics; assist with basic feedback.\n- Instructional materials: Generate slides, worksheets, handouts.\n- Classroom support: Offer management strategies, engagement techniques, inclusive approaches.\n- Administrative tasks: Draft letters, reports, organize documentation.\n- Communication: Compose emails, announcements professionally.\n- Technical support: Guide on app features, digital tools, explain concepts simply.\n- AI integration: Explain and assist with AI tools responsibly.\n- Research & development: Help with writing, summarizing, reflective practices.";
  const fullPrompt = systemPrompt + "\n\n" + userPrompt;

  const url = OPENROUTER_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    })
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON from API:", text);
    throw new Error("Failed to parse API response.");
  }

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`API error: ${msg}`);
  }

  return data?.choices?.[0]?.message?.content || "";
}

// ===== FILTER: Teacher relevance =====
function teacherFilter(text) {
  const keywords = [
    "lesson", "plan", "planning", "assessment", "quiz", "exam", "rubric",
    "classroom", "students", "teachers", "education", "curriculum",
    "technology", "tech issue", "tech support", "grading", "grades", "record",
    "feedback", "worksheet", "activity", "learning objectives", "standards",
    "module", "unit", "stress", "technostress", "troubleshooting", "support",
    "tv", "television", "hdmi", "cable", "cord", "wifi", "laptop", "port",
    "display", "website", "settings", "ui", "interface"
  ];

  const isRelevant = keywords.some(kw => text.toLowerCase().includes(kw));
  if (!isRelevant) {
    return "⚠️ This topic is outside Chipi’s focus. I only assist with teacher daily tasks like tech support, class grades record management, assessment creation, lesson planning, rubric design, classroom technology troubleshooting, and other educational activities to reduce technostress.";
  }
  return text;
}

// ===== FORMATTERS =====
// =================================================================================================

function formatAIText(text) {
    // First, handle code blocks by replacing them with placeholders
    const codeBlocks = [];
    let textWithPlaceholders = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        const placeholder = `{{CODE_BLOCK_${codeBlocks.length}}}`;
        codeBlocks.push(escapeHtml(code.trim()));
        return placeholder;
    });

    // Convert markdown to HTML
    let html = markdownToHtml(textWithPlaceholders);

    // Restore code blocks
    html = html.replace(/{{CODE_BLOCK_(\d+)}}/g, (match, index) => {
        return `<pre><code>${codeBlocks[index]}</code></pre>`;
    });

    // Process content within <li> tags to remove internal line breaks (<br>)
    html = html.replace(/<li>([\s\S]*?)<\/li>/g, (match, liContent) => {
        // Replace all <br> tags inside the li content with a space
        const cleanedContent = liContent.replace(/<br\s*\/?>/g, ' ');
        // Also, collapse multiple whitespace characters into a single space
        return `<li>${cleanedContent.replace(/\s\s+/g, ' ').trim()}</li>`;
    });

    return html;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function stripHtml(str) {
  const tmp = document.createElement("div");
  tmp.innerHTML = str;
  return tmp.textContent || tmp.innerText || "";
}

// ===== HISTORY (localStorage) =====
function loadChats() {
  try {
    const key = `chipi_chats_${accessKey}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChats() {
  const key = `chipi_chats_${accessKey}`;
  localStorage.setItem(key, JSON.stringify(chats));
}

function computeInitialTabCounter(chatsObj) {
  // handle legacy titles like "Tab N" or "Conversation N" or any trailing number
  let max = 0;
  Object.values(chatsObj).forEach(c => {
    const title = (c && c.title) || "";
    let match = /(?:Tab|Conversation)\s*(\d+)$/i.exec(title);
    if (!match) match = /(\d+)$/.exec(title);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  });
  return max;
}

function createTabChat() {
  const id = `chat_${Date.now()}`;
  const nextTabNumber = tabCounter + 1;
  tabCounter = nextTabNumber;
  chats[id] = {
    title: `Conversation ${nextTabNumber}`,
    messages: [],
    created: Date.now()
  };
  saveChats();
  return id;
}

function lastActivityTs(chat) {
  if (!chat) return 0;
  const last = chat.messages && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
  return (last && last.ts) || chat.created || 0;
}

function renderHistory() {
  historyList.innerHTML = "";
  const ids = Object.keys(chats).sort((a, b) => {
    const at = lastActivityTs(chats[a]);
    const bt = lastActivityTs(chats[b]);
    return bt - at;
  });

  if (ids.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-item";
    empty.innerHTML = `
      <span class="icon">ℹ️</span>
      <span class="history-title">No history yet...</span>
    `;
    historyList.appendChild(empty);
    return;
  }

  ids.forEach(id => {
    const chat = chats[id];
    const item = document.createElement("li");
    item.className = "history-item";
    if (currentChatId === id) {
      item.classList.add("selected");
      item.style.background = "#e6f9ff";
      item.setAttribute('aria-current', 'true');
    } else {
      item.style.background = "transparent";
      item.removeAttribute('aria-current');
    }

    // Show an explicit editing state class on each row when editMode is active
    if (editMode) item.classList.add('editing'); else item.classList.remove('editing');

    const iconEl = document.createElement("span");
    iconEl.className = "icon";
    iconEl.textContent = "💬";
    iconEl.title = chat.title || '';
    // Make the item accessible when collapsed and visible only as icon
    item.setAttribute('aria-label', chat.title || 'Conversation');
    item.tabIndex = 0;

    const titleWrap = document.createElement("div");
    titleWrap.style.display = "flex";
    titleWrap.style.flexDirection = "column";
    titleWrap.style.minWidth = "0";
    titleWrap.style.alignSelf = "stretch";

    const titleEl = document.createElement("span");
    titleEl.className = "history-title";
    titleEl.textContent = chat.title || "Untitled";
    titleEl.title = chat.title || "";

    const subEl = document.createElement("div");
    // No rename capability: titles are read-only
    titleWrap.appendChild(titleEl);
    subEl.className = "history-sub";
    subEl.style.color = "var(--muted)";
    subEl.style.fontSize = "13px";
    const previewMsg = chat.messages && chat.messages.length ? chat.messages[chat.messages.length - 1].content : "";
    const plainPreview = stripHtml(previewMsg);
    subEl.textContent = plainPreview.length > 60 ? plainPreview.slice(0, 60) + '...' : plainPreview;

    const actions = document.createElement("div");
    actions.className = "history-actions";

    // Delete (trash) — visible only in edit mode
    const deleteBtn = document.createElement("button");
    deleteBtn.setAttribute("title", "Delete");
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.style.display = editMode ? "inline-flex" : "none";
    deleteBtn.style.padding = "5px";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      scheduleDeleteChat(id);
    });

    actions.appendChild(deleteBtn);

    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(subEl);

    item.appendChild(iconEl);
    item.appendChild(titleWrap);
    item.appendChild(actions);

    // Keyboard support: Enter opens, Delete removes (in edit mode)
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !editMode) {
        currentChatId = id;
        renderChat(id);
        renderHistory();
      }
      if (e.key === 'Delete' && editMode) {
        scheduleDeleteChat(id);
      }
    });

    // Click to load chat (disabled while editing)
    item.addEventListener("click", () => {
      if (editMode) return;
      currentChatId = id;
      renderChat(id);
      renderHistory();
});

    historyList.appendChild(item);
  });
}

function saveCurrentChatId(id) {
  try { localStorage.setItem(`chipi_last_chat_${accessKey}`, id); } catch (e) {}
}

function renderChat(id) {
  // set as current and persist
  currentChatId = id;
  saveCurrentChatId(id);
messagesEl.innerHTML = "";
// Always add the introduction at the top of messages
  const introTpl = document.getElementById("introductionTemplate");
if (introTpl) {
    const introClone = introTpl.content.cloneNode(true);
messagesEl.appendChild(introClone);
    // Scroll to show the intro at the top on render, accounting for images
    ensureScrollAfterAssets(messagesEl, true);
  }

  const chat = chats[id];
  if (!chat || !chat.messages || chat.messages.length === 0) {
// For empty chats, just the introduction is shown
    return;
  }

  chat.messages.forEach(m => {
    const msg = document.createElement("div");
msg.className = `message ${m.role}`;

    if (m.role === "ai") {
      const avatar = document.createElement("img");
      avatar.className = "msg-avatar";
      avatar.src = "./CHIPI CHATLOGO.png";
      avatar.alt = "Chipi Logo";
msg.appendChild(avatar);
    } else if (m.role === "user") {
      const avatar = document.createElement("img");
      avatar.className = "msg-avatar";
      avatar.src = "./USERLOGO.png";
      avatar.alt = "User Avatar";
      msg.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (m.role === "ai") {
      bubble.innerHTML = m.content;
    } else {
      bubble.innerHTML = m.content;
    }
    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
  });

  scrollMessagesToBottom();
}

// ===== LAYOUT HELPERS =====
function applySidebarLayout() {
  const isCollapsed = sidebar.classList.contains("collapsed");
  // only set aria-expanded if a toggle exists in the DOM
  const toggleEl = document.getElementById('sidebarToggle');
  if (toggleEl) toggleEl.setAttribute('aria-expanded', String(!isCollapsed));

  if (isCollapsed) {
    appRoot.style.gridTemplateColumns = `var(--sidebar-collapsed-width) 1fr`;
  } else {
    sidebar.classList.add("expanded");
    appRoot.style.gridTemplateColumns = `var(--sidebar-width) 1fr`;
  }
}

// ===== UTILITIES: Markdown, Timestamps, Toasts, Autosize =====
function markdownToHtml(md) {
// convert code fences first
  md = md.replace(/```[a-zA-Z0-9-]*\n([\s\S]*?)```/g, (m, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code>${escaped}</code></pre>`;
  });
  // inline code
  md = md.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // links
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // bold
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // italic
  md = md.replace(/(^|\s)\*(\S(?:.*?\S)?)\*/g, '$1<em>$2</em>');
  // simple list items
  if (/^\s*[-*]\s+/m.test(md)) {
    md = md.replace(/(^|\n)(?:[-*]\s+(.+))/g, '$1<li>$2</li>');
    md = md.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');
  }
  // newlines to <br>
  md = md.replace(/\n/g, '<br>');
  return md;
}

function formatAIText(text) {
  if (!text) return '';
  // Normalize line endings and collapse excessive blank lines to at most one empty line
  text = String(text).replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  // Remove common model labels like [BOT], BOT:, [AI], etc., and unwanted tokens like [/s] and <s>
  text = text.replace(/^\s*(?:\[bot\]|bot:|\[ai\]|ai:)\s*/i, '');
  text = text.replace(/\[\/s\]/g, '');
  text = text.replace(/<s>/g, '');
  // Trim leading/trailing whitespace
  text = text.trim();

  const escaped = escapeHtml(text);
  let html = markdownToHtml(escaped);
  // Collapse repeated <br> sequences produced from many newlines down to two
  html = html.replace(/(?:<br>\s*){3,}/g, '<br><br>');
  let withHighlights = html
    .replace(/(^|<br>)(Important:)/gi, "$1<strong>Important:</strong>")
    .replace(/(^|<br>)(Key:)/gi, "$1<strong>Key:</strong>")
    .replace(/(^|<br>)(Tip:)/gi, "$1<strong>Tip:</strong>")
    .replace(/(^|<br>)(Note:)/gi, "$1<strong>Note:</strong>");

  // Remove short leading apology sentences like "I'm sorry..." or "Apologies..."
  withHighlights = withHighlights.replace(/^(?:\s|<br>)*(?:I(?:'m|\s+am)\s+sorry[\s\S]*?(?:\.|,)|sorry[\s\S]*?(?:\.|,)|I\s+apologize[\s\S]*?(?:\.|,)|apologies[\s\S]*?(?:\.|,))\s*/i, '');

  // Make numbered step headings more prominent (bold + slightly larger) for lines starting with "1. ...:"
  // Handle both raw lines (with <br>) and list items <li>
  withHighlights = withHighlights.replace(/(^|<br>)\s*(\d+\.\s*([^<:]{2,}?:))/g, "$1<strong class=\"step-title\">$2</strong>");
  withHighlights = withHighlights.replace(/<li>\s*(\d+\.\s*([^<:]{2,}?:))/g, "<li><strong class=\"step-title\">$1</strong>");

  // Make text bigger and bold for "###" markers, removing the hashtags
  withHighlights = withHighlights.replace(/(^|<br>)\s*###\s*(.+?)(?=<br>|$)/g, "$1<strong class=\"step-title\">$2</strong>");

  return withHighlights;
}

// Toast helpers
const toastContainer = document.getElementById('toastContainer');
function showToast(message, undoLabel, undoCallback, ttl = 6000) {
  if (!toastContainer) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<div class="toast-text">${escapeHtml(message)}</div>`;
  if (undoLabel && undoCallback) {
    const btn = document.createElement('button');
    btn.className = 'btn small';
    btn.textContent = undoLabel;
    btn.addEventListener('click', () => {
      undoCallback();
      toastContainer.removeChild(t);
      clearTimeout(timeout);
    });
    t.appendChild(btn);
  }
  toastContainer.appendChild(t);
  const timeout = setTimeout(() => {
    if (t.parentNode) t.parentNode.removeChild(t);
  }, ttl);
  return t;
}

// Autosize textarea
function autosizeTextarea(el) {
  // Only apply to TEXTAREA elements — inputs should remain single-line
  if (!el || el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  const newH = Math.min(el.scrollHeight, 180);
  el.style.height = newH + 'px';
}



// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    userInputEl.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    addTabBtn.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    exportChats();
  }
});

// ===== Import / Export and Delete with Undo =====
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const pendingDeletes = {};

exportBtn?.addEventListener('click', exportChats);
importBtn?.addEventListener('click', () => importFile?.click());
importFile?.addEventListener('change', handleImportFile);

function exportChats() {
  const data = JSON.stringify(chats, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chipi_chats.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function handleImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid file');
    // merge chats (avoid id collisions)
Object.entries(data).forEach(([k, v], i) => {
      let id = k;
      if (chats[id]) id = `import_${Date.now()}_${i}`;
      chats[id] = v;
    });
    saveChats();
    renderHistory();
    showToast('Imported conversations', 'OK');
  } catch (err) {
    showToast('Failed to import file');
    console.error(err);
  } finally {
    importFile.value = '';
  }
}

function scheduleDeleteChat(id) {
  if (!chats[id]) return;
  const backup = chats[id];
  delete chats[id];
  saveChats();
  renderHistory();
  if (currentChatId === id) {
    currentChatId = null;
    // clear persisted last chat so we don't attempt to restore a removed id
    try { localStorage.removeItem(`chipi_last_chat_${accessKey}`); } catch (e) {}
    messagesEl.innerHTML = '';
    if (welcomeEl) welcomeEl.style.display = 'block';
  }

  // If all chats are deleted, create a new one starting from no. 1
  if (Object.keys(chats).length === 0) {
    tabCounter = 0;
    const newId = createTabChat();
    currentChatId = newId;
    saveCurrentChatId(newId);
    renderHistory();
    renderChat(newId);
  }

  const undo = () => {
    chats[id] = backup;
    saveChats();
    renderHistory();
    showToast('Restore complete');
    delete pendingDeletes[id];
  };

  // show undo toast
  showToast('Conversation deleted', 'Undo', undo, 6000);

  // set finalization timeout
  const to = setTimeout(() => {
    // after TTL we remove the backup (can't restore anymore)
    delete pendingDeletes[id];
  }, 6000);

  pendingDeletes[id] = { backup, timeout: to };
}

document.addEventListener('DOMContentLoaded', () => {
    // Re-initializing all UI elements to ensure they are connected
    const sendBtn = document.getElementById('sendBtn');
    const userInputEl = document.getElementById('userInput');
    const addTabBtn = document.getElementById('addTabBtn');
    const editHistoryBtn = document.getElementById('editHistoryBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const assessmentCreationModal = document.getElementById('assessmentCreationModal');
    const lessonPlanningModal = document.getElementById('lessonPlanningModal');
    const assessmentCreationForm = document.getElementById('assessmentCreationForm');
    const lessonPlanningForm = document.getElementById('lessonPlanningForm');

    // Restore event listeners for core chat functions
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (userInputEl) userInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    if (addTabBtn) addTabBtn.addEventListener('click', createNewChat);
    if (editHistoryBtn) editHistoryBtn.addEventListener('click', toggleHistoryEdit);

    // Restore profile menu functionality
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', !isExpanded);
            profileMenu.setAttribute('aria-hidden', isExpanded);
        });
    }

    // Load initial data
    loadChats();
    renderHistory();
    renderChat(currentChatId);

    // Event delegation for dynamically added buttons
    document.body.addEventListener('click', function(event) {
        // Handle Lesson Planning button click
        if (event.target.matches('#lessonPlanningBtn, #lessonPlanningBtn *')) {
            if (lessonPlanningModal) lessonPlanningModal.style.display = "block";
        }

        // Handle modal close buttons
        if (event.target.classList.contains('close-btn')) {
            if (assessmentCreationModal) assessmentCreationModal.style.display = "none";
            if (lessonPlanningModal) lessonPlanningModal.style.display = "none";
        }
    });

    // Close modals if user clicks outside of them
    window.addEventListener('click', function(event) {
        if (event.target === assessmentCreationModal) {
            assessmentCreationModal.style.display = "none";
        }
        if (event.target === lessonPlanningModal) {
            lessonPlanningModal.style.display = "none";
        }
    });

    // Handle Assessment Creation form submission
    if (assessmentCreationForm) {
        assessmentCreationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // The form submission is handled by assessment-creation.js generateAssessment()
        });
    }

    // Handle Lesson Planning form submission
    if (lessonPlanningForm) {
        lessonPlanningForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // The form submission is handled by lesson-planning.js generateLessonPlan()
        });
    }
});
