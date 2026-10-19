const API_URL = "http://localhost:3000/employees";

let employees = [];
let editingId = null;
let deletingId = null;
let currentPage = 1;
const pageSize = 10;
let isLoading = false;

const $ = id => document.getElementById(id);

function normalizeEmployee(e = {}) {
    return {
        ...e,
        id: e.id ?? e._id,
        name: String(e.name ?? e.employeeName ?? ""),
        email: String(e.email ?? ""),
        mobile: String(e.mobile ?? e.phone ?? ""),
        department: String(e.department ?? ""),
        status: String(e.status ?? "Active"),
        joiningDate: String(e.joiningDate ?? e.joining_date ?? "").slice(0, 10),
        projects: Array.isArray(e.projects)
            ? e.projects.map(p =>
                typeof p === "string"
                    ? { name: p, status: "In Progress" }
                    : {
                        name: String(p?.name ?? p?.title ?? ""),
                        status: String(p?.status ?? "In Progress")
                    }
            )
            : []
    };
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? {
                "Content-Type": "application/json"
            } : {}),
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        let message = "";
        try {
            const data = await response.json();
            message = data.message || data.error || "";
        } catch (_) {}

        throw new Error(message || `API error: ${response.status}`);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

async function getEmployees() {
    const result = await apiRequest(API_URL);
    const data = Array.isArray(result)
        ? result
        : result?.data ?? result?.employees;

    if (!Array.isArray(data)) {
        throw new Error("Invalid employees API response.");
    }

    return data.map(normalizeEmployee);
}

async function getEmployeeById(id) {
    const result = await apiRequest(
        `${API_URL}/${encodeURIComponent(id)}`
    );

    const employee = result?.data ?? result?.employee ?? result;

    if (!employee || typeof employee !== "object" || Array.isArray(employee)) {
        throw new Error("Invalid employee details response.");
    }

    return normalizeEmployee(employee);
}

async function createEmployee(employee) {
    return apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(employee)
    });
}

async function updateEmployee(id, employee) {
    return apiRequest(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(employee)
    });
}

async function deleteEmployee(id) {
    return apiRequest(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}

function setMessage(message, error = false) {
    $("message").textContent = message;
    $("message").style.color = error ? "#dc3545" : "";
}

function setLoading(button, loading, normal, busy) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? busy : normal;
}

async function loadEmployees() {
    setMessage("Loading employees...");
    $("employeeTable").innerHTML =
        '<tr><td colspan="7">Loading employees...</td></tr>';

    try {
        employees = await getEmployees();
        currentPage = 1;
        render();
    } catch (error) {
        employees = [];
        updateDashboard();

        $("employeeTable").innerHTML =
            '<tr><td colspan="7">Unable to load employees.</td></tr>';

        $("pagination").innerHTML = "";

        setMessage(
            `${error.message}. Check that the API server is running.`,
            true
        );
    }
}

function updateDashboard() {
    $("total").textContent = employees.length;

    $("active").textContent = employees.filter(
        e => e.status.toLowerCase() === "active"
    ).length;

    $("projects").textContent = employees.reduce(
        (sum, e) => sum + e.projects.filter(
            p => ["active", "in progress"].includes(
                p.status.toLowerCase()
            )
        ).length,
        0
    );

    $("unassigned").textContent = employees.filter(
        e => e.projects.length === 0
    ).length;
}

function getFilteredEmployees() {
    const search = $("search").value.toLowerCase().trim();
    const searchBy = $("searchBy").value;
    const department = $("department").value;
    const status = $("statusFilter").value;
    const projectStatus = $("projectFilter").value;
    const sort = $("sort").value;
    const direction = $("direction").value === "asc" ? 1 : -1;

    return employees.filter(e => {
        const field = searchBy === "email" ? e.email : e.name;

        const searchMatch = field.toLowerCase().includes(search);
        const departmentMatch = !department || e.department === department;
        const statusMatch = !status || e.status === status;

        const projectMatch = !projectStatus ||
            (projectStatus === "Unassigned"
                ? e.projects.length === 0
                : e.projects.some(p => p.status === projectStatus));

        return searchMatch &&
            departmentMatch &&
            statusMatch &&
            projectMatch;
    }).sort((a, b) => {
        let x;
        let y;

        if (sort === "projects") {
            x = a.projects.length;
            y = b.projects.length;
        } else if (sort === "joiningDate") {
            x = a.joiningDate;
            y = b.joiningDate;
        } else if (sort === "status") {
            x = a.status.toLowerCase();
            y = b.status.toLowerCase();
        } else {
            x = a.name.toLowerCase();
            y = b.name.toLowerCase();
        }

        return (x > y ? 1 : x < y ? -1 : 0) * direction;
    });
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function render() {
    updateDashboard();

    const filtered = getFilteredEmployees();
    const totalPages = Math.ceil(filtered.length / pageSize);

    currentPage = Math.min(currentPage, Math.max(1, totalPages));

    const start = (currentPage - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    if (!pageData.length) {
        $("employeeTable").innerHTML =
            '<tr><td colspan="7">No employees found.</td></tr>';
    } else {
        $("employeeTable").innerHTML = pageData.map(e => `
            <tr>
                <td>${safe(e.name)}</td>
                <td>${safe(e.email)}</td>
                <td>${safe(e.department)}</td>
                <td>${e.projects.length}</td>
                <td>${safe(e.status)}</td>
                <td>${safe(e.joiningDate)}</td>
                <td>
                    <button onclick="viewEmployee('${safe(e.id)}')">View</button>
                    <button onclick="editEmployee('${safe(e.id)}')">Edit</button>
                    <button class="delete"
                        onclick="askDelete('${safe(e.id)}')">Delete</button>
                </td>
            </tr>
        `).join("");
    }

    setMessage(`${filtered.length} employee(s) found`);

    $("pagination").innerHTML = "";

    if (totalPages > 1) {
        addPage("Previous", currentPage - 1, currentPage === 1);

        for (let i = 1; i <= totalPages; i++) {
            addPage(i, i, false, i === currentPage);
        }

        addPage("Next", currentPage + 1, currentPage === totalPages);
    }
}

function addPage(label, page, disabled, active = false) {
    const button = document.createElement("button");

    button.textContent = label;
    button.disabled = disabled;

    if (active) button.classList.add("active");

    button.onclick = () => {
        currentPage = page;
        render();
    };

    $("pagination").appendChild(button);
}

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

function openAdd() {
    editingId = null;
    $("employeeForm").reset();
    $("formTitle").textContent = "Add Employee";
    $("formModal").style.display = "flex";
}

function closeModal() {
    $("formModal").style.display = "none";
}

function closeDetails() {
    $("detailsModal").style.display = "none";
}

function closeDelete() {
    $("deleteModal").style.display = "none";
}

async function editEmployee(id) {
    try {
        setMessage("Loading employee details...");

        const e = await getEmployeeById(id);

        editingId = e.id;

        $("formTitle").textContent = "Edit Employee";
        $("name").value = e.name;
        $("email").value = e.email;
        $("mobile").value = e.mobile;
        $("formDepartment").value = e.department;
        $("joiningDate").value = e.joiningDate;
        $("formStatus").value = e.status;
        $("projectInput").value = e.projects.map(p => p.name).join(", ");

        $("formModal").style.display = "flex";
        setMessage("Employee details loaded.");
    } catch (error) {
        alert(`Unable to fetch employee: ${error.message}`);
        setMessage(error.message, true);
    }
}

$("employeeForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (isLoading) return;

    const saveButton = $("employeeForm").querySelector(
        'button[type="submit"]'
    );

    const name = $("name").value.trim();
    const email = $("email").value.trim();
    const mobile = $("mobile").value.trim();

    if (name.length < 3) {
        alert("Name must contain at least 3 characters.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Enter a valid email address.");
        return;
    }

    if (!/^\d{10}$/.test(mobile)) {
        alert("Enter a valid 10-digit mobile number.");
        return;
    }

    const duplicate = employees.some(e =>
        e.email.toLowerCase() === email.toLowerCase() &&
        String(e.id) !== String(editingId)
    );

    if (duplicate) {
        alert("Email already exists.");
        return;
    }

    const oldEmployee = employees.find(
        e => String(e.id) === String(editingId)
    );

    const projectNames = $("projectInput").value
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    const employee = {
        name,
        email,
        mobile,
        department: $("formDepartment").value,
        joiningDate: $("joiningDate").value,
        status: $("formStatus").value,
        projects: projectNames.map(projectName => {
            const previous = oldEmployee?.projects.find(
                p => p.name === projectName
            );

            return previous || {
                name: projectName,
                status: "In Progress"
            };
        })
    };

    const wasEditing = editingId !== null;

    isLoading = true;
    setLoading(saveButton, true, "Save Employee", "Saving...");
    setMessage(wasEditing ? "Updating employee..." : "Adding employee...");

    try {
        if (wasEditing) {
            await updateEmployee(editingId, employee);
        } else {
            await createEmployee(employee);
        }

        employees = await getEmployees();

        closeModal();
        editingId = null;
        currentPage = 1;
        render();

        setMessage(
            wasEditing
                ? "Employee updated successfully."
                : "Employee added successfully."
        );
    } catch (error) {
        setMessage(`Save failed: ${error.message}`, true);
        alert(`Unable to save employee: ${error.message}`);
    } finally {
        isLoading = false;
        setLoading(saveButton, false, "Save Employee", "Saving...");
    }
});

async function viewEmployee(id) {
    $("detailsContent").innerHTML = "<p>Loading employee details...</p>";
    $("detailsModal").style.display = "flex";

    try {
        const e = await getEmployeeById(id);

        $("detailsContent").innerHTML = `
            <p><b>Name:</b> ${safe(e.name)}</p>
            <p><b>Email:</b> ${safe(e.email)}</p>
            <p><b>Mobile:</b> ${safe(e.mobile)}</p>
            <p><b>Department:</b> ${safe(e.department)}</p>
            <p><b>Joining Date:</b> ${safe(e.joiningDate)}</p>
            <p><b>Status:</b> ${safe(e.status)}</p>
            <h3>Projects</h3>
            <ul>
                ${e.projects.length
                    ? e.projects.map(p =>
                        `<li>${safe(p.name)} — ${safe(p.status)}</li>`
                    ).join("")
                    : "<li>No projects assigned</li>"
                }
            </ul>
        `;
    } catch (error) {
        $("detailsContent").innerHTML =
            `<p>Unable to load details: ${safe(error.message)}</p>`;
    }
}

function askDelete(id) {
    deletingId = id;
    $("deleteModal").style.display = "flex";
}

async function confirmDelete() {
    if (isLoading || deletingId === null) return;

    const deleteButton = $("deleteModal").querySelector(".delete");

    isLoading = true;
    setLoading(deleteButton, true, "Delete", "Deleting...");
    setMessage("Deleting employee...");

    try {
        await deleteEmployee(deletingId);
        employees = await getEmployees();

        closeDelete();
        deletingId = null;
        render();

        setMessage("Employee deleted successfully.");
    } catch (error) {
        setMessage(`Delete failed: ${error.message}`, true);
        alert(`Unable to delete employee: ${error.message}`);
    } finally {
        isLoading = false;
        setLoading(deleteButton, false, "Delete", "Deleting...");
    }
}

loadEmployees();