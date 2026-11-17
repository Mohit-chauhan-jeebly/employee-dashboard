 
const API_URL = window.getEmployeesApiUrl();
 
const employeeForm = document.getElementById("employeeForm");
const employeeTable = document.getElementById("employeeTable");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
 
const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
 
let employees = [];
 
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
 
// Mobile number: only digits
document.getElementById("mobile").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
});
 
// Add employee form
employeeForm.addEventListener("submit", async function (event) {
    event.preventDefault();
 
    message.textContent = "";
    message.className = "message";
 
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const department = document.getElementById("department").value;
    const joiningDate = document.getElementById("joiningDate").value;
    const status = document.getElementById("status").value;
 
    if (name.length < 3) {
        showMessage("Name must contain at least 3 characters.", "error");
        return;
    }
 
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
    }
 
    if (!/^[0-9]{10}$/.test(mobile)) {
        showMessage("Mobile number must contain exactly 10 digits.", "error");
        return;
    }
 
    if (!department || !joiningDate || !status) {
        showMessage("Please fill in all required fields.", "error");
        return;
    }
 
    const employee = {
        name,
        email,
        mobile,
        department,
        joiningDate,
        status,
        projects: []
    };
 
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
 
    try {
        const existingResponse = await fetch(API_URL);
        if (!existingResponse.ok) throw new Error("Could not verify duplicate employee details.");
        const existingEmployees = await existingResponse.json();
        const duplicate = existingEmployees.find(emp =>
            String(emp.email || "").toLowerCase() === email.toLowerCase() ||
            String(emp.mobile || "") === mobile
        );
        if (duplicate) {
            showMessage("An employee with this email or mobile number already exists.", "error");
            submitBtn.disabled = false;
            return;
        }
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(employee)
        });
 
        if (!response.ok) {
            throw new Error("Server could not save employee.");
        }
 
        const savedEmployee = await response.json();
 
        showMessage(
            "Employee added successfully! Employee ID: " + savedEmployee.id,
            "success"
        );
 
        employeeForm.reset();
 
        // Reload employee records after adding
        await loadEmployees();
 
    } catch (error) {
        console.error("Add Employee Error:", error);
 
        showMessage(
            "Unable to add employee. Please check whether backend is running.",
            "error"
        );
 
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "+ Add Employee";
    }
});
 
// Display success/error message
function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}
 
// Clear message when form is reset
employeeForm.addEventListener("reset", function () {
    message.textContent = "";
    message.className = "message";
});
 
// Fetch employees
async function loadEmployees() {
    const loadingMessage = document.getElementById("loadingMessage");
    const errorMessage = document.getElementById("errorMessage");
 
    loadingMessage.textContent = "Loading employees...";
    errorMessage.textContent = "";
 
    try {
        const response = await fetch(API_URL);
 
        if (!response.ok) {
            throw new Error("Unable to fetch employees.");
        }
 
        employees = await response.json();
 
        populateDepartments();
        updateStats();
        applyFilters();
 
        loadingMessage.textContent =
            `${employees.length} employee records loaded.`;
 
    } catch (error) {
        console.error("Load Employees Error:", error);
 
        loadingMessage.textContent = "";
        errorMessage.textContent =
            "Backend connection failed. Please start JSON Server.";
 
        employeeTable.innerHTML =
            '<tr><td colspan="6">Unable to load employees.</td></tr>';
 
        document.getElementById("resultCount").textContent =
            "Unable to load employee records";
    }
}
 
// Populate department dropdown
function populateDepartments() {
    const currentValue = departmentFilter.value;
 
    const departments = [
        ...new Set(
            employees
                .map(employee => employee.department)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));
 
    departmentFilter.innerHTML =
        '<option value="">All Departments</option>';
 
    departments.forEach(department => {
        const option = document.createElement("option");
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
 
    departmentFilter.value = departments.includes(currentValue)
        ? currentValue
        : "";
}
 
// Update statistics
function updateStats() {
    document.getElementById("totalEmployees").textContent =
        employees.length;
 
    document.getElementById("activeEmployees").textContent =
        employees.filter(employee => employee.status === "Active").length;
 
    document.getElementById("totalDepartments").textContent =
        new Set(
            employees
                .map(employee => employee.department)
                .filter(Boolean)
        ).size;
}
 
// Search, filter and sort
function applyFilters() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const departmentValue = departmentFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortFilter.value;
 
    let filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            String(employee.name || "").toLowerCase().includes(searchValue) ||
            String(employee.email || "").toLowerCase().includes(searchValue);
 
        const matchesDepartment =
            !departmentValue || employee.department === departmentValue;
 
        const matchesStatus =
            !statusValue || employee.status === statusValue;
 
        return matchesSearch && matchesDepartment && matchesStatus;
    });
 
    // Sorting
    filteredEmployees.sort((a, b) => {
        switch (sortValue) {
            case "name-asc":
                return String(a.name || "").localeCompare(String(b.name || ""));
 
            case "name-desc":
                return String(b.name || "").localeCompare(String(a.name || ""));
 
            case "date-new":
                return String(b.joiningDate || "").localeCompare(
                    String(a.joiningDate || "")
                );
 
            case "date-old":
                return String(a.joiningDate || "").localeCompare(
                    String(b.joiningDate || "")
                );
 
            case "department-asc":
                return String(a.department || "").localeCompare(
                    String(b.department || "")
                );
 
            case "department-desc":
                return String(b.department || "").localeCompare(
                    String(a.department || "")
                );
 
            case "status-asc":
                return String(a.status || "").localeCompare(
                    String(b.status || "")
                );
 
            case "status-desc":
                return String(b.status || "").localeCompare(
                    String(a.status || "")
                );
 
            default:
                return 0;
        }
    });
 
    displayEmployees(filteredEmployees);
 
    document.getElementById("resultCount").textContent =
        `Showing ${filteredEmployees.length} of ${employees.length} employees`;
}
 
// Display employee table
function displayEmployees(list) {
    employeeTable.innerHTML = "";
 
    if (list.length === 0) {
        employeeTable.innerHTML = `
            <tr>
                <td colspan="6">No matching employees found.</td>
            </tr>
        `;
        return;
    }
 
    list.forEach(employee => {
        const row = document.createElement("tr");
 
        const values = [
            employee.id,
            employee.name,
            employee.email,
            employee.department,
            employee.joiningDate
        ];
 
        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });
 
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
 
        badge.textContent = employee.status || "Unknown";
        badge.className =
            "status " +
            (employee.status === "Active" ? "active" : "inactive");
 
        statusCell.appendChild(badge);
        row.appendChild(statusCell);
 
        employeeTable.appendChild(row);
    });
}
 
// Search and filter event listeners
searchInput.addEventListener("input", applyFilters);
departmentFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);
sortFilter.addEventListener("change", applyFilters);
 
// Reset filters
document.getElementById("resetBtn").addEventListener("click", () => {
    searchInput.value = "";
    departmentFilter.value = "";
    statusFilter.value = "";
    sortFilter.value = "name-asc";
 
    applyFilters();
});
 
// Refresh employee records
document.getElementById("refreshBtn").addEventListener("click", loadEmployees);
 
// Start application
loadEmployees();
 