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

// الحصول على معرف المسابقة الحالية (بناءً على الأسئلة)
function getQuizId(questions) {
    // إنشاء معرف فريد للمسابقة بناءً على محتوى الأسئلة
    const questionsString = JSON.stringify(questions.map(q => q.question));
    // استخدام hash بسيط
    let hash = 0;
    for (let i = 0; i < questionsString.length; i++) {
        const char = questionsString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
}

// التحقق من حل المستخدم للمسابقة من قبل
async function hasUserSolvedQuiz(userName, quizId) {
    if (!database) return false;
    
    try {
        const userQuizzesRef = ref(database, `userQuizzes/${userName}/${quizId}`);
        const snapshot = await get(userQuizzesRef);
        return snapshot.exists();
    } catch (error) {
        console.error('خطأ في التحقق من المسابقة:', error);
        return false;
    }
}

// حفظ نتيجة المستخدم في Firebase
async function saveUserResult(userName, score, totalQuestions) {
    if (!database) return;
    
    try {
        const quizId = getQuizId(questions);
        
        // التحقق من حل المسابقة من قبل
        const alreadySolved = await hasUserSolvedQuiz(userName, quizId);
        if (alreadySolved) {
            alert('لقد قمت بحل هذه المسابقة من قبل! لا يمكنك الحصول على نقاط إضافية.');
            return;
        }
        
        // حساب النقاط (النقاط = عدد الإجابات الصحيحة)
        const points = score;
        
        // حفظ المسابقة المحلولة
        const userQuizRef = ref(database, `userQuizzes/${userName}/${quizId}`);
        await set(userQuizRef, {
            score: score,
            totalQuestions: totalQuestions,
            timestamp: Date.now(),
            date: new Date().toLocaleString('ar-EG')
        });
        
        // حفظ النتيجة في سجل المستخدمين
        const userResult = {
            name: userName,
            score: score,
            totalQuestions: totalQuestions,
            percentage: Math.round((score / totalQuestions) * 100),
            points: points,
            quizId: quizId,
            timestamp: Date.now(),
            date: new Date().toLocaleString('ar-EG')
        };
        
        const usersRef = ref(database, 'users');
        const newUserRef = push(usersRef);
        await set(newUserRef, userResult);
        
        // تحديث نقاط المستخدم الإجمالية
        const userPointsRef = ref(database, `userPoints/${userName}`);
        const pointsSnapshot = await get(userPointsRef);
        let totalPoints = points;
        if (pointsSnapshot.exists()) {
            totalPoints = (pointsSnapshot.val() || 0) + points;
        }
        await set(userPointsRef, totalPoints);
        
        // تحديث قائمة المراكز بناءً على النقاط الإجمالية
        await updateLeaderboard(userName, totalPoints);
        
        // تحديث قائمة المراكز
        loadLeaderboard();
    } catch (error) {
        console.error('خطأ في حفظ النتيجة:', error);
    }
}

// تحديث قائمة المراكز
async function updateLeaderboard(userName, totalPoints) {
    if (!database) return;
    
    try {
        // الحصول على جميع المستخدمين ونقاطهم
        const userPointsRef = ref(database, 'userPoints');
        const snapshot = await get(userPointsRef);
        
        const allUsers = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                allUsers.push({
                    name: childSnapshot.key,
                    points: childSnapshot.val() || 0
                });
            });
        }
        
        // ترتيب حسب النقاط (الأعلى أولاً)
        allUsers.sort((a, b) => b.points - a.points);
        
        // حفظ أول 7 فقط في قائمة المراكز
        const leaderboardRef = ref(database, 'leaderboard');
        await set(leaderboardRef, null); // مسح القائمة القديمة
        
        const top7 = allUsers.slice(0, 7);
        for (let i = 0; i < top7.length; i++) {
            const userRef = ref(database, `leaderboard/${top7[i].name}`);
            await set(userRef, {
                name: top7[i].name,
                points: top7[i].points,
                rank: i + 1,
                timestamp: Date.now(),
                date: new Date().toLocaleString('ar-EG')
            });
        }
    } catch (error) {
        console.error('خطأ في تحديث قائمة المراكز:', error);
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
            const data = childSnapshot.val();
            leaders.push({
                id: childSnapshot.key,
                name: data.name || childSnapshot.key,
                points: data.points || 0,
                rank: data.rank || 0,
                date: data.date || 'تاريخ غير محدد'
            });
        });
        
        // ترتيب حسب النقاط (الأعلى أولاً)
        leaders.sort((a, b) => b.points - a.points);
        
        // عرض أول 7 فقط
        const topLeaders = leaders.slice(0, 7);
        
        if (topLeaders.length === 0) {
            leaderboardList.innerHTML = '<p class="no-leaders">لا يوجد متسابقين في قائمة المراكز بعد</p>';
            return;
        }
        
        topLeaders.forEach((leader, index) => {
            const leaderItem = document.createElement('div');
            leaderItem.className = 'leader-item';
            leaderItem.innerHTML = `
                <div class="leader-rank">${index + 1}</div>
                <div class="leader-info">
                    <div class="leader-name">${leader.name}</div>
                    <div class="leader-points">${leader.points} نقطة</div>
                </div>
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
async function startQuiz() {
    // التحقق من حل المسابقة من قبل
    const quizId = getQuizId(questions);
    const alreadySolved = await hasUserSolvedQuiz(userName, quizId);
    
    if (alreadySolved) {
        if (confirm('لقد قمت بحل هذه المسابقة من قبل! هل تريد حلها مرة أخرى (لن تحصل على نقاط)؟')) {
            currentQuestionIndex = 0;
            userAnswers = [];
            showPage('quizPage');
            loadQuestion();
        }
    } else {
        currentQuestionIndex = 0;
        userAnswers = [];
        showPage('quizPage');
        loadQuestion();
    }
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

    // التحقق من حل المسابقة من قبل
    const quizId = getQuizId(questions);
    const alreadySolved = await hasUserSolvedQuiz(userName, quizId);
    
    if (!alreadySolved) {
        // حفظ النتيجة في Firebase فقط إذا لم يحل المسابقة من قبل
        await saveUserResult(userName, correctAnswers, questions.length);
    } else {
        // عرض رسالة أن المسابقة تم حلها من قبل
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message info';
        messageDiv.textContent = 'لقد قمت بحل هذه المسابقة من قبل! لم يتم إضافة نقاط جديدة.';
        resultsDetails.insertBefore(messageDiv, resultsDetails.firstChild);
    }
    
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
