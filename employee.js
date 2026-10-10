const API_URL = "http://localhost:3000/employees";

let employees = [];
let editingId = null;
let deletingId = null;
let currentPage = 1;
const pageSize = 10;
let localMode = true;

const demoData = [
    {
        id: 1,
        name: "John Smith",
        email: "john@gmail.com",
        mobile: "9876543210",
        department: "Engineering",
        status: "Active",
        joiningDate: "2026-01-12",
        projects: [
            { name: "Project A", status: "Active" },
            { name: "Project B", status: "Completed" },
            { name: "Project C", status: "Active" }
        ]
    },
    {
        id: 2,
        name: "David Lee",
        email: "david@gmail.com",
        mobile: "9876543211",
        department: "Finance",
        status: "Active",
        joiningDate: "2025-11-10",
        projects: [
            { name: "Finance App", status: "In Progress" },
            { name: "Reports", status: "Completed" }
        ]
    },
    {
        id: 3,
        name: "Sarah Khan",
        email: "sarah@gmail.com",
        mobile: "9876543212",
        department: "HR",
        status: "Inactive",
        joiningDate: "2025-08-20",
        projects: [
            { name: "Hiring Portal", status: "Completed" }
        ]
    }
];

function normalizeEmployee(e) {
    return {
        ...e,
        joiningDate: e.joiningDate || "",
        projects: Array.isArray(e.projects)
            ? e.projects.map(p =>
                typeof p === "string"
                    ? { name: p, status: "In Progress" }
                    : p
              )
            : []
    };
}

// API FUNCTIONS
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        throw new Error("API error: " + response.status);
    }

    if (response.status === 204) return null;
    return response.json();
}

async function getEmployees() {
    return apiRequest(API_URL);
}

async function getEmployeeById(id) {
    return apiRequest(`${API_URL}/${id}`);
}

async function createEmployee(employee) {
    return apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(employee)
    });
}

async function updateEmployee(id, employee) {
    return apiRequest(`${API_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(employee)
    });
}

async function deleteEmployee(id) {
    return apiRequest(`${API_URL}/${id}`, {
        method: "DELETE"
    });
}

async function loadEmployees() {
    document.getElementById("message").textContent =
        "Loading employees...";

    try {
        const data = await getEmployees();
        if (!Array.isArray(data)) throw new Error("Invalid API data");

        employees = data.map(normalizeEmployee);
        localMode = false;
        render();
    } catch (error) {
        localMode = true;
        employees = demoData.map(e => ({
            ...e,
            projects: e.projects.map(p => ({ ...p }))
        }));
        render();

        document.getElementById("message").innerHTML =
            'API unavailable. Demo data shown. ' +
            '<button onclick="loadEmployees()">Retry API</button>';
    }
}

function updateDashboard() {
    document.getElementById("total").textContent =
        employees.length;

    document.getElementById("active").textContent =
        employees.filter(e => e.status === "Active").length;

    document.getElementById("projects").textContent =
        employees.reduce((sum, e) =>
            sum + e.projects.filter(p =>
                p.status === "Active" ||
                p.status === "In Progress"
            ).length, 0);

    document.getElementById("unassigned").textContent =
        employees.filter(e => e.projects.length === 0).length;
}

function getFilteredEmployees() {
    const search = document.getElementById("search")
        .value.toLowerCase().trim();

    const department =
        document.getElementById("department").value;

    const status =
        document.getElementById("statusFilter").value;

    const projectStatus =
        document.getElementById("projectFilter").value;

    const sort = document.getElementById("sort").value;
    const direction =
        document.getElementById("direction").value === "asc" ? 1 : -1;

    return employees.filter(e => {
        const searchMatch =
            e.name.toLowerCase().includes(search) ||
            e.email.toLowerCase().includes(search);

        const departmentMatch =
            !department || e.department === department;

        const statusMatch =
            !status || e.status === status;

        const projectMatch = !projectStatus ||
            (projectStatus === "Unassigned"
                ? e.projects.length === 0
                : e.projects.some(p => p.status === projectStatus));

        return searchMatch && departmentMatch &&
            statusMatch && projectMatch;
    }).sort((a, b) => {
        let x, y;

        if (sort === "projects") {
            x = a.projects.length;
            y = b.projects.length;
        } else if (sort === "joiningDate") {
            x = a.joiningDate;
            y = b.joiningDate;
        } else if (sort === "status") {
            x = a.status;
            y = b.status;
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
    }[char]));
}

function render() {
    updateDashboard();

    const filtered = getFilteredEmployees();
    const totalPages = Math.ceil(filtered.length / pageSize);

    if (currentPage > totalPages) {
        currentPage = Math.max(1, totalPages);
    }

    const start = (currentPage - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);
    const tbody = document.getElementById("employeeTable");

    if (!pageData.length) {
        tbody.innerHTML =
            '<tr><td colspan="7">No employees found.</td></tr>';
    } else {
        tbody.innerHTML = pageData.map(e => `
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

    document.getElementById("message").textContent =
        `${filtered.length} employee(s) found` +
        (localMode ? " — Demo Mode" : "");

    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

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

    document.getElementById("pagination").appendChild(button);
}

["search", "department", "statusFilter",
 "projectFilter", "sort", "direction"].forEach(id => {
    document.getElementById(id).addEventListener(
        id === "search" ? "input" : "change",
        () => {
            currentPage = 1;
            render();
        }
    );
});

function openAdd() {
    editingId = null;
    document.getElementById("employeeForm").reset();
    document.getElementById("formTitle").textContent = "Add Employee";
    document.getElementById("formModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("formModal").style.display = "none";
}

function closeDetails() {
    document.getElementById("detailsModal").style.display = "none";
}

function closeDelete() {
    document.getElementById("deleteModal").style.display = "none";
}

function editEmployee(id) {
    const e = employees.find(x => String(x.id) === String(id));
    if (!e) return;

    editingId = e.id;
    document.getElementById("formTitle").textContent = "Edit Employee";
    document.getElementById("name").value = e.name;
    document.getElementById("email").value = e.email;
    document.getElementById("mobile").value = e.mobile || "";
    document.getElementById("formDepartment").value = e.department;
    document.getElementById("joiningDate").value = e.joiningDate;
    document.getElementById("formStatus").value = e.status;
    document.getElementById("projectInput").value =
        e.projects.map(p => p.name).join(", ");

    document.getElementById("formModal").style.display = "flex";
}

document.getElementById("employeeForm")
.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const mobile = document.getElementById("mobile").value.trim();

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

    if (employees.some(e =>
        e.email.toLowerCase() === email.toLowerCase() &&
        String(e.id) !== String(editingId)
    )) {
        alert("Email already exists.");
        return;
    }

    const old = employees.find(e =>
        String(e.id) === String(editingId));

    const projectNames = document.getElementById("projectInput")
        .value.split(",").map(p => p.trim()).filter(Boolean);

    const employee = {
        name,
        email,
        mobile,
        department: document.getElementById("formDepartment").value,
        joiningDate: document.getElementById("joiningDate").value,
        status: document.getElementById("formStatus").value,
        projects: projectNames.map(name => {
            const previous = old?.projects.find(p => p.name === name);
            return previous || { name, status: "In Progress" };
        })
    };

    try {
        if (localMode) {
            if (editingId !== null) {
                employees = employees.map(e =>
                    String(e.id) === String(editingId)
                        ? { ...employee, id: editingId }
                        : e
                );
            } else {
                employees.push({ ...employee, id: Date.now() });
            }
        } else {
            if (editingId !== null) {
                await updateEmployee(editingId, employee);
            } else {
                await createEmployee(employee);
            }
            employees = (await getEmployees()).map(normalizeEmployee);
        }

        closeModal();
        currentPage = 1;
        render();
    } catch (error) {
        alert("Unable to save. Check your API connection.");
    }
});

function viewEmployee(id) {
    const e = employees.find(x => String(x.id) === String(id));
    if (!e) return;

    document.getElementById("detailsContent").innerHTML = `
        <p><b>Name:</b> ${safe(e.name)}</p>
        <p><b>Email:</b> ${safe(e.email)}</p>
        <p><b>Mobile:</b> ${safe(e.mobile)}</p>
        <p><b>Department:</b> ${safe(e.department)}</p>
        <p><b>Joining Date:</b> ${safe(e.joiningDate)}</p>
        <p><b>Status:</b> ${safe(e.status)}</p>
        <h3>Projects</h3>
        <ul>${e.projects.length
            ? e.projects.map(p =>
                `<li>${safe(p.name)} — ${safe(p.status)}</li>`
              ).join("")
            : "<li>No projects assigned</li>"}
        </ul>
    `;

    document.getElementById("detailsModal").style.display = "flex";
}

function askDelete(id) {
    deletingId = id;
    document.getElementById("deleteModal").style.display = "flex";
}

async function confirmDelete() {
    try {
        if (localMode) {
            employees = employees.filter(e =>
                String(e.id) !== String(deletingId));
        } else {
            await deleteEmployee(deletingId);
            employees = (await getEmployees()).map(normalizeEmployee);
        }

        closeDelete();
        render();
    } catch (error) {
        alert("Unable to delete employee. Check your API connection.");
    }
}

loadEmployees();