/**
 * AI Assistant script for L1 Monitoring Application
 * Handles AI-driven log analysis and interaction with the RAG system
 */

let analyzeStatus = 'idle';

/**
 * Initialize the AI Assistant components
 */
function initAIAssistant() {
    console.log("Initializing AI Assistant");
    
    // Set up event listeners
    setupAnalyzeEventListener();
    
    // Initialize components
    updateComponentStatus();
    
    // Set up sample question clicks
    setupSampleQuestions();
    
    // Load predictive maintenance data
    loadPredictiveMaintenance();
    
    // Setup refresh button for maintenance data
    setupMaintenanceRefresh();
    
    // Initialize LLM model selector
    initLLMModelSelector();
    
    // Make the selected logs array globally available
    window.selectedLogs = [];
    
    // Expose the function to add logs for vector search to use
    window.addToSelectedLogs = addToSelectedLogsContext;
}

/**
 * Initialize the LLM model selector modal
 */
function initLLMModelSelector() {
    // Get elements
    const providerSelect = document.getElementById('llm-provider-select');
    const modelSelect = document.getElementById('llm-model-select');
    const saveButton = document.getElementById('save-model-settings');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValue = document.getElementById('temperature-value');
    const topPSlider = document.getElementById('top-p-slider');
    const topPValue = document.getElementById('top-p-value');
    const maxTokensInput = document.getElementById('max-tokens-input');
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyLabel = document.getElementById('api-key-label');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    
    // Fetch and populate LLM providers
    fetch('/api/llm/providers')
        .then(response => response.json())
        .then(data => {
            if (providerSelect) {
                updateProviderSelect(data.providers, data.current_provider);
                
                // Load models for the selected provider
                loadModelsForProvider(data.current_provider);
                
                // Show/hide API key section based on provider
                updateApiKeySection(data.current_provider);
            }
        })
        .catch(error => {
            console.error('Error fetching LLM providers:', error);
        });
    
    // Handle provider change
    if (providerSelect) {
        providerSelect.addEventListener('change', () => {
            const selectedProvider = providerSelect.value;
            loadModelsForProvider(selectedProvider);
            updateApiKeySection(selectedProvider);
        });
    }
    
    // Handle temperature slider change
    if (temperatureSlider && temperatureValue) {
        temperatureSlider.addEventListener('input', () => {
            temperatureValue.textContent = temperatureSlider.value;
        });
    }
    
    // Handle top-p slider change
    if (topPSlider && topPValue) {
        topPSlider.addEventListener('input', () => {
            topPValue.textContent = topPSlider.value;
        });
    }
    
    // Handle save API key button click
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKeyInput = document.getElementById('api-key-input');
            const provider = providerSelect ? providerSelect.value : null;
            
            if (!provider) {
                alert('Please select a provider first');
                return;
            }
            
            if (apiKeyInput && apiKeyInput.value) {
                // Save API key
                fetch('/api/llm/api-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        provider: provider,
                        api_key: apiKeyInput.value
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('API key saved successfully:', data);
                    
                    // Clear the input
                    apiKeyInput.value = '';
                    
                    // Show success message
                    showNotification(`API key for ${getProviderDisplayName(provider)} saved successfully`, 'success');
                    
                    // Update models list after API key is saved
                    loadModelsForProvider(provider);
                    
                    // Refresh provider list to update availability
                    fetch('/api/llm/providers')
                        .then(response => response.json())
                        .then(data => {
                            updateProviderSelect(data.providers);
                        });
                })
                .catch(error => {
                    console.error('Error saving API key:', error);
                    showNotification(`Failed to save API key: ${error.message}`, 'danger');
                });
            } else {
                showNotification('Please enter a valid API key', 'warning');
            }
        });
    }
    
    // Handle save model settings button click
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            // Get selected values
            const provider = providerSelect ? providerSelect.value : null;
            const model = modelSelect ? modelSelect.value : null;
            const temperature = temperatureSlider ? parseFloat(temperatureSlider.value) : 0.7;
            const maxTokens = maxTokensInput ? parseInt(maxTokensInput.value, 10) : 256;
            const topP = topPSlider ? parseFloat(topPSlider.value) : 0.95;
            
            // Save settings
            saveLLMSettings(provider, model, { temperature, max_tokens: maxTokens, top_p: topP });
        });
    }
}

/**
 * Load models for a specific provider
 * @param {string} provider - The provider ID
 */
function loadModelsForProvider(provider) {
    const modelSelect = document.getElementById('llm-model-select');
    if (!modelSelect) return;
    
    // Clear existing options
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
    // Fetch models for the provider
    fetch(`/api/llm/models?provider=${provider}`)
        .then(response => response.json())
        .then(data => {
            // Clear loading option
            modelSelect.innerHTML = '';
            
            // Add options for each model
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                option.title = model.description || '';
                modelSelect.appendChild(option);
            });
            
            // Set the current model
            if (data.current_model) {
                modelSelect.value = data.current_model;
            }
        })
        .catch(error => {
            console.error('Error fetching models for provider:', error);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        });
}

/**
 * Update the API key section based on the selected provider
 * @param {string} provider - The provider ID
 */
function updateApiKeySection(provider) {
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyLabel = document.getElementById('api-key-label');
    
    if (!apiKeySection || !apiKeyLabel) return;
    
    // Show API key section for cloud providers
    if (provider === 'ollama') {
        apiKeySection.style.display = 'none';
    } else {
        apiKeySection.style.display = 'block';
        apiKeyLabel.textContent = `${getProviderDisplayName(provider)} API Key`;
    }
}

/**
 * Save LLM settings
 * @param {string} provider - The provider ID
 * @param {string} model - The model ID
 * @param {Object} parameters - Model parameters (temperature, max_tokens, etc.)
 */
function saveLLMSettings(provider, model, parameters) {
    // Validate input
    if (!provider || !model) {
        alert('Please select both a provider and a model');
        return;
    }
    
    // Save settings via API
    fetch('/api/llm/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            provider: provider,
            model: model,
            parameters: parameters
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Update UI with new settings
        updateComponentStatus();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modelSettingsModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show success message
        alert('LLM settings updated successfully');
    })
    .catch(error => {
        console.error('Error saving LLM settings:', error);
        alert(`Failed to save LLM settings: ${error.message}`);
    });
}

/**
 * Setup event listener for the analyze button
 */
function setupAnalyzeEventListener() {
    const analyzeButton = document.getElementById('analyze-button');
    const issueDescription = document.getElementById('issue-description');
    
    if (analyzeButton && issueDescription) {
        analyzeButton.addEventListener('click', () => {
            const query = issueDescription.value.trim();
            if (query) {
                analyzeQuery(query);
            } else {
                alert('Please enter a description of the issue or a question.');
            }
        });
        
        // Also trigger analysis on Enter key when in textarea
        issueDescription.addEventListener('keydown', (e) => {
            // Check if Enter key was pressed without shift (to allow for multi-line entry with Shift+Enter)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent default action (new line)
                analyzeButton.click(); // Trigger the button click
            }
        });
    }
}

/**
 * Update the status indicators for AI components
 */
function updateComponentStatus() {
    // Update component status indicators
    const llmProvider = document.getElementById('llm-provider');
    const llmModel = document.getElementById('llm-model');
    const vectorStatus = document.getElementById('vector-status');
    const embeddingStatus = document.getElementById('embedding-status');
    const mlStatus = document.getElementById('ml-status');
    
    // Fetch the current LLM settings
    fetch('/api/llm/settings')
        .then(response => response.json())
        .then(data => {
            if (llmProvider) {
                const providerName = getProviderDisplayName(data.provider);
                llmProvider.textContent = providerName;
                llmProvider.className = 'badge bg-success';
            }
            
            if (llmModel) {
                llmModel.textContent = data.model;
                llmModel.className = 'badge bg-success';
            }
        })
        .catch(error => {
            console.error('Error fetching LLM settings:', error);
            if (llmProvider) {
                llmProvider.textContent = 'Unknown';
                llmProvider.className = 'badge bg-warning';
            }
            if (llmModel) {
                llmModel.textContent = 'Unknown';
                llmModel.className = 'badge bg-warning';
            }
        });
    
    if (vectorStatus) {
        vectorStatus.textContent = 'Active';
        vectorStatus.className = 'badge bg-success';
    }
    
    if (embeddingStatus) {
        embeddingStatus.textContent = 'MiniLM-L6';
        embeddingStatus.className = 'badge bg-success';
    }
    
    if (mlStatus) {
        mlStatus.textContent = 'Isolation Forest';
        mlStatus.className = 'badge bg-success';
    }
}

/**
 * Convert provider ID to display name
 * @param {string} providerId - The provider ID
 * @returns {string} The display name
 */
function getProviderDisplayName(providerId) {
    const providers = {
        'ollama': 'OLLAMA (Local)',
        'anthropic': 'Anthropic Claude',
        'openai': 'OpenAI',
        'perplexity': 'Perplexity AI'
    };
    
    return providers[providerId.toLowerCase()] || providerId;
}

/**
 * Update the provider select dropdown with the latest provider data
 * @param {Array} providers - Array of provider objects
 * @param {string} currentProvider - The currently selected provider ID
 */
function updateProviderSelect(providers, currentProvider = null) {
    const providerSelect = document.getElementById('llm-provider-select');
    if (!providerSelect) return;
    
    // Save current selection if not provided
    if (!currentProvider) {
        currentProvider = providerSelect.value;
    }
    
    // Clear existing options
    providerSelect.innerHTML = '';
    
    // Add options for each provider
    providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        
        // Disabled unavailable providers
        if (!provider.available) {
            option.disabled = true;
            option.textContent += ' (API Key Required)';
        }
        
        providerSelect.appendChild(option);
    });
    
    // Set the current provider
    if (currentProvider) {
        providerSelect.value = currentProvider;
    }
}

/**
 * Setup the sample question clickable elements
 */
function setupSampleQuestions() {
    const sampleQuestions = document.querySelectorAll('.sample-question');
    const issueDescription = document.getElementById('issue-description');
    
    if (sampleQuestions && issueDescription) {
        sampleQuestions.forEach(question => {
            question.addEventListener('click', () => {
                issueDescription.value = question.textContent.trim();
                issueDescription.focus();
            });
        });
    }
}

/**
 * Analyze a user query using the RAG system
 * @param {string} query - The user's question or issue description
 */
function analyzeQuery(query) {
    // Show loading state
    setAnalysisLoadingState(true);
    const suggestionContainer = document.getElementById('suggestion-container');
    if (suggestionContainer) {
        suggestionContainer.style.display = 'none';
    }
    
    // Make API request to analyze logs
    fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            selected_logs: [] // Could add support for user-selected logs later
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Display suggestion and relevant logs
        displaySuggestion(data.suggestion, data.relevant_logs);
        setAnalysisLoadingState(false);
    })
    .catch(error => {
        console.error('Error analyzing logs:', error);
        // Display error message
        displayError(`Failed to analyze logs: ${error.message}`);
        setAnalysisLoadingState(false);
    });
}

/**
 * Set the loading state during analysis
 * @param {boolean} isLoading - Whether analysis is loading
 */
function setAnalysisLoadingState(isLoading) {
    const analyzeButton = document.getElementById('analyze-button');
    const loadingIndicator = document.getElementById('suggestion-loading');
    
    if (analyzeButton) {
        if (isLoading) {
            analyzeButton.disabled = true;
            analyzeButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
            analyzeStatus = 'loading';
        } else {
            analyzeButton.disabled = false;
            analyzeButton.innerHTML = '<i class="fas fa-search me-2"></i> Analyze Logs';
            analyzeStatus = 'idle';
        }
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
}

/**
 * Display the generated suggestion and relevant logs
 * @param {string} suggestion - The AI-generated suggestion
 * @param {Array} relevantLogs - Array of relevant log entries
 */
function displaySuggestion(suggestion, relevantLogs) {
    const suggestionContainer = document.getElementById('suggestion-container');
    const suggestionContent = document.getElementById('suggestion-content');
    const relevantLogsContainer = document.getElementById('relevant-logs');
    
    if (suggestionContainer && suggestionContent && relevantLogsContainer) {
        // Format and display the suggestion, adding line breaks for readability
        const formattedSuggestion = suggestion
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
            
        suggestionContent.innerHTML = `
            <div class="mb-3">${formattedSuggestion}</div>
        `;
        
        // Display relevant logs
        relevantLogsContainer.innerHTML = '';
        if (relevantLogs && relevantLogs.length > 0) {
            relevantLogs.forEach(log => {
                const logLevel = log.level || 'INFO';
                const logTime = log.timestamp || 'Unknown';
                const logMessage = log.message || 'No message';
                const logService = log.service || 'unknown';
                
                const logElement = document.createElement('div');
                logElement.className = 'list-group-item';
                logElement.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">
                            <span class="badge level-badge level-${logLevel}">${logLevel}</span>
                            <span class="text-muted small">[${logService}]</span>
                        </h6>
                        <small class="text-muted">${logTime}</small>
                    </div>
                    <p class="mb-1">${logMessage}</p>
                `;
                
                relevantLogsContainer.appendChild(logElement);
            });
        } else {
            relevantLogsContainer.innerHTML = `
                <div class="list-group-item text-center">
                    <i class="fas fa-info-circle me-2"></i> No relevant logs found
                </div>
            `;
        }
        
        // Show the suggestion container
        suggestionContainer.style.display = 'block';
        
        // Scroll to the suggestion
        suggestionContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Display an error message
 * @param {string} message - The error message to display
 */
function displayError(message) {
    const suggestionContainer = document.getElementById('suggestion-container');
    const suggestionContent = document.getElementById('suggestion-content');
    const relevantLogsContainer = document.getElementById('relevant-logs');
    
    if (suggestionContainer && suggestionContent) {
        suggestionContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> ${message}
            </div>
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> The system can continue analyzing logs using its local models, 
                but for the best analysis, please ensure the LLM service (Ollama) is running.
            </div>
        `;
        
        if (relevantLogsContainer) {
            relevantLogsContainer.innerHTML = '';
        }
        
        // Show the container
        suggestionContainer.style.display = 'block';
    }
}

/**
 * Setup the maintenance refresh button click event
 */
function setupMaintenanceRefresh() {
    const refreshButton = document.getElementById('refresh-maintenance-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadPredictiveMaintenance();
        });
    }
}

/**
 * Load predictive maintenance data from the API
 */
function loadPredictiveMaintenance() {
    const loadingIndicator = document.getElementById('maintenance-loading');
    const contentContainer = document.getElementById('maintenance-content');
    
    if (loadingIndicator && contentContainer) {
        loadingIndicator.style.display = 'block';
        contentContainer.style.display = 'none';
        
        fetch('/api/predictive-maintenance/analysis')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                displayMaintenanceData(data);
                loadingIndicator.style.display = 'none';
                contentContainer.style.display = 'flex';
            })
            .catch(error => {
                console.error('Error loading predictive maintenance data:', error);
                loadingIndicator.style.display = 'none';
                displayMaintenanceError(error.message);
            });
    }
}

/**
 * Display the predictive maintenance data
 * @param {Object} data - The maintenance data from the API
 */
function displayMaintenanceData(data) {
    // Update timestamp
    const lastUpdated = document.getElementById('health-last-updated');
    if (lastUpdated && data.timestamp) {
        const timestamp = new Date(data.timestamp);
        lastUpdated.textContent = `Last updated: ${timestamp.toLocaleString()}`;
    }
    
    // Create health chart
    createHealthChart(
        data.healthy_components ? data.healthy_components.length : 0,
        data.at_risk_components ? data.at_risk_components.length : 0,
        data.maintenance_required ? data.maintenance_required.length : 0
    );
    
    // Display recommendations
    displayRecommendations(
        data.maintenance_required || [],
        data.at_risk_components || []
    );
}

/**
 * Create the equipment health chart
 * @param {number} healthyCount - Number of healthy components
 * @param {number} atRiskCount - Number of at-risk components
 * @param {number} maintenanceCount - Number of components requiring maintenance
 */
function createHealthChart(healthyCount, atRiskCount, maintenanceCount) {
    const ctx = document.getElementById('health-chart');
    
    if (!ctx) return;
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.healthChart) {
        window.healthChart.destroy();
    }
    
    // Create new chart
    window.healthChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy', 'At Risk', 'Maintenance Required'],
            datasets: [{
                data: [healthyCount, atRiskCount, maintenanceCount],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',  // Green for healthy
                    'rgba(255, 193, 7, 0.7)',  // Yellow for at risk
                    'rgba(220, 53, 69, 0.7)'   // Red for maintenance required
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f8f9fa'
                    }
                }
            }
        }
    });
}

/**
 * Display maintenance recommendations
 * @param {Array} maintenanceRequired - Components requiring immediate maintenance
 * @param {Array} atRiskComponents - Components at risk
 */
function displayRecommendations(maintenanceRequired, atRiskComponents) {
    const tableBody = document.getElementById('recommendations-table-body');
    const noRecommendations = document.getElementById('no-recommendations');
    
    if (!tableBody || !noRecommendations) return;
    
    // Combine all recommendations
    const allRecommendations = [...maintenanceRequired, ...atRiskComponents];
    
    if (allRecommendations.length === 0) {
        tableBody.innerHTML = '';
        noRecommendations.style.display = 'block';
        return;
    }
    
    // Show recommendations
    noRecommendations.style.display = 'none';
    tableBody.innerHTML = '';
    
    // Sort by health score (ascending - worst first)
    allRecommendations.sort((a, b) => (a.health_score || 100) - (b.health_score || 100));
    
    // Add rows to table
    allRecommendations.forEach(item => {
        const healthScore = item.health_score || 0;
        let healthClass = 'bg-success';
        let action = 'Monitor';
        let urgency = 'Low';
        
        if (healthScore < 30) {
            healthClass = 'bg-danger';
            action = 'Replace';
            urgency = 'High';
        } else if (healthScore < 60) {
            healthClass = 'bg-warning';
            action = 'Maintenance';
            urgency = 'Medium';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.component || 'Unknown'}</td>
            <td>${item.action || action}</td>
            <td>${item.urgency || urgency}</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${healthClass}" role="progressbar" 
                         style="width: ${healthScore}%;" 
                         aria-valuenow="${healthScore}" aria-valuemin="0" aria-valuemax="100">
                        ${healthScore}%
                    </div>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Display an error in the maintenance section
 * @param {string} message - The error message
 */
function displayMaintenanceError(message) {
    const contentContainer = document.getElementById('maintenance-content');
    
    if (contentContainer) {
        contentContainer.style.display = 'block';
        contentContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> 
                    Error loading predictive maintenance data: ${message}
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Try refreshing the data or check the server logs for more information.
                </div>
            </div>
        `;
    }
}

/**
 * Add a log entry to the selected logs context for analysis
 * This function is exposed globally for vector search to use
 * @param {Object} logData - The log data to add to context
 */
function addToSelectedLogsContext(logData) {
    // Make sure window.selectedLogs is initialized
    if (!window.selectedLogs) {
        window.selectedLogs = [];
    }
    
    // Check if log already exists in the selected logs
    const exists = window.selectedLogs.some(log => 
        JSON.stringify(log) === JSON.stringify(logData)
    );
    
    if (!exists) {
        window.selectedLogs.push(logData);
        showNotification(`Added log entry to analysis context`, 'success');
        
        // Update analyze button to indicate context is available
        const analyzeButton = document.getElementById('analyze-button');
        if (analyzeButton) {
            analyzeButton.innerHTML = `
                <i class="fas fa-search me-2"></i> 
                Analyze Logs <span class="badge bg-info ms-2">${window.selectedLogs.length}</span>
            `;
        }
        
        // Update the analyze query function to include selected logs
        updateAnalyzeQueryWithContext();
    } else {
        showNotification('This log entry is already in the analysis context', 'warning');
    }
}

// Expose the function globally for vector search to use
window.addToSelectedLogs = addToSelectedLogsContext;

/**
 * Update the analyze query function to include the selected logs context
 */
function updateAnalyzeQueryWithContext() {
    // Modify the analyzeQuery function to include selected logs
    analyzeQuery = function(query) {
        // Show loading state
        setAnalysisLoadingState(true);
        const suggestionContainer = document.getElementById('suggestion-container');
        if (suggestionContainer) {
            suggestionContainer.style.display = 'none';
        }
        
        // Make API request to analyze logs with selected logs context
        fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                selected_logs: window.selectedLogs || []
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Display suggestion and relevant logs
            displaySuggestion(data.suggestion, data.relevant_logs);
            setAnalysisLoadingState(false);
        })
        .catch(error => {
            console.error('Error analyzing logs:', error);
            // Display error message
            displayError(`Failed to analyze logs: ${error.message}`);
            setAnalysisLoadingState(false);
        });
    };
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The message type (success, info, warning, danger)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification fade-in`;
    notification.innerHTML = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('fade-in');
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 500); // Time for fade out animation
    }, 3000); // Display time
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initAIAssistant();
});