// Get elements
const slaForm = document.getElementById('sla-form');
const goalInput = document.getElementById('goal');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resumeBtn = document.getElementById('resume-btn');
const resetBtn = document.getElementById('reset-btn');
const endBtn = document.getElementById('end-btn'); // End button
const statusElem = document.getElementById('status');
const slaReport = document.getElementById('sla-report');
const uptimeReport = document.getElementById('uptime-report');
const breachReport = document.getElementById('breach-report'); // Breach message
const currentUptimeElem = document.getElementById('current-uptime');
const ctx = document.getElementById('uptime-chart').getContext('2d');
const historyReport = document.getElementById('history-report'); // History report element
const last24hrsBtn = document.getElementById('last-24hrs');
const last7daysBtn = document.getElementById('last-7days');
const last30daysBtn = document.getElementById('last-30days');
const exportBtn = document.getElementById('export-btn'); // Export button
const congratsMessage = document.getElementById('congrats-message'); // Congrats message element

// Variables for tracking
let slaGoal = 0; // SLA Goal (initialized to 0%)
let elapsedTime = 0; // Actual uptime in seconds
let trackingStartTime = 0;
let trackingInProgress = false;
let uptimeData = []; // Data for the chart
let interval;

// Initialize historical data array
let historicalData = [];

// Set up Chart.js for real-time updates
const uptimeChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [0], // Start with a single point at 0 time
    datasets: [{
      label: 'Uptime (%)',
      data: [0], // Start with 0% uptime
      borderColor: 'yellow', // Default color when no SLA Goal is set
      fill: false,
      tension: 0.1,
    }]
  },
  options: {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 10 }
      },
      x: {
        type: 'linear',
        position: 'bottom',
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10
        },
        callback: function(value) {
          const date = new Date(value); // Create a Date object from the value
          return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true}); // Format the time
        }
      }
    }
  }
});

// Set initial values from LocalStorage (set SLA Goal to 0 if no value exists)
document.addEventListener('DOMContentLoaded', () => {
  updateSlaGoal(slaGoal); // Initially set the SLA Goal to 0%
  loadHistoricalData(); // Load historical data on page load
});

// Save historical data to localStorage
function saveHistoricalData() {
  localStorage.setItem('historicalData', JSON.stringify(historicalData));
}

// Load historical data from localStorage
function loadHistoricalData() {
  const storedData = localStorage.getItem('historicalData');
  if (storedData) {
    historicalData = JSON.parse(storedData);
  }
}

// ** Show/Hide Historical Uptime Data on Click/Double Click **
function toggleHistoricalData(range, button) {
  if (button.dataset.visible === "true") {
    // If already visible, hide it
    historyReport.innerHTML = "";
    button.dataset.visible = "false";
  } else {
    // Otherwise, show historical data
    displayHistoricalData(range);
    button.dataset.visible = "true";
  }
}

// Attach single-click and double-click events to historical uptime buttons
[last24hrsBtn, last7daysBtn, last30daysBtn].forEach(button => {
  button.addEventListener("click", function () {
    toggleHistoricalData(this.id, this);
  });

  button.addEventListener("dblclick", function () {
    historyReport.innerHTML = "";
    this.dataset.visible = "false";
  });
});

// Display historical data
function displayHistoricalData(range) {
  let filteredData = [];
  const now = new Date();

  // Filter data based on the selected range
  historicalData.forEach(item => {
    const itemDate = new Date(item.date);
    const timeDifference = now - itemDate;

    if (
      (range === "last-24hrs" && timeDifference <= 24 * 60 * 60 * 1000) ||
      (range === "last-7days" && timeDifference <= 7 * 24 * 60 * 60 * 1000) ||
      (range === "last-30days" && timeDifference <= 30 * 24 * 60 * 60 * 1000)
    ) {
      filteredData.push(`<p>📅 ${item.date} - ⏱️ ${item.uptime.toFixed(2)}% Uptime</p>`);
    }
  });

  // If no data found
  historyReport.innerHTML = filteredData.length > 0 ? filteredData.join("") : "<p>No historical data available.</p>";
}

// Set SLA goal when the user submits the form
slaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  let newSlaGoal = parseFloat(goalInput.value);

  // Validate SLA Goal to be between 0% and 100%
  if (isNaN(newSlaGoal) || newSlaGoal < 0) {
    newSlaGoal = 0;
  } else if (newSlaGoal > 100) {
    newSlaGoal = 100;
  }

  slaGoal = newSlaGoal;
  localStorage.setItem('slaGoal', slaGoal);  // Save the SLA Goal to localStorage
  updateSlaGoal(slaGoal);
});

// Update the SLA goal displayed in the Performance Report
function updateSlaGoal(goal) {
  slaReport.textContent = `SLA Goal: ${goal}% Uptime`;  // Display the SLA goal dynamically
  calculateUptime();  // Update uptime report
}

// Format time as HH:MM:SS
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Start tracking uptime
startBtn.addEventListener('click', () => {
  if (!trackingInProgress) {
    trackingStartTime = Date.now();
    trackingInProgress = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = false;
    resumeBtn.disabled = true; // Disable the Resume button while tracking
    endBtn.disabled = false; // Enable the End button when tracking starts
    statusElem.textContent = 'Status: Tracking...';

    // Start updating the uptime percentage and chart every second
    interval = setInterval(() => {
      elapsedTime = (Date.now() - trackingStartTime) / 1000; // In seconds

      // Calculate SLA percentage (actual uptime)
      const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100; // Gradually increase uptime to 100%

      // Update the chart with new data point
      const newData = {
        x: Date.now(), // Use current timestamp for the x-axis
        y: actualUptimePercentage // Current uptime as y value (percentage)
      };

      uptimeData.push(newData);
      uptimeChart.data.labels.push(newData.x); // Add timestamp to labels
      uptimeChart.data.datasets[0].data.push(newData.y); // Add uptime percentage to data

      // Update the chart in real time
      updateChartColor(actualUptimePercentage);

      // Update the current uptime display
      const formattedUptime = formatTime(elapsedTime);
      currentUptimeElem.textContent = formattedUptime; // Display the timer

      // Update the Actual Uptime: field
      uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`; // Update the uptime percentage in real-time
    }, 1000); // Update every 1 second
  }
});

// Stop tracking uptime
stopBtn.addEventListener('click', () => {
  if (trackingInProgress) {
    clearInterval(interval); // Stop the interval
    const trackingEndTime = Date.now();
    const sessionDuration = (trackingEndTime - trackingStartTime) / 1000; // in seconds
    trackingInProgress = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resumeBtn.disabled = false; // Enable the Resume button after stopping the tracker
    endBtn.disabled = true; // Disable the End button after stopping the tracker

    statusElem.textContent = `Status: Uptime Tracker Stopped. Total Uptime: ${elapsedTime.toFixed(2)} seconds.`;

    uptimeData.push({
      x: Date.now(),
      y: (elapsedTime / (elapsedTime + 1)) * 100
    });

    // Save this session to historical data
    historicalData.push({
      date: new Date().toLocaleString(),
      uptime: (elapsedTime / (elapsedTime + 1)) * 100,
      duration: elapsedTime.toFixed(2)
    });

    saveHistoricalData(); // Save the updated historical data
    uptimeChart.update();
    calculateUptime();
    checkSlaStatus((elapsedTime / (elapsedTime + 1)) * 100); // Check SLA status when tracker is stopped
  }
});

// Export data as CSV
exportBtn.addEventListener('click', () => {
  const csvData = [
    ["Timestamp", "Uptime (%)", "Duration (Seconds)"], 
    ...historicalData.map(item => [item.date, item.uptime.toFixed(2), item.duration])
  ];

  const csvContent = csvData.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "uptime_data.csv");
    link.click();
  }
});

// End tracking and display SLA status
endBtn.addEventListener('click', () => {
  if (trackingInProgress) {
    clearInterval(interval); // Stop the interval
    trackingInProgress = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resumeBtn.disabled = true; // Disable the Resume button when ending tracking
    endBtn.disabled = true; // Disable the End button after it's clicked

    statusElem.textContent = `Status: Tracker Ended. Total Uptime: ${elapsedTime.toFixed(2)} seconds.`;

    // Calculate and check SLA
    checkSlaStatus((elapsedTime / (elapsedTime + 1)) * 100); // Force final SLA check
  }
});

// Resume tracking uptime
resumeBtn.addEventListener('click', () => {
  if (!trackingInProgress) {
    trackingStartTime = Date.now() - elapsedTime * 1000; // Adjust start time to resume tracking
    trackingInProgress = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = false;
    resumeBtn.disabled = true; // Disable the Resume button while tracking
    statusElem.textContent = 'Status: Resuming Tracking...';

    // Continue updating the uptime percentage and chart every second
    interval = setInterval(() => {
      elapsedTime = (Date.now() - trackingStartTime) / 1000; // In seconds

      // Calculate SLA percentage (actual uptime)
      const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100; // Gradually increase uptime to 100%

      // Update the chart with new data point
      const newData = {
        x: Date.now(), // Use current timestamp for the x-axis
        y: actualUptimePercentage // Current uptime as y value (percentage)
      };

      uptimeData.push(newData);
      uptimeChart.data.labels.push(newData.x); // Add timestamp to labels
      uptimeChart.data.datasets[0].data.push(newData.y); // Add uptime percentage to data

      // Update the chart in real time
      updateChartColor(actualUptimePercentage);

      // Update the current uptime display
      const formattedUptime = formatTime(elapsedTime);
      currentUptimeElem.textContent = formattedUptime; // Display the timer

      // Update the Actual Uptime: field
      uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`; // Update the uptime percentage in real-time
    }, 1000); // Update every 1 second
  }
});

// Reset tracker
resetBtn.addEventListener('click', () => {
  clearInterval(interval); // Stop the interval
  elapsedTime = 0;
  slaGoal = 0; // Reset SLA Goal to 0
  goalInput.value = ''; // Reset the input field for SLA Goal
  statusElem.textContent = 'Status: Tracker Reset.';
  uptimeData = [];
  uptimeChart.data.labels = []; // Clear the chart's labels
  uptimeChart.data.datasets[0].data = []; // Clear the chart's data
  uptimeChart.data.datasets[0].borderColor = 'yellow'; // Set chart color to yellow when SLA Goal is not set
  uptimeChart.update();
  currentUptimeElem.textContent = '00:00:00'; // Reset the current uptime display
  updateSlaGoal(0); // Reset SLA goal display to 0%
  breachReport.textContent = ''; // Reset the SLA goal message
  congratsMessage.textContent = ''; // Reset the Congrats message
  congratsMessage.style.display = 'none'; // Hide the Congrats message
  calculateUptime();
});

// Calculate uptime and check SLA breach
function calculateUptime() {
  const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100;
  uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`;
}

// Check if SLA goal is met or breached
function checkSlaStatus(actualUptimePercentage) {
  if (slaGoal === 0) {
    uptimeChart.data.datasets[0].borderColor = 'yellow'; // Set chart to yellow if SLA Goal is not set
  } else if (actualUptimePercentage < slaGoal) {
    breachReport.textContent = `🚨 SLA Breach: Uptime is below the goal!`;
    uptimeChart.data.datasets[0].borderColor = 'red'; // Set chart to red for breach
    congratsMessage.textContent = ''; // Hide the Congrats message if the SLA is breached
    congratsMessage.style.display = 'none';
  } else {
    breachReport.textContent = `✅ SLA Goal Met: Uptime is at or above the goal!`;
    uptimeChart.data.datasets[0].borderColor = 'green'; // Set chart to green for success
    congratsMessage.textContent = '🎉 Congratulations! SLA Goal Met! 🎉'; // Show Congrats message
    congratsMessage.style.display = 'block'; // Show the Congrats message
  }
  uptimeChart.update();
}

// Update the chart color based on the SLA status
function updateChartColor(actualUptimePercentage) {
  if (slaGoal === 0) {
    uptimeChart.data.datasets[0].borderColor = 'yellow'; // Set chart to yellow if SLA Goal is not set
  } else if (actualUptimePercentage < slaGoal) {
    uptimeChart.data.datasets[0].borderColor = 'red'; // Set chart to red if SLA is breached
  } else {
    uptimeChart.data.datasets[0].borderColor = 'green'; // Set chart to green if SLA is met
  }
  uptimeChart.update();
}
