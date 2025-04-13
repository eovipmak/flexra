$(document).ready(function() {
    // Get server details including nest and egg information
    let serverDetails = null;
    let availableEggs = [];
    let selectedEggId = null;
    let eggDetails = {}; // Cache for egg details (environment variables, docker image, etc.)
    let nestName = "Unknown"; // Default nest name
    let availableNests = []; // Store available nests
    let selectedNestId = null; // Track selected nest
    let isLoadingEggs = false; // Track egg loading state
    
    // Load server details
    loadServerDetails();
    
    function loadServerDetails() {
        $.ajax({
            url: `settings.php?id=${serverId}&action=get_server_details`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                serverDetails = data;
                selectedEggId = serverDetails.attributes.egg;
                selectedNestId = serverDetails.attributes.nest;
                
                // Load available nests
                loadAvailableNests();
                
                // Get details for current egg
                loadEggDetails(selectedEggId, selectedNestId);
            },
            error: function() {
                showError('Failed to load server details. Please check your permissions.');
            }
        });
    }
    
    function loadAvailableNests() {
        $.ajax({
            url: `settings.php?id=${serverId}&action=get_available_nests`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                availableNests = data.data || [];
                
                // Load nest details for current nest
                if (selectedNestId) {
                    loadNestDetails(selectedNestId);
                    
                    // Fetch available eggs for current nest
                    loadAvailableEggs(selectedNestId);
                }
                
                renderSettingsForm();
            },
            error: function() {
                showError('Failed to load available nests. Please check your permissions.');
                
                // If we can't load nests, try to load eggs for the current nest at least
                if (selectedNestId) {
                    loadNestDetails(selectedNestId);
                    loadAvailableEggs(selectedNestId);
                    renderSettingsForm();
                }
            }
        });
    }
    
    function loadNestDetails(nestId) {
        if (!nestId) return;
        
        $.ajax({
            url: `settings.php?id=${serverId}&action=get_nest_details&nest_id=${nestId}`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data && data.attributes && data.attributes.name) {
                    nestName = data.attributes.name;
                    // Update the display if form is already rendered
                    updateNestDisplay();
                }
            },
            error: function() {
                console.error("Failed to load nest details.");
            }
        });
    }
    
    function updateNestDisplay() {
        // Update nest selector if it exists
        if (availableNests.length > 0) {
            $("#nest-selector").val(selectedNestId);
        } else {
            $("#nest-name-input").val(nestName);
        }
    }
    
    function loadAvailableEggs(nestId) {
        if (!nestId) return;
        
        // Set loading state
        isLoadingEggs = true;
        updateEggDisplay();
        
        $.ajax({
            url: `settings.php?id=${serverId}&action=get_available_eggs&nest_id=${nestId}`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                availableEggs = data.data || [];
                isLoadingEggs = false;
                updateEggDisplay();
            },
            error: function() {
                showError('Failed to load available eggs. Please check your permissions.');
                isLoadingEggs = false;
                updateEggDisplay();
            }
        });
    }
    
    function updateEggDisplay() {
        // Update the egg selection UI
        const eggContainer = $('#egg-selection-container');
        if (eggContainer.length) {
            if (isLoadingEggs) {
                eggContainer.html(`
                    <div class="text-center py-4">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Loading egg options...</span>
                        </div>
                        <p class="mt-2">Loading available platforms...</p>
                    </div>
                `);
            } else {
                eggContainer.html(`
                    <div class="egg-selection-grid">
                        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2 row-eq-height">
                            ${renderEggCards()}
                        </div>
                    </div>
                `);
                
                // Reattach click events
                $('.egg-card').on('click', function() {
                    $('.egg-card').removeClass('selected');
                    $(this).addClass('selected');
                    
                    // Update selected egg
                    selectedEggId = $(this).data('egg-id');
                    
                    // Preload details if not already cached
                    if (!eggDetails[selectedEggId]) {
                        loadEggDetails(selectedEggId, selectedNestId);
                    }
                });
            }
        }
    }
    
    function loadEggDetails(eggId, nestId) {
        // Check if we already have this egg's details cached
        if (eggDetails[eggId]) {
            return;
        }
        
        $.ajax({
            url: `settings.php?id=${serverId}&action=get_egg_details&egg_id=${eggId}&nest_id=${nestId}`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.error) {
                    console.error("Failed to load egg details:", data.error);
                    return;
                }
                
                // Cache the egg details
                eggDetails[eggId] = data;
            },
            error: function() {
                console.error("Failed to load egg details. API request failed.");
            }
        });
    }
    
    function renderSettingsForm() {
        if (!serverDetails) {
            return;
        }
        
        // Create settings form
        let html = `
            <form id="settings-form">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Changing the server platform may require reconfiguring your startup parameters and could cause compatibility issues with existing worlds.
                </div>
                
                <div class="section-card card mb-4">
                    <div class="card-body">
                        <!-- Server Type (Nest) Selection -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">Type</label>
                            <div id="nest-selection-container">
                                <div class="nest-selection-grid">
                                    <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2 row-eq-height">
                                        ${renderNestCards()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Server Platform (Egg) Selection -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">Platform</label>
                            <div id="egg-selection-container">
                                <div class="egg-selection-grid">
                                    <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2 row-eq-height">
                                        ${renderEggCards()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between">
                    <button type="button" id="reinstall-server" class="btn btn-danger">
                        <i class="bi bi-arrow-repeat me-2"></i>Reinstall Server
                    </button>
                    <button type="submit" id="save-settings" class="btn btn-primary save-btn">
                        <i class="bi bi-save me-2"></i>Save Changes
                    </button>
                </div>
            </form>
        `;
        
        $('#settings-container').html(html);
        
        // Add confirmation modal to the page
        const modalHtml = `
            <div class="modal fade" id="reinstall-confirm-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>Confirm Reinstallation
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="fw-bold">WARNING: This action cannot be undone!</p>
                            <p>Reinstalling the server will:</p>
                            <ul>
                                <li>Reset all server files to their default state</li>
                                <li>Delete all plugin/mod installations</li>
                                <li>Remove all worlds and saves</li>
                                <li>Clear all configuration files</li>
                            </ul>
                            <p>Are you absolutely sure you want to continue?</p>
                            
                            <div class="alert alert-info mt-3">
                                <i class="bi bi-info-circle-fill me-2"></i>
                                <strong>Important:</strong> After reinstallation completes, you will need to 
                                <strong>manually start the server</strong> from the Console tab for changes to take effect.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-reinstall-btn">
                                Yes, Reinstall Server
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append the modal to the settings container
        $('#settings-container').append(modalHtml);
        
        // Bind events after rendering
        $('.egg-card').on('click', function() {
            $('.egg-card').removeClass('selected');
            $(this).addClass('selected');
            
            // Update selected egg
            selectedEggId = $(this).data('egg-id');
            
            // Preload details if not already cached
            if (!eggDetails[selectedEggId]) {
                loadEggDetails(selectedEggId, selectedNestId);
            }
        });
        
        // Bind event for nest selection
        $('.nest-card').on('click', function() {
            $('.nest-card').removeClass('selected');
            $(this).addClass('selected');
            
            // Update selected nest
            const newNestId = $(this).data('nest-id');
            
            // Only reload eggs if the nest actually changed
            if (selectedNestId !== newNestId) {
                selectedNestId = newNestId;
                
                // Reset selected egg when nest changes
                selectedEggId = null;
                
                // Load nest details
                loadNestDetails(selectedNestId);
                
                // Load eggs for the selected nest
                loadAvailableEggs(selectedNestId);
            }
        });
        
        $('#settings-form').on('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
        
        // Change reinstall button handler to show modal instead of basic confirm
        $('#reinstall-server').on('click', function() {
            // Show the modal instead of the browser confirm dialog
            const reinstallModal = new bootstrap.Modal(document.getElementById('reinstall-confirm-modal'));
            reinstallModal.show();
        });
        
        // Handle the confirm button in the modal
        $('#confirm-reinstall-btn').on('click', function() {
            reinstallServer();
            bootstrap.Modal.getInstance(document.getElementById('reinstall-confirm-modal')).hide();
        });
    }
    
    function renderNestCards() {
        // If no nests are available, just display current nest name in readonly input
        if (!availableNests || availableNests.length === 0) {
            return `<div class="col-12">
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    No server types available. Using: ${escapeHtml(nestName)}
                </div>
            </div>`;
        }
        
        // Otherwise, create cards for each nest
        return availableNests.map(nest => {
            const isSelected = nest.attributes.id === selectedNestId;
            return `
                <div class="nest-grid-item col">
                    <div class="nest-card ${isSelected ? 'selected' : ''}" data-nest-id="${nest.attributes.id}">
                        <div class="nest-name">${escapeHtml(nest.attributes.name)}</div>
                        <div class="nest-description">${escapeHtml(nest.attributes.description || 'No description available')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderEggCards() {
        if (!availableEggs.length) {
            return '<div class="col-12">No platforms available for this server type.</div>';
        }
        
        return availableEggs.map(egg => {
            const isSelected = egg.attributes.id === selectedEggId;
            // Also fetch details for each egg so they're ready when selected
            if (!eggDetails[egg.attributes.id]) {
                loadEggDetails(egg.attributes.id, selectedNestId);
            }
            return `
                <div class="egg-grid-item col">
                    <div class="egg-card ${isSelected ? 'selected' : ''}" data-egg-id="${egg.attributes.id}">
                        <div class="egg-name">${escapeHtml(egg.attributes.name)}</div>
                        <div class="egg-description">${escapeHtml(egg.attributes.description)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function saveSettings() {
        if (!selectedEggId || !serverDetails) {
            showError('Please select a platform before saving.');
            return;
        }
        
        // Show loading state
        const saveBtn = $('#save-settings');
        const originalBtnText = saveBtn.html();
        saveBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...');
        saveBtn.prop('disabled', true);
        
        // Function to continue with the save operation when egg details are available
        const proceedWithSave = () => {
            // Get the egg details (if available)
            const eggData = eggDetails[selectedEggId]?.attributes;
            
            if (!eggData) {
                showError("Error: Could not load egg configuration data");
                saveBtn.html(originalBtnText);
                saveBtn.prop('disabled', false);
                return;
            }
            
            console.log("Retrieved egg details:", eggData);
            
            // Prepare data for update
            const updateData = {
                egg: selectedEggId,
                skip_scripts: false
            };
            
            // Use the egg's startup command
            updateData.startup = eggData.startup;
            
            // Use the first Docker image from the egg
            if (eggData.docker_images && Object.keys(eggData.docker_images).length > 0) {
                updateData.image = Object.values(eggData.docker_images)[0];
            } else {
                // Fallback to current image if available
                updateData.image = serverDetails.attributes.container.image;
            }
            
            // CRITICAL: Set environment variables from egg definition
            updateData.environment = {};
            
            // First try to get variables from the embedded relationships
            let variables = [];
            
            // Try different paths for variables based on API response structure
            if (eggData.variables && Array.isArray(eggData.variables)) {
                // Direct variables array
                variables = eggData.variables;
            } else if (eggData.relationships && eggData.relationships.variables && eggData.relationships.variables.data) {
                // Relationship data format
                variables = eggData.relationships.variables.data;
            }
            
            // If we still don't have variables, try a different approach - use current server's env vars
            if (!variables.length && serverDetails.attributes.container && serverDetails.attributes.container.environment) {
                // Fall back to current server environment variables
                console.log("Falling back to current server environment variables");
                updateData.environment = { ...serverDetails.attributes.container.environment };
            } else if (variables.length > 0) {
                // Process the variables we found
                variables.forEach(variable => {
                    // Handle different variable formats from API
                    const envVar = variable.env_variable || variable.attributes?.env_variable;
                    const defaultValue = variable.default_value || variable.attributes?.default_value;
                    const isRequired = variable.required || variable.attributes?.required;
                    
                    if (envVar) {
                        // Use default value if available, otherwise empty string
                        updateData.environment[envVar] = defaultValue !== null ? defaultValue : '';
                        
                        // Log required variables with no default
                        if (isRequired && defaultValue === null) {
                            console.warn(`Required variable ${envVar} has no default value`);
                        }
                    }
                });
            } else {
                console.error("No variables found for this egg");
                showError("Error: No environment variables found for this egg configuration");
                saveBtn.html(originalBtnText);
                saveBtn.prop('disabled', false);
                return;
            }
            
            console.log("Updating server with:", updateData);
            
            // Make sure we have environment variables
            if (!updateData.environment || Object.keys(updateData.environment).length === 0) {
                showError("Error: Environment variables could not be determined");
                saveBtn.html(originalBtnText);
                saveBtn.prop('disabled', false);
                return;
            }
            
            $.ajax({
                url: `settings.php?id=${serverId}&action=update_settings`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(updateData),
                success: function(data) {
                    if (data.errors) {
                        showError('Failed to update settings: ' + 
                                 (data.errors[0]?.detail || 'Unknown error'));
                    } else {
                        showSuccess('Server settings updated successfully! You may need to restart your server for changes to take effect.');
                        
                        // Reload server details after a short delay
                        setTimeout(() => {
                            loadServerDetails();
                        }, 2000);
                    }
                },
                error: function(xhr) {
                    let errorMessage = 'Failed to update server settings';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.errors && response.errors.length > 0) {
                            errorMessage += ': ' + response.errors[0].detail;
                        }
                    } catch (e) {
                        // Use default error message
                    }
                    showError(errorMessage);
                },
                complete: function() {
                    // Restore button state
                    saveBtn.html(originalBtnText);
                    saveBtn.prop('disabled', false);
                }
            });
        };
        
        // Check if we have the egg details already
        if (eggDetails[selectedEggId]) {
            proceedWithSave();
        } else {
            // Load egg details first, then proceed
            $.ajax({
                url: `settings.php?id=${serverId}&action=get_egg_details&egg_id=${selectedEggId}&nest_id=${selectedNestId}`,
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    if (data.error) {
                        showError("Failed to load egg details: " + data.error);
                        saveBtn.html(originalBtnText);
                        saveBtn.prop('disabled', false);
                        return;
                    }
                    
                    // Cache the egg details
                    eggDetails[selectedEggId] = data;
                    
                    // Now proceed with the save
                    proceedWithSave();
                },
                error: function() {
                    showError("Failed to load egg details. Please try again.");
                    saveBtn.html(originalBtnText);
                    saveBtn.prop('disabled', false);
                }
            });
        }
    }
    
    function reinstallServer() {
        // Show loading state
        const reinstallBtn = $('#reinstall-server');
        const originalBtnText = reinstallBtn.html();
        reinstallBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Reinstalling...');
        reinstallBtn.prop('disabled', true);
        
        $.ajax({
            url: `settings.php?id=${serverId}&action=reinstall`,
            type: 'POST',
            success: function(data) {
                if (data.error) {
                    showError('Failed to reinstall server: ' + data.error);
                } else {
                    showSuccess('Server reinstallation has been initiated. This may take a few minutes to complete. You will need to manually start your server when the process is complete.');
                }
            },
            error: function() {
                showError('Failed to reinstall server. Please try again later.');
            },
            complete: function() {
                // Restore button state
                reinstallBtn.html(originalBtnText);
                reinstallBtn.prop('disabled', false);
            }
        });
    }
    
    // Helper function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Display error message
    function showError(message) {
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Insert at the top of the container
        $('#settings-container').prepend(alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
        
        // Scroll to the top to show the message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Display success message
    function showSuccess(message) {
        const alertHtml = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Insert at the top of the container
        $('#settings-container').prepend(alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
        
        // Scroll to the top to show the message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});