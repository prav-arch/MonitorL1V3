/**
 * Fine-tuning dashboard functionality
 */

// Document ready
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDocuments();
    loadJobs();
    loadModels();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Load training documents
 */
function loadDocuments() {
    const documentList = document.getElementById('documentList');
    if (!documentList) return;
    
    // Show loading spinner
    documentList.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Get filter states
    const showProcessed = document.getElementById('showProcessedDocs')?.checked ?? true;
    const showUnprocessed = document.getElementById('showUnprocessedDocs')?.checked ?? true;
    const filterTelecom = document.getElementById('filterTelecomDocs')?.checked ?? true;
    const filterGeneral = document.getElementById('filterGeneralDocs')?.checked ?? true;
    
    // Prepare filter object
    const filters = {
        processed: showProcessed,
        unprocessed: showUnprocessed,
        contentTypes: []
    };
    
    if (filterTelecom) filters.contentTypes.push('telecom');
    if (filterGeneral) filters.contentTypes.push('general');
    
    // Fetch documents
    axios.get('/api/training/documents')
        .then(response => {
            const documents = response.data.documents || [];
            const stats = response.data.stats || {
                total: 0,
                processed: 0,
                unprocessed: 0
            };
            
            // Update counts
            document.getElementById('totalDocumentsCount').textContent = stats.total;
            document.getElementById('processedDocumentsCount').textContent = stats.processed;
            
            // Render documents
            renderDocuments(documents, stats, filters);
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            documentList.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load training documents. ${error.response?.data?.error || error.message}
                </div>
            `;
        });
}

/**
 * Load fine-tuning jobs
 */
function loadJobs() {
    const jobsList = document.getElementById('jobsList');
    if (!jobsList) return;
    
    // Show loading spinner
    jobsList.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch jobs
    axios.get('/api/fine-tuning/jobs')
        .then(response => {
            const jobs = response.data.jobs || [];
            
            // Update counts
            const totalJobs = jobs.length;
            let completedJobs = 0;
            let runningJobs = 0;
            let pendingJobs = 0;
            let failedJobs = 0;
            
            jobs.forEach(job => {
                if (job.status === 'completed') completedJobs++;
                else if (job.status === 'running') runningJobs++;
                else if (job.status === 'pending') pendingJobs++;
                else if (job.status === 'failed') failedJobs++;
            });
            
            document.getElementById('totalJobsCount').textContent = totalJobs;
            document.getElementById('completedJobsCount').textContent = completedJobs;
            document.getElementById('runningJobsCount').textContent = runningJobs;
            document.getElementById('pendingJobsCount').textContent = pendingJobs;
            document.getElementById('failedJobsCount').textContent = failedJobs;
            
            // Render jobs
            renderJobs(jobs);
        })
        .catch(error => {
            console.error('Error loading jobs:', error);
            jobsList.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load fine-tuning jobs. ${error.response?.data?.error || error.message}
                </div>
            `;
        });
}

/**
 * Load available models
 */
function loadModels() {
    const modelsContainer = document.getElementById('availableModels');
    if (!modelsContainer) return;
    
    // Show loading spinner
    modelsContainer.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch models
    axios.get('/api/fine-tuning/models')
        .then(response => {
            const models = response.data.models || [];
            
            // Render models
            renderModels(models);
        })
        .catch(error => {
            console.error('Error loading models:', error);
            modelsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Failed to load available models. ${error.response?.data?.error || error.message}
                    </div>
                </div>
            `;
        });
}

/**
 * Load document details
 */
function loadDocumentDetails(docId) {
    const detailsContent = document.getElementById('documentDetailsContent');
    const extractedText = document.getElementById('documentExtractedText');
    const processBtn = document.getElementById('processDocumentBtn');
    
    if (!detailsContent) return;
    
    // Show loading spinner
    detailsContent.innerHTML = `
        <div class="d-flex justify-content-center align-items-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Hide extracted text and process button
    if (extractedText) extractedText.style.display = 'none';
    if (processBtn) processBtn.style.display = 'none';
    
    // Fetch document details
    axios.get(`/api/training/documents/${docId}`)
        .then(response => {
            const document = response.data.document;
            
            // Render document details
            renderDocumentDetails(document);
            
            // Set up process button
            if (processBtn) {
                if (!document.is_processed) {
                    processBtn.style.display = 'block';
                    processBtn.onclick = () => processDocument(docId);
                } else {
                    processBtn.style.display = 'none';
                }
            }
            
            // Show extracted text if available
            if (extractedText && document.extracted_text) {
                extractedText.style.display = 'block';
                extractedText.innerHTML = `<pre>${document.extracted_text}</pre>`;
            }
        })
        .catch(error => {
            console.error('Error loading document details:', error);
            detailsContent.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load document details. ${error.response?.data?.error || error.message}
                </div>
            `;
        });
}

/**
 * Load job details
 */
function loadJobDetails(jobId) {
    const detailsContent = document.getElementById('jobDetailsContent');
    if (!detailsContent) return;
    
    // Show loading spinner
    detailsContent.innerHTML = `
        <div class="d-flex justify-content-center align-items-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch job details
    axios.get(`/api/fine-tuning/jobs/${jobId}`)
        .then(response => {
            const job = response.data.job;
            
            // Render job details
            renderJobDetails(job);
        })
        .catch(error => {
            console.error('Error loading job details:', error);
            detailsContent.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load job details. ${error.response?.data?.error || error.message}
                </div>
            `;
        });
}

/**
 * Render training documents
 */
function renderDocuments(documents, stats, filters) {
    const documentList = document.getElementById('documentList');
    if (!documentList) return;
    
    // Filter documents
    const filteredDocs = documents.filter(doc => {
        // Filter by processing status
        if (doc.is_processed && !filters.processed) return false;
        if (!doc.is_processed && !filters.unprocessed) return false;
        
        // Filter by content type
        if (filters.contentTypes.length > 0 && !filters.contentTypes.includes(doc.content_type)) {
            return false;
        }
        
        return true;
    });
    
    // If no documents, show empty state
    if (filteredDocs.length === 0) {
        documentList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-file-earmark-text fs-1"></i>
                <p class="mt-3">No documents match the current filters</p>
            </div>
        `;
        return;
    }
    
    // Generate HTML for documents
    let html = '<div class="list-group">';
    
    filteredDocs.forEach(doc => {
        const docFilename = getFilename(doc.document_path);
        const docIcon = getDocumentIcon(doc.document_type);
        const statusBadge = doc.is_processed 
            ? '<span class="badge bg-success">Processed</span>' 
            : '<span class="badge bg-warning text-dark">Unprocessed</span>';
            
        html += `
            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                 data-bs-toggle="modal" data-bs-target="#documentDetailsModal" 
                 onclick="loadDocumentDetails(${doc.id})">
                <div>
                    <div class="d-flex align-items-center">
                        <i class="${docIcon} me-2"></i>
                        <div>
                            <h6 class="mb-0">${docFilename}</h6>
                            <small class="text-muted">${doc.document_type.toUpperCase()} - ${doc.content_type}</small>
                        </div>
                    </div>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    documentList.innerHTML = html;
}

/**
 * Render fine-tuning jobs
 */
function renderJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    if (!jobsList) return;
    
    // If no jobs, show empty state
    if (jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-cpu fs-1"></i>
                <p class="mt-3">No fine-tuning jobs found</p>
                <button class="btn btn-primary btn-sm mt-2" data-bs-toggle="modal" data-bs-target="#createJobModal">
                    <i class="bi bi-plus-circle"></i> Create New Job
                </button>
            </div>
        `;
        return;
    }
    
    // Sort jobs by created_at (newest first)
    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Generate HTML for jobs
    let html = '<div class="list-group">';
    
    jobs.forEach(job => {
        const statusBadge = getJobStatusBadge(job.status);
        const createdDate = formatDate(job.created_at);
            
        html += `
            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                 data-bs-toggle="modal" data-bs-target="#jobDetailsModal" 
                 onclick="loadJobDetails(${job.id})">
                <div>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-cpu-fill me-2"></i>
                        <div>
                            <h6 class="mb-0">${job.job_name}</h6>
                            <small class="text-muted">Model: ${job.model_name} - Created: ${createdDate}</small>
                        </div>
                    </div>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    jobsList.innerHTML = html;
}

/**
 * Render available models
 */
function renderModels(models) {
    const modelsContainer = document.getElementById('availableModels');
    if (!modelsContainer) return;
    
    // If no models, show empty state
    if (models.length === 0) {
        modelsContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    <i class="bi bi-braces fs-1"></i>
                    <p class="mt-3">No models available</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Group models by provider for better display
    const modelsByProvider = {};
    models.forEach(model => {
        const provider = model.provider || 'unknown';
        if (!modelsByProvider[provider]) {
            modelsByProvider[provider] = [];
        }
        modelsByProvider[provider].push(model);
    });
    
    // Generate HTML for models
    let html = '';
    
    // Provider headers
    Object.keys(modelsByProvider).forEach(provider => {
        // Provider title with icon
        let providerIcon = 'bi-cpu';
        let providerTitle = provider.charAt(0).toUpperCase() + provider.slice(1);
        
        if (provider === 'ollama') {
            providerIcon = 'bi-hdd-stack';
            providerTitle = 'Ollama (Local Models)';
        } else if (provider === 'openai') {
            providerIcon = 'bi-lightning';
            providerTitle = 'OpenAI';
        } else if (provider === 'anthropic') {
            providerIcon = 'bi-layers';
            providerTitle = 'Anthropic Claude';
        } else if (provider === 'perplexity') {
            providerIcon = 'bi-search';
            providerTitle = 'Perplexity';
        }
        
        html += `
            <div class="col-12 mb-3">
                <h5 class="border-bottom pb-2 d-flex align-items-center">
                    <i class="bi ${providerIcon} me-2"></i>
                    ${providerTitle} Models
                </h5>
            </div>
        `;
        
        // Render models for this provider
        modelsByProvider[provider].forEach(model => {
            const isFinetuned = model.type === 'fine-tuned';
            const modelIcon = isFinetuned ? 'bi-stars' : 'bi-cpu';
            
            // Set card background based on provider
            let cardClass = '';
            let badgeClass = isFinetuned ? 'bg-success' : 'bg-secondary';
            
            if (provider === 'ollama') {
                cardClass = isFinetuned ? 'border-success' : '';
            } else if (provider === 'openai') {
                cardClass = 'border-primary';
                badgeClass = 'bg-primary';
            } else if (provider === 'anthropic') {
                cardClass = 'border-info';
                badgeClass = 'bg-info text-dark';
            } else if (provider === 'perplexity') {
                cardClass = 'border-warning';
                badgeClass = 'bg-warning text-dark';
            }
            
            // Add tooltip attribute for Ollama models
            const tooltipAttr = provider === 'ollama' ? 
                'data-bs-toggle="tooltip" data-bs-placement="top" title="Locally hosted model, ideal for fine-tuning"' : '';
                
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100 ${cardClass}" ${tooltipAttr}>
                        <div class="card-body">
                            <h5 class="card-title d-flex align-items-center">
                                <i class="bi ${modelIcon} me-2"></i>
                                ${model.name}
                            </h5>
                            <p class="card-text small">
                                <strong>Type:</strong> ${isFinetuned ? 'Fine-tuned' : 'Base'} model<br>
                                ${model.base_model ? `<strong>Base:</strong> ${model.base_model}<br>` : ''}
                                <strong>Provider:</strong> 
                                <span class="badge ${provider === 'ollama' ? 'bg-success' : 
                                                provider === 'openai' ? 'bg-primary' : 
                                                provider === 'anthropic' ? 'bg-info text-dark' : 
                                                provider === 'perplexity' ? 'bg-warning text-dark' : 'bg-secondary'}">
                                    <i class="bi bi-${provider === 'ollama' ? 'hdd-stack' : 
                                                provider === 'openai' ? 'lightning' : 
                                                provider === 'anthropic' ? 'layers' : 
                                                provider === 'perplexity' ? 'search' : 'cpu'} me-1"></i>
                                    ${provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </span>
                                ${provider === 'ollama' ? '<span class="ms-2 text-success"><i class="bi bi-check-circle"></i> Local</span>' : ''}
                                ${model.provider_configured === false ? 
                                    `<span class="ms-2 text-danger" data-bs-toggle="tooltip" data-bs-placement="top" title="API key/connection not configured">
                                        <i class="bi bi-exclamation-triangle-fill"></i>
                                     </span>` : 
                                    model.provider_configured === true ? 
                                        `<span class="ms-2 text-success" data-bs-toggle="tooltip" data-bs-placement="top" title="Provider configured and ready">
                                            <i class="bi bi-check-circle-fill"></i>
                                         </span>` : 
                                        ''}
                                <br>
                                ${model.description ? `<strong>Description:</strong> ${model.description}<br>` : ''}
                            </p>
                        </div>
                        <div class="card-footer d-flex justify-content-between">
                            <small class="text-muted">${model.created_at ? formatDate(model.created_at) : ''}</small>
                            <span class="badge ${badgeClass}">
                                ${isFinetuned ? 'Custom' : 'Standard'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
    });
    
    modelsContainer.innerHTML = html;
    
    // Initialize tooltips
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });
}

/**
 * Render document details
 */
function renderDocumentDetails(document) {
    const detailsContent = document.getElementById('documentDetailsContent');
    if (!detailsContent) return;
    
    const docFilename = getFilename(document.document_path);
    const docIcon = getDocumentIcon(document.document_type);
    const statusBadge = document.is_processed 
        ? '<span class="badge bg-success">Processed</span>' 
        : '<span class="badge bg-warning text-dark">Unprocessed</span>';
    const createdDate = formatDate(document.created_at);
    
    // Update modal title
    const modalTitle = document.getElementById('documentDetailsModalLabel');
    if (modalTitle) {
        modalTitle.textContent = docFilename;
    }
    
    // Generate details HTML
    let html = `
        <div class="row">
            <div class="col-md-6">
                <h5 class="mb-3 d-flex align-items-center">
                    <i class="${docIcon} me-2"></i>
                    Document Information
                </h5>
                <table class="table">
                    <tr>
                        <th scope="row">Filename</th>
                        <td>${docFilename}</td>
                    </tr>
                    <tr>
                        <th scope="row">Type</th>
                        <td>${document.document_type.toUpperCase()}</td>
                    </tr>
                    <tr>
                        <th scope="row">Content Type</th>
                        <td>${document.content_type}</td>
                    </tr>
                    <tr>
                        <th scope="row">Status</th>
                        <td>${statusBadge}</td>
                    </tr>
                    <tr>
                        <th scope="row">Uploaded</th>
                        <td>${createdDate}</td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h5 class="mb-3">Document Preview</h5>
                <div class="p-3 border rounded bg-light text-center">
                    <i class="${docIcon} fs-1 mb-3"></i>
                    <p>
                        ${document.is_processed 
                            ? 'This document has been processed and is ready for training.' 
                            : 'This document needs to be processed before it can be used for training.'}
                    </p>
                    ${!document.is_processed 
                        ? '<div class="alert alert-info">Click "Process Document" below to extract text and prepare for training.</div>' 
                        : ''}
                </div>
            </div>
        </div>
        ${document.extracted_text 
            ? '<h5 class="mt-4">Extracted Text Preview</h5>' 
            : ''}
    `;
    
    detailsContent.innerHTML = html;
}

/**
 * Render job details
 */
function renderJobDetails(job) {
    const detailsContent = document.getElementById('jobDetailsContent');
    if (!detailsContent) return;
    
    const statusBadge = getJobStatusBadge(job.status);
    const createdDate = formatDate(job.created_at);
    const updatedDate = formatDate(job.updated_at);
    
    // Update modal title
    const modalTitle = document.getElementById('jobDetailsModalLabel');
    if (modalTitle) {
        modalTitle.textContent = `Job: ${job.job_name}`;
    }
    
    // Parse parameters
    let parameters = {};
    try {
        if (job.parameters) {
            parameters = JSON.parse(job.parameters);
        }
    } catch (e) {
        console.error('Error parsing job parameters:', e);
    }
    
    // Parse training files
    let trainingFiles = [];
    try {
        if (job.training_files) {
            trainingFiles = JSON.parse(job.training_files);
        }
    } catch (e) {
        console.error('Error parsing training files:', e);
    }
    
    // Generate details HTML
    let html = `
        <div class="row">
            <div class="col-md-6">
                <h5 class="mb-3 d-flex align-items-center">
                    <i class="bi bi-cpu-fill me-2"></i>
                    Job Information
                </h5>
                <table class="table">
                    <tr>
                        <th scope="row">Job Name</th>
                        <td>${job.job_name}</td>
                    </tr>
                    <tr>
                        <th scope="row">Base Model</th>
                        <td>${job.model_name}</td>
                    </tr>
                    <tr>
                        <th scope="row">Provider</th>
                        <td>
                            ${(() => {
                                const provider = job.provider || 'ollama';
                                let badgeClass = 'bg-secondary';
                                let icon = 'cpu';
                                
                                if (provider === 'ollama') {
                                    badgeClass = 'bg-success';
                                    icon = 'hdd-stack';
                                } else if (provider === 'openai') {
                                    badgeClass = 'bg-primary';
                                    icon = 'lightning';
                                } else if (provider === 'anthropic') {
                                    badgeClass = 'bg-info text-dark';
                                    icon = 'layers';
                                } else if (provider === 'perplexity') {
                                    badgeClass = 'bg-warning text-dark';
                                    icon = 'search';
                                }
                                
                                return `<span class="badge ${badgeClass}">
                                    <i class="bi bi-${icon} me-1"></i> 
                                    ${provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </span>`;
                            })()}
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Status</th>
                        <td>${statusBadge}</td>
                    </tr>
                    <tr>
                        <th scope="row">Created</th>
                        <td>${createdDate}</td>
                    </tr>
                    <tr>
                        <th scope="row">Last Updated</th>
                        <td>${updatedDate}</td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h5 class="mb-3">Fine-Tuned Model</h5>
                <div class="p-3 border rounded bg-light">
                    ${job.fine_tuned_model_name 
                        ? `<div class="d-flex align-items-center">
                             <i class="bi bi-stars fs-1 me-3"></i>
                             <div>
                               <h5>${job.fine_tuned_model_name}</h5>
                               <p class="text-success mb-0">Model is ready for use</p>
                             </div>
                           </div>`
                        : `<div class="text-center">
                             <i class="bi bi-hourglass-split fs-1 mb-3"></i>
                             <p>${job.status === 'failed' 
                                 ? 'Fine-tuning failed. No model was created.' 
                                 : 'Waiting for fine-tuning to complete.'}</p>
                           </div>`}
                </div>
                
                ${job.error_message 
                    ? `<div class="alert alert-danger mt-3">
                         <h6>Error Details:</h6>
                         <p class="mb-0 small">${job.error_message}</p>
                       </div>` 
                    : ''}
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-md-6">
                <h5 class="mb-3">Training Files</h5>
                <div class="list-group">
                    ${trainingFiles.length > 0 
                        ? trainingFiles.map(file => `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="bi bi-file-earmark-text me-2"></i>
                                    Document #${file}
                                </div>
                            </div>`).join('')
                        : '<div class="alert alert-warning">No training files specified</div>'}
                </div>
            </div>
            <div class="col-md-6">
                <h5 class="mb-3">Training Parameters</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <tbody>
                            ${Object.keys(parameters).length > 0 
                                ? Object.entries(parameters).map(([key, value]) => `
                                    <tr>
                                        <th scope="row">${key}</th>
                                        <td>${value}</td>
                                    </tr>`).join('')
                                : '<tr><td colspan="2" class="text-muted">Using default parameters</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    detailsContent.innerHTML = html;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Filter documents
    document.getElementById('showProcessedDocs')?.addEventListener('change', loadDocuments);
    document.getElementById('showUnprocessedDocs')?.addEventListener('change', loadDocuments);
    document.getElementById('filterTelecomDocs')?.addEventListener('change', loadDocuments);
    document.getElementById('filterGeneralDocs')?.addEventListener('change', loadDocuments);
    
    // Refresh buttons
    document.getElementById('refreshDocumentsBtn')?.addEventListener('click', loadDocuments);
    document.getElementById('refreshJobsBtn')?.addEventListener('click', loadJobs);
    
    // Upload document
    document.getElementById('uploadDocumentSubmit')?.addEventListener('click', uploadDocument);
    
    // Import website
    document.getElementById('importWebsiteSubmit')?.addEventListener('click', importWebsite);
    
    // Create job
    document.getElementById('createJobSubmit')?.addEventListener('click', createJob);
}

/**
 * Upload a document
 */
function uploadDocument() {
    const fileInput = document.getElementById('documentFile');
    const contentType = document.getElementById('contentType');
    const progressBar = document.getElementById('uploadProgress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const resultDiv = document.getElementById('uploadResult');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showError('uploadResult', 'Please select a file to upload');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('logfile', fileInput.files[0]);
    formData.append('content_type', contentType.value);
    
    // Show progress bar
    progressBar.classList.remove('d-none');
    progressBarInner.style.width = '0%';
    resultDiv.classList.add('d-none');
    
    // Upload file
    axios.post('/api/logs/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            progressBarInner.style.width = percentCompleted + '%';
        }
    })
    .then(response => {
        // Show success message
        progressBar.classList.add('d-none');
        resultDiv.classList.remove('d-none');
        resultDiv.classList.remove('alert-danger');
        resultDiv.classList.add('alert-success');
        
        if (response.data.registered_for_fine_tuning) {
            resultDiv.innerHTML = `
                <strong>Success!</strong> Document uploaded and registered for fine-tuning.
                Document ID: ${response.data.training_document_id}
            `;
        } else {
            resultDiv.innerHTML = `
                <strong>Success!</strong> Document uploaded successfully.
            `;
        }
        
        // Refresh documents list
        loadDocuments();
        
        // Reset form after 3 seconds
        setTimeout(() => {
            fileInput.value = '';
            progressBar.classList.add('d-none');
            resultDiv.classList.add('d-none');
        }, 3000);
    })
    .catch(error => {
        // Show error message
        progressBar.classList.add('d-none');
        resultDiv.classList.remove('d-none');
        resultDiv.classList.remove('alert-success');
        resultDiv.classList.add('alert-danger');
        resultDiv.textContent = `Upload failed: ${error.response?.data?.error || error.message}`;
    });
}

/**
 * Import website content for training
 */
function importWebsite() {
    const websiteUrl = document.getElementById('websiteUrl');
    const contentType = document.getElementById('websiteContentType');
    const progressBar = document.getElementById('websiteImportProgress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const resultDiv = document.getElementById('websiteImportResult');
    const submitBtn = document.getElementById('importWebsiteSubmit');
    
    if (!websiteUrl || !websiteUrl.value) {
        showError('websiteImportResult', 'Please enter a website URL');
        return;
    }
    
    // Validate URL
    try {
        new URL(websiteUrl.value);
    } catch (e) {
        showError('websiteImportResult', 'Please enter a valid URL (including http:// or https://)');
        return;
    }
    
    // Show progress and disable button
    progressBar.classList.remove('d-none');
    progressBarInner.style.width = '50%';
    resultDiv.classList.add('d-none');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Importing...';
    
    // Send request to import website
    axios.post('/api/training/website', {
        url: websiteUrl.value,
        content_type: contentType.value
    })
    .then(response => {
        // Update progress
        progressBarInner.style.width = '100%';
        
        // Show success message
        setTimeout(() => {
            progressBar.classList.add('d-none');
            resultDiv.classList.remove('d-none');
            resultDiv.classList.remove('alert-danger');
            resultDiv.classList.add('alert-success');
            
            resultDiv.innerHTML = `
                <strong>Success!</strong> Website content imported and processed for training.
                Document ID: ${response.data.document_id}
            `;
            
            // Refresh documents list
            loadDocuments();
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Import';
            
            // Reset form after 3 seconds
            setTimeout(() => {
                websiteUrl.value = '';
                progressBar.classList.add('d-none');
                resultDiv.classList.add('d-none');
            }, 5000);
        }, 500);
    })
    .catch(error => {
        // Show error message
        progressBar.classList.add('d-none');
        resultDiv.classList.remove('d-none');
        resultDiv.classList.remove('alert-success');
        resultDiv.classList.add('alert-danger');
        resultDiv.textContent = `Import failed: ${error.response?.data?.error || error.message}`;
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Import';
    });
}

/**
 * Process a document
 */
function processDocument(docId) {
    const processBtn = document.getElementById('processDocumentBtn');
    const detailsContent = document.getElementById('documentDetailsContent');
    
    if (!processBtn || !detailsContent) return;
    
    // Disable button and show loading
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    
    // Send request to process document
    axios.post(`/api/training/documents/${docId}/process`)
        .then(response => {
            // Show success message
            processBtn.style.display = 'none';
            
            // Add success alert to details content
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success mt-3';
            alertDiv.innerHTML = `<strong>Success!</strong> Document processed successfully.`;
            detailsContent.appendChild(alertDiv);
            
            // Refresh document details
            setTimeout(() => {
                loadDocumentDetails(docId);
                loadDocuments();
            }, 2000);
        })
        .catch(error => {
            // Re-enable button
            processBtn.disabled = false;
            processBtn.innerHTML = 'Process Document';
            
            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger mt-3';
            alertDiv.innerHTML = `<strong>Error!</strong> Failed to process document: ${error.response?.data?.error || error.message}`;
            detailsContent.appendChild(alertDiv);
        });
}

/**
 * Load training documents for job creation
 */
function loadTrainingDocumentsForJob() {
    const documentsList = document.getElementById('trainingDocumentsList');
    if (!documentsList) return;
    
    // Show loading
    documentsList.innerHTML = `
        <div class="list-group-item text-center">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...
        </div>
    `;
    
    // Fetch processed documents
    axios.get('/api/training/documents?processed_only=true')
        .then(response => {
            const documents = response.data.documents || [];
            
            // If no documents, show message
            if (documents.length === 0) {
                documentsList.innerHTML = `
                    <div class="list-group-item text-center text-muted">
                        No processed documents available
                    </div>
                `;
                return;
            }
            
            // Generate checkboxes for each document
            let html = '';
            documents.forEach(doc => {
                const docFilename = getFilename(doc.document_path);
                html += `
                    <div class="list-group-item">
                        <div class="form-check">
                            <input class="form-check-input training-doc-checkbox" type="checkbox" 
                                   value="${doc.id}" id="doc-${doc.id}">
                            <label class="form-check-label d-flex justify-content-between" for="doc-${doc.id}">
                                <div>
                                    <i class="${getDocumentIcon(doc.document_type)} me-2"></i>
                                    ${docFilename}
                                </div>
                                <span class="badge ${doc.content_type === 'telecom' ? 'bg-info' : 'bg-secondary'}">
                                    ${doc.content_type}
                                </span>
                            </label>
                        </div>
                    </div>
                `;
            });
            
            documentsList.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading training documents:', error);
            documentsList.innerHTML = `
                <div class="list-group-item text-danger">
                    Failed to load documents: ${error.response?.data?.error || error.message}
                </div>
            `;
        });
}

/**
 * Create a fine-tuning job
 */
function createJob() {
    const jobName = document.getElementById('jobName').value;
    const baseModelSelect = document.getElementById('baseModel');
    const baseModel = baseModelSelect.value;
    const trainingDocs = Array.from(document.querySelectorAll('.training-doc-checkbox:checked')).map(cb => cb.value);
    const learningRate = document.getElementById('learningRate').value;
    const epochs = document.getElementById('epochs').value;
    const createBtn = document.getElementById('createJobSubmit');
    const resultDiv = document.getElementById('createJobResult');
    
    // Validate inputs
    if (!jobName) {
        showError('createJobResult', 'Please enter a job name');
        return;
    }
    
    if (!baseModel) {
        showError('createJobResult', 'Please select a base model');
        return;
    }
    
    if (trainingDocs.length === 0) {
        showError('createJobResult', 'Please select at least one training document');
        return;
    }
    
    // Get provider from selected option
    const selectedOption = baseModelSelect.options[baseModelSelect.selectedIndex];
    const provider = selectedOption.dataset.provider || 'ollama';
    
    // Get provider-specific warning and confirmation messages
    if (provider !== 'ollama') {
        let warningMessage = '';
        
        if (provider === 'openai') {
            warningMessage = `You've selected an OpenAI model for fine-tuning. This will:
- Require an OpenAI API key
- Incur usage costs on your OpenAI account
- Use OpenAI's servers for processing your data

Do you want to continue with OpenAI fine-tuning?`;
        } else if (provider === 'anthropic') {
            warningMessage = `You've selected an Anthropic Claude model for fine-tuning. This will:
- Require an Anthropic API key
- Incur usage costs on your Anthropic account
- Use Anthropic's servers for processing your data
- May have limited fine-tuning capabilities

Do you want to continue with Anthropic fine-tuning?`;
        } else if (provider === 'perplexity') {
            warningMessage = `You've selected a Perplexity model for fine-tuning. This will:
- Require a Perplexity API key
- Incur usage costs on your Perplexity account
- Use Perplexity's servers for processing your data
- May have limited fine-tuning capabilities

Do you want to continue with Perplexity fine-tuning?`;
        } else {
            warningMessage = `You've selected a ${provider} model for fine-tuning. This may require an API key and could incur costs. Do you want to continue?`;
        }
        
        if (!confirm(warningMessage)) {
            return;
        }
    }
    
    // Prepare parameters
    const parameters = {
        learning_rate: parseFloat(learningRate),
        epochs: parseInt(epochs)
    };
    
    // Disable button and show loading
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
    resultDiv.classList.add('d-none');
    
    // Send request with provider information
    axios.post('/api/fine-tuning/jobs', {
        job_name: jobName,
        model_name: baseModel,
        provider: provider,
        training_file_ids: trainingDocs,
        parameters: parameters
    })
    .then(response => {
        // Show success message
        resultDiv.classList.remove('d-none');
        resultDiv.classList.remove('alert-danger');
        resultDiv.classList.add('alert-success');
        resultDiv.innerHTML = `
            <strong>Success!</strong> Fine-tuning job created.
            Job ID: ${response.data.job_id}
        `;
        
        // Refresh jobs list
        loadJobs();
        
        // Reset form after 3 seconds
        setTimeout(() => {
            document.getElementById('createJobModal').querySelector('button[data-bs-dismiss="modal"]').click();
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create Job';
            document.getElementById('jobName').value = '';
            document.querySelectorAll('.training-doc-checkbox').forEach(cb => cb.checked = false);
        }, 3000);
    })
    .catch(error => {
        // Show error message
        resultDiv.classList.remove('d-none');
        resultDiv.classList.remove('alert-success');
        resultDiv.classList.add('alert-danger');
        resultDiv.textContent = `Job creation failed: ${error.response?.data?.error || error.message}`;
        
        // Re-enable button
        createBtn.disabled = false;
        createBtn.innerHTML = 'Create Job';
    });
}

/**
 * Show an error message
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    showAlert(element, 'danger', message);
}

/**
 * Show an alert message
 */
function showAlert(element, type, message) {
    element.classList.remove('d-none');
    element.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
    element.classList.add(`alert-${type}`);
    element.textContent = message;
}

/**
 * Get an icon class for a document type
 */
function getDocumentIcon(docType) {
    if (!docType) return 'bi bi-file-earmark';
    
    const type = docType.toLowerCase();
    switch (type) {
        case 'pdf':
            return 'bi bi-file-earmark-pdf';
        case 'doc':
        case 'docx':
            return 'bi bi-file-earmark-word';
        case 'ppt':
        case 'pptx':
            return 'bi bi-file-earmark-slides';
        case 'log':
        case 'txt':
            return 'bi bi-file-earmark-text';
        default:
            return 'bi bi-file-earmark';
    }
}

/**
 * Get a status badge for a job status
 */
function getJobStatusBadge(status) {
    if (!status) return '<span class="badge bg-secondary">Unknown</span>';
    
    switch (status.toLowerCase()) {
        case 'completed':
            return '<span class="badge bg-success">Completed</span>';
        case 'running':
            return '<span class="badge bg-primary">Running</span>';
        case 'pending':
            return '<span class="badge bg-secondary">Pending</span>';
        case 'failed':
            return '<span class="badge bg-danger">Failed</span>';
        default:
            return `<span class="badge bg-info">${status}</span>`;
    }
}

/**
 * Get filename from path
 */
function getFilename(path) {
    if (!path) return 'Unknown File';
    return path.split('/').pop();
}

/**
 * Format a date string
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString();
    } catch (e) {
        return dateStr;
    }
}

/**
 * Load models into create job form
 */
function loadModelsForJobForm() {
    const baseModelSelect = document.getElementById('baseModel');
    if (!baseModelSelect) return;
    
    // Clear existing options
    baseModelSelect.innerHTML = '<option value="" selected disabled>Loading models...</option>';
    
    // Fetch models
    axios.get('/api/fine-tuning/models')
        .then(response => {
            const models = response.data.models || [];
            
            // Filter to only base models (not fine-tuned ones) and categorize by provider
            const modelsByProvider = {};
            models.filter(m => m.type === 'base').forEach(model => {
                const provider = model.provider || 'other';
                if (!modelsByProvider[provider]) {
                    modelsByProvider[provider] = [];
                }
                modelsByProvider[provider].push(model);
            });
            
            // Clear loading state
            baseModelSelect.innerHTML = '';
            
            // First add a default disabled option
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = 'Select a model...';
            baseModelSelect.appendChild(defaultOption);
            
            // Add provider-specific optgroups
            Object.keys(modelsByProvider).forEach(provider => {
                // Create optgroup for provider
                const providerModels = modelsByProvider[provider];
                if (providerModels.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
                    
                    // Special case for providers
                    if (provider === 'ollama') {
                        optgroup.label = 'Ollama (Local Models)';
                    } else if (provider === 'openai') {
                        optgroup.label = 'OpenAI Models';
                    } else if (provider === 'anthropic') {
                        optgroup.label = 'Anthropic Claude Models';
                    } else if (provider === 'perplexity') {
                        optgroup.label = 'Perplexity Models';
                    }
                    
                    // Add models to optgroup
                    providerModels.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        // Add data attributes for provider
                        option.dataset.provider = provider;
                        // Add highlight only for Ollama models since they're the ones that can be fine-tuned locally
                        // Add provider information to option text
                        let iconClass = '';
                        let providerLabel = '';
                        
                        if (provider === 'ollama') {
                            iconClass = 'bi-hdd-stack text-success';
                            providerLabel = ' (Local)';
                            option.classList.add('fw-bold');
                            // Add tooltip attribute for Ollama models
                            option.setAttribute('data-bs-toggle', 'tooltip');
                            option.setAttribute('data-bs-placement', 'right');
                            option.setAttribute('title', 'Locally hosted model, ideal for fine-tuning');
                        } else if (provider === 'openai') {
                            iconClass = 'bi-lightning text-primary';
                            providerLabel = ' (OpenAI)';
                            option.classList.add('text-muted');
                        } else if (provider === 'anthropic') {
                            iconClass = 'bi-layers text-info';
                            providerLabel = ' (Claude)';
                            option.classList.add('text-muted');
                        } else if (provider === 'perplexity') {
                            iconClass = 'bi-search text-warning';
                            providerLabel = ' (Perplexity)';
                            option.classList.add('text-muted');
                        } else {
                            iconClass = 'bi-cpu text-secondary';
                            option.classList.add('text-muted');
                        }
                        
                        // Add configuration status to option
                        let configStatus = '';
                        if (model.provider_configured === false) {
                            configStatus = `<i class="bi bi-exclamation-triangle-fill text-danger ms-1" 
                                             data-bs-toggle="tooltip" data-bs-placement="right" 
                                             title="API key/connection not configured"></i>`;
                            // Make option disabled if not configured
                            option.disabled = true;
                        } else if (model.provider_configured === true) {
                            configStatus = `<i class="bi bi-check-circle-fill text-success ms-1"
                                            data-bs-toggle="tooltip" data-bs-placement="right"
                                            title="Provider configured and ready"></i>`;
                        }
                        
                        // Update option text with icon, provider info, and configuration status
                        option.innerHTML = `<i class="bi ${iconClass} me-1"></i> ${model.name}${providerLabel} ${configStatus}`;
                        optgroup.appendChild(option);
                    });
                    
                    baseModelSelect.appendChild(optgroup);
                }
            });
            
            // If no models, show a message
            if (Object.keys(modelsByProvider).length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.selected = true;
                option.textContent = 'No models available';
                baseModelSelect.appendChild(option);
            }
            
            // Initialize tooltips for model dropdown options
            const tooltipTriggerList = [].slice.call(baseModelSelect.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
            
            // Add change event listener
            baseModelSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const provider = selectedOption.dataset.provider;
                
                // Show warning if not Ollama provider
                const warningElement = document.getElementById('modelWarning');
                if (warningElement) {
                    if (provider && provider !== 'ollama') {
                        let warningIcon = 'exclamation-triangle-fill';
                        let warningClass = 'warning';
                        let warningText = `Note: Fine-tuning with ${provider} models requires the provider's API and may incur costs.`;
                        
                        // Customize warning based on provider
                        if (provider === 'openai') {
                            warningText = `Note: Fine-tuning with OpenAI models requires an API key and will incur costs based on your OpenAI account.`;
                        } else if (provider === 'anthropic') {
                            warningText = `Note: Fine-tuning with Anthropic Claude models requires an API key and will incur costs based on your Anthropic account.`;
                            warningClass = 'info';
                            warningIcon = 'info-circle-fill';
                        } else if (provider === 'perplexity') {
                            warningText = `Note: Fine-tuning with Perplexity models requires an API key and will incur costs based on your Perplexity account.`;
                        }
                        
                        warningElement.innerHTML = `
                            <div class="alert alert-${warningClass} mt-2">
                                <i class="bi bi-${warningIcon} me-2"></i>
                                ${warningText}
                            </div>
                        `;
                        warningElement.style.display = 'block';
                    } else {
                        // For Ollama models, show a positive message
                        warningElement.innerHTML = `
                            <div class="alert alert-success mt-2">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                You've selected a locally hosted Ollama model - ideal for fine-tuning without external API costs.
                            </div>
                        `;
                        warningElement.style.display = 'block';
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading models for job form:', error);
            baseModelSelect.innerHTML = '<option value="" selected disabled>Error loading models</option>';
        });
}

// Add modal event listener to load training documents and models
document.addEventListener('show.bs.modal', function(event) {
    if (event.target.id === 'createJobModal') {
        loadTrainingDocumentsForJob();
        loadModelsForJobForm();
    }
});