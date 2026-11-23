// ========================================
// ExpenseFlow - Main Application
// ========================================

import { app } from "./firebase.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Initialize Firebase services from the same app
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase project:", app.options.projectId);
console.log("Firestore initialized:", Boolean(db));

// ========================================
// ELEMENTS
// ========================================

const $ = id => document.getElementById(id);

const authSection = $("authSection");
const appSection = $("appSection");

const authForm = $("authForm");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const authSubmit = $("authSubmit");
const authMessage = $("authMessage");
const authHeading = $("authHeading");
const authSwitchText = $("authSwitchText");
const authSwitchButton = $("authSwitchButton");

const logoutButton = $("logoutButton");
const userEmail = $("userEmail");
const connectionStatus = $("connectionStatus");

const expenseForm = $("expenseForm");
const expenseFormTitle = $("expenseFormTitle");
const dateInput = $("date");
const categoryInput = $("category");
const descriptionInput = $("description");
const amountInput = $("amount");
const submitButton = $("submitButton");
const cancelEditButton = $("cancelEditButton");
const formMessage = $("formMessage");

const budgetForm = $("budgetForm");
const budgetInput = $("budgetInput");
const saveBudgetButton = $("saveBudgetButton");
const budgetMessage = $("budgetMessage");

const totalExpensesElement = $("totalExpenses");
const monthlyBudgetDisplay = $("monthlyBudgetDisplay");
const remainingBudgetElement = $("remainingBudget");
const savingsAmountElement = $("savingsAmount");
const savingsNote = $("savingsNote");

const budgetProgressFill = $("budgetProgressFill");
const budgetUsedText = $("budgetUsedText");
const budgetPercentText = $("budgetPercentText");

const transactionList = $("transactionList");
const searchInput = $("searchInput");

const pdfButton = $("pdfButton");
const chartMessage = $("chartMessage");

// ========================================
// STATE
// ========================================

let currentUser = null;
let expenses = [];
let monthlyBudget = 0;
let editingExpenseId = null;
let expenseChart = null;
let authMode = "login";
let isSavingBudget = false;
let isSavingExpense = false;

// ========================================
// HELPERS
// ========================================

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function todayString() {
    const now = new Date();

    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function currentMonthString() {
    return todayString().slice(0, 7);
}

function isCurrentMonth(date) {
    return typeof date === "string" &&
        date.slice(0, 7) === currentMonthString();
}

function getCurrentMonthExpenses() {
    return expenses.filter(
        expense => isCurrentMonth(expense.date)
    );
}

function showMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}

function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "message";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}

// ========================================
// FIRESTORE REFERENCES
// ========================================

function getExpensesCollection() {
    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    return collection(
        db,
        "users",
        currentUser.uid,
        "expenses"
    );
}

function getBudgetDocument() {
    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    return doc(
        db,
        "users",
        currentUser.uid,
        "settings",
        "preferences"
    );
}

// ========================================
// FORM RESET
// ========================================

function resetExpenseForm() {
    expenseForm.reset();

    dateInput.value = todayString();

    editingExpenseId = null;

    expenseFormTitle.textContent = "Add an Expense";
    submitButton.textContent = "+ Add Expense";

    cancelEditButton.hidden = true;

    clearMessage(formMessage);
}

// ========================================
// AUTH MODE
// ========================================

authSwitchButton.addEventListener("click", () => {
    authMode = authMode === "login"
        ? "register"
        : "login";

    authHeading.textContent =
        authMode === "login"
            ? "Welcome back!"
            : "Create your account";

    authSubmit.textContent =
        authMode === "login"
            ? "Login"
            : "Create Account";

    authSwitchText.textContent =
        authMode === "login"
            ? "Don't have an account?"
            : "Already have an account?";

    authSwitchButton.textContent =
        authMode === "login"
            ? "Create account"
            : "Login";

    clearMessage(authMessage);
});

// ========================================
// LOGIN / REGISTER
// ========================================

authForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearMessage(authMessage);

    const email = authEmail.value.trim();
    const password = authPassword.value;

    authSubmit.disabled = true;

    try {
        if (authMode === "register") {
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            showMessage(
                authMessage,
                "Account created successfully!",
                "success"
            );
        } else {
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
        }
    } catch (error) {
        console.error("Authentication error:", error);

        const errors = {
            "auth/email-already-in-use":
                "This email is already registered.",

            "auth/invalid-email":
                "Enter a valid email address.",

            "auth/weak-password":
                "Password must contain at least 6 characters.",

            "auth/invalid-credential":
                "Incorrect email or password.",

            "auth/user-not-found":
                "No account found for this email.",

            "auth/wrong-password":
                "Incorrect password.",

            "auth/operation-not-allowed":
                "Enable Email/Password in Firebase Console.",

            "auth/network-request-failed":
                "Network error. Check your internet."
        };

        showMessage(
            authMessage,
            errors[error.code] ||
                `${error.code || "Error"}: ${error.message}`
        );
    } finally {
        authSubmit.disabled = false;
    }
});

// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (!user) {
        expenses = [];
        monthlyBudget = 0;

        authSection.hidden = false;
        appSection.hidden = true;

        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }

        return;
    }

    authSection.hidden = true;
    appSection.hidden = false;

    userEmail.textContent = user.email || "";

    resetExpenseForm();

    await loadAllData();
});

// ========================================
// LOGOUT
// ========================================

logoutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
        alert(`Logout failed: ${error.message}`);
    }
});

// ========================================
// LOAD ALL DATA
// ========================================

async function loadAllData() {
    if (!currentUser) return;

    connectionStatus.textContent = "Loading data...";

    try {
        await Promise.all([
            loadExpenses(),
            loadBudget()
        ]);

        renderDashboard();

        connectionStatus.textContent =
            "Connected to Firebase";

        connectionStatus.style.color = "#16a579";
    } catch (error) {
        console.error("Data loading error:", error);

        connectionStatus.textContent =
            "Connection error";

        connectionStatus.style.color = "#e05260";

        const detail = error.code
            ? `${error.code}: ${error.message}`
            : error.message;

        showMessage(
            formMessage,
            `Could not load expenses: ${detail}`
        );

        showMessage(
            budgetMessage,
            `Could not load budget: ${detail}`
        );
    }
}

// ========================================
// LOAD EXPENSES
// ========================================

async function loadExpenses() {
    const expenseQuery = query(
        getExpensesCollection(),
        orderBy("date", "desc")
    );

    const snapshot = await getDocs(expenseQuery);

    expenses = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));
}

// ========================================
// LOAD BUDGET
// ========================================

async function loadBudget() {
    const snapshot = await getDoc(
        getBudgetDocument()
    );

    if (snapshot.exists()) {
        const data = snapshot.data();

        monthlyBudget =
            Number(data.monthlyBudget) || 0;
    } else {
        monthlyBudget = 0;
    }

    budgetInput.value = monthlyBudget > 0
        ? monthlyBudget
        : "";
}

// ========================================
// SAVE MONTHLY BUDGET
// ========================================

budgetForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearMessage(budgetMessage);

    if (!currentUser) {
        showMessage(
            budgetMessage,
            "Please log in first."
        );

        return;
    }

    if (isSavingBudget) return;

    const value = Number(budgetInput.value);

    if (!Number.isFinite(value) || value <= 0) {
        showMessage(
            budgetMessage,
            "Enter a budget greater than zero."
        );

        return;
    }

    isSavingBudget = true;

    saveBudgetButton.disabled = true;
    saveBudgetButton.textContent = "Saving...";

    try {
        await setDoc(
            getBudgetDocument(),
            {
                monthlyBudget: value,
                updatedAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        monthlyBudget = value;

        renderDashboard();

        showMessage(
            budgetMessage,
            "Monthly budget saved successfully!",
            "success"
        );
    } catch (error) {
        console.error("Budget save failed:", error);

        showMessage(
            budgetMessage,
            `${error.code || "Error"}: ${error.message}`
        );
    } finally {
        isSavingBudget = false;

        saveBudgetButton.disabled = false;
        saveBudgetButton.textContent = "Save Budget";
    }
});

// ========================================
// ADD / UPDATE EXPENSE
// ========================================

expenseForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearMessage(formMessage);

    if (!currentUser) {
        showMessage(
            formMessage,
            "Please log in first."
        );

        return;
    }

    if (isSavingExpense) return;

    const date = dateInput.value;
    const category = categoryInput.value;
    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);

    if (
        !date ||
        !category ||
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        showMessage(
            formMessage,
            "Complete all fields and enter a valid amount."
        );

        return;
    }

    const expenseData = {
        date,
        category,
        description,
        amount,
        updatedAt: serverTimestamp()
    };

    isSavingExpense = true;

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
        if (editingExpenseId) {
            await updateDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid,
                    "expenses",
                    editingExpenseId
                ),
                expenseData
            );
        } else {
            await addDoc(
                getExpensesCollection(),
                {
                    ...expenseData,
                    createdAt: serverTimestamp()
                }
            );
        }

        resetExpenseForm();

        await loadExpenses();

        renderDashboard();

        showMessage(
            formMessage,
            "Expense saved successfully!",
            "success"
        );
    } catch (error) {
        console.error("Expense save failed:", error);

        showMessage(
            formMessage,
            `${error.code || "Error"}: ${error.message}`
        );
    } finally {
        isSavingExpense = false;

        submitButton.disabled = false;

        submitButton.textContent = editingExpenseId
            ? "Update Expense"
            : "+ Add Expense";
    }
});

// ========================================
// CANCEL EDIT
// ========================================

cancelEditButton.addEventListener(
    "click",
    resetExpenseForm
);

// ========================================
// EDIT EXPENSE
// ========================================

function editExpense(id) {
    const expense = expenses.find(
        item => item.id === id
    );

    if (!expense) return;

    editingExpenseId = id;

    dateInput.value = expense.date || todayString();
    categoryInput.value = expense.category || "";
    descriptionInput.value = expense.description || "";
    amountInput.value = expense.amount || "";

    expenseFormTitle.textContent = "Edit Expense";
    submitButton.textContent = "Update Expense";

    cancelEditButton.hidden = false;

    clearMessage(formMessage);

    expenseForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ========================================
// DELETE EXPENSE
// ========================================

async function deleteExpense(id) {
    if (!currentUser) return;

    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "expenses",
                id
            )
        );

        await loadExpenses();

        renderDashboard();
    } catch (error) {
        console.error("Delete failed:", error);

        alert(
            `${error.code || "Error"}: ${error.message}`
        );
    }
}

// ========================================
// TRANSACTION LIST
// ========================================

function renderTransactions() {
    const search = searchInput.value
        .trim()
        .toLowerCase();

    const filtered = expenses.filter(expense => {
        return (
            String(expense.description || "")
                .toLowerCase()
                .includes(search) ||

            String(expense.category || "")
                .toLowerCase()
                .includes(search) ||

            String(expense.date || "")
                .includes(search)
        );
    });

    if (filtered.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                ${
                    search
                        ? "No matching expenses found."
                        : "No expenses added yet."
                }
            </div>
        `;

        return;
    }

    transactionList.innerHTML = filtered.map(expense => `
        <article class="transaction-item">

            <div class="transaction-details">
                <strong>
                    ${escapeHTML(expense.description)}
                </strong>

                <span>
                    ${escapeHTML(expense.category)}
                    ·
                    ${escapeHTML(expense.date)}
                </span>
            </div>

            <div class="transaction-right">

                <div class="transaction-amount">
                    ${money(expense.amount)}
                </div>

                <div class="transaction-actions">

                    <button
                        class="btn btn-light"
                        type="button"
                        data-action="edit"
                        data-id="${escapeHTML(expense.id)}"
                    >
                        Edit
                    </button>

                    <button
                        class="btn btn-danger"
                        type="button"
                        data-action="delete"
                        data-id="${escapeHTML(expense.id)}"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>
    `).join("");
}

transactionList.addEventListener("click", async event => {
    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
        editExpense(id);
    }

    if (button.dataset.action === "delete") {
        await deleteExpense(id);
    }
});

searchInput.addEventListener(
    "input",
    renderTransactions
);

// ========================================
// DASHBOARD CALCULATIONS
// ========================================

function renderDashboard() {
    const monthlyExpenses = getCurrentMonthExpenses();

    const total = monthlyExpenses.reduce(
        (sum, expense) =>
            sum + (Number(expense.amount) || 0),
        0
    );

    const remaining = monthlyBudget - total;

    totalExpensesElement.textContent = money(total);

    monthlyBudgetDisplay.textContent =
        money(monthlyBudget);

    remainingBudgetElement.textContent =
        money(remaining);

    savingsAmountElement.textContent =
        money(Math.max(0, remaining));

    if (remaining < 0) {
        savingsNote.textContent =
            "You have exceeded your budget.";

        remainingBudgetElement.style.color = "#e05260";
    } else {
        savingsNote.textContent =
            "Budget remaining after expenses.";

        remainingBudgetElement.style.color = "#20223a";
    }

    const percentage = monthlyBudget > 0
        ? (total / monthlyBudget) * 100
        : 0;

    budgetProgressFill.style.width =
        `${Math.min(100, percentage)}%`;

    budgetProgressFill.classList.toggle(
        "over-budget",
        monthlyBudget > 0 && total > monthlyBudget
    );

    budgetUsedText.textContent =
        `Used: ${money(total)}`;

    budgetPercentText.textContent =
        monthlyBudget > 0
            ? `${Math.round(percentage)}% used`
            : "Set a budget";

    renderTransactions();

    renderChart(monthlyExpenses);
}

// ========================================
// CHART
// ========================================

function renderChart(monthlyExpenses) {
    if (typeof Chart === "undefined") {
        chartMessage.textContent =
            "Chart library could not load. Check your internet.";

        return;
    }

    chartMessage.textContent = "";

    const categories = {};

    monthlyExpenses.forEach(expense => {
        const category = expense.category || "Other";

        categories[category] =
            (categories[category] || 0) +
            (Number(expense.amount) || 0);
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }

    expenseChart = new Chart(
        $("expenseChart"),
        {
            type: "doughnut",

            data: {
                labels: labels.length
                    ? labels
                    : ["No expenses yet"],

                datasets: [{
                    data: values.length
                        ? values
                        : [1],

                    backgroundColor: [
                        "#6757f5",
                        "#16a579",
                        "#f59e0b",
                        "#e05260",
                        "#3b82f6",
                        "#9b59b6",
                        "#14b8a6",
                        "#f97316",
                        "#94a3b8"
                    ],

                    borderWidth: 3,
                    borderColor: "#ffffff"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom",

                        labels: {
                            padding: 17,
                            usePointStyle: true
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                if (!labels.length) {
                                    return "No expenses yet";
                                }

                                return (
                                    `${context.label}: ` +
                                    money(context.raw)
                                );
                            }
                        }
                    }
                }
            }
        }
    );
}

// ========================================
// PDF REPORT
// ========================================

pdfButton.addEventListener("click", () => {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert(
            "PDF library could not load. Check your internet."
        );

        return;
    }

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();

    const monthlyExpenses = getCurrentMonthExpenses();

    const total = monthlyExpenses.reduce(
        (sum, expense) =>
            sum + (Number(expense.amount) || 0),
        0
    );

    const remaining = monthlyBudget - total;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);

    pdf.text("ExpenseFlow Report", 14, 20);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
        `Email: ${currentUser.email || ""}`,
        14,
        30
    );

    pdf.text(
        `Month: ${currentMonthString()}`,
        14,
        37
    );

    pdf.text(
        `Monthly Budget: INR ${monthlyBudget.toFixed(2)}`,
        14,
        47
    );

    pdf.text(
        `Monthly Expenses: INR ${total.toFixed(2)}`,
        14,
        54
    );

    pdf.text(
        `Budget Remaining: INR ${remaining.toFixed(2)}`,
        14,
        61
    );

    let y = 76;

    pdf.setFont("helvetica", "bold");

    pdf.text("Date", 14, y);
    pdf.text("Category", 42, y);
    pdf.text("Description", 78, y);
    pdf.text("Amount (INR)", 160, y);

    y += 8;

    pdf.setFont("helvetica", "normal");

    monthlyExpenses.forEach(expense => {
        if (y > 275) {
            pdf.addPage();
            y = 20;
        }

        pdf.text(
            String(expense.date || "").slice(0, 10),
            14,
            y
        );

        pdf.text(
            String(expense.category || "").slice(0, 18),
            42,
            y
        );

        pdf.text(
            String(expense.description || "").slice(0, 40),
            78,
            y
        );

        pdf.text(
            Number(expense.amount || 0).toFixed(2),
            165,
            y
        );

        y += 7;
    });

    pdf.save(
        `ExpenseFlow-${currentMonthString()}.pdf`
    );
});

// ========================================
// INITIALIZE
// ========================================

dateInput.value = todayString();