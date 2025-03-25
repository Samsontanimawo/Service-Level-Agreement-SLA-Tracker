// Get elements
const slaForm = document.getElementById('sla-form');
const goalInput = document.getElementById('goal');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resumeBtn = document.getElementById('resume-btn');
const endBtn = document.getElementById('end-btn');
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
let currentSlaStatus = 'No SLA Goal Set'; // Default SLA Status

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
    displayHistoricalData(); // Display the historical data when loading
  }
}

// Display historical data with SLA status
function displayHistoricalData() {
  historyReport.innerHTML = ''; // Clear current history
  historicalData.forEach(item => {
    const statusText = item.slaStatus ? item.slaStatus : 'No SLA Goal Set';
    historyReport.innerHTML += `<p>📅 ${item.date} - ⏱️ ${item.uptime.toFixed(2)}% Uptime - Status: ${statusText}</p>`;
  });
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
// Update the SLA goal displayed in the Performance Report
function updateSlaGoal(goal) {
  slaReport.textContent = `SLA Goal: ${goal}% Uptime`;  // Display the SLA goal dynamically
  calculateUptime(); // Update uptime report
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
    endBtn.disabled = false; 
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

      // Update the chart in real-time
      updateChartColor(actualUptimePercentage);

      // Update the current uptime display
      const formattedUptime = formatTime(elapsedTime);
      currentUptimeElem.textContent = formattedUptime; // Display the timer

      // Update the Actual Uptime field
      uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`; // Update the uptime percentage in real-time

      // Add new uptime data to historical data and update display
      const slaStatus = checkSlaStatus(actualUptimePercentage);
      historicalData.push({
        date: new Date().toLocaleString(),
        uptime: actualUptimePercentage,
        slaStatus: slaStatus
      });
      displayHistoricalData(); // Update historical data display in real-time

    }, 1000); // Update every 1 second
  }
});

// Stop tracking uptime
stopBtn.addEventListener('click', () => {
  if (trackingInProgress) {
    clearInterval(interval); // Stop the interval
    trackingInProgress = false;
    stopBtn.disabled = true;
    resumeBtn.disabled = false; 
    statusElem.textContent = 'Status: Paused';
  }
});

// Resume tracking uptime
resumeBtn.addEventListener('click', () => {
  if (!trackingInProgress) {
    trackingStartTime = Date.now() - elapsedTime * 1000; // Adjust start time to resume tracking
    trackingInProgress = true;
    resumeBtn.disabled = true; 
    stopBtn.disabled = false; 
    statusElem.textContent = 'Status: Resumed';

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

      // Update the chart in real-time
      updateChartColor(actualUptimePercentage);

      // Update the current uptime display
      const formattedUptime = formatTime(elapsedTime);
      currentUptimeElem.textContent = formattedUptime; // Display the timer

      // Update the Actual Uptime field
      uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`; // Update the uptime percentage in real-time

      // Add new uptime data to historical data and update display
     // Add new uptime data to historical data and update display
     const slaStatus = checkSlaStatus(actualUptimePercentage);
     historicalData.push({
       date: new Date().toLocaleString(),
       uptime: actualUptimePercentage,
       slaStatus: slaStatus
     });
     displayHistoricalData(); // Update historical data display in real-time

   }, 1000); // Update every 1 second
 }
});

// End tracking uptime
endBtn.addEventListener('click', () => {
 if (trackingInProgress) {
   trackingInProgress = false;
   clearInterval(interval);
   stopBtn.disabled = true;
   resumeBtn.disabled = true;
   endBtn.disabled = true;
   statusElem.textContent = 'Status: Ended';
   updateChartColor(uptimeData[uptimeData.length - 1].y); 
   const finalUptime = uptimeData[uptimeData.length - 1].y;
   const slaStatus = checkSlaStatus(finalUptime);
   historicalData.push({
     date: new Date().toLocaleString(),
     uptime: finalUptime,
     slaStatus: slaStatus
   });
   displayHistoricalData(); 
   saveHistoricalData(); 
   startBtn.disabled = false; // Enable the Start button again
 }
});

// Calculate uptime and check SLA breach
function calculateUptime() {
 const actualUptimePercentage = (elapsedTime / (elapsedTime + 1)) * 100;
 uptimeReport.textContent = `Actual Uptime: ${actualUptimePercentage.toFixed(2)}%`;
 setTimeout(calculateUptime, 1000); // Update every 1 second
}

// Check if SLA goal is met or breached
function checkSlaStatus(actualUptimePercentage) {
 let slaStatus = '';
 if (slaGoal === 0) {
   uptimeChart.data.datasets[0].borderColor = 'yellow'; // Set chart to yellow if SLA Goal is not set
   slaStatus = 'No SLA Goal Set';
 } else if (actualUptimePercentage < slaGoal) {
   breachReport.textContent = `SLA Breach: Uptime is below the goal!`;
   uptimeChart.data.datasets[0].borderColor = 'red'; // Set chart to red for breach
   slaStatus = 'SLA Breached';
 } else {
   breachReport.textContent = `SLA Goal Met: Uptime is at or above the goal!`;
   uptimeChart.data.datasets[0].borderColor = 'green'; // Set chart to green for success
   slaStatus = 'SLA Met';
 }
 uptimeChart.update();
 return slaStatus;
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

// Export data as CSV
exportBtn.addEventListener('click', () => {
 const csvData = [
   ["Timestamp", "Uptime (%)", "SLA Status"], 
   ...historicalData.map(item => [item.date, item.uptime.toFixed(2), item.slaStatus])
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