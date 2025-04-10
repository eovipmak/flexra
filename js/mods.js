// Mods page JavaScript functionality

// Global state management
const state = {
    currentProjectId: '',
    selectedFileName: '',
    currentQuery: '',
    currentOffset: 0,
    resultsPerPage: 20,
    totalResults: 0,
    isLoading: false,
    allVersions: [],
    gameVersions: [],
    platforms: []
};

// DOM element references
const elements = {};

// Initialize on document ready
$(document).ready(function() {
    // Cache DOM elements for performance
    cacheElements();
    
    // Initialize Bootstrap modal
    const installModal = new bootstrap.Modal(elements.installModal);
    
    // Add data-skeleton attributes for automatic skeleton loading
    $('#installed-mods-grid, #mod-results').attr({
        'data-skeleton': 'true',
        'data-skeleton-type': 'plugin',
        'data-skeleton-count': '6'
    });
    
    // Initialize event listeners
    setupEventListeners();
    
    // Add animation classes to buttons
    $('.btn').addClass('btn-animated btn-ripple');
    
    // Load initial data with a slight delay for better UX
    setTimeout(() => {
        loadInstalledMods();
        searchMods('', 0);
    }, 300);
    
    // Initialize enhanced UI features if available
    if (window.initializeEnhancedUI) {
        window.initializeEnhancedUI();
    }
});

// Cache DOM elements for faster access
function cacheElements() {
    elements.installModal = document.getElementById('installModal');
    elements.searchInput = $('#search-mod');
    elements.searchButton = $('#search-button');
    elements.modResults = $('#mod-results');
    elements.installedMods = $('#installed-mods-grid');
    elements.installButton = $('#install-mod-btn');
    elements.modalModName = $('#modal-mod-name');
    elements.versionSelect = $('#version-select');
    elements.gameVersionFilter = $('#game-version-filter');
    elements.platformFilter = $('#platform-filter');
}

// Set up all event listeners
function setupEventListeners() {
    // Search functionality
    elements.searchButton.click(() => performSearch());
    elements.searchInput.keypress(e => { if (e.which === 13) performSearch(); });
    
    // Install button
    elements.installButton.click(() => {
        const versionId = elements.versionSelect.val();
        if (versionId && state.currentProjectId && state.selectedFileName) {
            installMod(state.currentProjectId, versionId, state.selectedFileName);
        } else {
            toastManager.warning('Please select a version to install', {
                title: 'Selection Required'
            });
        }
    });
    
    // Filter changes
    elements.gameVersionFilter.add(elements.platformFilter).change(() => populateVersionsDropdown());
    
    // Version selection changes
    elements.versionSelect.change(() => {
        state.selectedFileName = $('option:selected', elements.versionSelect).data('filename');
    });
    
    // Event delegation for pagination and delete buttons
    $(document).on('click', '.pagination-page', function() {
        if ($(this).hasClass('disabled')) return;
        
        const page = parseInt($(this).data('page'));
        state.currentOffset = (page - 1) * state.resultsPerPage;
        searchMods(state.currentQuery, state.currentOffset);
    });
}

// Perform search with current input value
function performSearch() {
    state.currentQuery = elements.searchInput.val();
    state.currentOffset = 0;
    searchMods(state.currentQuery, 0);
}

// AJAX helper function to reduce code duplication
function ajaxRequest(url, method = 'GET', data = null, contentType = null) {
    const options = {
        url: url,
        type: method,
        dataType: 'json',
        error: function(xhr, status, error) {
            console.error(`AJAX Error: ${status}`, error);
            return Promise.reject(error);
        }
    };
    
    if (data) {
        options.data = data;
    }
    
    if (contentType) {
        options.contentType = contentType;
    }
    
    return $.ajax(options);
}

// Load installed mods
function loadInstalledMods() {
    // Show skeleton loading UI
    showLoading('installed-mods-grid');
    
    // Use direct jQuery AJAX for simplicity and reliability
    $.ajax({
        url: `mods.php?id=${serverId}&action=server_mods`,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.mods?.length > 0) {
                const modsHTML = response.mods.map((mod, index) => {
                    const fileName = mod.attributes.name;
                    const firstLetter = fileName.charAt(0).toUpperCase();
                    const size = formatBytes(mod.attributes.size);
                    
                    // Add animation delay based on index
                    const animationDelay = index * 50;
                    
                    // Generate a random color for the mod icon based on the filename
                    const colorHue = Math.abs(fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
                    const iconBg = `hsl(${colorHue}, 70%, 60%)`;
                    const iconColor = colorHue > 180 && colorHue < 360 ? 'white' : 'black';
                    
                    return `
                        <div class="plugin-card installed-plugin card-hover-effect" data-mod-name="${fileName}">
                            <div class="plugin-icon" style="background-color: ${iconBg}; color: ${iconColor}">
                                <span style="font-size: 20px; font-weight: bold;">${firstLetter}</span>
                            </div>
                            <h6 class="text-truncate" title="${fileName}">${fileName}</h6>
                            <div class="plugin-meta">
                                <span class="badge bg-light text-dark rounded-pill">
                                    <i class="bi bi-hdd me-1"></i>${size}
                                </span>
                            </div>
                            <div class="plugin-actions">
                                <button class="btn btn-sm btn-outline-danger w-100 btn-animated btn-ripple" 
                                        onclick="deleteMod('/mods/${fileName}')">
                                    <i class="bi bi-trash me-1"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                $('#installed-mods-grid').html(modsHTML);
                
                // Apply staggered animations using the animation controller if available
                if (window.animationController) {
                    const cards = document.querySelectorAll('.installed-plugin');
                    window.animationController.stagger(
                        Array.from(cards),
                        'fadeInUp',
                        { duration: 500, staggerDelay: 50 }
                    );
                } else {
                    // Fallback animation
                    setTimeout(() => {
                        $('.installed-plugin').each(function(i) {
                            $(this).css('opacity', '1');
                            setTimeout(() => {
                                $(this).css('transform', 'translateY(0)');
                            }, i * 50);
                        });
                    }, 50);
                }
            } else {
                $('#installed-mods-grid').html(`
                    <div class="alert alert-info w-100 fade-in-up">
                        <i class="bi bi-info-circle me-2"></i>No mods installed yet
                    </div>
                `);
            }
        },
        error: function() {
            $('#installed-mods-grid').html(`
                <div class="alert alert-danger w-100 fade-in-up">
                    <i class="bi bi-exclamation-triangle me-2"></i>Failed to load installed mods
                </div>
            `);
        }
    });
}

// Delete mod with confirmation
function deleteMod(modPath) {
    const modName = modPath.split('/').pop();
    
    // Use confirmation modal instead of alert
    confirmationManager.confirm({
        title: 'Delete Mod',
        message: `Are you sure you want to delete "${modName}"?`,
        details: 'This may affect your server functionality and could cause errors if other mods depend on it.',
        confirmText: 'Delete Mod',
        confirmButtonClass: 'btn btn-danger'
    }, () => {
        // This function runs only if the user confirms
        const data = { delete_mod: 1, mod_path: modPath };
        
        ajaxRequest(`mods.php?id=${serverId}`, 'POST', data)
            .then(response => {
                if (response.success) {
                    toastManager.success(`Mod "${modName}" was deleted successfully`, {
                        title: 'Mod Deleted'
                    });
                } else {
                    toastManager.error(`Failed to delete mod: ${response.message || 'Unknown error'}`, {
                        title: 'Deletion Failed'
                    });
                }
                loadInstalledMods(); // Refresh the list regardless of outcome
            })
            .catch(() => {
                toastManager.error('An error occurred while deleting the mod', {
                    title: 'Connection Error'
                });
                loadInstalledMods(); // Still refresh to check current status
            });
    });
}

// Search for mods
function searchMods(query, offset = 0) {
    state.currentQuery = query;
    state.currentOffset = offset;
    state.isLoading = true;
    
    // Show skeleton loading UI
    showLoading('mod-results');
    
    // Add search animation to the search button
    $('#search-button').html('<span class="loading-spinner me-2"></span> Searching...');
    
    // Use direct jQuery AJAX for simplicity and reliability
    $.ajax({
        url: `mods.php?id=${serverId}&action=search&query=${encodeURIComponent(query)}&offset=${offset}&limit=${state.resultsPerPage}`,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            state.isLoading = false;
            
            // Reset search button
            $('#search-button').html('<i class="bi bi-search me-1"></i> Search');
            
            if (response?.hits?.length > 0) {
                state.totalResults = response.total_hits || response.hits.length;
                
                const modsHtml = response.hits.map((mod, index) => {
                    const modId = mod.project_id;
                    const modName = mod.title || 'Unknown Mod';
                    const safeModName = modName.replace(/'/g, "\\'");
                    const modDesc = mod.description || 'No description available';
                    const downloads = formatCompactNumber(mod.downloads || 0);
                    const follows = formatCompactNumber(mod.follows || 0);
                    
                    // Generate a random color for placeholder based on mod name
                    const colorHue = Math.abs(modName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
                    const placeholderColor = `${colorHue.toString(16).padStart(2, '0')}${(colorHue + 120) % 360}${(colorHue + 240) % 360}`;
                    
                    const placeholderIcon = `https://placehold.co/64/${placeholderColor}/ffffff?text=${encodeURIComponent(modName.charAt(0))}`;
                    const modIconUrl = mod.icon_url || placeholderIcon;
                    
                    return `
                    <div class="plugin-card card-hover-effect" data-mod-id="${modId}">
                        <div class="plugin-image-container">
                            <img data-lazy="image" data-src="${modIconUrl}" 
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e9ecef'/%3E%3C/svg%3E" 
                                alt="${modName}" class="lazy-blur" 
                                onerror="this.src='${placeholderIcon}'">
                        </div>
                        <h5 title="${modName}" class="plugin-title">${modName}</h5>
                        <div class="plugin-meta">
                            <span class="badge bg-light text-dark rounded-pill">
                                <i class="bi bi-download me-1"></i> ${downloads}
                            </span>
                            <span class="badge bg-light text-dark rounded-pill">
                                <i class="bi bi-star-fill me-1"></i> ${follows}
                            </span>
                        </div>
                        <div class="description">${modDesc}</div>
                        <div class="plugin-actions">
                            <button class="btn btn-sm btn-primary w-100 install-btn btn-animated btn-ripple" 
                                onclick="openInstallModal('${modId}', '${safeModName}')">
                                <i class="bi bi-download me-1"></i> Install
                            </button>
                        </div>
                    </div>`;
                }).join('');
                
                const totalPages = Math.ceil(state.totalResults / state.resultsPerPage);
                const currentPage = Math.floor(offset / state.resultsPerPage) + 1;
                
                $('#mod-results').html(modsHtml);
                $('.pagination-container').remove();
                
                if (totalPages > 1) {
                    $('#mod-results').after(generatePaginationHTML(currentPage, totalPages));
                    
                    // Add ripple effect to pagination buttons
                    $('.pagination-page').addClass('btn-ripple');
                }
                
                // Initialize lazy loading for the new images
                if (window.enhancedLazyLoading) {
                    enhancedLazyLoading();
                } else if (window.lazyLoader) {
                    window.lazyLoader.observe();
                }
                
                // Apply staggered animations using the animation controller if available
                if (window.animationController) {
                    const cards = document.querySelectorAll('.plugin-card');
                    window.animationController.stagger(
                        Array.from(cards),
                        'fadeInUp',
                        { duration: 500, staggerDelay: 50 }
                    );
                } else {
                    // Fallback animation
                    setTimeout(() => {
                        $('.plugin-card').each(function(i) {
                            $(this).css('opacity', '1');
                            setTimeout(() => {
                                $(this).css('transform', 'translateY(0)');
                            }, i * 50);
                        });
                    }, 50);
                }
            } else {
                $('#mod-results').html(`
                    <div class="alert alert-info w-100 fade-in-up">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-info-circle fs-3 me-3"></i>
                            <div>
                                <h5 class="mb-1">No mods found</h5>
                                <p class="mb-0">Try a different search term or browse popular mods</p>
                            </div>
                        </div>
                    </div>
                `);
                
                // Remove result count if exists
                $('.search-results-count').remove();
            }
        },
        error: function(error) {
            state.isLoading = false;
            
            // Reset search button
            $('#search-button').html('<i class="bi bi-search me-1"></i> Search');
            
            $('#mod-results').html(`
                <div class="alert alert-danger w-100 fade-in-up">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle fs-3 me-3"></i>
                        <div>
                            <h5 class="mb-1">Error loading mods</h5>
                            <p class="mb-0">Please try again later or check your connection</p>
                        </div>
                    </div>
                </div>
            `);
            
            // Remove result count if exists
            $('.search-results-count').remove();
            
            console.error("Search error:", error);
        }
    });
}

// Open the install modal and load versions
function openInstallModal(projectId, projectName) {
    state.currentProjectId = projectId;
    elements.modalModName.text(projectName);
    
    // Reset selects
    elements.versionSelect.html('<option value="">Loading versions...</option>');
    elements.gameVersionFilter.html('<option value="all">All Versions</option>');
    elements.platformFilter.html('<option value="all">All Platforms</option>');
    
    // Show the modal
    getInstallModal().show();
    
    // Fetch versions for this project
    $.ajax({
        url: `mods.php?id=${serverId}&action=versions&project_id=${projectId}`,
        type: 'GET',
        dataType: 'json',
        success: versions => {
            if (!versions?.length) {
                elements.versionSelect.html('<option value="">No versions available</option>');
                return;
            }
            
            // Process versions
            state.allVersions = versions.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
            
            // Extract unique game versions and platforms
            state.gameVersions = [];
            state.platforms = [];
            
            state.allVersions.forEach(version => {
                // Collect game versions
                version.game_versions?.forEach(gv => {
                    if (!state.gameVersions.includes(gv)) state.gameVersions.push(gv);
                });
                
                // Collect platforms/loaders
                version.loaders?.forEach(loader => {
                    if (!state.platforms.includes(loader)) state.platforms.push(loader);
                });
            });
            
            // Sort game versions semantically (newest first)
            state.gameVersions.sort((a, b) => {
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);
                
                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    const aVal = aParts[i] || 0;
                    const bVal = bParts[i] || 0;
                    if (bVal !== aVal) return bVal - aVal;
                }
                return 0;
            });
            
            populateFilterDropdown('#game-version-filter', state.gameVersions, 'All Versions');
            populateFilterDropdown('#platform-filter', state.platforms, 'All Platforms');
            populateVersionsDropdown();
        },
        error: () => {
            elements.versionSelect.html('<option value="">Failed to load versions</option>');
            toastManager.error('Failed to load mod versions');
        }
    });
}

// Get Bootstrap modal instance
function getInstallModal() {
    return bootstrap.Modal.getInstance(elements.installModal) || 
           new bootstrap.Modal(elements.installModal);
}

// Filter and populate versions dropdown
function populateVersionsDropdown() {
    const selectedGameVersion = elements.gameVersionFilter.val();
    const selectedPlatform = elements.platformFilter.val();
    
    // Filter versions based on selections
    const filteredVersions = state.allVersions.filter(version => {
        const gameVersionMatch = selectedGameVersion === 'all' || 
                              (version.game_versions && version.game_versions.includes(selectedGameVersion));
        
        const platformMatch = selectedPlatform === 'all' || 
                           (version.loaders && version.loaders.includes(selectedPlatform));
        
        return gameVersionMatch && platformMatch;
    });
    
    // Generate HTML for filtered versions
    if (filteredVersions.length > 0) {
        const optionsHTML = filteredVersions.map(version => {
            // Find main jar file
            const mainFile = version.files.find(file => file.primary && file.filename.endsWith('.jar')) || 
                         version.files.find(file => file.filename.endsWith('.jar'));
            
            if (mainFile) {
                const gameVersionText = version.game_versions.join(', ');
                const loaderText = version.loaders ? ` (${version.loaders.join(', ')})` : '';
                
                return `<option value="${version.id}" data-filename="${mainFile.filename}">
                    ${version.name} - MC ${gameVersionText}${loaderText}
                </option>`;
            }
            return '';
        }).join('');
        
        elements.versionSelect.html(optionsHTML);
        
        // Set selected file name from first option
        const firstOption = elements.versionSelect.find('option:first');
        state.selectedFileName = firstOption.data('filename');
    } else {
        elements.versionSelect.html('<option value="">No matching versions</option>');
        state.selectedFileName = '';
    }
}

// Install selected mod
function installMod(projectId, versionId, fileName) {
    elements.installButton.prop('disabled', true)
        .html(`<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Installing...`);
    
    // Get mod name from modal
    const modName = elements.modalModName.text();
    
    const data = {
        install_mod: 1,
        project_id: projectId,
        version_id: versionId,
        file_name: fileName
    };
    
    ajaxRequest(`mods.php?id=${serverId}`, 'POST', data)
        .then(response => {
            if (response.success) {
                getInstallModal().hide();
                toastManager.success(`Mod "${modName}" was installed successfully!`, {
                    title: 'Mod Installed',
                    duration: 5000
                });
                loadInstalledMods();
            } else {
                toastManager.error(`Failed to install mod: ${response.message || 'Unknown error'}`, {
                    title: 'Installation Failed'
                });
            }
        })
        .catch(() => {
            toastManager.error('Could not connect to the server to install the mod', {
                title: 'Connection Error'
            });
        })
        .always(() => {
            elements.installButton.prop('disabled', false).html('<i class="bi bi-download"></i> Install');
        });
}

// Generate pagination HTML
function generatePaginationHTML(currentPage, totalPages) {
    if (totalPages <= 1) return '';
    
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;
    
    let paginationHTML = `
        <div class="pagination-container mt-4">
            <div class="pagination-info mb-2">
                Showing page ${currentPage} of ${totalPages} (${state.totalResults} total results)
            </div>
            <div class="pagination-controls">
                <button class="btn btn-sm btn-outline-secondary pagination-page me-1 ${isFirstPage ? 'disabled' : ''}" 
                    data-page="1">
                    <i class="bi bi-chevron-double-left"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary pagination-page me-1 ${isFirstPage ? 'disabled' : ''}"
                    data-page="${currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </button>
    `;
    
    // Calculate range of pages to show
    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);
    
    // Add numbered pages
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} pagination-page me-1" 
                data-page="${i}">${i}</button>
        `;
    }
    
    paginationHTML += `
                <button class="btn btn-sm btn-outline-secondary pagination-page me-1 ${isLastPage ? 'disabled' : ''}"
                    data-page="${currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary pagination-page ${isLastPage ? 'disabled' : ''}"
                    data-page="${totalPages}">
                    <i class="bi bi-chevron-double-right"></i>
                </button>
            </div>
        </div>
    `;
    
    return paginationHTML;
}

// Format numbers in a compact way
function formatCompactNumber(number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number;
}

// Add this helper function
function populateFilterDropdown(elementId, options, defaultText = 'All') {
    let html = `<option value="all">${defaultText}</option>`;
    options.forEach(option => {
        const displayText = option.charAt(0).toUpperCase() + option.slice(1);
        html += `<option value="${option}">${displayText}</option>`;
    });
    $(elementId).html(html);
}

// Create a loading spinner element
function createLoadingSpinner() {
    return `
        <div class="d-flex justify-content-center w-100">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

// Show skeleton loading UI
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Use skeleton loader if available
    if (window.createSkeletonCards) {
        const count = elementId.includes('installed') ? 4 : 6;
        window.createSkeletonCards(element, count, 'plugin');
    } else {
        // Fallback to simple spinner
        $(`#${elementId}`).html(createLoadingSpinner());
    }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}