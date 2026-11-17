 
// JSON Server API URL
// Make sure this URL matches your running JSON Server.
const API_URL = window.getEmployeesApiUrl();
 
const tableBody = document.getElementById("employeeTable");
const refreshBtn = document.getElementById("refreshBtn");
 
const totalEmployees = document.getElementById("totalEmployees");
const activeEmployees = document.getElementById("activeEmployees");
const totalDepartments = document.getElementById("totalDepartments");
 
const recordCount = document.getElementById("recordCount");
const showingText = document.getElementById("showingText");
const apiStatus = document.getElementById("apiStatus");
const errorMessage = document.getElementById("errorMessage");
 
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const pageNumber = document.getElementById("pageNumber");
 
const PAGE_SIZE = 10;
 
let employees = [];
let currentPage = 1;
 
// Date
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
 
// Sidebar
document.getElementById("menuBtn").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("closed");
});
 
// Safe text helper
function safeText(value) {
    return String(value ?? "-").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[char];
    });
}
 
// Format date
function formatDate(value) {
    if (!value) return "-";
 
    const date = new Date(value + "T00:00:00");
 
    if (Number.isNaN(date.getTime())) return safeText(value);
 
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
 
// Load employee data
async function loadEmployees() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading...";
    errorMessage.hidden = true;
    apiStatus.textContent = "Connecting...";
    apiStatus.classList.remove("error");
 
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="message">Loading employees...</td>
        </tr>
    `;
 
    try {
        const response = await fetch(API_URL);
 
        if (!response.ok) {
            throw new Error("API request failed. Status: " + response.status);
        }
 
        const data = await response.json();
 
        if (!Array.isArray(data)) {
            throw new Error("API response is not an employee list.");
        }
 
        employees = data;
        currentPage = 1;
 
        updateStatistics();
        renderEmployees();
 
        apiStatus.textContent = "● API Connected";
        recordCount.textContent = employees.length + " employee records found";
 
    } catch (error) {
        employees = [];
 
        updateStatistics();
 
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="message">
                    Unable to load employee data.
                </td>
            </tr>
        `;
 
        recordCount.textContent = "No records loaded";
        showingText.textContent = "Please check your API connection.";
 
        apiStatus.textContent = "● API Disconnected";
        apiStatus.classList.add("error");
 
        errorMessage.textContent =
            error.message + " Make sure JSON Server is running on port 3000.";
 
        errorMessage.hidden = false;
 
        console.error("Employee API Error:", error);
 
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "↻ Refresh";
    }
}
 
// Update summary cards
function updateStatistics() {
    const activeCount = employees.filter(function (employee) {
        return String(employee.status || "").toLowerCase() === "active";
    }).length;
 
    const departments = new Set(
        employees
            .map(employee => employee.department)
            .filter(Boolean)
    );
 
    totalEmployees.textContent = employees.length;
    activeEmployees.textContent = activeCount;
    totalDepartments.textContent = departments.size;
}
 
// Display employee table
function renderEmployees() {
    const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
 
    currentPage = Math.min(currentPage, totalPages);
 
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageEmployees = employees.slice(startIndex, startIndex + PAGE_SIZE);
 
    if (pageEmployees.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="message">No employees found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageEmployees.map(function (employee) {
            const status = String(employee.status || "Inactive").toLowerCase();
            const statusClass = status === "active" ? "active" : "inactive";
 
            return `
                <tr>
                    <td class="employee-id">#${safeText(employee.id)}</td>
                    <td class="employee-name">${safeText(employee.name)}</td>
                    <td>${safeText(employee.email)}</td>
                    <td>${safeText(employee.mobile)}</td>
                    <td>${safeText(employee.department)}</td>
                    <td>${formatDate(employee.joiningDate)}</td>
                    <td>
                        <span class="badge ${statusClass}">
                            ${safeText(employee.status || "Inactive")}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }
 
    pageNumber.textContent = currentPage;
    showingText.textContent = employees.length === 0
        ? "Showing 0 employees"
        : `Showing ${startIndex + 1}-${Math.min(startIndex + PAGE_SIZE, employees.length)} of ${employees.length} employees`;
 
    previousBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}
 
// Pagination
previousBtn.addEventListener("click", function () {
    if (currentPage > 1) {
        currentPage--;
        renderEmployees();
    }
});
 
nextBtn.addEventListener("click", function () {
    const totalPages = Math.ceil(employees.length / PAGE_SIZE);
 
    if (currentPage < totalPages) {
        currentPage++;
        renderEmployees();
    }
});
 
// Refresh
refreshBtn.addEventListener("click", loadEmployees);
 
// Initial API call
loadEmployees();
 