// ==========================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================================================
let state = {
    settings: {
        name: "ゲストユーザー",
        grade: "",
        target: ""
    },
    grades: [], // Array of { id, name, date, type, scores: { english, math... }, maxScores: { english, math... }, total, maxTotal, averageRate, photo: base64 }
    todos: [] // Array of { id, title, date, reminder: boolean }
};

// LocalStorage Keys
const STORAGE_KEYS = {
    SETTINGS: "studybuddy_settings",
    GRADES: "studybuddy_grades",
    TODOS: "studybuddy_todos"
};

// Load initial data
function loadState() {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedGrades = localStorage.getItem(STORAGE_KEYS.GRADES);
    const savedTodos = localStorage.getItem(STORAGE_KEYS.TODOS);

    if (savedSettings) {
        state.settings = JSON.parse(savedSettings);
    }
    if (savedGrades) {
        try {
            const grades = JSON.parse(savedGrades);
            // 古いデータのフォールバック（maxScoresなどが無い場合の補完）
            state.grades = grades.map(grade => {
                if (!grade.maxScores) {
                    grade.maxScores = { english: 100, math: 100, japanese: 100, science: 100, social: 100 };
                }
                if (grade.maxTotal === undefined || grade.maxTotal === null || grade.maxTotal === 0) {
                    let maxTotal = 0;
                    Object.keys(grade.scores).forEach(sub => {
                        if (grade.scores[sub] !== null && grade.scores[sub] !== "") {
                            maxTotal += (grade.maxScores[sub] || 100);
                        }
                    });
                    grade.maxTotal = maxTotal;
                }
                if (grade.averageRate === undefined || grade.averageRate === null) {
                    grade.averageRate = grade.maxTotal > 0 ? Math.round((grade.total / grade.maxTotal) * 100) : (grade.average || 0);
                }
                return grade;
            });
        } catch (e) {
            console.error("Grades parse error:", e);
            state.grades = [];
        }
    }
    if (savedTodos) {
        state.todos = JSON.parse(savedTodos);
    }
}

// Save data to localStorage
function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
}

function saveGrades() {
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(state.grades));
}

function saveTodos() {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(state.todos));
}

// ==========================================================================
// APPLICATION INITIALIZATION
// ==========================================================================
let gradeChartInstance = null;
let currentUploadedPhotoBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
    loadState();
    
    // Initialize UI Elements
    initNavigation();
    initLucideIcons();
    initCalendarPanel();
    initImageModal();
    initPhotoUpload();
    
    updateUIProfile();
    updateGradesTable();
    updateStatsAndChart();
    updateAIAnalysis();
    updateHistoryTimeline();
    updateTodoList();
    triggerAIReminder(); // Run AI scheduler alerts
    
    // Set up event listeners
    initEventListeners();
});

// ==========================================================================
// TAB & NAVIGATION SYSTEM
// ==========================================================================
function initNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");

    const tabDetails = {
        dashboard: { title: "ダッシュボード", subtitle: "現在の成績データとAIの分析概要です。" },
        grades: { title: "成績を入力する", subtitle: "テストや模試の点数を記録して、データを更新します。" },
        "ai-tutor": { title: "AI家庭教師 Buddy", subtitle: "あなたの成績に合わせた完全オリジナルの学習指導を行います。" },
        history: { title: "学習履歴", subtitle: "過去のテスト成績と、AIアドバイスの記録を振り返ります。" },
        settings: { title: "設定", subtitle: "プロフィールの設定やデータの管理を行います。" }
    };

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            
            // Toggle active menu item
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Toggle active tab content
            tabContents.forEach(tab => {
                if (tab.id === `tab-${tabId}`) {
                    tab.classList.add("active");
                } else {
                    tab.classList.remove("active");
                }
            });

            // Update Header text
            if (tabDetails[tabId]) {
                pageTitle.textContent = tabDetails[tabId].title;
                pageSubtitle.textContent = tabDetails[tabId].subtitle;
            }

            // Tab entry actions
            if (tabId === "dashboard") {
                updateStatsAndChart();
                updateAIAnalysis();
                triggerAIReminder();
            }
            if (tabId === "ai-tutor") {
                updateAIAnalysis();
            }
            if (tabId === "history") {
                updateHistoryTimeline();
            }

            initLucideIcons();
        });
    });

    // Dashboard quick link
    document.getElementById("go-to-ai-tutor-btn").addEventListener("click", () => {
        const tutorMenu = document.querySelector('[data-tab="ai-tutor"]');
        if (tutorMenu) tutorMenu.click();
    });
}

function initLucideIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

// ==========================================================================
// CALENDAR & TODO PANEL LOGIC
// ==========================================================================
function initCalendarPanel() {
    const trigger = document.getElementById("calendar-trigger-badge");
    const sidebar = document.getElementById("calendar-sidebar");
    const overlay = document.getElementById("calendar-overlay");
    const closeBtn = document.getElementById("calendar-close-btn");

    if (!trigger || !sidebar || !overlay || !closeBtn) return;

    const openPanel = () => {
        sidebar.classList.add("open");
        overlay.classList.add("open");
        updateTodoList();
    };

    const closePanel = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    };

    trigger.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);
    overlay.addEventListener("click", closePanel);

    // Form submission
    const form = document.getElementById("calendar-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const titleInput = document.getElementById("todo-title");
            const dateInput = document.getElementById("todo-date");
            const reminderCheckbox = document.getElementById("todo-reminder");

            const newTodo = {
                id: Date.now().toString(),
                title: titleInput.value.trim(),
                date: dateInput.value,
                reminder: reminderCheckbox.checked
            };

            state.todos.push(newTodo);
            saveTodos();

            // Reset form
            titleInput.value = "";
            dateInput.value = "";
            reminderCheckbox.checked = true;

            updateTodoList();
            triggerAIReminder();
            showNotification("学習計画に予定を追加しました！");
        });
    }
}

// Google カレンダーの終日予定用フォーマット (YYYYMMDD)
function formatGoogleCalendarDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    
    // 終了日は翌日にする必要があるため計算
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const ey = endDate.getFullYear();
    const em = String(endDate.getMonth() + 1).padStart(2, "0");
    const ed = String(endDate.getDate()).padStart(2, "0");
    
    return `${y}${m}${d}/${ey}${em}${ed}`;
}

// Update the list of ToDos inside Calendar Sidebar
function updateTodoList() {
    const listContainer = document.getElementById("calendar-todo-list");
    const noTodo = document.getElementById("no-todo-placeholder");
    const badgeCount = document.getElementById("calendar-todo-count");

    if (!listContainer) return;
    listContainer.innerHTML = "";

    // Show alert badge on header calendar button
    const activeTodos = state.todos.filter(todo => new Date(todo.date) >= new Date().setHours(0,0,0,0));
    if (activeTodos.length > 0) {
        badgeCount.textContent = activeTodos.length;
        badgeCount.style.display = "flex";
    } else {
        badgeCount.style.display = "none";
    }

    if (state.todos.length === 0) {
        noTodo.style.display = "flex";
        return;
    } else {
        noTodo.style.display = "none";
    }

    // Sort chronologically (earliest to latest)
    const sortedTodos = [...state.todos].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedTodos.forEach(todo => {
        const item = document.createElement("div");
        item.className = "todo-item";

        const isPast = new Date(todo.date) < new Date().setHours(0,0,0,0);
        const dateStyle = isPast ? "color: var(--color-danger);" : "";
        const alertLabel = isPast ? "（期限超過）" : "";
        
        // Googleカレンダー用のURL生成
        const gcalDate = formatGoogleCalendarDate(todo.date);
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(todo.title)}&dates=${gcalDate}&details=${encodeURIComponent("StudyBuddy AIから登録された学習予定です。")}`;

        item.innerHTML = `
            <div class="todo-info">
                <span class="todo-item-title">${escapeHTML(todo.title)}</span>
                <span class="todo-item-date" style="${dateStyle}">
                    <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                    <span>${formatDate(todo.date)}${alertLabel}</span>
                </span>
            </div>
            <div class="todo-actions">
                ${todo.reminder ? '<span class="todo-badge">AI通知</span>' : ''}
                <a href="${gcalUrl}" target="_blank" class="btn btn-secondary btn-icon" title="Googleカレンダーに登録" style="width: 28px; height: 28px; padding: 4px; display: inline-flex; align-items: center; justify-content: center;">
                    <i data-lucide="calendar-plus" style="width: 14px; height: 14px; color: var(--color-primary);"></i>
                </a>
                <button class="btn btn-danger btn-icon delete-todo-btn" data-id="${todo.id}" title="完了して削除" style="width: 28px; height: 28px; padding: 4px;">
                    <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });

    // Add delete events
    document.querySelectorAll(".delete-todo-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            state.todos = state.todos.filter(t => t.id !== id);
            saveTodos();
            updateTodoList();
            triggerAIReminder();
        });
    });

    initLucideIcons();
}

// AI Reminder Banner engine based on upcoming schedule
function triggerAIReminder() {
    const banner = document.getElementById("ai-reminder-banner");
    const textEl = document.getElementById("ai-reminder-text");

    if (!banner || !textEl) return;

    // Filter todos with reminder enabled and in the future or today
    const now = new Date().setHours(0, 0, 0, 0);
    const futureTodos = state.todos
        .filter(todo => todo.reminder && new Date(todo.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (futureTodos.length === 0) {
        banner.style.display = "none";
        return;
    }

    const nextTodo = futureTodos[0];
    const diffTime = new Date(nextTodo.date) - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const targetName = state.settings.name || "ユーザー";

    let reminderText = "";
    if (diffDays === 0) {
        reminderText = `💡 <strong>AI家庭教師 Buddy:</strong> ${targetName}さん、本日(${formatDate(nextTodo.date)})は「<strong>${escapeHTML(nextTodo.title)}</strong>」の当日です！今日の目標に向かって一歩踏み出しましょう！`;
    } else {
        reminderText = `⏰ <strong>AI家庭教師 Buddy:</strong> 「<strong>${escapeHTML(nextTodo.title)}</strong>」まで<strong>あと ${diffDays} 日</strong>です！苦手科目の最終見直し計画は立てましたか？チャットで「対策問題を出して」と話しかけてみてくださいね。`;
    }

    textEl.innerHTML = reminderText;
    banner.style.display = "flex";
}

// ==========================================================================
// PHOTO UPLOAD & PREVIEW SYSTEM
// ==========================================================================
function initPhotoUpload() {
    const photoInput = document.getElementById("test-photo");
    const previewContainer = document.getElementById("photo-preview-container");
    const previewImg = document.getElementById("photo-preview");
    const removeBtn = document.getElementById("remove-photo-btn");
    const placeholderText = document.getElementById("photo-placeholder-text");

    if (!photoInput || !previewContainer || !previewImg || !removeBtn) return;

    photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation: Limit to 1.5MB for localStorage stability
        if (file.size > 1.5 * 1024 * 1024) {
            alert("画像サイズが大きすぎます。プロトタイプ保存のため、1.5MB以下の写真をアップロードしてください。");
            photoInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentUploadedPhotoBase64 = event.target.result;
            previewImg.src = currentUploadedPhotoBase64;
            previewContainer.style.display = "block";
            if (placeholderText) placeholderText.innerHTML = `<i data-lucide="check-circle" style="color: var(--color-success)"></i> <span>選択済み (${(file.size / 1024).toFixed(0)}KB)</span>`;
            initLucideIcons();
        };
        reader.readAsDataURL(file);
    });

    removeBtn.addEventListener("click", () => {
        currentUploadedPhotoBase64 = null;
        photoInput.value = "";
        previewImg.src = "";
        previewContainer.style.display = "none";
        if (placeholderText) placeholderText.innerHTML = `<i data-lucide="image"></i> <span>画像を追加（カメラ撮影など）</span>`;
        initLucideIcons();
    });
}

// ==========================================================================
// IMAGE EXPANSION MODAL
// ==========================================================================
function initImageModal() {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("image-modal-img");
    const captionText = document.getElementById("image-modal-caption");
    const closeBtn = document.getElementById("image-modal-close-btn");

    if (!modal || !modalImg || !captionText || !closeBtn) return;

    closeBtn.onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    };
}

function openImageModal(src, altText) {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("image-modal-img");
    const captionText = document.getElementById("image-modal-caption");

    if (!modal || !modalImg || !captionText) return;

    modal.style.display = "block";
    modalImg.src = src;
    captionText.textContent = altText;
}

// ==========================================================================
// UI UPDATE PROFILE & SETTINGS
// ==========================================================================
function updateUIProfile() {
    const displayName = document.getElementById("display-user-name");
    const displayGrade = document.getElementById("display-user-grade");
    const inputName = document.getElementById("user-name");
    const inputGrade = document.getElementById("user-grade");
    const inputTarget = document.getElementById("user-target");

    displayName.textContent = state.settings.name || "ゲストユーザー";
    displayGrade.textContent = state.settings.grade || "学年未設定";

    if (inputName) inputName.value = state.settings.name || "";
    if (inputGrade) inputGrade.value = state.settings.grade || "";
    if (inputTarget) inputTarget.value = state.settings.target || "";
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    const nameVal = document.getElementById("user-name").value.trim();
    const gradeVal = document.getElementById("user-grade").value;
    const targetVal = document.getElementById("user-target").value.trim();

    state.settings.name = nameVal || "ゲストユーザー";
    state.settings.grade = gradeVal;
    state.settings.target = targetVal;

    saveSettings();
    updateUIProfile();
    updateAIAnalysis();

    showNotification("設定を保存しました！");
}

// ==========================================================================
// GRADES RENDER & EDIT OPERATIONS (NO DELETES ALLOWED!)
// ==========================================================================
function updateGradesTable() {
    const tableBody = document.getElementById("grades-table-body");
    const noTableData = document.getElementById("no-table-data");
    
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (state.grades.length === 0) {
        noTableData.style.display = "flex";
        return;
    } else {
        noTableData.style.display = "none";
    }

    // Sort grades by date (descending)
    const sortedGrades = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedGrades.forEach(grade => {
        const tr = document.createElement("tr");
        
        const formatScore = (score, max) => {
            if (score === null || score === undefined || score === "") return "-";
            return `<span style="font-weight: 500;">${score}</span><span style="font-size: 0.75rem; color: var(--text-muted);">/${max}</span>`;
        };

        // ScoreRate (total score / max score)
        const scorePercent = grade.maxTotal > 0 ? Math.round((grade.total / grade.maxTotal) * 100) : 0;

        // Image icon or thumbnail
        let photoHtml = '<i data-lucide="image-off" class="table-photo-icon"></i>';
        if (grade.photo) {
            photoHtml = `<img src="${grade.photo}" class="table-thumbnail" alt="${escapeHTML(grade.name)}の写真" onclick="event.stopPropagation(); openImageModal('${grade.photo}', '${escapeHTML(grade.name)}の用紙')">`;
        }

        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHTML(grade.name)}</td>
            <td><span class="todo-badge" style="font-size: 0.7rem;">${escapeHTML(grade.type)}</span></td>
            <td>${formatDate(grade.date)}</td>
            <td class="grade-badge-cell">
                <span class="text-gradient">${scorePercent}%</span>
                <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);"> (${grade.total}/${grade.maxTotal})</span>
            </td>
            <td>${formatScore(grade.scores.english, grade.maxScores.english)}</td>
            <td>${formatScore(grade.scores.math, grade.maxScores.math)}</td>
            <td>${formatScore(grade.scores.japanese, grade.maxScores.japanese)}</td>
            <td>${formatScore(grade.scores.science, grade.maxScores.science)}</td>
            <td>${formatScore(grade.scores.social, grade.maxScores.social)}</td>
            <td style="text-align: center;">${photoHtml}</td>
            <td>
                <button class="btn btn-secondary btn-icon edit-grade-btn" data-id="${grade.id}" title="点数を編集・変更">
                    <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add edit events (No delete allowed based on user feedback)
    document.querySelectorAll(".edit-grade-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            prepareEditGrade(id);
        });
    });

    initLucideIcons();
}

// Edit Mode Initiator
function prepareEditGrade(id) {
    const grade = state.grades.find(g => g.id === id);
    if (!grade) return;

    // Fill the inputs
    document.getElementById("edit-grade-id").value = grade.id;
    document.getElementById("test-date").value = grade.date;
    document.getElementById("test-type").value = grade.type;

    // Subjects and Max Scores
    const subjects = ["english", "math", "japanese", "science", "social"];
    subjects.forEach(sub => {
        document.getElementById(`score-${sub}`).value = grade.scores[sub] !== null ? grade.scores[sub] : "";
        document.getElementById(`max-${sub}`).value = grade.maxScores[sub] || 100;
    });

    // Handle photo restoration in form
    const previewContainer = document.getElementById("photo-preview-container");
    const previewImg = document.getElementById("photo-preview");
    const placeholderText = document.getElementById("photo-placeholder-text");
    const fileInput = document.getElementById("test-photo");

    fileInput.value = ""; // clear selected new file
    if (grade.photo) {
        currentUploadedPhotoBase64 = grade.photo;
        previewImg.src = grade.photo;
        previewContainer.style.display = "block";
        if (placeholderText) placeholderText.innerHTML = `<i data-lucide="check-circle" style="color: var(--color-success)"></i> <span>登録済み写真あり</span>`;
    } else {
        currentUploadedPhotoBase64 = null;
        previewImg.src = "";
        previewContainer.style.display = "none";
        if (placeholderText) placeholderText.innerHTML = `<i data-lucide="image"></i> <span>画像を追加（カメラ撮影など）</span>`;
    }

    // Toggle button styles for Edit mode
    document.getElementById("form-title").textContent = "成績データの変更・編集";
    document.getElementById("form-subtitle").textContent = "点数や満点などの情報を変更して「変更を適用」を押してください。";
    document.getElementById("submit-grade-btn").querySelector("span").textContent = "変更を適用する";
    document.getElementById("cancel-edit-btn").style.display = "block";

    // Switch to Grades input Tab
    const gradesMenu = document.querySelector('[data-tab="grades"]');
    if (gradesMenu) gradesMenu.click();
}

function cancelEditMode() {
    document.getElementById("grade-form").reset();
    document.getElementById("edit-grade-id").value = "";
    currentUploadedPhotoBase64 = null;
    
    // Hide previews
    document.getElementById("photo-preview-container").style.display = "none";
    document.getElementById("photo-preview").src = "";
    document.getElementById("photo-placeholder-text").innerHTML = `<i data-lucide="image"></i> <span>画像を追加（カメラ撮影など）</span>`;
    
    // Toggle titles
    document.getElementById("form-title").textContent = "テスト・模試の成績を登録";
    document.getElementById("form-subtitle").textContent = "点数と満点を入力し、必要に応じて問題用紙の写真も登録しましょう。";
    document.getElementById("submit-grade-btn").querySelector("span").textContent = "成績を保存する";
    document.getElementById("cancel-edit-btn").style.display = "none";

    initLucideIcons();
}

// Add or edit grade operation
function handleGradeSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById("edit-grade-id").value;
    const dateInput = document.getElementById("test-date");
    const typeInput = document.getElementById("test-type");

    const parseVal = (id) => {
        const val = document.getElementById(id).value;
        return val === "" ? null : Number(val);
    };

    const subjects = ["english", "math", "japanese", "science", "social"];
    let scores = {};
    let maxScores = {};
    let totalScore = 0;
    let maxTotalScore = 0;
    let enteredCount = 0;

    subjects.forEach(sub => {
        const score = parseVal(`score-${sub}`);
        const max = parseVal(`max-${sub}`) || 100;
        scores[sub] = score;
        maxScores[sub] = max;

        if (score !== null) {
            totalScore += score;
            maxTotalScore += max;
            enteredCount++;
        }
    });

    if (enteredCount === 0) {
        alert("少なくとも1科目の点数を入力してください。");
        return;
    }

    const averageRate = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
    const testName = typeInput.value; // テスト名は種類をそのまま使用

    if (editId) {
        // Edit Action
        const index = state.grades.findIndex(g => g.id === editId);
        if (index !== -1) {
            state.grades[index] = {
                ...state.grades[index],
                name: testName,
                date: dateInput.value,
                type: typeInput.value,
                scores: scores,
                maxScores: maxScores,
                total: totalScore,
                maxTotal: maxTotalScore,
                averageRate: averageRate,
                photo: currentUploadedPhotoBase64 // Keep Base64
            };
            showNotification(`「${testName}」を修正しました！`);
        }
    } else {
        // Add Action
        const newGrade = {
            id: Date.now().toString(),
            name: testName,
            date: dateInput.value,
            type: typeInput.value,
            scores: scores,
            maxScores: maxScores,
            total: totalScore,
            maxTotal: maxTotalScore,
            averageRate: averageRate,
            photo: currentUploadedPhotoBase64
        };
        state.grades.push(newGrade);
        showNotification(`「${newGrade.name}」を登録しました！`);
    }

    saveGrades();
    cancelEditMode();

    // Refresh UI
    updateGradesTable();
    updateStatsAndChart();
    updateAIAnalysis();
    updateHistoryTimeline();

    // Redirect to Dashboard
    const dashboardMenu = document.querySelector('[data-tab="dashboard"]');
    if (dashboardMenu) dashboardMenu.click();
}

// ==========================================================================
// STATISTICS & CHART GENERATION (WITH FILTER AND得点率)
// ==========================================================================
function updateStatsAndChart() {
    const statLatestValue = document.getElementById("stat-latest-value");
    const statNextTodoValue = document.getElementById("stat-next-todo-value");
    const statTargetValue = document.getElementById("stat-target-value");
    const noDataMessage = document.getElementById("no-data-message");
    const filterSelect = document.getElementById("dashboard-filter");

    const filterVal = filterSelect ? filterSelect.value : "all";

    // 1. Filter grades
    let filteredGrades = [];
    if (filterVal === "all") {
        filteredGrades = state.grades;
    } else if (filterVal === "定期テスト") {
        filteredGrades = state.grades.filter(g => g.type === "定期テスト");
    } else if (filterVal === "外部模試-すべて") {
        filteredGrades = state.grades.filter(g => g.type !== "定期テスト" && g.type !== "小テスト/その他");
    } else {
        filteredGrades = state.grades.filter(g => g.type === filterVal);
    }

    // --- A. クイック統計カードの更新 ---
    // 1) 最新のテスト
    if (state.grades.length > 0) {
        const latest = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const scorePercent = latest.maxTotal > 0 ? Math.round((latest.total / latest.maxTotal) * 100) : 0;
        if (statLatestValue) {
            statLatestValue.innerHTML = `${escapeHTML(latest.name)} <span class="text-gradient">${scorePercent}%</span>`;
        }
    } else {
        if (statLatestValue) statLatestValue.textContent = "--";
    }

    // 2) 次の予定 (カレンダーから取得)
    const now = new Date().setHours(0, 0, 0, 0);
    const activeTodos = state.todos
        .filter(todo => new Date(todo.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (activeTodos.length > 0) {
        const nextTodo = activeTodos[0];
        const diffDays = Math.ceil((new Date(nextTodo.date) - now) / (1000 * 60 * 60 * 24));
        const dayLabel = diffDays === 0 ? "本日" : `あと ${diffDays} 日`;
        if (statNextTodoValue) {
            statNextTodoValue.innerHTML = `${escapeHTML(nextTodo.title)} <span class="text-gradient">(${dayLabel})</span>`;
        }
    } else {
        if (statNextTodoValue) statNextTodoValue.textContent = "予定なし";
    }

    // 3) 現在の学習目標
    if (statTargetValue) {
        statTargetValue.textContent = state.settings.target || "目標未設定";
    }

    // If no data matching filters
    if (filteredGrades.length === 0) {
        if (noDataMessage) noDataMessage.style.display = "flex";
        if (gradeChartInstance) {
            gradeChartInstance.destroy();
            gradeChartInstance = null;
        }
        return;
    }

    if (noDataMessage) noDataMessage.style.display = "none";

    // 2. Render Chart.js with 得点率 (%)
    const sortedChronological = [...filteredGrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const chartLabels = sortedChronological.map(g => `${g.name} (${formatDateShort(g.date)})`);

    // Helper to calculate rate array per subject (maps (score / max)*100)
    const getSubjectRateArray = (subKey) => {
        return sortedChronological.map(g => {
            const val = g.scores[subKey];
            const max = g.maxScores[subKey] || 100;
            if (val === null || val === undefined || val === "") return null;
            return Math.round((val / max) * 100);
        });
    };

    const datasets = [
        {
            label: "英語得点率",
            data: getSubjectRateArray("english"),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 4,
            spanGaps: true
        },
        {
            label: "数学得点率",
            data: getSubjectRateArray("math"),
            borderColor: "#a855f7",
            backgroundColor: "rgba(168, 85, 247, 0.05)",
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 4,
            spanGaps: true
        },
        {
            label: "国語得点率",
            data: getSubjectRateArray("japanese"),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 4,
            spanGaps: true
        },
        {
            label: "理科得点率",
            data: getSubjectRateArray("science"),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 4,
            spanGaps: true
        },
        {
            label: "社会得点率",
            data: getSubjectRateArray("social"),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 4,
            spanGaps: true
        }
    ];

    const ctx = document.getElementById("gradeChart").getContext("2d");

    if (gradeChartInstance) {
        gradeChartInstance.destroy();
    }

    // Title settings for chart
    const chartSubtitleEl = document.getElementById("chart-subtitle");
    if (chartSubtitleEl) {
        chartSubtitleEl.textContent = filterVal === "all" ? "各科目の得点率（％）の推移" : `${filterSelect.options[filterSelect.selectedIndex].text}の得点率（％）の推移`;
    }

    gradeChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: chartLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Inter", size: 11 }
                    }
                },
                tooltip: {
                    mode: "index",
                    intersect: false,
                    backgroundColor: "#1e293b",
                    titleColor: "#f8fafc",
                    bodyColor: "#94a3b8",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#94a3b8", font: { family: "Inter" } }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: {
                        color: "#94a3b8",
                        font: { family: "Inter" },
                        stepSize: 20,
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}

// ==========================================================================
// AI ENGINE - HARDNESS-AWARE ADVICE GENERATOR (UPDATED SIMULATION)
// ==========================================================================
function generateAIAdvice() {
    if (state.grades.length === 0) return null;

    // Filter selector configuration inside dashboard used as scope
    const filterSelect = document.getElementById("dashboard-filter");
    const filterVal = filterSelect ? filterSelect.value : "all";

    let scopeGrades = state.grades;
    if (filterVal !== "all") {
        if (filterVal === "定期テスト") scopeGrades = state.grades.filter(g => g.type === "定期テスト");
        else if (filterVal === "外部模試-すべて") scopeGrades = state.grades.filter(g => g.type !== "定期テスト" && g.type !== "小テスト/その他");
        else scopeGrades = state.grades.filter(g => g.type === filterVal);
    }

    if (scopeGrades.length === 0) return null;

    // Get the latest grade from scope
    const latestGrade = [...scopeGrades].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const grade = state.settings.grade || "設定なしの高校生";
    
    // Sort subjects by rate (score / max) in the latest exam
    let rates = [];
    const subjects = { english: "英語", math: "数学", japanese: "国語", science: "理科", social: "社会" };

    Object.keys(latestGrade.scores).forEach(sub => {
        const val = latestGrade.scores[sub];
        const max = latestGrade.maxScores[sub] || 100;
        if (val !== null && val !== "") {
            rates.push({ key: sub, name: subjects[sub], score: val, max: max, rate: Math.round((val / max) * 100) });
        }
    });

    if (rates.length === 0) return null;

    rates.sort((a, b) => b.rate - a.rate);
    const strongest = rates[0];
    const weakest = rates[rates.length - 1];

    let advice = {
        summary: "",
        strengths: "",
        weaknesses: "",
        studyMethods: "",
        problem: ""
    };

    const isExamYear = grade.includes("3年") || grade.includes("受験");
    
    // --- 1. Hardness awareness database ---
    let examHardnessText = "";
    let mathToughNess = false; // special flag if math is hard

    if (latestGrade.type === "駿台模試") {
        examHardnessText = "駿台模試は全国トップクラスに難易度が高く、偏差値算出もシビアです。そのため、単純な素点ではなく全体平均の低さを考慮する必要があります。";
        mathToughNess = true;
    } else if (latestGrade.type === "河合全統模試") {
        examHardnessText = "河合全統模試は全国最大の母集団を持つ、標準〜応用力の測定に適したバランスの良い模試です。";
    } else if (latestGrade.type === "進研模試") {
        examHardnessText = "進研模試は教科書レベルの基礎〜標準的な問題を中心に構成され、基礎に抜け漏れがないかを測るのに最適です。";
    } else if (latestGrade.type === "定期テスト") {
        examHardnessText = "学校の定期テストは出題範囲が決まった、努力量が直接スコアに反映される基礎試験です。";
    } else {
        examHardnessText = "模試の標準的なデータをもとに、得点率からアプローチを解析しました。";
    }

    // --- 2. Strengths text ---
    advice.strengths = `「${latestGrade.name}(${latestGrade.type})」において、${strongest.name}が得点率 ${strongest.rate}% (${strongest.score}/${strongest.max}) でトップでした！`;
    if (strongest.rate >= 80) {
        advice.strengths += ` ${examHardnessText}特にこの難易度のテストで8割を超えているのは、${strongest.name}の基本論理が脳内に強固に定着している証拠。志望校合格に向けた大きなアドバンテージです。`;
    } else {
        advice.strengths += ` ${strongest.name}は比較的安定した理解ができています。大崩れしないよう今の学習ペースを維持し、さらに標準問題の正答率を高めましょう。`;
    }

    // --- 3. Weaknesses & Difficulty calibration ---
    advice.weaknesses = `今回の強化ポイントは ${weakest.name} で、得点率は ${weakest.rate}% (${weakest.score}/${weakest.max}) でした。`;
    
    if (latestGrade.type === "駿台模試") {
        if (weakest.rate < 40) {
            advice.weaknesses += ` 駿台模試でのこの得点率は、問題の難しさによるショックがあるかもしれませんが焦る必要はありません。今は難問に惑わされず、まずは大問の(1)(2)などの小問を確実に拾えるよう、基礎典型パターンのインプットを見直しましょう。`;
        } else if (weakest.rate < 60) {
            advice.weaknesses += ` 非常に難解な問題に対し健闘しています。平均点が低い中、半分近く取れているのは土台がある証拠。次は、解説冊子の別解なども熟読し、大問後半の記述で部分点を取りきるテクニックを学びましょう。`;
        } else {
            advice.weaknesses += ` 難関模試において高いパフォーマンスを維持しています。些細な計算ミスや記述の不備での減点がないか、自己分析を徹底しましょう。`;
        }
    } else if (latestGrade.type === "進研模試" || latestGrade.type === "定期テスト") {
        if (weakest.rate < 50) {
            advice.weaknesses += ` ${latestGrade.type}の難易度設定において、得点率5割未満は「教科書の基礎知識」にまだ大きな理解の穴（抜け落ち）があるという警告サインです。まずは学校の授業ノートや教科書の基本例題に戻る必要があります。`;
        } else if (weakest.rate < 70) {
            advice.weaknesses += ` 基本問題は解けていますが、標準・代表的な応用ワーク（学校の傍用問題集など）の反復回数が不足している様子です。テスト範囲のワークをもう1周繰り返しましょう。`;
        } else {
            advice.weaknesses += ` 土台はあります。細かな失点やスペルミス、時間配分などをもう一度見直すだけで、8割〜9割へ到達可能です。`;
        }
    } else {
        // Average school/other cases
        if (weakest.rate < 50) {
            advice.weaknesses += ` 基礎レベルの見直しが最優先です。問題集を解く前に、用語集や公式の導出など、「前提となる知識」を再確認する日を設定してください。`;
        } else {
            advice.weaknesses += ` 応用問題での失点が目立ちます。自分がどのステップで間違えたのか（計算ミスか、方針の間違いか）を必ず分析ファイルに記録しましょう。`;
        }
    }

    // --- 4. Study methods based on dynamic difficulty ---
    if (weakest.key === "math") {
        advice.studyMethods = `【${latestGrade.type}】の数学対策として、「自力で最初から解答を記述する」練習を取り入れましょう。`;
        if (latestGrade.type === "駿台模試" || latestGrade.type === "河合全統模試") {
            advice.studyMethods += ` 特に難度の高い模試では、問題を解いた後の『解法パターンの抽象化（なぜこの公式がここで使われたのか？）』が欠かせません。ノートの端に『解法のポイント』を自分の言葉で1行で書く習慣をつけてください。`;
            advice.problem = `【数学 - 弱点対策オリジナル精選（模試レベル）】\n「放物線 y = x^2 - 2x と直線 y = mx が異なる2点 A, B で交わり、線分 AB の中点 P の軌跡を求めよ。また、m が変化するときの軌跡の範囲を示せ。」\n👉 解説のコツ: mを媒介変数とし、中点の座標(X, Y)をmで表します。交点が存在する条件からmの範囲（判別式D>0）を求め、これをXの範囲に変換する点に注意！`;
        } else {
            advice.studyMethods += ` 学校の傍用問題集（4ステップやサクシードなど）のA問題・B問題を全て「何も見ずに解ける」まで反復します。焦らず、基本の記述ルールを網羅しましょう。`;
            advice.problem = `【数学 - 弱点対策オリジナル精選（基礎）】\n「2次関数 y = x^2 - 2ax + a^2 - 2a (0 ≦ x ≦ 2) の最小値を、定数 a の範囲で場合分けして求めよ。」\n👉 解説のコツ: 軸の位置 x = a が 定義域 [0, 2] の「左側 (a < 0)」「内部 (0 ≦ a ≦ 2)」「右側 (a > 2)」で場合分けを行います。グラフを描いて視覚的に納得しましょう。`;
        }
    } else if (weakest.key === "english") {
        advice.studyMethods = `【${latestGrade.type}】の英語対策として、まずは「単語と文法」の精度確認です。`;
        if (latestGrade.type === "駿台模試" || latestGrade.type === "河合全統模試") {
            advice.studyMethods += ` 難関大向け記述や長文読解では、単語の意味の「1対1」の暗記を超え、「文脈に合わせた日本語の補正」や「英文解釈（句と節の括り出し）」が必要です。1日1文、構造分解（S/V/O/C）を徹底して訳す練習をしましょう。`;
            advice.problem = `【英語 - 弱点対策オリジナル精選（難関レベル）】\n次の（ ）に入れる最も適切な語句を選びなさい。\n"The professor requested that all students ( ) their essays by next Friday."\n1) will submit  2) submit  3) submitted  4) submitting\n👉 解説のコツ: 動詞 request（要求）の後に続く that 節内では、仮定法現在（shouldの省略）となり、主語に関わらず動詞の原形が使われます。`;
        } else {
            advice.studyMethods += ` 共通テストや進研模試対策として、毎日音読・単語学習をルーティン化しましょう。特に1文ごとの精読ルールをしっかり身につけることが結果に繋がります。`;
            advice.problem = `【英語 - 弱点対策オリジナル精選（標準）】\n次の英文を和訳しなさい。\n"It is vital for high school students to acquire good study habits while they are young."\n👉 解説のコツ: It is vital for A to do... 「Aが〜することは極めて重要だ」の構文を落ち着いて訳しましょう。vitalは「不可欠な、極めて重要」という意味です。`;
        }
    } else if (weakest.key === "japanese") {
        advice.studyMethods = `国語の得点力向上には、文章の構造を客観的に捉える必要があります。現代文は接続詞に注目し、古文は「主語の省略の特定」を徹底しましょう。`;
        advice.problem = `【古文 - 弱点対策オリジナル精選】\n次の文中の助動詞「む」の意味を説明しなさい。\n「いざ、天の原ふりさけ見て、月をおぼし出でむ。」\n👉 解説のコツ: 主語が話し手自身（一人称）の場合、助動詞「む」は「意志（〜しよう）」の意味になります。`;
    } else {
        advice.studyMethods = `${subjects[weakest.key]}はインプットとアウトプットのバランスが大切です。間違えた部分を教科書で確認し、その周辺知識も一緒に再暗記しましょう。`;
        advice.problem = `【理科/社会 - 弱点対策オリジナル精選】\n「この教科の重要用語について、名前だけでなく『なぜその現象が起こるのか』原因やメカニズムを自分の言葉で説明してみましょう。」\n👉 解説のコツ: 理屈（仕組み）を人に説明するように口頭で話すだけでも、暗記の深度が劇的に深まります！`;
    }

    // --- 5. Dashboard summary ---
    const filterText = filterVal === "all" ? "" : `（集計：${filterSelect.options[filterSelect.selectedIndex].text}）`;
    advice.summary = `最新の「${latestGrade.name}(${latestGrade.type})」を基準に分析しました${filterText}。現在の${state.settings.name}さんの得意教科は【${strongest.name}】、最も対策が必要な教科は【${weakest.name}】です。学年（${grade}）や模試の難易度（${latestGrade.type}）を解析した結果、${weakest.name}の点数をここから伸ばすことが全体の底上げに最も効果的です。アドバイスと問題をチェックしてみましょう！`;

    return advice;
}

// Update the AI tutor tab display (Centralized Chat focus)
function updateAIAnalysis() {
    const dashboardAdvice = document.getElementById("dashboard-ai-advice");
    const aiStrengths = document.getElementById("ai-strengths");
    const aiWeaknesses = document.getElementById("ai-weaknesses");
    const aiStudyMethods = document.getElementById("ai-study-methods");
    const aiProblems = document.getElementById("ai-recommended-problems");

    const advice = generateAIAdvice();

    if (!advice) {
        if (dashboardAdvice) {
            dashboardAdvice.innerHTML = `成績データが入力されると、あなたの学年（<strong>${state.settings.grade || "未設定"}</strong>）に合わせた強み・弱みの分析と、今週取り組むべきアドバイスが表示されます。まずは「成績を入力する」タブから点数を登録しましょう！`;
        }
        if (aiStrengths) aiStrengths.textContent = "成績データがありません。まずは成績を入力してください。";
        if (aiWeaknesses) aiWeaknesses.textContent = "成績データがありません。まずは成績を入力してください。";
        if (aiStudyMethods) aiStudyMethods.textContent = "成績データがありません。まずは成績を入力してください。";
        if (aiProblems) aiProblems.innerHTML = '<p class="analysis-text">成績データがありません。まずは成績を入力してください。</p>';
        return;
    }

    // Update fields
    if (dashboardAdvice) dashboardAdvice.textContent = advice.summary;
    if (aiStrengths) aiStrengths.textContent = advice.strengths;
    if (aiWeaknesses) aiWeaknesses.textContent = advice.weaknesses;
    if (aiStudyMethods) aiStudyMethods.textContent = advice.studyMethods;
    
    if (aiProblems) {
        aiProblems.innerHTML = `
            <pre class="analysis-text" style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; background: none; border: none; padding: 0; margin: 0;">${escapeHTML(advice.problem)}</pre>
        `;
    }
}

// ==========================================================================
// HISTORY / TIMELINE GENERATION
// ==========================================================================
function updateHistoryTimeline() {
    const timeline = document.getElementById("history-timeline");
    const noHistory = document.getElementById("no-history-placeholder");

    if (!timeline) return;
    timeline.innerHTML = "";

    if (state.grades.length === 0) {
        noHistory.style.display = "flex";
        return;
    } else {
        noHistory.style.display = "none";
    }

    // Sort by date (newest first for timeline)
    const sortedGrades = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedGrades.forEach(grade => {
        const item = document.createElement("div");
        item.className = "timeline-item";

        // Calculate rates per subject to identify strengths/weaknesses
        let subjectRates = [];
        const subjects = { english: "英語", math: "数学", japanese: "国語", science: "理科", social: "社会" };
        
        Object.keys(grade.scores).forEach(sub => {
            const val = grade.scores[sub];
            const max = grade.maxScores[sub] || 100;
            if (val !== null && val !== "") {
                subjectRates.push({ name: subjects[sub], rate: Math.round((val / max) * 100), score: val, max: max });
            }
        });
        
        subjectRates.sort((a, b) => b.rate - a.rate);

        let badgeHtml = "";
        subjectRates.forEach(s => {
            let className = "score-badge";
            if (subjectRates.length > 1) {
                if (s.name === subjectRates[0].name) className += " strong";
                else if (s.name === subjectRates[subjectRates.length - 1].name) className += " weak";
            }
            badgeHtml += `<span class="${className}">${s.name}: ${s.score}/${s.max} (${s.rate}%)</span> `;
        });

        // Photo inclusion inside history block
        let photoHtml = "";
        if (grade.photo) {
            photoHtml = `
                <div class="timeline-photo-box">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">登録写真（クリックで拡大表示）:</div>
                    <img src="${grade.photo}" class="timeline-photo-thumbnail" alt="${escapeHTML(grade.name)}の用紙" onclick="openImageModal('${grade.photo}', '${escapeHTML(grade.name)}の用紙')">
                </div>
            `;
        }

        // Hardness aware text inside timeline archive
        let archiveText = `この【${grade.type}】での得意教科は【${subjectRates[0]?.name || "-"}】、苦手教科は【${subjectRates[subjectRates.length - 1]?.name || "-"}】でした。`;
        if (grade.type === "駿台模試") {
            archiveText += ` 非常にハイレベルな駿台模試に対し、各設問ごとの部分点獲得を目標に対策アドバイスが作成されました。`;
        } else if (grade.type === "定期テスト") {
            archiveText += ` 学校配布ワークの繰り返し、出題範囲の網羅学習がアドバイスされました。`;
        } else {
            archiveText += ` 得点率の傾向から、基礎概念の補強をアドバイスしました。`;
        }

        item.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h3 class="timeline-title">${escapeHTML(grade.name)} (${grade.type})</h3>
                    <span class="timeline-date">${formatDate(grade.date)} 受験</span>
                </div>
                <div class="timeline-body">
                    <div class="timeline-grades-summary">
                        ${badgeHtml}
                        <span class="score-badge text-gradient" style="font-weight: 700;">総合得点率: ${grade.averageRate}%</span>
                    </div>
                    ${photoHtml}
                    <div class="timeline-ai-text">
                        <div style="font-weight: 600; color: var(--color-secondary); font-size: 0.8rem; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="sparkles" style="width: 12px; height: 12px;"></i>
                            <span>当時のAI家庭教師のアドバイスアーカイブ</span>
                        </div>
                        ${archiveText}
                    </div>
                </div>
            </div>
        `;
        timeline.appendChild(item);
    });

    initLucideIcons();
}

// ==========================================================================
// CHAT PANEL LOGIC (AI TUTOR INTERACTIVE CHAT SIMULATOR)
// ==========================================================================
function handleChatSubmit(e) {
    e.preventDefault();
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    
    if (!chatInput || !chatMessages) return;
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // 1. Append User Message
    appendChatMessage("user", messageText);
    chatInput.value = "";

    // 2. Typing Indicator Simulator
    const typingDiv = document.createElement("div");
    typingDiv.className = "chat-message bot typing";
    typingDiv.innerHTML = `<div class="message-content"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 3. Generate Answer & Respond with delay
    setTimeout(() => {
        typingDiv.remove();
        const botResponse = getSimulatedAIResponse(messageText);
        appendChatMessage("bot", botResponse);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1200);
}

function appendChatMessage(sender, text) {
    const chatMessages = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<div class="message-content">${linkify(escapeHTML(text).replace(/\n/g, "<br>"))}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Simulated AI responses considering difficulty and schedules
function getSimulatedAIResponse(userMessage) {
    const msg = userMessage.toLowerCase();
    const grade = state.settings.grade || "高校生";
    const name = state.settings.name || "ユーザー";
    
    const advice = generateAIAdvice();
    const hasData = state.grades.length > 0;
    
    // Core details of grades
    let strongestName = "未登録", weakestName = "未登録", latestType = "未登録";
    if (hasData && advice) {
        const latestGrade = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        latestType = latestGrade.type;
        
        let subjectRates = [];
        const subjects = { english: "英語", math: "数学", japanese: "国語", science: "理科", social: "社会" };
        Object.keys(latestGrade.scores).forEach(sub => {
            const val = latestGrade.scores[sub];
            const max = latestGrade.maxScores[sub] || 100;
            if (val !== null && val !== "") {
                subjectRates.push({ name: subjects[sub], rate: Math.round((val / max) * 100) });
            }
        });
        subjectRates.sort((a, b) => b.rate - a.rate);
        strongestName = subjectRates[0]?.name || "英語";
        weakestName = subjectRates[subjectRates.length - 1]?.name || "数学";
    }

    // Schedule checking
    const now = new Date().setHours(0, 0, 0, 0);
    const futureTodos = state.todos.filter(todo => new Date(todo.date) >= now);
    let nextTodoText = "";
    if (futureTodos.length > 0) {
        const nextT = futureTodos.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        const days = Math.ceil((new Date(nextT.date) - now) / (1000 * 60 * 60 * 24));
        nextTodoText = `学習計画によれば、あと ${days} 日後に「${nextT.title}」が控えていますね。`;
    }

    // Response selector
    if (msg.includes("予定") || msg.includes("カレンダー") || msg.includes("日程") || msg.includes("いつ")) {
        if (futureTodos.length === 0) {
            return `現在、学習計画に未来の予定やテストが登録されていません。右上の「学習計画カレンダー」を開き、目標とするテスト日程や課題の期日を追加してみてください！AIが自動でリマインダーや対策スケジュールを作成しますよ。`;
        }
        
        let planResponse = `${name}さん、現在の学習計画にある直近の予定です：\n\n`;
        futureTodos.forEach((todo, idx) => {
            const days = Math.ceil((new Date(todo.date) - now) / (1000 * 60 * 60 * 24));
            const dayLabel = days === 0 ? "本日" : `あと ${days} 日`;
            planResponse += `${idx + 1}. 【${escapeHTML(todo.title)}】 - ${formatDate(todo.date)} (${dayLabel})\n`;
        });
        planResponse += `\nこれらの期日に向けて、どのような対策をすべきか、具体的な科目の相談も大歓迎です！`;
        return planResponse;
    }

    if (msg.includes("勉強計画") || msg.includes("スケジュール") || msg.includes("計画")) {
        if (!hasData) {
            return `勉強計画を作るためには、まずあなたの得意・苦手科目を把握する必要があります。点数が低かったテストや直近の模試の点数を「成績を入力する」タブから1つ以上登録してみてくださいね！`;
        }
        
        let headerText = `${name}さん（${grade}）のための特別勉強スケジュールを作成しました！`;
        if (nextTodoText) headerText += `\n（${nextTodoText}これをマイルストーンにしています）`;

        let hardnessNote = "";
        if (latestType === "駿台模試") {
            hardnessNote = `※難度の高い駿台模試対策として、基礎のインプット3割、思考力を必要とする標準的な典型題の解説読み書き7割で配分しましょう。`;
        } else if (latestType === "定期テスト") {
            hardnessNote = `※定期テスト対策ですので、出題範囲の学校ワークを「3周」することを絶対目標にしてください。`;
        }

        return `${headerText}\n\n【平日スケジュール（毎日2〜3時間目安）】\n1. 暗記系ルーティン（英単語・理社の一問一答）：朝 15分\n2. 要強化科目【${weakestName}】の復習と基礎演習：夕方 60分\n3. 得意科目【${strongestName}】の応用題または長文精読：夜 45分\n4. 間違えた問題の解き直し（今日間違えたもの）：寝る前 15分\n\n${hardnessNote}\n\n苦手な【${weakestName}】を伸ばすことが、次のテストの得点率アップに一番の近道です。今日から始めてみませんか？`;
    }

    if (msg.includes("数学") || msg.includes("すうがく")) {
        if (weakestName === "数学" || !hasData) {
            return `数学が少し苦手なようですね！数学の点数を引き上げる最大のコツは「解答を見ずに解く時間を作る」ことです。\n\n1. 問題を解いてみて、5分考えてわからなければ解説を読みます。\n2. 解説を理解したら、本を閉じ、白紙に「最初から最後まで解答を再現できるか」自力で書きます。\n3. 再現できなかったら、もう一度解説に戻ります。\n\nこの「白紙に書く」プロセスを踏むだけで、模試やテストで『解説を読めばわかるのに自力では解けない』という現象が劇的に減りますよ！`;
        } else {
            return `数学は【${strongestName}】に近い強みを持っていますね！素晴らしいセンスです。このまま点数をさらに伸ばすためには、青チャートや重要問題集などの「標準〜応用問題」の網羅率を上げること。そして、別解（異なる解き方）を意識することです。別解を考えることで、視野が広がり、本番での応用力が身につきますよ！`;
        }
    }

    if (msg.includes("英語") || msg.includes("えいご")) {
        if (weakestName === "英語" || !hasData) {
            return `英語の対策ですね！英語を伸ばすためには順序（ピラミッド）があります。\n\n1階：英単語・英文法（ここが最優先！）\n2階：英文解釈（1文を正確に訳す練習）\n3階：長文読解（速読・多読）\n\n長文で点数が取れない人の9割は、1階部分の英単語や文法がグラグラしています。まずは毎日同じ単語帳を繰り返すルーティンを確立しましょう。おすすめは「1日100単語を眺めること（書いて覚えるのではなく、見て意味が出るテンポで周回する）」です！`;
        } else {
            return `英語は得意科目のようですね！素晴らしいです！さらなる高み（共通テスト8〜9割、難関大記述レベル）を目指すなら、英語を英語のまま理解する「音読」を推奨します。一度100%精読して理解した長文のCDや音声を使い、それに合わせてシャドーイング（または音読）を1日15分行いましょう。読解スピードが劇的に上がりますよ！`;
        }
    }

    if (msg.includes("問題") || msg.includes("もんだい") || msg.includes("演習")) {
        if (!hasData) {
            return `問題を出題したいのですが、まだあなたの学年や科目の点数がわからない状態です。「成績を入力する」から最近受けたテストの点数を登録するか、「設定」で学年を登録してくださいね！`;
        }
        return `今のあなたにぴったりの対策問題を選びました！紙とペンを用意して、挑戦してみてください。\n\n${advice.problem}\n\n答えがわかったり、ヒントがさらに欲しくなったら、「数学の問題の答えは？」「ヒントを教えて」とチャットで聞いてくださいね！`;
    }

    if (msg.includes("答え") || msg.includes("こたえ") || msg.includes("解説")) {
        if (msg.includes("数学")) {
            return `【数学問題の解答と解説】\n\n(1) 軸 a の場合分け問題の解答：\n定義域は 0 ≦ x ≦ 2。軸は x = a です。\n・a < 0 のとき：定義域の左外に軸があるため、最小値は端点の f(0) = a^2 - 2a\n・0 ≦ a ≦ 2 のとき：定義域内に軸があるため、最小値は頂点の f(a) = -2a\n・a > 2 のとき：定義域の右外に軸があるため、最小値は端点の f(2) = a^2 - 6a + 4\n\n(2) 軌跡問題（受験生向け）の解答：\n交点A, Bのx座標は方程式 x^2 - (m+2)x = 0 (直線と放物線を連立)の解です。Pのx座標Xは中点なので X = (x_1 + x_2)/2 = (m+2)/2。ここから m = 2X - 2。これを直線の式 Y = mX に代入して Y = (2X - 2)X = 2X^2 - 2X。異なる2点で交わる判別式 D > 0 から得られる m の範囲を x の範囲に直します。\n\n理解できましたか？わからなければ、どの行が気になるか聞いてくださいね！`;
        }
        if (msg.includes("英語")) {
            return `【英語問題の解答と解説】\n\n(1) 4択問題： 正解は「2) submit」です。\n解説： request（要求する）、suggest（提案する）、insist（主張する）などの動詞の後に続く that 節では、動詞は「should + 原形」または「shouldが省略された原形（仮定法現在）」になります。主語が all students ですが、動詞は submit（原形）が正解となります。文法問題で非常によく出るポイントです！\n\n(2) 和訳問題： 正解例「高校生にとって、若いうちに良い勉強習慣を身につけることは極めて重要である。」\n解説： It is vital（不可欠だ・極めて重要だ） for A（高校生にとって） to do...（身につけることは）の骨格を正しく訳せればバッチリです！`;
        }
        return `どの科目の問題の解説が必要ですか？「数学の答え」「英語の答え」などと話しかけてください！`;
    }

    if (!hasData) {
        return `メッセージありがとうございます！成績データがまだ登録されていないため、一般的なアドバイスになりますが、勉強のコツは「毎日決まった時間に勉強をスタートする（環境のルーティン化）」ことです。\n\nまずは直近の学校のテストや模試の点数を1つ登録してみましょう。そうすると、あなたの得意・不得意にあわせたもっと詳しいアドバイスができるようになります！`;
    }

    return `ご質問ありがとうございます！\n現在の成績データによると、${name}さんは【${strongestName}】が最も得意で、【${weakestName}】が伸びしろの大きい（対策すべき）科目です。直近のテスト【${latestType}】の難易度も把握しています。\n\n「${userMessage}」に関してアドバイスすると、今の学年（${grade}）であれば、まずは${weakestName}の基礎固めをしっかりと行う時間を作りつつ、自信のある${strongestName}で確実に高得点をキープする勉強が効果的です。${nextTodoText ? `直近の予定もありますので、まずはそこにターゲットを合わせましょう。` : ""}\n\n具体的にどのような勉強法や問題について知りたいですか？「数学の勉強法」や「英語の問題を出して」などのように聞いていただければ、詳しくお答えしますよ！`;
}

// ==========================================================================
// EVENT LISTENERS & INITIAL SETUP
// ==========================================================================
function initEventListeners() {
    // Grade Form Submit
    const gradeForm = document.getElementById("grade-form");
    if (gradeForm) {
        gradeForm.addEventListener("submit", handleGradeSubmit);
    }

    // Cancel Edit Button
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", cancelEditMode);
    }

    // Dashboard Filter Change
    const filterSelect = document.getElementById("dashboard-filter");
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            updateStatsAndChart();
            updateAIAnalysis();
        });
    }

    // Settings Form Submit
    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) {
        settingsForm.addEventListener("submit", handleSettingsSubmit);
    }

    // Chat Form Submit
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", handleChatSubmit);
    }

    // Clear All Data
    const clearBtn = document.getElementById("clear-all-data-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearAllData);
    }

    // AI Reminder Banner close button
    const closeReminderBtn = document.getElementById("ai-reminder-close-btn");
    if (closeReminderBtn) {
        closeReminderBtn.addEventListener("click", () => {
            document.getElementById("ai-reminder-banner").style.display = "none";
        });
    }
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

// Date Formatter: YYYY/MM/DD
function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
}

// Date Formatter: MM/DD
function formatDateShort(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
}

// Escape HTML utility to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Create URLs clickable inside text
function linkify(inputText) {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank" style="text-decoration: underline; color: var(--color-primary);">$1</a>');

    //URLs starting with "www." (without // before it)
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank" style="text-decoration: underline; color: var(--color-primary);">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1" style="text-decoration: underline; color: var(--color-primary);">$1</a>');

    return replacedText;
}

// Custom simple notification banner
function showNotification(message) {
    let toast = document.querySelector(".toast-notification");
    if (toast) {
        toast.remove();
    }

    toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.backgroundColor = "#1e293b";
    toast.style.border = "1px solid rgba(168, 85, 247, 0.4)";
    toast.style.borderRadius = "8px";
    toast.style.padding = "16px 24px";
    toast.style.color = "#f8fafc";
    toast.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 0 10px rgba(168, 85, 247, 0.2)";
    toast.style.zIndex = "9999";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.animation = "fadeInUp 0.3s ease forwards";

    toast.innerHTML = `
        <i data-lucide="check-circle" style="color: var(--color-success); width: 20px; height: 20px;"></i>
        <span style="font-weight: 500; font-size: 0.95rem;">${escapeHTML(message)}</span>
    `;

    document.body.appendChild(toast);
    initLucideIcons();

    // Keyframe definition injected if not present
    if (!document.getElementById("toast-styles")) {
        const style = document.createElement("style");
        style.id = "toast-styles";
        style.innerHTML = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOutDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(20px); }
            }
            .chat-message.bot.typing .typing-dots span {
                animation: blink 1.4s infinite both;
                font-size: 1.5rem;
                display: inline-block;
                line-height: 0.5;
            }
            .chat-message.bot.typing .typing-dots span:nth-child(2) { animation-delay: .2s; }
            .chat-message.bot.typing .typing-dots span:nth-child(3) { animation-delay: .4s; }
            @keyframes blink {
                0% { opacity: .2; }
                20% { opacity: 1; }
                100% { opacity: .2; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = "fadeOutDown 0.3s ease forwards";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Clear all data (reset app)
function clearAllData() {
    if (confirm("【警告】すべての成績データ、カレンダーの予定、プロフィール設定を完全に削除します。よろしいですか？")) {
        localStorage.clear();
        state = {
            settings: { name: "ゲストユーザー", grade: "", target: "" },
            grades: [],
            todos: []
        };
        saveSettings();
        saveGrades();
        saveTodos();
        location.reload();
    }
}
