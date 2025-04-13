document.addEventListener('DOMContentLoaded', function() {
    fetchStartupInfo();
});

// Fetch server startup info from client API
function fetchStartupInfo() {
    fetch(`startup.php?id=${serverId}&action=get_startup_info`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            
            renderStartupForm(data);
        })
        .catch(error => {
            showError('Failed to fetch server information: ' + error.message);
        });
}

// Render the startup form with server information
function renderStartupForm(serverInfo) {
    const container = document.getElementById('startup-settings-container');
    
    if (!serverInfo || !serverInfo.meta || !serverInfo.data) {
        container.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to load server configuration</div>';
        return;
    }
    
    // Get startup command and docker images from meta
    const startupCommand = serverInfo.meta.startup_command || '';
    const rawStartupCommand = serverInfo.meta.raw_startup_command || '';
    const dockerImages = serverInfo.meta.docker_images || {};
    
    // Extract application details (egg ID and current Docker image)
    const eggId = serverInfo.application_details?.egg_id;
    const currentImage = serverInfo.application_details?.current_image;
    
    // Get environment variables directly, no need for grouping
    const variables = serverInfo.data || [];
    
    // Render the form
    container.innerHTML = `
        <form id="startup-form">
            <!-- Top row with Startup Command and Docker Image side by side -->
            <div class="row mb-3">
                <!-- Startup Command Card (left side) -->
                <div class="col-md-6">
                    <div class="card section-card h-100">
                        <div class="card-header">
                            <h4 class="card-title m-0">
                                <i class="bi bi-terminal me-2"></i>Startup Command
                            </h4>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Configure the command used to start your Minecraft server.</p>
                            <div class="mb-3">
                                <textarea class="form-control auto-resize" id="startup-command" style="overflow: hidden;">${rawStartupCommand}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Docker Image Card (right side) -->
                <div class="col-md-6">
                    <div class="card section-card h-100">
                        <div class="card-header">
                            <h4 class="card-title m-0">
                                <i class="bi bi-box-seam me-2"></i>Docker Image
                            </h4>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Select the Docker image that will run your server.</p>
                            <div>
                                ${renderDockerImageOptions(dockerImages, currentImage)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Environment Variables Card (full width below) -->
            <div class="card section-card">
                <div class="card-header">
                    <h4 class="card-title m-0">
                        <i class="bi bi-braces me-2"></i>Environment Variables
                    </h4>
                </div>
                <div class="card-body">
                    <p class="text-muted">Configure environment variables that control your server's behavior.</p>
                    
                    ${renderEnvironmentVariables(variables)}
                </div>
            </div>
            
            <input type="hidden" id="egg-id" value="${eggId || ''}">
            
            <div class="d-grid gap-2 col-md-6 mx-auto mt-4">
                <button type="submit" class="btn btn-primary save-btn">
                    <i class="bi bi-save me-2"></i>Save Changes
                </button>
            </div>
        </form>
    `;
    
    // Auto-resize textarea
    const autoResizeTextarea = () => {
        const textarea = document.getElementById('startup-command');
        if (textarea) {
            // Reset height to avoid issues with shrinking
            textarea.style.height = 'auto';
            // Set the height to match the scrollHeight (content height)
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    };
    
    // Call once on load
    autoResizeTextarea();
    
    // Add event listener for changes
    document.getElementById('startup-command')?.addEventListener('input', autoResizeTextarea);
    
    // No longer need click listeners for Docker image selection as we're using a dropdown
    
    // Add form submit handler
    document.getElementById('startup-form').addEventListener('submit', handleFormSubmit);
}

// Render Docker image options as a dropdown
function renderDockerImageOptions(images, currentImage) {
    let options = '';
    
    // Add options for each Docker image
    Object.entries(images).forEach(([name, image]) => {
        const isSelected = image === currentImage ? 'selected' : '';
        options += `<option value="${image}" ${isSelected}>${name} (${image})</option>`;
    });
    
    // If current image is not in the list, add it as custom option
    if (currentImage && !Object.values(images).includes(currentImage)) {
        options += `<option value="${currentImage}" selected>Custom (${currentImage})</option>`;
    }
    
    // Return the complete select element
    return `
        <label for="docker-image" class="form-label">Docker Image</label>
        <select class="form-select" id="docker-image" aria-label="Select Docker Image">
            ${options}
        </select>
        <small class="text-muted mt-1 d-block">The container image will be used to run your server.</small>
    `;
}

// Render environment variables in a simple 2-column grid
function renderEnvironmentVariables(variables) {
    let html = '<div class="row g-3">';
    
    // Create a card for each variable, 2 per row
    variables.forEach(variable => {
        const attr = variable.attributes;
        const isEditable = attr.is_editable;
        const disabled = isEditable ? '' : 'disabled';
        const value = attr.server_value !== null ? attr.server_value : attr.default_value;
        
        html += `
        <div class="col-md-6">
            <div class="env-var-card h-100">
                <div class="mb-2">
                    <label for="var-${attr.env_variable}" class="form-label fw-bold">
                        ${attr.name}
                        ${!isEditable ? '<span class="badge bg-secondary ms-2">Read Only</span>' : ''}
                    </label>
                    <input type="text" 
                        id="var-${attr.env_variable}"
                        class="form-control env-variable" 
                        data-var-name="${attr.env_variable}" 
                        value="${value}" ${disabled}>
                </div>
                <small class="text-muted">${attr.description}</small>
            </div>
        </div>`;
    });
    
    html += '</div>';
    return html;
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const startupCommand = document.getElementById('startup-command').value;
    const dockerImage = document.getElementById('docker-image').value;
    const eggId = document.getElementById('egg-id').value;
    
    // Get environment variables
    const environment = {};
    document.querySelectorAll('.env-variable:not([disabled])').forEach(input => {
        environment[input.dataset.varName] = input.value;
    });
    
    // Create request payload for application API
    const payload = {
        startup: startupCommand,
        environment: environment,
        image: dockerImage,
        skip_scripts: false
    };
    
    // Add egg ID if we have it
    if (eggId) {
        payload.egg = parseInt(eggId);
    }
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;
    
    // Send update request to application API
    fetch(`startup.php?id=${serverId}&action=update_startup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(`${data.error}: ${JSON.stringify(data.details || {})}`);
        } else {
            showSuccess('Startup settings updated successfully!');
            // Refresh after 2 seconds to show updated values
            setTimeout(() => {
                fetchStartupInfo();
            }, 2000);
        }
    })
    .catch(error => {
        showError('Failed to update startup settings: ' + error.message);
    })
    .finally(() => {
        // Restore button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    });
}

// Display error message
function showError(message) {
    const container = document.getElementById('startup-settings-container');
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger alert-dismissible fade show';
    alertElement.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at the top of the container
    container.insertBefore(alertElement, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        $(alertElement).alert('close');
    }, 5000);
    
    // Scroll to the top to show the message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Display success message
function showSuccess(message) {
    const container = document.getElementById('startup-settings-container');
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-success alert-dismissible fade show';
    alertElement.innerHTML = `
        <i class="bi bi-check-circle-fill me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at the top of the container
    container.insertBefore(alertElement, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        $(alertElement).alert('close');
    }, 5000);
    
    // Scroll to the top to show the message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}