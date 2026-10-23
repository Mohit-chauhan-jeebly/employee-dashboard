
"use strict";

const API_URL = "http://localhost:3000/employees";
const PAGE_SIZE = 10;

let employees = [];
let editingId = null;
let deletingId = null;
let currentPage = 1;
let isLoading = false;
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function normalizeEmployee(item = {}) {
    const projects = Array.isArray(item.projects) ? item.projects : [];

    return {
        ...item,
        id: item.id ?? item._id ?? "",
        name: String(item.name ?? item.employeeName ?? ""),
        email: String(item.email ?? ""),
        mobile: String(item.mobile ?? item.phone ?? ""),
        department: String(item.department ?? ""),
        status: String(item.status ?? "Active"),
        joiningDate: String(item.joiningDate ?? item.joining_date ?? "").slice(0, 10),
        projects: projects.map((project) => {
            if (typeof project === "string") {
                return {
                    name: project,
                    status: "In Progress"
                };
            }

            return {
                name: String(project?.name ?? project?.title ?? ""),
                status: String(project?.status ?? "In Progress")
            };
        })
    };
}

async function apiRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body ? {
                    "Content-Type": "application/json"
                } : {}),
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error(
            "Failed to fetch. Start JSON Server with: npx json-server db.json --port 3000, then check the API URL."
        );
    }

    if (!response.ok) {
        let detail = "";

        try {
            const payload = await response.json();
            detail = payload?.message || payload?.error || "";
        } catch (_) {
            detail = "";
        }

        throw new Error(
            detail || `API request failed (${response.status} ${response.statusText})`
        );
    }

    if (response.status === 204) {
        return null;
    }

    const raw = await response.text();

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (_) {
        throw new Error("API returned invalid JSON. Check the backend response.");
    }
}

// GET: Fetch all employees
async function getEmployees() {
    const result = await apiRequest(API_URL);

    const list = Array.isArray(result)
        ? result
        : result?.data ?? result?.employees;

    if (!Array.isArray(list)) {
        throw new Error(
            "Employee API must return an array, or an object containing employees/data array."
        );
    }

    return list.map(normalizeEmployee);
}

// GET: Fetch a single employee by ID
async function getEmployeeById(id) {
    const result = await apiRequest(
        `${API_URL}/${encodeURIComponent(id)}`
    );

    const employee = result?.data ?? result?.employee ?? result;

    if (
        !employee ||
        typeof employee !== "object" ||
        Array.isArray(employee)
    ) {
        throw new Error("Employee details API returned an invalid response.");
    }

    return normalizeEmployee(employee);
}

// POST: Create a new employee
async function createEmployee(payload) {
    return apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

// PUT: Update an existing employee
async function updateEmployee(id, payload) {
    return apiRequest(
        `${API_URL}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );
}

// DELETE: Remove an employee
async function deleteEmployeeRequest(id) {
    return apiRequest(
        `${API_URL}/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );
}

function setMessage(message, isError = false) {
    const node = $("message");

    node.textContent = message;
    node.classList.toggle("error", isError);
}

function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

function setBusy(busy) {
    isLoading = busy;

    $("addEmployeeButton").disabled = busy;
    $("saveButton").disabled = busy;
    $("confirmDeleteButton").disabled = busy;

    $("saveButton").textContent = busy
        ? "Saving..."
        : "Save Employee";

    $("confirmDeleteButton").textContent = busy
        ? "Deleting..."
        : "Delete";
}

// Load employees from API
async function loadEmployees({ preservePage = false } = {}) {
    if (!preservePage) {
        currentPage = 1;
    }

    setMessage("Loading employees...");

    $("employeeTable").innerHTML =
        '<tr><td colspan="7" class="table-state">Loading employees...</td></tr>';

    $("tableSummary").textContent = "Loading records...";

    try {
        employees = await getEmployees();

        render();

        if (employees.length === 0) {
            setMessage(
                "No employees found. Use Add Employee to create the first record."
            );
        }
    } catch (error) {
        employees = [];

        updateDashboard();

        $("employeeTable").innerHTML = `
            <tr>
                <td colspan="7" class="table-state">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

        $("pagination").innerHTML = "";
        $("tableSummary").textContent = "Could not load records";

        setMessage(error.message, true);
    }
}

// Update dashboard cards
function updateDashboard() {
    $("total").textContent = employees.length;

    $("active").textContent = employees.filter(
        employee => employee.status.toLowerCase() === "active"
    ).length;

    $("projects").textContent = employees.reduce(
        (total, employee) => {
            return total + employee.projects.filter(project =>
                ["active", "in progress"].includes(
                    project.status.toLowerCase()
                )
            ).length;
        },
        0
    );

    $("unassigned").textContent = employees.filter(
        employee => employee.projects.length === 0
    ).length;
}

// Search, filter and sort employees
function getFilteredEmployees() {
    const query = $("search").value.trim().toLowerCase();
    const searchBy = $("searchBy").value;
    const department = $("department").value;
    const status = $("statusFilter").value;
    const projectStatus = $("projectFilter").value;
    const sortBy = $("sort").value;

    const multiplier =
        $("direction").value === "desc" ? -1 : 1;

    return employees
        .filter(employee => {
            const searchable = searchBy === "email"
                ? employee.email
                : employee.name;

            const searchMatch = searchable
                .toLowerCase()
                .includes(query);

            const departmentMatch =
                !department || employee.department === department;

            const statusMatch =
                !status || employee.status === status;

            const projectMatch = !projectStatus ||
                (
                    projectStatus === "Unassigned"
                        ? employee.projects.length === 0
                        : employee.projects.some(
                            project => project.status === projectStatus
                        )
                );

            return (
                searchMatch &&
                departmentMatch &&
                statusMatch &&
                projectMatch
            );
        })
        .sort((a, b) => {
            let left;
            let right;

            if (sortBy === "projects") {
                left = a.projects.length;
                right = b.projects.length;
            } else if (sortBy === "joiningDate") {
                left = a.joiningDate;
                right = b.joiningDate;
            } else if (sortBy === "status") {
                left = a.status.toLowerCase();
                right = b.status.toLowerCase();
            } else {
                left = a.name.toLowerCase();
                right = b.name.toLowerCase();
            }

            return (
                left > right ? 1 :
                left < right ? -1 : 0
            ) * multiplier;
        });
}

// Render employee table and pagination
function render() {
    updateDashboard();

    const filtered = getFilteredEmployees();

    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / PAGE_SIZE)
    );

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;

    const pageRows = filtered.slice(
        start,
        start + PAGE_SIZE
    );

    if (!pageRows.length) {
        $("employeeTable").innerHTML = `
            <tr>
                <td colspan="7" class="table-state">
                    No employees match your search or filters.
                </td>
            </tr>
        `;
    } else {
        $("employeeTable").innerHTML = pageRows.map(employee => {
            const statusClass =
                employee.status.toLowerCase() === "active"
                    ? "active"
                    : "inactive";

            const id = escapeHtml(employee.id);

            return `
                <tr>
                    <td class="employee-name">
                        ${escapeHtml(employee.name)}
                    </td>

                    <td class="employee-email">
                        ${escapeHtml(employee.email)}
                    </td>

                    <td>${escapeHtml(employee.department)}</td>

                    <td>${employee.projects.length}</td>

                    <td>
                        <span class="status-pill ${statusClass}">
                            ${escapeHtml(employee.status)}
                        </span>
                    </td>

                    <td>${escapeHtml(employee.joiningDate || "—")}</td>

                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="action-button"
                                data-action="view"
                                data-id="${id}">
                                View
                            </button>

                            <button
                                type="button"
                                class="action-button"
                                data-action="edit"
                                data-id="${id}">
                                Edit
                            </button>

                            <button
                                type="button"
                                class="action-button delete"
                                data-action="delete"
                                data-id="${id}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    const first = filtered.length ? start + 1 : 0;
    const last = Math.min(
        start + PAGE_SIZE,
        filtered.length
    );

    $("tableSummary").textContent =
        `${first}–${last} of ${filtered.length} employee(s)`;

    setMessage(`${filtered.length} employee(s) found`);

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = $("pagination");

    pagination.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }

    addPageButton(
        "Previous",
        currentPage - 1,
        currentPage === 1
    );

    for (let page = 1; page <= totalPages; page++) {
        addPageButton(
            String(page),
            page,
            false,
            page === currentPage
        );
    }

    addPageButton(
        "Next",
        currentPage + 1,
        currentPage === totalPages
    );
}

function addPageButton(label, page, disabled, active = false) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;

    if (active) {
        button.classList.add("active");
    }

    button.addEventListener("click", () => {
        currentPage = page;
        render();
    });

    $("pagination").appendChild(button);
}

// Search and filter events
[
    "search",
    "searchBy",
    "department",
    "statusFilter",
    "projectFilter",
    "sort",
    "direction"
].forEach(id => {
    $(id).addEventListener(
        id === "search" ? "input" : "change",
        () => {
            currentPage = 1;
            render();
        }
    );
});

// Employee action buttons
$("employeeTable").addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const id = button.dataset.id;

    if (button.dataset.action === "view") {
        await viewEmployee(id);
    }

    if (button.dataset.action === "edit") {
        await editEmployee(id);
    }

    if (button.dataset.action === "delete") {
        askDelete(id);
    }
});

// Open Add Employee form
function openAdd() {
    if (isLoading) {
        return;
    }

    editingId = null;

    $("employeeForm").reset();
    $("formError").textContent = "";
    $("formTitle").textContent = "Add Employee";
    $("saveButton").textContent = "Save Employee";

    $("formModal").classList.add("open");
    $("name").focus();
}

function closeModal() {
    if (isLoading) {
        return;
    }

    $("formModal").classList.remove("open");
    $("formError").textContent = "";
}

function closeDetails() {
    $("detailsModal").classList.remove("open");
}

function closeDelete() {
    if (isLoading) {
        return;
    }

    $("deleteModal").classList.remove("open");
    $("deleteError").textContent = "";
    deletingId = null;
}

// Edit employee using single-employee GET API
async function editEmployee(id) {
    try {
        setMessage("Loading employee details...");

        const employee = await getEmployeeById(id);

        editingId = employee.id;

        $("employeeForm").reset();
        $("formError").textContent = "";
        $("formTitle").textContent = "Edit Employee";

        $("name").value = employee.name;
        $("email").value = employee.email;
        $("mobile").value = employee.mobile;
        $("formDepartment").value = employee.department;
        $("joiningDate").value = employee.joiningDate;
        $("formStatus").value = employee.status;

        $("projectInput").value = employee.projects
            .map(project => project.name)
            .join(", ");

        $("formModal").classList.add("open");

        setMessage("Employee details loaded.");
    } catch (error) {
        setMessage(
            `Could not load employee details: ${error.message}`,
            true
        );

        showToast("Unable to fetch employee details.");
    }
}

// Prepare form data for API
function buildEmployeePayload() {
    const projectNames = $("projectInput")
        .value
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);

    return {
        name: $("name").value.trim(),
        email: $("email").value.trim(),
        mobile: $("mobile").value.trim(),
        department: $("formDepartment").value,
        joiningDate: $("joiningDate").value,
        status: $("formStatus").value,

        projects: projectNames.map(name => ({
            name,
            status: "In Progress"
        }))
    };
}

// Add or update employee
$("employeeForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (isLoading) {
        return;
    }

    const form = $("employeeForm");

    if (!form.reportValidity()) {
        return;
    }

    const payload = buildEmployeePayload();

    if (payload.name.length < 3) {
        $("formError").textContent =
            "Name must contain at least 3 characters.";
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        $("formError").textContent =
            "Please enter a valid email address.";
        return;
    }

    if (!/^\d{10}$/.test(payload.mobile)) {
        $("formError").textContent =
            "Mobile number must contain exactly 10 digits.";
        return;
    }

    setBusy(true);
    $("formError").textContent = "";

    try {
        if (
            editingId !== null &&
            editingId !== undefined &&
            editingId !== ""
        ) {
            await updateEmployee(editingId, payload);
            showToast("Employee updated successfully.");
        } else {
            await createEmployee(payload);
            showToast("Employee added successfully.");
        }

        $("formModal").classList.remove("open");

        editingId = null;

        await loadEmployees({ preservePage: true });
    } catch (error) {
        $("formError").textContent = error.message;
        setMessage(error.message, true);
    } finally {
        setBusy(false);
    }
});

// View employee details using GET by ID
async function viewEmployee(id) {
    try {
        setMessage("Loading employee details...");

        const employee = await getEmployeeById(id);

        const projects = employee.projects.length
            ? `
                <ul class="projects-list">
                    ${employee.projects.map(project => `
                        <li>
                            ${escapeHtml(project.name)}
                            — ${escapeHtml(project.status)}
                        </li>
                    `).join("")}
                </ul>
            `
            : "<p>No projects assigned.</p>";

        $("detailsContent").innerHTML = `
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.name)}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.email)}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Mobile</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.mobile)}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Department</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.department)}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Joining Date</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.joiningDate || "—")}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        ${escapeHtml(employee.status)}
                    </div>
                </div>
            </div>

            <h3>Projects</h3>
            ${projects}
        `;

        $("detailsModal").classList.add("open");

        setMessage("Employee details loaded.");
    } catch (error) {
        setMessage(
            `Could not load employee details: ${error.message}`,
            true
        );

        showToast("Unable to fetch employee details.");
    }
}

// Open Delete confirmation
function askDelete(id) {
    if (isLoading) {
        return;
    }

    deletingId = id;

    $("deleteError").textContent = "";
    $("deleteModal").classList.add("open");
}

// Delete employee
async function confirmDelete() {
    if (
        deletingId === null ||
        deletingId === undefined ||
        isLoading
    ) {
        return;
    }

    setBusy(true);
    $("deleteError").textContent = "";

    try {
        await deleteEmployeeRequest(deletingId);

        $("deleteModal").classList.remove("open");

        deletingId = null;

        showToast("Employee deleted successfully.");

        await loadEmployees({ preservePage: true });
    } catch (error) {
        $("deleteError").textContent = error.message;
        setMessage(error.message, true);
    } finally {
        setBusy(false);
    }
}

// Close modal by clicking outside
document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal && !isLoading) {
            modal.classList.remove("open");
        }
    });
});

// Close modal with Escape key
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !isLoading) {
        document.querySelectorAll(".modal.open").forEach(modal => {
            modal.classList.remove("open");
        });
    }
});

// Start loading data
loadEmployees();
