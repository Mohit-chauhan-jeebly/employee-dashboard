// Sidebar menu toggle
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
 
menuBtn.addEventListener("click", function () {
    sidebar.classList.toggle("closed");
});
 
// Display current date
const currentDate = document.getElementById("currentDate");
 
currentDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
});
 
// Day 1 task checklist
const checkboxes = document.querySelectorAll(".task-check");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const progressMessage = document.getElementById("progressMessage");
const taskStatus = document.querySelector(".task-status");
 
function updateProgress() {
    const totalTasks = checkboxes.length;
 
    const completedTasks = document.querySelectorAll(
        ".task-check:checked"
    ).length;
 
    const percentage = Math.round(
        (completedTasks / totalTasks) * 100
    );
 
    progressText.textContent = percentage + "%";
    progressFill.style.width = percentage + "%";
 
    checkboxes.forEach(function (checkbox) {
        checkbox.closest(".task-item").classList.toggle(
            "completed",
            checkbox.checked
        );
    });
 
    if (percentage === 100) {
        progressMessage.textContent =
            "Congratulations! All Day 1 tasks are completed.";
 
        taskStatus.textContent = "Completed";
        taskStatus.style.background = "#14532d";
        taskStatus.style.color = "#86efac";
    } else {
        progressMessage.textContent =
            completedTasks + " of " + totalTasks + " tasks completed.";
 
        taskStatus.textContent = "In Progress";
        taskStatus.style.background = "#78350f";
        taskStatus.style.color = "#fbbf24";
    }
}
 
// Listen to checklist changes
checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", updateProgress);
});
 
// Initial progress
updateProgress();