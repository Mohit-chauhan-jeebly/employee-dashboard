
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 10;

  let API_URL = "";
  let employees = [];
  let currentPage = 1;

  // -------------------------------
  // HELPER FUNCTIONS
  // -------------------------------

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const getProjects = (employee) =>
    Array.isArray(employee.projects) ? employee.projects : [];

  const projectCount = (employee) =>
    getProjects(employee).length;

  const dateLabel = (value) => {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
  };

  function getApiUrl() {
    if (!API_URL) {
      if (typeof window.getEmployeesApiUrl !== "function") {
        throw new Error(
          "API configuration missing. Please check config.js."
        );
      }

      API_URL = window.getEmployeesApiUrl().replace(/\/+$/, "");
    }

    return API_URL;
  }

  function showMessage(type, message) {
    $("errorMessage").hidden = true;
    $("successMessage").hidden = true;

    $("errorMessage").textContent = "";
    $("successMessage").textContent = "";

    if (!message) return;

    const target = type === "error"
      ? $("errorMessage")
      : $("successMessage");

    target.textContent = message;
    target.hidden = false;
  }

  function setApiStatus(online, message) {
    $("apiStatus").textContent = message;

    $("apiDot").className = online
      ? "status-dot online"
      : "status-dot offline";
  }

  function setLoading(loading) {
    $("loadingState").hidden = !loading;
    $("refreshBtn").disabled = loading;
    $("retryBtn").disabled = loading;
  }

  // -------------------------------
  // MODAL FUNCTIONS
  // -------------------------------

  function openModal(id) {
    $(id).classList.add("open");
    $(id).setAttribute("aria-hidden", "false");
  }

  function closeModal(id) {
    $(id).classList.remove("open");
    $(id).setAttribute("aria-hidden", "true");
  }

  // -------------------------------
  // DASHBOARD STATISTICS
  // -------------------------------

  function updateStats() {
    $("totalEmployees").textContent = employees.length;

    $("activeEmployees").textContent =
      employees.filter(
        (employee) => employee.status === "Active"
      ).length;

    $("activeProjects").textContent =
      employees.reduce((total, employee) => {
        return total + getProjects(employee).filter(
          (project) => project.status === "In Progress"
        ).length;
      }, 0);

    $("unassignedEmployees").textContent =
      employees.filter(
        (employee) => projectCount(employee) === 0
      ).length;

    // Update department dropdown without losing selection.
    const previous = $("departmentFilter").value;

    const departments = [
      ...new Set(
        employees
          .map((employee) => employee.department)
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));

    $("departmentFilter").innerHTML =
      '<option value="">All Departments</option>' +
      departments.map((department) =>
        `<option value="${escapeHTML(department)}">${escapeHTML(department)}</option>`
      ).join("");

    $("departmentFilter").value =
      departments.includes(previous) ? previous : "";
  }

  // -------------------------------
  // SEARCH, FILTER AND SORT
  // -------------------------------

  function getFilteredEmployees() {
    const query = $("searchInput").value.trim().toLowerCase();
    const department = $("departmentFilter").value;
    const status = $("statusFilter").value;
    const projectStatus = $("projectStatusFilter").value;

    const result = employees.filter((employee) => {
      const searchable = [
        employee.id,
        employee.name,
        employee.email,
        employee.mobile,
        employee.department
      ].join(" ").toLowerCase();

      const projects = getProjects(employee);

      const projectMatch =
        !projectStatus ||
        (projectStatus === "Unassigned"
          ? projects.length === 0
          : projects.some(
              (project) => project.status === projectStatus
            ));

      return (
        (!query || searchable.includes(query)) &&
        (!department || employee.department === department) &&
        (!status || employee.status === status) &&
        projectMatch
      );
    });

    const [sortKey, direction] =
      $("sortFilter").value.split("-");

    const multiplier = direction === "desc" ? -1 : 1;

    result.sort((a, b) => {
      let first;
      let second;

      if (sortKey === "projects") {
        first = projectCount(a);
        second = projectCount(b);
      } else if (sortKey === "date") {
        first = a.joiningDate || "";
        second = b.joiningDate || "";
      } else if (sortKey === "status") {
        first = a.status || "";
        second = b.status || "";
      } else {
        first = (a.name || "").toLowerCase();
        second = (b.name || "").toLowerCase();
      }

      return (
        (first > second ? 1 : first < second ? -1 : 0) *
        multiplier
      );
    });

    return result;
  }

  // -------------------------------
  // PAGINATION
  // -------------------------------

  function renderPagination(totalPages) {
    const nav = $("pagination");
    nav.innerHTML = "";

    const addButton = (
      label,
      page,
      disabled = false,
      active = false
    ) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className =
        `page-button${active ? " active" : ""}`;

      button.textContent = label;
      button.disabled = disabled;

      button.addEventListener("click", () => {
        currentPage = page;
        renderTable();

        $("employeeTable").scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      });

      nav.appendChild(button);
    };

    addButton(
      "‹",
      Math.max(1, currentPage - 1),
      currentPage === 1
    );

    for (let page = 1; page <= totalPages; page++) {
      addButton(
        String(page),
        page,
        false,
        page === currentPage
      );
    }

    addButton(
      "›",
      Math.min(totalPages, currentPage + 1),
      currentPage === totalPages
    );
  }

  // -------------------------------
  // EMPLOYEE TABLE
  // -------------------------------

  function renderTable() {
    const filtered = getFilteredEmployees();

    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / PAGE_SIZE)
    );

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;

    const visible = filtered.slice(
      start,
      start + PAGE_SIZE
    );

    $("employeeTable").innerHTML = visible.length
      ? visible.map((employee) => {
          const projectStatuses = [
            ...new Set(
              getProjects(employee).map(
                (project) => project.status || "Pending"
              )
            )
          ];

          const projectText = projectStatuses.length
            ? projectStatuses.join(", ")
            : "Unassigned";

          return `
            <tr>
              <td>
                <strong class="employee-name">
                  ${escapeHTML(employee.name)}
                </strong>
                <span class="muted">
                  ID: ${escapeHTML(employee.id)}
                </span>
              </td>

              <td>
                ${escapeHTML(employee.email)}
                <span class="muted">
                  ${escapeHTML(employee.mobile)}
                </span>
              </td>

              <td>${escapeHTML(employee.department || "—")}</td>

              <td>
                <span class="project-count">
                  ${projectCount(employee)}
                </span>
              </td>

              <td>
                <span class="project-pill">
                  ${escapeHTML(projectText)}
                </span>
              </td>

              <td>
                <span class="pill ${
                  employee.status === "Active" ? "" : "inactive"
                }">
                  ${escapeHTML(employee.status || "Unknown")}
                </span>
              </td>

              <td>${escapeHTML(dateLabel(employee.joiningDate))}</td>

              <td>
                <div class="actions">
                  <button class="action-button"
                    data-action="view"
                    data-id="${escapeHTML(employee.id)}">
                    View
                  </button>

                  <button class="action-button"
                    data-action="edit"
                    data-id="${escapeHTML(employee.id)}">
                    Edit
                  </button>

                  <button class="action-button delete"
                    data-action="delete"
                    data-id="${escapeHTML(employee.id)}">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="8" class="empty-cell">
            No employees found. Try changing your search or filters.
          </td>
        </tr>
      `;

    $("showingText").textContent =
      `Showing ${filtered.length ? start + 1 : 0}–${Math.min(
        start + PAGE_SIZE,
        filtered.length
      )} of ${filtered.length} records`;

    renderPagination(totalPages);
  }

  // -------------------------------
  // LOAD EMPLOYEES FROM API
  // -------------------------------

  async function loadEmployees() {
    setLoading(true);
    showMessage("", "");

    $("retryPanel").hidden = true;
    $("retryMessage").textContent = "";

    setApiStatus(false, "Connecting to employee API…");

    $("employeeTable").innerHTML = `
      <tr>
        <td colspan="8" class="empty-cell">
          Loading employee records…
        </td>
      </tr>
    `;

    try {
      const url = getApiUrl();

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        15000
      );

      let response;

      try {
        response = await fetch(
          `${url}?_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache"
            },
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(
          `GET request failed with HTTP ${response.status}`
        );
      }

      const data = await response.json();

      // Accept an array OR { employees: [...] }.
      const records = Array.isArray(data)
        ? data
        : data?.employees;

      if (!Array.isArray(records)) {
        throw new Error(
          "Invalid API response. Expected an employee array."
        );
      }

      employees = records;
      currentPage = 1;

      updateStats();
      renderTable();

      $("retryPanel").hidden = true;
      $("retryMessage").textContent = "";

      showMessage("", "");

      setApiStatus(
        true,
        `API connected · ${employees.length} employee record(s)`
      );

      if (employees.length === 0) {
        showMessage(
          "success",
          "API connected successfully. No employees are available yet."
        );
      }

      return true;

    } catch (error) {
      employees = [];

      updateStats();
      renderTable();

      const errorText =
        error.name === "AbortError"
          ? "API request timed out. Check whether your backend is running."
          : error.message || "Unable to connect to the API.";

      setApiStatus(false, "API disconnected");

      $("retryMessage").textContent = errorText;
      $("retryPanel").hidden = false;

      showMessage("error", errorText);

      console.error("Employee API Error:", error);

      return false;

    } finally {
      setLoading(false);
    }
  }

  // -------------------------------
  // ADD / EDIT EMPLOYEE FORM
  // -------------------------------

  function openEmployeeForm(employee = null) {
    $("employeeForm").reset();
    $("formMessage").textContent = "";

    $("employeeId").value = employee?.id ?? "";

    $("modalTitle").textContent =
      employee ? "Edit Employee" : "Add Employee";

    $("employeeName").value = employee?.name || "";
    $("employeeEmail").value = employee?.email || "";
    $("employeeMobile").value = employee?.mobile || "";
    $("employeeDepartment").value = employee?.department || "";
    $("employeeJoiningDate").value = employee?.joiningDate || "";
    $("employeeStatus").value = employee?.status || "Active";

    $("projectName").value = getProjects(employee || {})
      .map((project) => project.name)
      .join(", ");

    $("projectStatus").value =
      getProjects(employee || {})[0]?.status || "In Progress";

    openModal("employeeModal");
    $("employeeName").focus();
  }

  // -------------------------------
  // EMPLOYEE DETAILS
  // -------------------------------

  function showEmployeeDetails(employee) {
    const fields = [
      ["Employee ID", employee.id],
      ["Full Name", employee.name],
      ["Email", employee.email],
      ["Mobile", employee.mobile],
      ["Department", employee.department],
      ["Joining Date", dateLabel(employee.joiningDate)],
      ["Employee Status", employee.status]
    ];

    $("detailsContent").innerHTML = `
      <div class="detail-grid">
        ${fields.map(([label, value]) => `
          <div class="detail-item">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(value || "—")}</strong>
          </div>
        `).join("")}
      </div>

      <div class="project-list">
        <h3>Assigned Projects (${projectCount(employee)})</h3>

        ${
          projectCount(employee)
            ? getProjects(employee).map((project) => `
                <div class="project-row">
                  <strong>
                    ${escapeHTML(project.name || "Unnamed project")}
                  </strong>
                  <span class="project-pill">
                    ${escapeHTML(project.status || "Pending")}
                  </span>
                </div>
              `).join("")
            : '<p class="muted">No projects assigned to this employee.</p>'
        }
      </div>
    `;

    openModal("detailsModal");
  }

  // -------------------------------
  // SAVE EMPLOYEE: POST / PUT
  // -------------------------------

  async function saveEmployee(event) {
    event.preventDefault();

    $("formMessage").textContent = "";

    let url;

    try {
      url = getApiUrl();
    } catch (error) {
      $("formMessage").textContent = error.message;
      return;
    }

    const id = $("employeeId").value;

    const name = $("employeeName").value.trim();
    const email = $("employeeEmail").value.trim().toLowerCase();
    const mobile = $("employeeMobile").value.trim();

    if (name.length < 3) {
      $("formMessage").textContent =
        "Name must contain at least 3 characters.";
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("formMessage").textContent =
        "Enter a valid email address.";
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      $("formMessage").textContent =
        "Enter a valid 10-digit mobile number.";
      return;
    }

    const projectNames = $("projectName").value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const payload = {
      name,
      email,
      mobile,
      department: $("employeeDepartment").value,
      joiningDate: $("employeeJoiningDate").value,
      status: $("employeeStatus").value,
      projects: projectNames.map((projectName) => ({
        name: projectName,
        status: $("projectStatus").value
      }))
    };

    const duplicate = employees.find((employee) =>
      String(employee.id) !== String(id) &&
      (
        String(employee.email || "").toLowerCase() === email ||
        String(employee.mobile || "") === mobile
      )
    );

    if (duplicate) {
      $("formMessage").textContent =
        "This email address or mobile number is already assigned to another employee.";
      return;
    }

    const button = $("saveEmployeeBtn");

    button.disabled = true;
    button.textContent = id ? "Updating…" : "Saving…";

    try {
      const requestUrl = id
        ? `${url}/${encodeURIComponent(id)}`
        : url;

      const response = await fetch(requestUrl, {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(
          `${id ? "PUT" : "POST"} request failed with HTTP ${response.status}`
        );
      }

      closeModal("employeeModal");

      const refreshed = await loadEmployees();

      if (refreshed) {
        showMessage(
          "success",
          id
            ? "Employee updated successfully."
            : "Employee added successfully."
        );
      } else {
        showMessage(
          "error",
          "Employee was saved, but the latest employee list could not be refreshed. Use Retry."
        );
      }

    } catch (error) {
      $("formMessage").textContent = error.message;

      showMessage("error", error.message);

      $("retryMessage").textContent =
        "Save failed. Check the API connection, then retry.";

      $("retryPanel").hidden = false;

    } finally {
      button.disabled = false;
      button.textContent = "Save Employee";
    }
  }

  // -------------------------------
  // DELETE EMPLOYEE
  // -------------------------------

  async function deleteEmployee(employee, button) {
    let url;

    try {
      url = getApiUrl();
    } catch (error) {
      showMessage("error", error.message);
      return;
    }

    if (!window.confirm(
      `Are you sure you want to delete ${employee.name}?`
    )) {
      return;
    }

    button.disabled = true;

    try {
      const response = await fetch(
        `${url}/${encodeURIComponent(employee.id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `DELETE request failed with HTTP ${response.status}`
        );
      }

      const refreshed = await loadEmployees();

      if (refreshed) {
        showMessage("success", "Employee deleted successfully.");
      } else {
        showMessage(
          "error",
          "Employee was deleted, but the latest list could not be refreshed. Use Retry."
        );
      }

    } catch (error) {
      showMessage("error", error.message);

      $("retryMessage").textContent =
        "Delete failed. Check the API connection, then retry.";

      $("retryPanel").hidden = false;

      button.disabled = false;
    }
  }

  // -------------------------------
  // TABLE ACTIONS
  // -------------------------------

  $("employeeTable").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const employee = employees.find(
      (item) => String(item.id) === button.dataset.id
    );

    if (!employee) return;

    if (button.dataset.action === "view") {
      showEmployeeDetails(employee);
    }

    if (button.dataset.action === "edit") {
      openEmployeeForm(employee);
    }

    if (button.dataset.action === "delete") {
      deleteEmployee(employee, button);
    }
  });

  // -------------------------------
  // FILTER EVENTS
  // -------------------------------

  [
    "searchInput",
    "departmentFilter",
    "statusFilter",
    "projectStatusFilter",
    "sortFilter"
  ].forEach((id) => {
    $(id).addEventListener(
      id === "searchInput" ? "input" : "change",
      () => {
        currentPage = 1;
        renderTable();
      }
    );
  });

  $("resetFiltersBtn").addEventListener("click", () => {
    $("searchInput").value = "";
    $("departmentFilter").value = "";
    $("statusFilter").value = "";
    $("projectStatusFilter").value = "";
    $("sortFilter").value = "name-asc";

    currentPage = 1;
    renderTable();
  });

  // -------------------------------
  // MODAL EVENTS
  // -------------------------------

  $("addEmployeeBtn").addEventListener("click", () =>
    openEmployeeForm()
  );

  $("employeeForm").addEventListener(
    "submit",
    saveEmployee
  );

  $("closeEmployeeModal").addEventListener("click", () =>
    closeModal("employeeModal")
  );

  $("cancelEmployeeModal").addEventListener("click", () =>
    closeModal("employeeModal")
  );

  $("closeDetailsModal").addEventListener("click", () =>
    closeModal("detailsModal")
  );

  $("doneDetailsBtn").addEventListener("click", () =>
    closeModal("detailsModal")
  );

  ["employeeModal", "detailsModal"].forEach((id) => {
    $(id).addEventListener("click", (event) => {
      if (event.target === $(id)) {
        closeModal(id);
      }
    });
  });

  // -------------------------------
  // REFRESH AND RETRY
  // -------------------------------

  $("refreshBtn").addEventListener("click", loadEmployees);
  $("retryBtn").addEventListener("click", loadEmployees);

  // -------------------------------
  // SIDEBAR NAVIGATION FIX
  // -------------------------------

  const sidebar = $("sidebar");
  const menuBtn = $("menuBtn");
  const sidebarOverlay = $("sidebarOverlay");

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");

    menuBtn.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar() {
    const isOpen = sidebar.classList.toggle("open");

    sidebarOverlay.classList.toggle("open", isOpen);

    menuBtn.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  }

  menuBtn.setAttribute("aria-expanded", "false");

  menuBtn.addEventListener("click", toggleSidebar);

  sidebarOverlay.addEventListener("click", closeSidebar);

  // Close sidebar after selecting a navigation link.
  sidebar.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Close sidebar using Escape key.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();

      closeModal("employeeModal");
      closeModal("detailsModal");
    }
  });

  // Reset mobile sidebar when screen becomes desktop size.
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeSidebar();
    }
  });

  // -------------------------------
  // MOBILE NUMBER VALIDATION
  // -------------------------------

  $("employeeMobile").addEventListener("input", (event) => {
    event.target.value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 10);
  });

  // -------------------------------
  // CURRENT DATE
  // -------------------------------

  $("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  // -------------------------------
  // INITIAL DASHBOARD LOAD
  // -------------------------------

  loadEmployees();

})();
