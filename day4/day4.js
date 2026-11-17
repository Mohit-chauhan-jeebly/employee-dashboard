 
const API_URL = window.getEmployeesApiUrl();
 
const employeeSelect = document.getElementById("employeeSelect");
const editForm = document.getElementById("editForm");
const formFields = document.getElementById("formFields");
const message = document.getElementById("message");
const errorMessage = document.getElementById("errorMessage");
const loadingMessage = document.getElementById("loadingMessage");
const saveBtn = document.getElementById("saveBtn");
 
let employees = [];
let selectedEmployee = null;
let originalValues = null;
 
// CURRENT DATE
 
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
 
// MESSAGE FUNCTION
 
function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}
 
function clearMessages() {
    message.textContent = "";
    message.className = "message";
    errorMessage.textContent = "";
}
 
// LOAD EMPLOYEES
 
async function loadEmployees() {
    employeeSelect.innerHTML =
        '<option value="">Loading employees...</option>';
 
    formFields.disabled = true;
    selectedEmployee = null;
    originalValues = null;
 
    loadingMessage.textContent = "Loading employees...";
    clearMessages();
 
    try {
        const response = await fetch(API_URL);
 
        if (!response.ok) {
            throw new Error("Unable to fetch employees.");
        }
 
        employees = await response.json();
 
        employeeSelect.innerHTML =
            '<option value="">Select an employee</option>';
 
        employees.forEach(employee => {
            const option = document.createElement("option");
 
            option.value = employee.id;
            option.textContent =
                `${employee.name} (ID: ${employee.id})`;
 
            employeeSelect.appendChild(option);
        });
 
        loadingMessage.textContent = employees.length
            ? `${employees.length} employees loaded successfully.`
            : "No employees found. Add an employee first.";
 
    } catch (error) {
        console.error(error);
 
        employeeSelect.innerHTML =
            '<option value="">Unable to load employees</option>';
 
        loadingMessage.textContent = "";
        errorMessage.textContent =
            "Backend connection failed. Please start JSON Server.";
    }
}
 
// FORM VALUES
 
function getFormValues() {
    return {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        department: document.getElementById("department").value,
        joiningDate: document.getElementById("joiningDate").value,
        status: document.getElementById("status").value
    };
}
 
function fillEmployeeForm(employee) {
    document.getElementById("name").value = employee.name || "";
    document.getElementById("email").value = employee.email || "";
    document.getElementById("mobile").value = employee.mobile || "";
    document.getElementById("department").value =
        employee.department || "";
    document.getElementById("joiningDate").value =
        employee.joiningDate || "";
    document.getElementById("status").value = employee.status || "";
}
 
// SELECT EMPLOYEE
 
employeeSelect.addEventListener("change", function () {
    clearMessages();
 
    const id = this.value;
 
    if (!id) {
        selectedEmployee = null;
        originalValues = null;
        editForm.reset();
        formFields.disabled = true;
        return;
    }
 
    selectedEmployee = employees.find(
        employee => String(employee.id) === String(id)
    );
 
    if (!selectedEmployee) return;
 
    fillEmployeeForm(selectedEmployee);
 
    originalValues = getFormValues();
    formFields.disabled = false;
});
 
// MOBILE VALIDATION
 
document.getElementById("mobile").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
});
 
// UPDATE EMPLOYEE
 
editForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessages();
 
    if (!selectedEmployee) {
        showMessage("Please select an employee first.", "error");
        return;
    }
 
    const values = getFormValues();
 
    if (values.name.length < 3) {
        showMessage("Name must contain at least 3 characters.", "error");
        return;
    }
 
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        showMessage("Enter a valid email address.", "error");
        return;
    }
 
    if (!/^[0-9]{10}$/.test(values.mobile)) {
        showMessage("Mobile number must contain exactly 10 digits.", "error");
        return;
    }
 
    if (!values.department || !values.joiningDate || !values.status) {
        showMessage("Please complete all required fields.", "error");
        return;
    }
 
    const updatedEmployee = {
        ...selectedEmployee,
        ...values
    };
 
    saveBtn.disabled = true;
    saveBtn.textContent = "Updating...";
 
    try {
        const checkResponse = await fetch(API_URL);
        if (!checkResponse.ok) throw new Error("Could not verify duplicate employee details.");
        const allEmployees = await checkResponse.json();
        const duplicate = allEmployees.find(emp =>
            String(emp.id) !== String(selectedEmployee.id) &&
            (String(emp.email || "").toLowerCase() === values.email.toLowerCase() ||
             String(emp.mobile || "") === values.mobile)
        );
        if (duplicate) {
            showMessage("Another employee already uses this email or mobile number.", "error");
            return;
        }
        const response = await fetch(
            `${API_URL}/${encodeURIComponent(selectedEmployee.id)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedEmployee)
            }
        );
 
        if (!response.ok) {
            throw new Error("Update request failed.");
        }
 
        const savedEmployee = await response.json();
 
        showMessage(
            `Employee ${savedEmployee.name} updated successfully!`,
            "success"
        );
 
        await loadEmployees();
 
        employeeSelect.value = String(savedEmployee.id);
        selectedEmployee = savedEmployee;
 
        fillEmployeeForm(savedEmployee);
        originalValues = getFormValues();
        formFields.disabled = false;
 
    } catch (error) {
        console.error(error);
 
        showMessage(
            "Unable to update employee. Check backend and try again.",
            "error"
        );
 
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
    }
});
 
// RESET EDIT FORM
 
editForm.addEventListener("reset", function () {
    if (!selectedEmployee || !originalValues) return;
 
    setTimeout(() => {
        fillEmployeeForm(originalValues);
        clearMessages();
    }, 0);
});
 
// REFRESH EMPLOYEES
 
document.getElementById("refreshBtn").addEventListener(
    "click",
    loadEmployees
);
 
// DAY 7: TESTING CHECKLIST
 
const checkboxes = document.querySelectorAll(
    '#checklist input[type="checkbox"]'
);
 
function updateProgress() {
    const total = checkboxes.length;
 
    const completed = [...checkboxes].filter(
        checkbox => checkbox.checked
    ).length;
 
    const remaining = total - completed;
 
    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;
 
    document.getElementById("totalTests").textContent = total;
    document.getElementById("completedTests").textContent = completed;
    document.getElementById("remainingTests").textContent = remaining;
    document.getElementById("progressPercent").textContent =
        percentage + "%";
 
    document.getElementById("progressBar").style.width =
        percentage + "%";
 
    document.getElementById("progressText").textContent =
        `${completed} of ${total} tests completed`;
}
 
checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", updateProgress);
});
 
// RESET CHECKLIST
 
document.getElementById("resetBtn").addEventListener("click", function () {
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
 
    updateProgress();
});
 
// DAY 7: API CONNECTION CHECK
 
const checkApiBtn = document.getElementById("checkApiBtn");
const apiDot = document.getElementById("apiDot");
const apiMessage = document.getElementById("apiMessage");
const employeeCount = document.getElementById("employeeCount");
 
async function checkAPI() {
    checkApiBtn.disabled = true;
    checkApiBtn.textContent = "Checking...";
 
    apiDot.className = "dot";
    apiMessage.textContent = "Connecting to backend...";
    employeeCount.textContent = "Employee Count: Checking...";
 
    try {
        const response = await fetch(API_URL);
 
        if (!response.ok) {
            throw new Error("API connection failed.");
        }
 
        const data = await response.json();
 
        apiDot.className = "dot online";
        apiMessage.textContent = "Backend connected successfully";
        employeeCount.textContent =
            "Employee Count: " + data.length;
 
    } catch (error) {
        console.error(error);
 
        apiDot.className = "dot offline";
        apiMessage.textContent = "Backend connection failed";
        employeeCount.textContent = error.message;
 
    } finally {
        checkApiBtn.disabled = false;
        checkApiBtn.textContent = "Check API";
    }
}
 
checkApiBtn.addEventListener("click", checkAPI);
 
// INITIALIZE
 
loadEmployees();
updateProgress();
checkAPI();
 