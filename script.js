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

// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, push, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let database;
let firebaseApp;

// تهيئة Firebase
async function initFirebase() {
    try {
        // استيراد إعدادات Firebase
        const firebaseConfigModule = await import('./firebase-config.js');
        if (firebaseConfigModule.firebaseConfig && firebaseConfigModule.firebaseConfig.apiKey) {
            firebaseApp = initializeApp(firebaseConfigModule.firebaseConfig);
            database = getDatabase(firebaseApp);
            loadLeaderboard();
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

// حفظ نتيجة المستخدم في Firebase
async function saveUserResult(userName, score, totalQuestions) {
    if (!database) return;
    
    try {
        const userResult = {
            name: userName,
            score: score,
            totalQuestions: totalQuestions,
            percentage: Math.round((score / totalQuestions) * 100),
            timestamp: Date.now(),
            date: new Date().toLocaleString('ar-EG')
        };
        
        // حفظ في قاعدة بيانات المستخدمين
        const usersRef = ref(database, 'users');
        const newUserRef = push(usersRef);
        await set(newUserRef, userResult);
        
        // حفظ في قائمة المراكز (فقط للمجيبين بشكل صحيح)
        if (score === totalQuestions) {
            const leaderboardRef = ref(database, 'leaderboard');
            const newLeaderRef = push(leaderboardRef);
            await set(newLeaderRef, {
                name: userName,
                timestamp: Date.now(),
                date: new Date().toLocaleString('ar-EG')
            });
        }
        
        // تحديث قائمة المراكز
        loadLeaderboard();
    } catch (error) {
        console.error('خطأ في حفظ النتيجة:', error);
    }
}

// تحميل قائمة المراكز
function loadLeaderboard() {
    if (!database) return;
    
    const leaderboardRef = ref(database, 'leaderboard');
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;
        
        leaderboardList.innerHTML = '';
        
        if (!snapshot.exists()) {
            leaderboardList.innerHTML = '<p class="no-leaders">لا يوجد متسابقين في قائمة المراكز بعد</p>';
            return;
        }
        
        const leaders = [];
        snapshot.forEach((childSnapshot) => {
            leaders.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // ترتيب حسب التاريخ (الأحدث أولاً)
        leaders.sort((a, b) => b.timestamp - a.timestamp);
        
        // عرض أول 10 فقط
        const topLeaders = leaders.slice(0, 10);
        
        if (topLeaders.length === 0) {
            leaderboardList.innerHTML = '<p class="no-leaders">لا يوجد متسابقين في قائمة المراكز بعد</p>';
            return;
        }
        
        topLeaders.forEach((leader, index) => {
            const leaderItem = document.createElement('div');
            leaderItem.className = 'leader-item';
            leaderItem.innerHTML = `
                <div class="leader-rank">${index + 1}</div>
                <div class="leader-name">${leader.name}</div>
                <div class="leader-date">${leader.date || 'تاريخ غير محدد'}</div>
            `;
            leaderboardList.appendChild(leaderItem);
        });
    }, (error) => {
        console.error('خطأ في تحميل قائمة المراكز:', error);
    });
}

// وظائف فتح/إغلاق Sidebar
function openLeaderboard() {
    const sidebar = document.getElementById('leaderboardSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // منع التمرير عند فتح Sidebar
    }
}

function closeLeaderboard() {
    const sidebar = document.getElementById('leaderboardSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // إعادة التمرير
    }
}

// المتغيرات العامة
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let userName = '';

// عناصر DOM
const namePage = document.getElementById('namePage');
const quizPage = document.getElementById('quizPage');
const resultsPage = document.getElementById('resultsPage');
const nameForm = document.getElementById('nameForm');
const userNameInput = document.getElementById('userName');
const displayName = document.getElementById('displayName');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressFill = document.getElementById('progressFill');
const currentQuestionSpan = document.getElementById('currentQuestion');
const totalQuestionsSpan = document.getElementById('totalQuestions');
const restartBtn = document.getElementById('restartBtn');

// معالجات أحداث Sidebar
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('leaderboardToggle');
    const closeBtn = document.getElementById('closeLeaderboard');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', openLeaderboard);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLeaderboard);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeLeaderboard);
    }
});

// تحميل الأسئلة عند تحميل الصفحة
window.addEventListener('load', async () => {
    initFirebase();
    questions = await loadQuestions();
});

// معالج نموذج الاسم
nameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    userName = userNameInput.value.trim();
    if (userName) {
        displayName.textContent = userName;
        questions = await loadQuestions();
        startQuiz();
    }
});

// بدء المسابقة
function startQuiz() {
    currentQuestionIndex = 0;
    userAnswers = [];
    showPage('quizPage');
    loadQuestion();
}

// تحميل السؤال الحالي
function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestionIndex];
    questionText.textContent = question.question;
    answersContainer.innerHTML = '';

    question.answers.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-option';
        answerDiv.textContent = answer;
        answerDiv.addEventListener('click', () => selectAnswer(index));
        answersContainer.appendChild(answerDiv);
    });

    // تحديث شريط التقدم
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressFill.style.width = progress + '%';
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
    totalQuestionsSpan.textContent = questions.length;

    // إخفاء الأزرار
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';
}

// اختيار إجابة
function selectAnswer(index) {
    // إزالة التحديد السابق
    document.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // تحديد الإجابة المختارة
    document.querySelectorAll('.answer-option')[index].classList.add('selected');
    userAnswers[currentQuestionIndex] = index;

    // إظهار زر التالي أو الإرسال
    if (currentQuestionIndex < questions.length - 1) {
        nextBtn.style.display = 'block';
    } else {
        submitBtn.style.display = 'block';
    }
}

// الانتقال للسؤال التالي
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    loadQuestion();
});

// إرسال الإجابات
submitBtn.addEventListener('click', () => {
    showResults();
});

// عرض النتائج
async function showResults() {
    showPage('resultsPage');
    
    let correctAnswers = 0;
    const resultsDetails = document.getElementById('resultsDetails');
    resultsDetails.innerHTML = '';

    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correctAnswer;
        
        if (isCorrect) correctAnswers++;

        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
        resultItem.innerHTML = `
            <div class="result-question">${index + 1}. ${question.question}</div>
            <div class="result-answer">
                <strong>إجابتك:</strong> ${question.answers[userAnswer] || 'لم تجب'}
                ${isCorrect ? ' ✓ صحيح' : ` ✗ خطأ (الإجابة الصحيحة: ${question.answers[question.correctAnswer]})`}
            </div>
        `;
        resultsDetails.appendChild(resultItem);
    });

    // عرض النتيجة
    const scorePercentage = Math.round((correctAnswers / questions.length) * 100);
    document.getElementById('scorePercentage').textContent = scorePercentage;
    document.getElementById('scoreNumber').textContent = correctAnswers;
    document.getElementById('maxScore').textContent = questions.length;

    // حفظ النتيجة في Firebase
    await saveUserResult(userName, correctAnswers, questions.length);
    
    // تحديث قائمة المراكز
    loadLeaderboard();
}

// زر إعادة البدء
restartBtn.addEventListener('click', () => {
    showPage('namePage');
    userNameInput.value = '';
});

// تبديل الصفحات
function showPage(pageId) {
    namePage.classList.remove('active');
    quizPage.classList.remove('active');
    resultsPage.classList.remove('active');
    document.getElementById(pageId).classList.add('active');
}
