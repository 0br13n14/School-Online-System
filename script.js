// LocalStorage Management
class StorageManager {
    constructor() {
        // Initialize only once per session
        if (!window.storageManagerInitialized) {
            this.initStorage();
            window.storageManagerInitialized = true;
        }
    }

    initStorage() {
        // Initialize empty data structure if not exists
        const defaultData = {
            users: {
                students: [],
                examiners: [],
                admins: []
            },
            exams: [],
            submissions: [],
            results: [],
            questions: [],
            subjects: []
        };

        if (!this.getData('appData')) {
            this.setData('appData', defaultData);
        }

        // Initialize current user session
        if (!this.getData('currentUser')) {
            this.setData('currentUser', null);
        }
    }

    getData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    setData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    // User management
    addUser(user, type) {
        const appData = this.getData('appData');
        if (appData && appData.users[type]) {
            // Check if user already exists
            if (appData.users[type].find(u => u.id === user.id)) {
                return false;
            }
            
            // Add registration timestamp if not present
            if (!user.registrationDate) {
                user.registrationDate = new Date().toISOString();
            }
            
            appData.users[type].push(user);
            return this.setData('appData', appData);
        }
        return false;
    }

    findUser(username, password) {
        const appData = this.getData('appData');
        if (!appData || !appData.users) {
            return null;
        }
        
        const users = [...appData.users.students, ...appData.users.examiners, ...appData.users.admins];
        return users.find(user => user.id === username && user.password === password);
    }

    getUserType(username) {
        const appData = this.getData('appData');
        if (!appData || !appData.users) {
            return null;
        }
        
        if (appData.users.students.find(u => u.id === username)) return 'student';
        if (appData.users.examiners.find(u => u.id === username)) return 'examiner';
        if (appData.users.admins.find(u => u.id === username)) return 'admin';
        return null;
    }

    // Get user by ID
    getUserById(userId) {
        const appData = this.getData('appData');
        if (!appData || !appData.users) {
            return null;
        }
        
        const allUsers = [
            ...appData.users.students,
            ...appData.users.examiners,
            ...appData.users.admins
        ];
        
        return allUsers.find(user => user.id === userId);
    }

    // Get exams created by specific examiner
    getExamsByExaminer(examinerId) {
        const exams = this.getExams();
        return exams.filter(exam => exam.createdBy === examinerId);
    }

    // Get submissions for examiner's exams
    getSubmissionsForExaminer(examinerId) {
        const exams = this.getExamsByExaminer(examinerId);
        const submissions = this.getSubmissions();
        const examIds = exams.map(exam => exam.id);
        
        return submissions.filter(submission => examIds.includes(submission.examId));
    }

    // Exam management
    addExam(exam) {
        const appData = this.getData('appData');
        exam.id = 'EXAM' + (appData.exams.length + 1).toString().padStart(3, '0');
        exam.questions = exam.questions || [];
        exam.status = exam.status || 'active';
        exam.createdAt = new Date().toISOString();
        appData.exams.push(exam);
        this.setData('appData', appData);
        return exam.id;
    }

    getExams() {
        const appData = this.getData('appData');
        return appData ? appData.exams : [];
    }

    getExamById(id) {
        const exams = this.getExams();
        return exams.find(exam => exam.id === id);
    }

    // Question management
    addQuestion(question) {
        const appData = this.getData('appData');
        question.id = 'Q' + (appData.questions.length + 1).toString().padStart(3, '0');
        question.createdAt = new Date().toISOString();
        appData.questions.push(question);
        this.setData('appData', appData);
        return question.id;
    }

    getQuestions() {
        const appData = this.getData('appData');
        return appData ? appData.questions : [];
    }

    // Submission management
    addSubmission(submission) {
        const appData = this.getData('appData');
        submission.id = 'SUB' + (appData.submissions.length + 1).toString().padStart(3, '0');
        submission.submittedAt = new Date().toISOString();
        submission.status = 'submitted';
        appData.submissions.push(submission);
        
        // Calculate result
        const exam = this.getExamById(submission.examId);
        let score = 0;
        let totalMarks = 0;

        if (exam && exam.questions) {
            submission.answers.forEach((answer, index) => {
                const question = exam.questions[index];
                if (question) {
                    totalMarks += question.marks;
                    if (answer === question.correctAnswer) {
                        score += question.marks;
                    }
                }
            });
        }

        const percentage = totalMarks > 0 ? (score / totalMarks * 100).toFixed(1) : 0;
        const passMarks = exam ? exam.passMarks : 50;

        const result = {
            id: 'RES' + (appData.results.length + 1).toString().padStart(3, '0'),
            studentId: submission.studentId,
            examId: submission.examId,
            score: score,
            totalMarks: totalMarks,
            percentage: parseFloat(percentage),
            submittedAt: submission.submittedAt,
            status: percentage >= passMarks ? 'passed' : 'failed'
        };

        appData.results.push(result);
        this.setData('appData', appData);
        return result;
    }

    getStudentResults(studentId) {
        const appData = this.getData('appData');
        return appData ? appData.results.filter(result => result.studentId === studentId) : [];
    }

    getSubmissions() {
        const appData = this.getData('appData');
        return appData ? appData.submissions : [];
    }

    // Subject management
    addSubject(subject) {
        const appData = this.getData('appData');
        subject.createdAt = new Date().toISOString();
        appData.subjects.push(subject);
        this.setData('appData', appData);
        return true;
    }

    getSubjects() {
        const appData = this.getData('appData');
        return appData ? appData.subjects : [];
    }

    // Update user
    updateUser(updatedUser) {
        const appData = this.getData('appData');
        const userType = this.getUserType(updatedUser.id);
        
        if (userType) {
            const users = appData.users[userType + 's'];
            const userIndex = users.findIndex(u => u.id === updatedUser.id);
            
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], ...updatedUser };
                this.setData('appData', appData);
                
                // Update current user if it's the same user
                const currentUser = this.getData('currentUser');
                if (currentUser && currentUser.id === updatedUser.id) {
                    this.setData('currentUser', users[userIndex]);
                }
                return true;
            }
        }
        return false;
    }

    // Delete user
    deleteUser(userId) {
        const appData = this.getData('appData');
        let deleted = false;
        
        ['students', 'examiners', 'admins'].forEach(role => {
            const initialLength = appData.users[role].length;
            appData.users[role] = appData.users[role].filter(u => u.id !== userId);
            if (appData.users[role].length < initialLength) {
                deleted = true;
            }
        });
        
        if (deleted) {
            // Also clear current user session if deleted user is logged in
            const currentUser = this.getData('currentUser');
            if (currentUser && currentUser.id === userId) {
                this.setData('currentUser', null);
            }
            this.setData('appData', appData);
            return true;
        }
        return false;
    }

    // Get all results for reporting
    getAllResults() {
        const appData = this.getData('appData');
        return appData ? appData.results : [];
    }

    // Get system statistics
    getSystemStats() {
        const appData = this.getData('appData');
        if (!appData) return null;

        const totalStudents = appData.users.students.length;
        const totalExaminers = appData.users.examiners.length;
        const totalAdmins = appData.users.admins.length;
        const totalExams = appData.exams.length;
        const totalSubmissions = appData.submissions.length;
        const totalQuestions = appData.questions.length;
        const totalSubjects = appData.subjects.length;

        const activeExams = appData.exams.filter(exam => exam.status === 'active').length;
        const passedExams = appData.results.filter(result => result.status === 'passed').length;
        const totalResults = appData.results.length;
        const passRate = totalResults > 0 ? (passedExams / totalResults * 100).toFixed(1) : 0;

        return {
            totalStudents,
            totalExaminers,
            totalAdmins,
            totalExams,
            totalSubmissions,
            totalQuestions,
            totalSubjects,
            activeExams,
            passedExams,
            totalResults,
            passRate
        };
    }

    // Get examiner statistics
    getExaminerStats(examinerId) {
        const myExams = this.getExamsByExaminer(examinerId);
        const mySubmissions = this.getSubmissionsForExaminer(examinerId);
        const questions = this.getQuestions();

        return {
            activeExams: myExams.filter(e => e.status === "active").length,
            totalSubmissions: mySubmissions.length,
            pendingEvaluations: mySubmissions.filter(s => s.status === "submitted").length,
            totalQuestions: questions.length
        };
    }
}

// Navigation Manager - Handles all navigation efficiently
class NavigationManager {
    constructor() {
        this.initNavigation();
    }
    
    initNavigation() {
        // Single event listener for all navigation
        document.addEventListener('click', (e) => {
            this.handleNavigation(e);
        });
        
        // Set initial active state
        this.updateActiveNavigation();
    }
    
    handleNavigation(event) {
        const navLink = event.target.closest('nav a');
        if (navLink) {
            const targetPage = navLink.getAttribute('href');
            const currentPage = this.getCurrentPage();
            
            // Prevent same-page navigation
            if (this.isSamePage(currentPage, targetPage)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        }
    }
    
    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }
    
    isSamePage(currentPage, targetPage) {
        if (currentPage === targetPage) return true;
        if (currentPage === 'index.html' && targetPage === '') return true;
        if (currentPage === '' && targetPage === 'index.html') return true;
        return false;
    }
    
    updateActiveNavigation() {
        const currentPage = this.getCurrentPage();
        const navLinks = document.querySelectorAll('nav a');
        
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (this.isSamePage(currentPage, linkHref)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// Alert Manager - Handles user notifications
class AlertManager {
    static show(message, type = 'success') {
        // Remove existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        if (type === 'success') {
            alert.style.background = '#28a745';
        } else if (type === 'error') {
            alert.style.background = '#dc3545';
        } else {
            alert.style.background = '#00509e';
        }

        document.body.appendChild(alert);

        // Auto-remove alert after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize storage manager
const storage = new StorageManager();

// Utility functions
function showAlert(message, type = 'success') {
    AlertManager.show(message, type);
}

function showLoadingState(button) {
    if (!button) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = 'Processing...';
    button.disabled = true;
    
    // Revert after 3 seconds if still in loading state
    setTimeout(() => {
        if (button.disabled) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }, 3000);
}

function logout() {
    storage.setData('currentUser', null);
    window.location.href = 'index.html';
}

// Authentication helper functions
function requireAuth(requiredRole = null) {
    const currentUser = storage.getData('currentUser');
    
    if (!currentUser) {
        return false;
    }
    
    if (requiredRole) {
        const userType = storage.getUserType(currentUser.id);
        if (userType !== requiredRole) {
            return false;
        }
    }
    
    return true;
}

function redirectIfNotAuthenticated(requiredRole = null, redirectPage = 'index.html') {
    if (!requireAuth(requiredRole)) {
        storage.setData('currentUser', null);
        window.location.href = redirectPage;
        return false;
    }
    return true;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation manager
    new NavigationManager();
    
    // Add smooth click effects to buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
            const btn = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
            btn.style.transform = 'scale(0.98)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
        }
    });
});

// Prevent multiple initializations
if (window.performance) {
    if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
        console.info('Page was reloaded');
    }
}