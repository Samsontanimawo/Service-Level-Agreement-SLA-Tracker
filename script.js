// Get elements
const slaForm = document.getElementById('sla-form');
const goalInput = document.getElementById('goal');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const statusElem = document.getElementById('status');
const slaReport = document.getElementById('sla-report');
const uptimeReport = document.getElementById('uptime-report');
const breachReport = document.getElementById('breach-report');
const currentUptimeElem = document.getElementById('current-uptime');
const ctx = document.getElementById('uptime-chart').getContext('2d');
const exportBtn = document.getElementById('export-btn');
const historySection = document.getElementById('history-report');

// Variables for tracking
let slaGoal = 0; // SLA Goal (initialized to 0%)
let elapsedTime = 0; // Actual uptime in seconds
let trackingStartTime = 0;
let trackingInProgress = false;
let uptimeData = []; // Data for the chart
let interval;

// Set up Chart.js for real-time updates
const uptimeChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [], // Timestamps for x-axis
    datasets: [{
      label: 'Uptime (%)',
      data: [], // Uptime percentages for y-axis
      borderColor: '#4CAF50', // Green color for healthy performance by default
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
        }
      }
    }
  }
});

// Set initial values from LocalStorage (set SLA Goal to 0 if no value exists)
document.addEventListener('DOMContentLoaded', () => {
  updateSlaGoal(slaGoal); // Initially set the SLA Goal to 0%
});

// Set SLA goal when the user submits the form
slaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  let newSlaGoal = parseFloat(goalInput.value);

  // Validate SLA Goal to be between 0% and 100%
  if (newSlaGoal < 0) {
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
    statusElem.textContent = 'Status: Tracking...';

    // Start updating the uptime percentage and chart every second
    interval = setInterval(() => {
      elapsedTime = (Date.now() - trackingStartTime) / 1000; // In seconds

      // Update the uptime in HH:MM:SS format
      const formattedUptime = formatTime(elapsedTime);
      currentUptimeElem.textContent = formattedUptime; // Display the timer

      // Calculate SLA percentage (actual uptime)
      const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100;  // For simplicity, assume the system uptime increases in this manner.

      // Add the new data point to the chart
      const newData = {
        x: new Date().getTime(), // Current time as x value (timestamp)
        y: actualUptimePercentage // Current uptime as y value (percentage)
      };

      uptimeData.push(newData);
      uptimeChart.data.labels.push(newData.x); // Add timestamp to labels
      uptimeChart.data.datasets[0].data.push(newData.y); // Add uptime percentage to data

      // Update the chart in real time
      uptimeChart.update();

      // Check if SLA is met or breached
      checkSlaStatus(elapsedTime);
      
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

    statusElem.textContent = `Status: Uptime Tracker Stopped. Total Uptime: ${elapsedTime.toFixed(2)} seconds.`;

    uptimeData.push({
      x: new Date().getTime(),
      y: (elapsedTime / (elapsedTime + 1)) * 100
    });

    uptimeChart.update();
    calculateUptime();
  }
});

// Reset tracker
resetBtn.addEventListener('click', () => {
  clearInterval(interval); // Stop the interval
  elapsedTime = 0;
  statusElem.textContent = 'Status: Tracker Reset.';
  uptimeData = [];
  uptimeChart.data.labels = []; // Clear the chart's labels
  uptimeChart.data.datasets[0].data = []; // Clear the chart's data
  uptimeChart.update();
  currentUptimeElem.textContent = '00:00:00'; // Reset the current uptime display
  updateSlaGoal(0); // Reset SLA goal display to 0%
  calculateUptime();
});

// Calculate uptime and check SLA breach
function calculateUptime() {
  const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100;
  uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`;

  // Check if actual uptime is below the SLA goal
  checkSlaStatus(elapsedTime);
}

// Check if SLA goal is met or breached
function checkSlaStatus(timeElapsed) {
  const slaDifference = timeElapsed - slaGoal;  // Subtract elapsed time from SLA goal

  if (slaDifference < 0) {
    breachReport.textContent = `SLA Breach: Uptime is below the goal!`;
    // Change chart color to red (SLA breached)
    uptimeChart.data.datasets[0].borderColor = 'red';
  } else {
    breachReport.textContent = `SLA Goal Met: Uptime is at or above the goal!`;
    // Change chart color to green (SLA met)
    uptimeChart.data.datasets[0].borderColor = 'green';
  }

  // Update the chart with the new color
  uptimeChart.update();
}

// Show browser notification for SLA breach
function showSlaBreachNotification() {
  if (Notification.permission === 'granted') {
    new Notification('SLA Breach', {
      body: `The current uptime is below the specified SLA goal of ${slaGoal}%`,
    });
  }
}

// Request permission for notifications
if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}

// Show Historical Data
function showHistoryData(timeframe) {
  const currentTime = new Date().getTime();
  let filteredData = uptimeData.filter((data) => {
    const timeDiff = currentTime - data.x;
    if (timeframe === '24h') return timeDiff <= 24 * 60 * 60 * 1000;
    if (timeframe === '7d') return timeDiff <= 7 * 24 * 60 * 60 * 1000;
    if (timeframe === '30d') return timeDiff <= 30 * 24 * 60 * 60 * 1000;
  });

  const historyHtml = filteredData.map((data) => {
    return `<p>Timestamp: ${new Date(data.x).toLocaleString()} - Uptime: ${data.y.toFixed(2)}%</p>`;
  }).join('');

  historySection.innerHTML = historyHtml || '<p>No data for selected timeframe.</p>';
}

// Event listeners for history buttons
document.getElementById('last-24hrs').addEventListener('click', () => {
  showHistoryData('24h');
});

document.getElementById('last-7days').addEventListener('click', () => {
  showHistoryData('7d');
});

document.getElementById('last-30days').addEventListener('click', () => {
  showHistoryData('30d');
});

// Export data to CSV
exportBtn.addEventListener('click', () => {
  const csvContent = generateCSV();
  downloadCSV(csvContent);
});

// Generate CSV content
function generateCSV() {
  let csv = 'Timestamp,Uptime\n';
  uptimeData.forEach((data) => {
    csv += `${new Date(data.x).toLocaleString()},${data.y.toFixed(2)}\n`;
  });
  return csv;
}

// Download CSV file
function downloadCSV(csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'uptime_data.csv';
  link.click();
}
