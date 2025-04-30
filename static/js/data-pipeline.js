// Data Pipeline Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Data Pipeline Management");
    
    // Initialize UI components and event handlers
    initializeDataPipeline();
});

function initializeDataPipeline() {
    // Function to initialize the data pipeline UI
    
    // Add event listeners for NiFi configuration form
    const nifiConfigForm = document.getElementById('nifi-config-form');
    if (nifiConfigForm) {
        nifiConfigForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateNiFiConfiguration();
        });
    }
    
    // Add event listeners for scheduler configuration form
    const schedulerConfigForm = document.getElementById('scheduler-config-form');
    if (schedulerConfigForm) {
        schedulerConfigForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateSchedulerConfiguration();
        });
    }
    
    // Add event listeners for refresh buttons
    const refreshJobsBtn = document.getElementById('refresh-jobs-btn');
    if (refreshJobsBtn) {
        refreshJobsBtn.addEventListener('click', function() {
            console.log("Manually refreshing jobs");
            fetchJobs();
        });
    }
    
    const refreshFilesBtn = document.getElementById('refresh-files-btn');
    if (refreshFilesBtn) {
        refreshFilesBtn.addEventListener('click', function() {
            const jobId = document.getElementById('job-filter')?.value;
            console.log("Manually refreshing files for job:", jobId);
            fetchFiles(jobId);
        });
    }
    
    // Setup job filter change event
    const jobFilter = document.getElementById('job-filter');
    if (jobFilter) {
        jobFilter.addEventListener('change', function() {
            const jobId = this.value;
            console.log("Job filter changed to:", jobId);
            fetchFiles(jobId);
        });
    }
    
    // Setup dashboard buttons
    const nifiDashboardBtn = document.getElementById('nifi-dashboard-btn');
    if (nifiDashboardBtn) {
        nifiDashboardBtn.addEventListener('click', function() {
            openNiFiDashboard();
        });
    }
    
    const schedulerDashboardBtn = document.getElementById('scheduler-dashboard-btn');
    if (schedulerDashboardBtn) {
        schedulerDashboardBtn.addEventListener('click', function() {
            openSchedulerDashboard();
        });
    }
    
    // Test NiFi connection on load
    testNiFiConnection();
    
    // Initial jobs load
    fetchJobs();
}

function updateNiFiConfiguration() {
    // Get NiFi connection details
    const nifiUrl = document.getElementById('nifi-url').value;
    const nifiUsername = document.getElementById('nifi-username').value;
    const nifiPassword = document.getElementById('nifi-password').value;
    const useMock = document.getElementById('nifi-use-mock').checked;
    
    // Store connection settings in session storage
    sessionStorage.setItem('nifi-url', nifiUrl);
    sessionStorage.setItem('nifi-use-mock', useMock ? 'true' : 'false');
    
    // Show success message
    alert('NiFi configuration updated successfully');
    
    // Update connection status
    testNiFiConnection();
}

function updateSchedulerConfiguration() {
    // Get scheduler configuration
    const schedulerType = document.getElementById('scheduler-type').value;
    const airflowUrl = document.getElementById('airflow-url')?.value;
    const airflowUsername = document.getElementById('airflow-username')?.value;
    const airflowPassword = document.getElementById('airflow-password')?.value;
    
    // Store settings in session storage
    sessionStorage.setItem('scheduler-type', schedulerType);
    if (schedulerType === 'airflow') {
        sessionStorage.setItem('airflow-url', airflowUrl);
    }
    
    // Show success message
    alert('Scheduler configuration updated successfully');
    
    // Update status
    testSchedulerConnection();
}

function testNiFiConnection() {
    const nifiStatus = document.getElementById('nifi-status');
    if (!nifiStatus) return;
    
    fetch('/api/ingestion/status')
        .then(response => response.json())
        .then(data => {
            if (data.nifi_available) {
                nifiStatus.textContent = 'Connected';
                nifiStatus.className = 'badge bg-success';
            } else if (data.mock_mode) {
                nifiStatus.textContent = 'Mock Mode';
                nifiStatus.className = 'badge bg-warning';
            } else {
                nifiStatus.textContent = 'Not Connected';
                nifiStatus.className = 'badge bg-danger';
            }
        })
        .catch(error => {
            console.error('Error testing NiFi connection:', error);
            nifiStatus.textContent = 'Connection Error';
            nifiStatus.className = 'badge bg-danger';
        });
}

function testSchedulerConnection() {
    const schedulerStatus = document.getElementById('scheduler-status');
    if (!schedulerStatus) return;
    
    const schedulerType = document.getElementById('scheduler-type').value;
    
    if (schedulerType === 'internal') {
        // Test internal scheduler
        fetch('/api/ingestion/status')
            .then(response => response.json())
            .then(data => {
                if (data.is_healthy) {
                    schedulerStatus.textContent = 'Internal Scheduler Running';
                    schedulerStatus.className = 'badge bg-success';
                } else {
                    schedulerStatus.textContent = 'Internal Scheduler Error';
                    schedulerStatus.className = 'badge bg-danger';
                }
            })
            .catch(error => {
                console.error('Error testing scheduler:', error);
                schedulerStatus.textContent = 'Connection Error';
                schedulerStatus.className = 'badge bg-danger';
            });
    } else if (schedulerType === 'airflow') {
        // For Airflow, we can't actually connect yet
        schedulerStatus.textContent = 'Airflow (Not Implemented)';
        schedulerStatus.className = 'badge bg-secondary';
    }
}

function fetchJobs() {
    const jobsTable = document.getElementById('jobs-table')?.querySelector('tbody');
    const jobFilter = document.getElementById('job-filter');
    
    if (!jobsTable) {
        console.error("Jobs table not found in DOM");
        return;
    }
    
    jobsTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading jobs...</td></tr>';
    
    console.log("Fetching jobs from API...");
    
    fetch('/api/ingestion/jobs')
        .then(response => {
            console.log("Jobs API response status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Jobs API data received:", data);
            
            if (data.status === 'success' && data.jobs && data.jobs.length > 0) {
                console.log("Found " + data.jobs.length + " jobs, populating table");
                jobsTable.innerHTML = '';
                
                // Clear job filter options except the first one
                if (jobFilter) {
                    while (jobFilter.options.length > 1) {
                        jobFilter.remove(1);
                    }
                }
                
                data.jobs.forEach(job => {
                    const row = document.createElement('tr');
                    
                    // Add job to filter dropdown
                    if (jobFilter) {
                        const option = document.createElement('option');
                        option.value = job.job_id;
                        option.textContent = `${job.job_id} (${job.type})`;
                        jobFilter.appendChild(option);
                    }
                    
                    // Status badge
                    let statusBadge = '';
                    if (job.status === 'scheduled') {
                        statusBadge = '<span class="badge bg-success">Scheduled</span>';
                    } else if (job.status === 'paused') {
                        statusBadge = '<span class="badge bg-warning">Paused</span>';
                    } else if (job.status === 'due') {
                        statusBadge = '<span class="badge bg-info">Due</span>';
                    } else if (job.status === 'mock') {
                        statusBadge = '<span class="badge bg-secondary">Mock Mode</span>';
                    } else {
                        statusBadge = `<span class="badge bg-secondary">${job.status || 'Unknown'}</span>`;
                    }
                    
                    row.innerHTML = `
                        <td>${job.job_id}</td>
                        <td>${job.type}</td>
                        <td>${job.schedule_type}: ${job.schedule_value}</td>
                        <td>${statusBadge}</td>
                        <td>${job.last_run || 'Never'}</td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-primary view-job-btn" data-job-id="${job.job_id}">View</button>
                                <button type="button" class="btn btn-info pause-resume-btn" data-job-id="${job.job_id}" data-job-status="${job.status || ''}">
                                    ${job.status === 'paused' ? 'Resume' : 'Pause'}
                                </button>
                                <button type="button" class="btn btn-danger delete-job-btn" data-job-id="${job.job_id}">Delete</button>
                            </div>
                        </td>
                    `;
                    
                    jobsTable.appendChild(row);
                });
                
                // Add event listeners for actions
                console.log("Setting up job action handlers");
                setupJobActionHandlers();
            } else {
                console.warn("No jobs found or API returned an error");
                jobsTable.innerHTML = '<tr><td colspan="6" class="text-center">No jobs found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching jobs:', error);
            jobsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading jobs</td></tr>';
        });
}

function setupJobActionHandlers() {
    // View job details
    document.querySelectorAll('.view-job-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const jobId = this.getAttribute('data-job-id');
            viewJobDetails(jobId);
        });
    });
    
    // Pause/resume job
    document.querySelectorAll('.pause-resume-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const jobId = this.getAttribute('data-job-id');
            const status = this.getAttribute('data-job-status');
            
            if (status === 'paused') {
                resumeJob(jobId, this);
            } else {
                pauseJob(jobId, this);
            }
        });
    });
    
    // Delete job
    document.querySelectorAll('.delete-job-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const jobId = this.getAttribute('data-job-id');
            deleteJob(jobId);
        });
    });
}

function viewJobDetails(jobId) {
    const jobFilter = document.getElementById('job-filter');
    if (jobFilter) {
        // Set job filter and show files for this job
        jobFilter.value = jobId;
        fetchFiles(jobId);
    }
}

function pauseJob(jobId, button) {
    fetch(`/api/ingestion/jobs/${jobId}/pause`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            button.textContent = 'Resume';
            button.setAttribute('data-job-status', 'paused');
            
            // Update status badge in the row
            const row = button.closest('tr');
            const statusCell = row.cells[3];
            statusCell.innerHTML = '<span class="badge bg-warning">Paused</span>';
            
            console.log(`Job ${jobId} paused successfully`);
        } else {
            alert(`Error pausing job: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('Error pausing job:', error);
        alert('Error pausing job. See console for details.');
    });
}

function resumeJob(jobId, button) {
    fetch(`/api/ingestion/jobs/${jobId}/resume`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            button.textContent = 'Pause';
            button.setAttribute('data-job-status', 'scheduled');
            
            // Update status badge in the row
            const row = button.closest('tr');
            const statusCell = row.cells[3];
            statusCell.innerHTML = '<span class="badge bg-success">Scheduled</span>';
            
            console.log(`Job ${jobId} resumed successfully`);
        } else {
            alert(`Error resuming job: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('Error resuming job:', error);
        alert('Error resuming job. See console for details.');
    });
}

function deleteJob(jobId) {
    if (!confirm(`Are you sure you want to delete job ${jobId}?`)) {
        return;
    }
    
    fetch(`/api/ingestion/jobs/${jobId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert(`Job ${jobId} deleted successfully`);
            fetchJobs();
        } else {
            alert(`Error deleting job: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('Error deleting job:', error);
        alert('Error deleting job. See console for details.');
    });
}

function fetchFiles(jobId) {
    const filesTable = document.getElementById('files-table')?.querySelector('tbody');
    if (!filesTable) return;
    
    filesTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading files...</td></tr>';
    
    if (!jobId) {
        filesTable.innerHTML = '<tr><td colspan="5" class="text-center">Select a job to view files</td></tr>';
        return;
    }
    
    fetch(`/api/ingestion/jobs/${jobId}/files`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.files && data.files.length > 0) {
                filesTable.innerHTML = '';
                
                data.files.forEach(file => {
                    const row = document.createElement('tr');
                    
                    // Format file size
                    const fileSize = formatFileSize(file.size);
                    
                    // Format timestamp
                    const createdDate = new Date(file.created * 1000).toLocaleString();
                    
                    row.innerHTML = `
                        <td>${file.name}</td>
                        <td>${fileSize}</td>
                        <td>${createdDate}</td>
                        <td>${jobId}</td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-primary view-file-btn" 
                                    data-job-id="${jobId}" 
                                    data-file-path="${file.path}" 
                                    data-file-name="${file.name}">
                                    View
                                </button>
                                <button type="button" class="btn btn-success process-file-btn" 
                                    data-job-id="${jobId}" 
                                    data-file-path="${file.path}">
                                    Process
                                </button>
                            </div>
                        </td>
                    `;
                    
                    filesTable.appendChild(row);
                });
                
                // Setup file action handlers
                setupFileActionHandlers();
            } else {
                filesTable.innerHTML = '<tr><td colspan="5" class="text-center">No files found for this job</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching files:', error);
            filesTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading files</td></tr>';
        });
}

function setupFileActionHandlers() {
    // View file
    document.querySelectorAll('.view-file-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const jobId = this.getAttribute('data-job-id');
            const filePath = this.getAttribute('data-file-path');
            const fileName = this.getAttribute('data-file-name');
            viewFile(jobId, filePath, fileName);
        });
    });
    
    // Process file
    document.querySelectorAll('.process-file-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const jobId = this.getAttribute('data-job-id');
            const filePath = this.getAttribute('data-file-path');
            processFile(jobId, filePath);
        });
    });
}

function viewFile(jobId, filePath, fileName) {
    console.log(`Viewing file: ${fileName} from job ${jobId}, path: ${filePath}`);
    
    fetch(`/api/ingestion/jobs/${jobId}/files/${encodeURIComponent(fileName)}`)
        .then(response => {
            console.log("File content response status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("File content data received:", data);
            
            if (data.status === 'success') {
                // Set modal content
                const previewFilename = document.getElementById('preview-filename');
                if (previewFilename) {
                    previewFilename.textContent = fileName;
                    previewFilename.style.color = "#000";
                    previewFilename.style.fontWeight = "bold";
                } else {
                    console.error("preview-filename element not found");
                }
                
                // Format content based on type
                const contentElement = document.getElementById('file-content');
                if (contentElement) {
                    // Ensure the styling is applied
                    contentElement.style.color = "#000";
                    contentElement.style.backgroundColor = "#fff";
                    
                    if (data.content_type === 'json') {
                        contentElement.textContent = JSON.stringify(data.content, null, 2);
                    } else {
                        contentElement.textContent = data.content;
                    }
                } else {
                    console.error("file-content element not found");
                }
                
                // Configure process button
                const processFileBtn = document.getElementById('process-file-btn');
                if (processFileBtn) {
                    processFileBtn.setAttribute('data-job-id', jobId);
                    processFileBtn.setAttribute('data-file-path', filePath);
                } else {
                    console.error("process-file-btn element not found");
                }
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('file-preview-modal'));
                modal.show();
            } else {
                alert(`Error loading file: ${data.message || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error viewing file:', error);
            alert('Error viewing file. See console for details.');
        });
}

function processFile(jobId, filePath) {
    // Get the job details to determine data type
    fetch(`/api/ingestion/jobs/${jobId}`)
        .then(response => response.json())
        .then(jobData => {
            if (jobData.status === 'success') {
                const job = jobData.job || {};
                const dataType = job.data_type || 'telecom_logs';
                
                // Process the file
                fetch('/api/ingestion/process-directory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        directory: job.local_directory || job.output_directory,
                        data_type: dataType
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' || data.status === 'partial') {
                        alert(`Processed ${data.files_processed} files successfully${data.errors && data.errors.length ? ` with ${data.errors.length} errors` : ''}`);
                    } else {
                        alert(`Error processing directory: ${data.message || 'Unknown error'}`);
                    }
                })
                .catch(error => {
                    console.error('Error processing directory:', error);
                    alert('Error processing directory. See console for details.');
                });
            } else {
                alert(`Error getting job details: ${jobData.message || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error getting job details:', error);
            alert('Error getting job details. See console for details.');
        });
}

// Helper for creating new jobs
function saveNewJob() {
    const createJobForm = document.getElementById('create-job-form');
    const jobType = document.getElementById('job-type').value;
    
    // Check if job type is selected
    if (!jobType) {
        alert('Please select a job type');
        return;
    }
    
    // Get common form fields
    const jobId = document.getElementById('job-id').value;
    const localDirectory = document.getElementById('local-directory').value;
    const scheduleType = document.getElementById('schedule-type').value;
    const scheduleValue = document.getElementById('schedule-value').value;
    
    // Prepare job data
    const jobData = {
        job_type: jobType,
        schedule_type: scheduleType,
        schedule_value: scheduleValue
    };
    
    // Add optional fields
    if (jobId) jobData.job_id = jobId;
    if (localDirectory) jobData.local_directory = localDirectory;
    
    // Add job type specific fields
    if (jobType === 'sftp') {
        jobData.remote_host = document.getElementById('sftp-host').value;
        jobData.remote_port = document.getElementById('sftp-port').value;
        jobData.remote_username = document.getElementById('sftp-username').value;
        jobData.remote_password = document.getElementById('sftp-password').value;
        jobData.remote_directory = document.getElementById('sftp-remote-dir').value;
        jobData.file_filter = document.getElementById('sftp-file-filter').value;
        
        // Validate required fields
        if (!jobData.remote_host || !jobData.remote_username || !jobData.remote_password || !jobData.remote_directory) {
            alert('Please fill in all required SFTP fields');
            return;
        }
    } else if (jobType === 'http') {
        jobData.api_url = document.getElementById('http-url').value;
        jobData.http_method = document.getElementById('http-method').value;
        jobData.data_type = document.getElementById('http-data-type').value;
        
        // Parse headers JSON if provided
        const headersText = document.getElementById('http-headers').value;
        if (headersText) {
            try {
                jobData.headers = JSON.parse(headersText);
            } catch (e) {
                alert('Invalid JSON in headers field');
                return;
            }
        }
        
        // Add authentication if provided
        const authUsername = document.getElementById('http-auth-username').value;
        const authPassword = document.getElementById('http-auth-password').value;
        
        if (authUsername) jobData.auth_username = authUsername;
        if (authPassword) jobData.auth_password = authPassword;
        
        // Validate required fields
        if (!jobData.api_url) {
            alert('Please provide an API URL');
            return;
        }
    }
    
    // Submit job creation request
    fetch('/api/ingestion/jobs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Job created successfully');
            
            // Close modal and refresh jobs
            const modal = bootstrap.Modal.getInstance(document.getElementById('create-job-modal'));
            modal.hide();
            fetchJobs();
            
            // Reset form
            createJobForm.reset();
            document.getElementById('sftp-config').classList.add('d-none');
            document.getElementById('http-config').classList.add('d-none');
        } else {
            alert(`Error creating job: ${data.message || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('Error creating job:', error);
        alert('Error creating job. See console for details.');
    });
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to open NiFi Dashboard
function openNiFiDashboard() {
    // Check if NiFi is available
    fetch('/api/ingestion/status')
        .then(response => response.json())
        .then(data => {
            if (data.nifi_available) {
                // Get NiFi URL from session or default
                const nifiUrl = sessionStorage.getItem('nifi-url') || 'http://localhost:8080/nifi';
                
                // Open NiFi dashboard in a new window
                const dashboardUrl = nifiUrl.replace('/nifi-api', '');
                window.open(dashboardUrl, '_blank');
            } else if (data.mock_mode) {
                alert('NiFi Dashboard is not available in Mock Mode. The system is currently running with simulated NiFi functionality.');
            } else {
                alert('NiFi is not connected. Please configure a valid NiFi connection first.');
            }
        })
        .catch(error => {
            console.error('Error checking NiFi status:', error);
            alert('Error checking NiFi status. See console for details.');
        });
}

// Function to open Scheduler Dashboard
function openSchedulerDashboard() {
    const schedulerType = document.getElementById('scheduler-type').value;
    
    if (schedulerType === 'internal') {
        alert('Internal scheduler does not have a separate dashboard interface. You can manage scheduled jobs from this page.');
    } else if (schedulerType === 'airflow') {
        // Get Airflow URL from session or default
        const airflowUrl = sessionStorage.getItem('airflow-url') || 'http://localhost:8080';
        
        // Check if Airflow is available (this would be implemented in a real system)
        alert('Airflow integration is not implemented in this version. In a production system, this would open the Airflow dashboard.');
        
        // Uncomment this in a real implementation
        // window.open(airflowUrl, '_blank');
    }
}

// Add DOMContentLoaded event listener for standalone usage
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Data Pipeline script loaded');
    });
} else {
    console.log('Data Pipeline script loaded');
}