// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let database;
let firebaseApp;

// كلمة مرور الإدارة (يمكن تغييرها)
const ADMIN_PASSWORD = 'admin123'; // قم بتغيير هذه الكلمة

// البيانات الافتراضية
const defaultQuestions = [
    {
        question: "ما هي عاصمة مصر؟",
        answers: ["القاهرة", "الإسكندرية", "الجيزة", "أسوان"],
        correctAnswer: 0
    },
    {
        question: "كم عدد قارات العالم؟",
        answers: ["5", "6", "7", "8"],
        correctAnswer: 2
    },
    {
        question: "ما هو أكبر محيط في العالم؟",
        answers: ["المحيط الأطلسي", "المحيط الهادئ", "المحيط الهندي", "المحيط المتجمد الشمالي"],
        correctAnswer: 1
    },
    {
        question: "في أي عام تم إنشاء الإنترنت؟",
        answers: ["1960", "1970", "1980", "1990"],
        correctAnswer: 1
    },
    {
        question: "ما هو أطول نهر في العالم؟",
        answers: ["نهر النيل", "نهر الأمازون", "نهر المسيسيبي", "نهر اليانغتسي"],
        correctAnswer: 0
    }
];

// تهيئة Firebase
async function initFirebase() {
    try {
        // استيراد إعدادات Firebase
        const firebaseConfigModule = await import('./firebase-config.js');
        if (firebaseConfigModule.firebaseConfig && firebaseConfigModule.firebaseConfig.apiKey) {
            firebaseApp = initializeApp(firebaseConfigModule.firebaseConfig);
            database = getDatabase(firebaseApp);
            console.log('Firebase تم تهيئته بنجاح في صفحة الإدارة');
        } else {
            console.log('Firebase غير مهيأ - يرجى إضافة إعدادات Firebase في firebase-config.js');
        }
    } catch (error) {
        console.error('خطأ في تهيئة Firebase:', error);
    }
}

// تحميل الأسئلة من Firebase أو localStorage
async function loadQuestions() {
    try {
        if (database) {
            const questionsRef = ref(database, 'questions');
            const snapshot = await get(questionsRef);
            if (snapshot.exists()) {
                return snapshot.val();
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل الأسئلة من Firebase:', error);
    }
    
    const saved = localStorage.getItem('quizQuestions');
    return saved ? JSON.parse(saved) : defaultQuestions;
}

// حفظ الأسئلة في Firebase و localStorage
async function saveQuestions(questions) {
    localStorage.setItem('quizQuestions', JSON.stringify(questions));
    try {
        if (database) {
            await set(ref(database, 'questions'), questions);
        }
    } catch (error) {
        console.error('خطأ في حفظ الأسئلة في Firebase:', error);
    }
}

// التحقق من كلمة المرور
function checkPassword(password) {
    return password === ADMIN_PASSWORD;
}

// عناصر DOM
const loginPage = document.getElementById('loginPage');
const adminPage = document.getElementById('adminPage');
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const loginMessage = document.getElementById('loginMessage');
const questionsContainer = document.getElementById('questionsContainer');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveMessage = document.getElementById('saveMessage');

// المتغيرات
let questions = [];
let isAuthenticated = false;

// التحقق من الجلسة
function checkSession() {
    const session = sessionStorage.getItem('adminSession');
    if (session === 'authenticated') {
        isAuthenticated = true;
        showAdminPage();
    } else {
        showLoginPage();
    }
}

// عرض صفحة تسجيل الدخول
function showLoginPage() {
    loginPage.classList.add('active');
    adminPage.classList.remove('active');
    isAuthenticated = false;
}

// عرض صفحة الإدارة
function showAdminPage() {
    loginPage.classList.remove('active');
    adminPage.classList.add('active');
    isAuthenticated = true;
    loadAndRenderQuestions();
    loadLeaderboardAdmin();
}

// معالج تسجيل الدخول
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = adminPasswordInput.value;
    
    if (checkPassword(password)) {
        sessionStorage.setItem('adminSession', 'authenticated');
        showAdminPage();
        adminPasswordInput.value = '';
        showLoginMessage('تم تسجيل الدخول بنجاح', 'success');
    } else {
        showLoginMessage('كلمة المرور غير صحيحة', 'error');
        adminPasswordInput.value = '';
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('adminSession');
    showLoginPage();
    showLoginMessage('تم تسجيل الخروج', 'success');
});

// عرض رسالة تسجيل الدخول
function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    setTimeout(() => {
        loginMessage.className = 'message';
    }, 3000);
}

// تحميل وعرض الأسئلة
async function loadAndRenderQuestions() {
    questions = await loadQuestions();
    renderQuestions();
}

// عرض الأسئلة
function renderQuestions() {
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = '';
    
    questions.forEach((question, qIndex) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <h3>السؤال ${qIndex + 1}</h3>
            <input type="text" class="question-input" value="${question.question}" 
                   placeholder="اكتب السؤال هنا" data-question-index="${qIndex}">
            <div class="answers-list" data-question-index="${qIndex}"></div>
            <button class="add-answer-btn" data-question-index="${qIndex}">إضافة إجابة</button>
            <button class="delete-question-btn" data-question-index="${qIndex}">حذف السؤال</button>
        `;
        questionsContainer.appendChild(questionItem);
        
        // عرض الإجابات
        const answersList = questionItem.querySelector('.answers-list');
        question.answers.forEach((answer, aIndex) => {
            answersList.appendChild(createAnswerInput(qIndex, aIndex, answer, aIndex === question.correctAnswer));
        });
    });
    
    // إضافة معالجات الأحداث
    attachEventListeners();
}

// إنشاء حقل إدخال إجابة
function createAnswerInput(qIndex, aIndex, answer, isCorrect) {
    const answerItem = document.createElement('div');
    answerItem.className = 'answer-item';
    answerItem.innerHTML = `
        <input type="radio" name="correct-${qIndex}" class="answer-radio" 
               ${isCorrect ? 'checked' : ''} data-question-index="${qIndex}" data-answer-index="${aIndex}">
        <input type="text" class="answer-input" value="${answer}" 
               placeholder="اكتب الإجابة هنا" data-question-index="${qIndex}" data-answer-index="${aIndex}">
        <button class="delete-answer-btn" data-question-index="${qIndex}" data-answer-index="${aIndex}">حذف</button>
    `;
    return answerItem;
}

// إضافة معالجات الأحداث
function attachEventListeners() {
    // تحديث نص السؤال
    document.querySelectorAll('.question-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const qIndex = parseInt(e.target.dataset.questionIndex);
            questions[qIndex].question = e.target.value;
        });
    });

    // تحديث نص الإجابة
    document.querySelectorAll('.answer-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const qIndex = parseInt(e.target.dataset.questionIndex);
            const aIndex = parseInt(e.target.dataset.answerIndex);
            questions[qIndex].answers[aIndex] = e.target.value;
        });
    });

    // تغيير الإجابة الصحيحة
    document.querySelectorAll('.answer-radio').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                const qIndex = parseInt(e.target.dataset.questionIndex);
                const aIndex = parseInt(e.target.dataset.answerIndex);
                questions[qIndex].correctAnswer = aIndex;
            }
        });
    });

    // حذف إجابة
    document.querySelectorAll('.delete-answer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.questionIndex);
            const aIndex = parseInt(e.target.dataset.answerIndex);
            
            if (questions[qIndex].answers.length > 1) {
                questions[qIndex].answers.splice(aIndex, 1);
                
                // تحديث الفهرس للإجابة الصحيحة
                if (questions[qIndex].correctAnswer >= aIndex) {
                    questions[qIndex].correctAnswer = Math.max(0, questions[qIndex].correctAnswer - 1);
                }
                
                renderQuestions();
            } else {
                showMessage('يجب أن يكون لكل سؤال إجابة واحدة على الأقل', 'error');
            }
        });
    });

    // إضافة إجابة جديدة
    document.querySelectorAll('.add-answer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.questionIndex);
            questions[qIndex].answers.push('إجابة جديدة');
            renderQuestions();
        });
    });

    // حذف سؤال
    document.querySelectorAll('.delete-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.questionIndex);
            
            if (questions.length > 1) {
                questions.splice(qIndex, 1);
                renderQuestions();
            } else {
                showMessage('يجب أن يكون هناك سؤال واحد على الأقل', 'error');
            }
        });
    });
}

// إضافة سؤال جديد
if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', () => {
        questions.push({
            question: 'سؤال جديد',
            answers: ['إجابة 1', 'إجابة 2', 'إجابة 3', 'إجابة 4'],
            correctAnswer: 0
        });
        renderQuestions();
    });
}

// حفظ التغييرات
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        // التحقق من صحة البيانات
        let isValid = true;
        let errorMessage = '';

        questions.forEach((q, qIndex) => {
            if (!q.question.trim()) {
                isValid = false;
                errorMessage = `السؤال ${qIndex + 1} فارغ`;
                return;
            }
            if (q.answers.length < 2) {
                isValid = false;
                errorMessage = `السؤال ${qIndex + 1} يجب أن يحتوي على إجابتين على الأقل`;
                return;
            }
            q.answers.forEach((a, aIndex) => {
                if (!a.trim()) {
                    isValid = false;
                    errorMessage = `السؤال ${qIndex + 1} يحتوي على إجابة فارغة`;
                    return;
                }
            });
            if (q.correctAnswer < 0 || q.correctAnswer >= q.answers.length) {
                isValid = false;
                errorMessage = `السؤال ${qIndex + 1} لا يحتوي على إجابة صحيحة محددة`;
                return;
            }
        });

        if (!isValid) {
            showMessage(errorMessage, 'error');
            return;
        }

        // حفظ البيانات
        await saveQuestions(questions);
        showMessage('تم حفظ التغييرات ونشرها بنجاح!', 'success');
    });
}

// إعادة تعيين للقيم الافتراضية
if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من إعادة تعيين جميع الأسئلة للقيم الافتراضية؟')) {
            questions = JSON.parse(JSON.stringify(defaultQuestions));
            await saveQuestions(questions);
            renderQuestions();
            showMessage('تم إعادة التعيين بنجاح!', 'success');
        }
    });
}

// عرض رسالة
function showMessage(message, type) {
    if (!saveMessage) return;
    saveMessage.textContent = message;
    saveMessage.className = `message ${type}`;
    setTimeout(() => {
        saveMessage.className = 'message';
    }, 3000);
}

// تحميل وعرض قائمة المراكز للإدارة
async function loadLeaderboardAdmin() {
    if (!database) return;
    
    try {
        const leaderboardRef = ref(database, 'leaderboard');
        const snapshot = await get(leaderboardRef);
        const container = document.getElementById('leaderboardAdminContainer');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="no-leaders-admin">لا يوجد متسابقين في قائمة المراكز</p>';
            return;
        }
        
        const leaders = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            leaders.push({
                id: childSnapshot.key,
                name: data.name || childSnapshot.key,
                points: data.points || 0,
                date: data.date || 'تاريخ غير محدد'
            });
        });
        
        // ترتيب حسب النقاط (الأعلى أولاً)
        leaders.sort((a, b) => b.points - a.points);
        
        if (leaders.length === 0) {
            container.innerHTML = '<p class="no-leaders-admin">لا يوجد متسابقين في قائمة المراكز</p>';
            return;
        }
        
        leaders.forEach((leader) => {
            const leaderItem = document.createElement('div');
            leaderItem.className = 'admin-leader-item';
            leaderItem.innerHTML = `
                <div class="admin-leader-info">
                    <div class="admin-leader-name">${leader.name}</div>
                    <div class="admin-leader-points">${leader.points} نقطة</div>
                    <div class="admin-leader-date">${leader.date}</div>
                </div>
                <div class="admin-leader-actions">
                    <button class="remove-leader-btn" data-leader-id="${leader.id}">حذف من المراكز</button>
                </div>
            `;
            container.appendChild(leaderItem);
        });
        
        // إضافة معالجات الأحداث للأزرار
        document.querySelectorAll('.remove-leader-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const leaderId = e.target.dataset.leaderId;
                const leader = leaders.find(l => l.id === leaderId);
                if (confirm(`هل أنت متأكد من حذف ${leader?.name} من قائمة المراكز؟`)) {
                    await removeFromLeaderboard(leaderId);
                }
            });
        });
    } catch (error) {
        console.error('خطأ في تحميل قائمة المراكز:', error);
    }
}

// حذف من قائمة المراكز
async function removeFromLeaderboard(leaderId) {
    if (!database) return;
    
    try {
        const leaderRef = ref(database, `leaderboard/${leaderId}`);
        await set(leaderRef, null);
        showMessage('تم حذف المتسابق من قائمة المراكز بنجاح', 'success');
        loadLeaderboardAdmin();
    } catch (error) {
        console.error('خطأ في حذف المتسابق:', error);
        showMessage('حدث خطأ أثناء حذف المتسابق', 'error');
    }
}

// تحميل الصفحة
window.addEventListener('load', async () => {
    await initFirebase();
    checkSession();
});
