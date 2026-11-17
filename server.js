
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Database file
const DB = path.join(__dirname, "dbs.json");

// Debug logs
console.log("Database file path:", DB);
console.log("Database file exists:", fs.existsSync(DB));

app.use(cors());
app.use(express.json());

// Read employees
function readEmployees() {
  try {
    if (!fs.existsSync(DB)) {
      console.error("ERROR: dbs.json file not found!");
      return [];
    }

    const data = JSON.parse(fs.readFileSync(DB, "utf8"));

    if (!Array.isArray(data.employees)) {
      console.error("ERROR: employees array not found in dbs.json");
      return [];
    }

    return data.employees;
  } catch (error) {
    console.error("Error reading database:", error.message);
    return [];
  }
}

// Save employees
function saveEmployees(employees) {
  try {
    fs.writeFileSync(
      DB,
      JSON.stringify({ employees }, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error("Error saving database:", error.message);
    return false;
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Employee API is running"
  });
});

// Get all employees
app.get("/employees", (req, res) => {
  const employees = readEmployees();

  res.json({
    employees,
    total: employees.length
  });
});

// Get employee by ID
app.get("/employees/:id", (req, res) => {
  const employees = readEmployees();

  const employee = employees.find(
    emp => String(emp.id) === String(req.params.id)
  );

  if (!employee) {
    return res.status(404).json({
      message: "Employee not found"
    });
  }

  res.json(employee);
});

// Add employee
app.post("/employees", (req, res) => {
  const employees = readEmployees();
  const newEmployee = req.body;

  if (!newEmployee.name || !newEmployee.email || !newEmployee.mobile) {
    return res.status(400).json({
      message: "Name, email and mobile are required"
    });
  }

  const employee = {
    ...newEmployee,
    id: newEmployee.id || `emp-${Date.now()}`
  };

  employees.push(employee);

  if (!saveEmployees(employees)) {
    return res.status(500).json({
      message: "Unable to save employee"
    });
  }

  res.status(201).json({
    message: "Employee added successfully",
    employee
  });
});

// Update employee
app.put("/employees/:id", (req, res) => {
  const employees = readEmployees();

  const index = employees.findIndex(
    emp => String(emp.id) === String(req.params.id)
  );

  if (index === -1) {
    return res.status(404).json({
      message: "Employee not found"
    });
  }

  employees[index] = {
    ...employees[index],
    ...req.body,
    id: employees[index].id
  };

  if (!saveEmployees(employees)) {
    return res.status(500).json({
      message: "Unable to update employee"
    });
  }

  res.json({
    message: "Employee updated successfully",
    employee: employees[index]
  });
});

// Delete employee
app.delete("/employees/:id", (req, res) => {
  const employees = readEmployees();

  const index = employees.findIndex(
    emp => String(emp.id) === String(req.params.id)
  );

  if (index === -1) {
    return res.status(404).json({
      message: "Employee not found"
    });
  }

  const deletedEmployee = employees.splice(index, 1)[0];

  if (!saveEmployees(employees)) {
    return res.status(500).json({
      message: "Unable to delete employee"
    });
  }

  res.json({
    message: "Employee deleted successfully",
    employee: deletedEmployee
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Employee API running on port ${PORT}`);

  const employees = readEmployees();

  console.log("Employees loaded:", employees.length);

  console.log(
    "Last employee ID:",
    employees.length
      ? employees[employees.length - 1].id
      : "No employees"
  );
});
