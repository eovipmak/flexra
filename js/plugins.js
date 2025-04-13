// Plugins page JavaScript functionality

// Global state management
const state = {
    currentProjectId: '',
    selectedFileName: '',
    currentQuery: '',
    currentOffset: 0,
    resultsPerPage: 20,
    totalResults: 0,
    allVersions: [],
    gameVersions: [],
    platforms: [],
    isLoading: false
};

// DOM element references
let elements = {};

// DOM ready handler
$(document).ready(() => {
    // Cache DOM elements for performance
    cacheElements();
    
    // Initialize Bootstrap modal
    const installModal = new bootstrap.Modal(document.getElementById('installModal'));
    
    // Add data-skeleton attributes for automatic skeleton loading
    $('#installed-plugins-grid, #plugin-results').attr({
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
        loadInstalledPlugins();
        searchPlugins('', 0);
    }, 300);
    
    // Initialize enhanced UI features if available
    if (window.initializeEnhancedUI) {
        window.initializeEnhancedUI();
    }
});

// Cache DOM elements for faster access
function cacheElements() {
    elements = {
        installModal: document.getElementById('installModal'),
        searchInput: $('#search-plugin'),
        searchButton: $('#search-button'),
        pluginResults: $('#plugin-results'),
        installedPlugins: $('#installed-plugins-grid'),
        installButton: $('#install-plugin-btn'),
        modalPluginName: $('#modal-plugin-name'),
        versionSelect: $('#version-select'),
        gameVersionFilter: $('#game-version-filter'),
        platformFilter: $('#platform-filter')
    };
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
            // Show loading animation on button
            elements.installButton.prop('disabled', true)
                .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Installing...');
            
            installPlugin(state.currentProjectId, versionId, state.selectedFileName);
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
    
    // Event delegation for pagination
    $(document).on('click', '.pagination-page', function() {
        if ($(this).hasClass('disabled')) return;
        
        const page = parseInt($(this).data('page'));
        state.currentOffset = (page - 1) * state.resultsPerPage;
        searchPlugins(state.currentQuery, state.currentOffset);
    });
}

// Helper functions
const showLoading = elementId => {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    // Use skeleton loader if available
    if (window.createSkeletonCards) {
        const count = elementId.includes('installed') ? 4 : 6;
        window.createSkeletonCards(container, count, 'plugin');
    } else {
        // Fallback to simple spinner
        $(`#${elementId}`).html('<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
    }
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

const formatCompactNumber = number => {
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number;
};

// Core functionality
function performSearch() {
    state.currentQuery = elements.searchInput.val();
    state.currentOffset = 0;
    searchPlugins(state.currentQuery, 0);
}

function loadInstalledPlugins() {
    // Show skeleton loading UI
    showLoading('installed-plugins-grid');
    
    // Use direct jQuery AJAX for simplicity and reliability
    $.ajax({
        url: `plugins.php?id=${serverId}&action=server_plugins`,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.plugins?.length > 0) {
                const pluginsHTML = response.plugins.map((plugin, index) => {
                    const fileName = plugin.attributes.name;
                    const firstLetter = fileName.charAt(0).toUpperCase();
                    const size = formatBytes(plugin.attributes.size);
                    
                    // Add animation delay based on index
                    const animationDelay = index * 50;
                    
                    // Generate a random color for the plugin icon based on the filename
                    const colorHue = Math.abs(fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
                    const iconBg = `hsl(${colorHue}, 70%, 60%)`;
                    const iconColor = colorHue > 180 && colorHue < 360 ? 'white' : 'black';
                    
                    return `
                        <div class="plugin-card installed-plugin card-hover-effect" data-plugin-name="${fileName}">
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
                                        onclick="deletePlugin('/plugins/${fileName}')">
                                    <i class="bi bi-trash me-1"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                $('#installed-plugins-grid').html(pluginsHTML);
                
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
                $('#installed-plugins-grid').html(`
                    <div class="alert alert-info w-100 fade-in-up">
                        <i class="bi bi-info-circle me-2"></i>No plugins installed yet
                    </div>
                `);
            }
        },
        error: function() {
            $('#installed-plugins-grid').html(`
                <div class="alert alert-danger w-100 fade-in-up">
                    <i class="bi bi-exclamation-triangle me-2"></i>Failed to load installed plugins
                </div>
            `);
        }
    });
}

function deletePlugin(pluginPath) {
    const pluginName = pluginPath.split('/').pop();
    
    // Use confirmation modal instead of alert
    confirmationManager.confirm({
        title: 'Delete Plugin',
        message: `Are you sure you want to delete "${pluginName}"?`,
        details: 'This may affect your server functionality and could cause errors if other plugins depend on it.',
        confirmText: 'Delete Plugin',
        confirmButtonClass: 'btn btn-danger'
    }, () => {
        // This function runs only if the user confirms
        $.ajax({
            url: `plugins.php?id=${serverId}&action=delete`,
            type: 'POST',
            data: { plugin_path: pluginPath },
            dataType: 'json',
            success: response => {
                if (response.success) {
                    toastManager.success(`Plugin "${pluginName}" was deleted successfully`);
                } else {
                    console.warn('Delete response indicates failure:', response);
                    toastManager.error(`Failed to delete plugin: ${response.message || 'Unknown error'}`);
                }
                loadInstalledPlugins();
            },
            error: () => {
                toastManager.error('An error occurred while deleting the plugin');
                loadInstalledPlugins();
            }
        });
    });
}

function searchPlugins(query, offset = 0) {
    state.currentQuery = query;
    state.currentOffset = offset;
    state.isLoading = true;
    
    // Show skeleton loading UI
    showLoading('plugin-results');
    
    // Add search animation to the search button
    elements.searchButton.html('<span class="loading-spinner me-2"></span> Searching...');
    
    // Use direct jQuery AJAX for simplicity and reliability
    $.ajax({
        url: `plugins.php?id=${serverId}&action=search&query=${encodeURIComponent(query)}&offset=${offset}&limit=${state.resultsPerPage}`,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            state.isLoading = false;
            
            // Reset search button
            elements.searchButton.html('<i class="bi bi-search me-1"></i> Search');
            
            if (response?.hits?.length > 0) {
                state.totalResults = response.total_hits || response.hits.length;
                
                const pluginsHtml = response.hits.map((plugin, index) => {
                    const pluginId = plugin.project_id;
                    const pluginName = plugin.title || 'Unknown Plugin';
                    const safePluginName = pluginName.replace(/'/g, "\\'");
                    const pluginDesc = plugin.description || 'No description available';
                    const downloads = formatCompactNumber(plugin.downloads || 0);
                    const follows = formatCompactNumber(plugin.follows || 0);
                    
                    // Generate a random color for placeholder based on plugin name
                    const colorHue = Math.abs(pluginName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
                    const placeholderColor = `${colorHue.toString(16).padStart(2, '0')}${(colorHue + 120) % 360}${(colorHue + 240) % 360}`;
                    
                    const placeholderIcon = `https://placehold.co/64/${placeholderColor}/ffffff?text=${encodeURIComponent(pluginName.charAt(0))}`;
                    const pluginIconUrl = plugin.icon_url || placeholderIcon;
                    
                    return `
                    <div class="plugin-card card-hover-effect" data-plugin-id="${pluginId}">
                        <div class="plugin-image-container">
                            <img data-lazy="image" data-src="${pluginIconUrl}" 
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e9ecef'/%3E%3C/svg%3E" 
                                alt="${pluginName}" class="lazy-blur" 
                                onerror="this.src='${placeholderIcon}'">
                        </div>
                        <h5 title="${pluginName}" class="plugin-title">${pluginName}</h5>
                        <div class="plugin-meta">
                            <span class="badge bg-light text-dark rounded-pill">
                                <i class="bi bi-download me-1"></i> ${downloads}
                            </span>
                            <span class="badge bg-light text-dark rounded-pill">
                                <i class="bi bi-star-fill me-1"></i> ${follows}
                            </span>
                        </div>
                        <div class="description">${pluginDesc}</div>
                        <div class="plugin-actions">
                            <button class="btn btn-sm btn-primary w-100 install-btn btn-animated btn-ripple" 
                                onclick="openInstallModal('${pluginId}', '${safePluginName}')">
                                <i class="bi bi-download me-1"></i> Install
                            </button>
                        </div>
                    </div>`;
                }).join('');
                
                const totalPages = Math.ceil(state.totalResults / state.resultsPerPage);
                const currentPage = Math.floor(offset / state.resultsPerPage) + 1;
                
                elements.pluginResults.html(pluginsHtml);
                $('.pagination-container').remove();
                
                if (totalPages > 1) {
                    elements.pluginResults.after(generatePaginationHTML(currentPage, totalPages));
                    
                    // Add ripple effect to pagination buttons
                    $('.pagination-page').addClass('btn-ripple');
                }
                
                // Initialize lazy loading for the new images
                if (window.enhancedLazyLoading) {
                    enhancedLazyLoading();
                } else if (window.lazyLoader) {
                    window.lazyLoader.observe();
                }
            } else {
                elements.pluginResults.html(`
                    <div class="alert alert-info w-100 fade-in-up">
                        <i class="bi bi-info-circle me-2"></i>
                        ${query ? `No plugins found matching "${query}"` : 'No plugins found'}
                    </div>
                `);
            }
        },
        error: function(error) {
            state.isLoading = false;
            elements.searchButton.html('<i class="bi bi-search me-1"></i> Search');
            
            elements.pluginResults.html(`
                <div class="alert alert-danger w-100 fade-in-up">
                    <i class="bi bi-exclamation-triangle me-2"></i>Failed to load plugins
                </div>
            `);
            
            console.error('Search error:', error);
        }
    });
}

function openInstallModal(projectId, pluginName) {
    state.currentProjectId = projectId;
    elements.modalPluginName.text(pluginName);
    
    // Reset version select
    elements.versionSelect.html('<option value="">Loading versions...</option>');
    elements.gameVersionFilter.html('<option value="all">All Versions</option>');
    elements.platformFilter.html('<option value="all">All Platforms</option>');
    
    // Show modal
    const installModal = bootstrap.Modal.getInstance(elements.installModal);
    installModal.show();
    
    // Fetch versions
    fetchVersions(projectId);
}

function fetchVersions(projectId) {
    $.ajax({
        url: `plugins.php?id=${serverId}&action=versions&project_id=${projectId}`,
        type: 'GET',
        dataType: 'json',
        success: versions => {
            state.allVersions = versions;
            
            // Extract unique game versions and platforms
            const gameVersions = new Set();
            const platforms = new Set();
            
            versions.forEach(version => {
                // Game versions
                if (version.game_versions && version.game_versions.length) {
                    version.game_versions.forEach(v => gameVersions.add(v));
                }
                
                // Platforms (loaders)
                if (version.loaders && version.loaders.length) {
                    version.loaders.forEach(l => platforms.add(l));
                }
            });
            
            // Update state
            state.gameVersions = Array.from(gameVersions).sort((a, b) => {
                // Sort versions in descending order (newest first)
                return b.localeCompare(a, undefined, { numeric: true });
            });
            
            state.platforms = Array.from(platforms).sort();
            
            // Populate filters
            populateFilters();
            
            // Populate versions dropdown
            populateVersionsDropdown();
        },
        error: () => {
            elements.versionSelect.html('<option value="">Failed to load versions</option>');
            toastManager.error('Failed to load plugin versions');
        }
    });
}

function populateFilters() {
    // Game versions filter
    if (state.gameVersions.length > 0) {
        const gameVersionsHtml = state.gameVersions.map(version => 
            `<option value="${version}">${version}</option>`
        ).join('');
        
        elements.gameVersionFilter.html(`
            <option value="all">All Versions</option>
            ${gameVersionsHtml}
        `);
    }
    
    // Platforms filter
    if (state.platforms.length > 0) {
        const platformsHtml = state.platforms.map(platform => 
            `<option value="${platform}">${platform.charAt(0).toUpperCase() + platform.slice(1)}</option>`
        ).join('');
        
        elements.platformFilter.html(`
            <option value="all">All Platforms</option>
            ${platformsHtml}
        `);
    }
}

function populateVersionsDropdown() {
    const gameVersionFilter = elements.gameVersionFilter.val();
    const platformFilter = elements.platformFilter.val();
    
    // Filter versions based on selected filters
    let filteredVersions = state.allVersions;
    
    if (gameVersionFilter !== 'all') {
        filteredVersions = filteredVersions.filter(version => 
            version.game_versions && version.game_versions.includes(gameVersionFilter)
        );
    }
    
    if (platformFilter !== 'all') {
        filteredVersions = filteredVersions.filter(version => 
            version.loaders && version.loaders.includes(platformFilter)
        );
    }
    
    // Sort versions by date (newest first)
    filteredVersions.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
    
    // Generate HTML
    if (filteredVersions.length > 0) {
        const versionsHtml = filteredVersions.map(version => {
            const versionName = version.name || version.version_number;
            const versionDate = new Date(version.date_published).toLocaleDateString();
            const primaryFile = version.files.find(file => file.primary) || version.files[0];
            const fileName = primaryFile ? primaryFile.filename : '';
            
            return `<option value="${version.id}" data-filename="${fileName}">
                ${version.version_number} - ${versionName} (${versionDate})
            </option>`;
        }).join('');
        
        elements.versionSelect.html(versionsHtml);
        
        // Set the first file as selected
        state.selectedFileName = filteredVersions[0].files[0].filename;
    } else {
        elements.versionSelect.html('<option value="">No versions match the selected filters</option>');
        state.selectedFileName = '';
    }
}

function installPlugin(projectId, versionId, fileName) {
    $.ajax({
        url: `plugins.php?id=${serverId}&action=install`,
        type: 'POST',
        data: {
            project_id: projectId,
            version_id: versionId,
            file_name: fileName
        },
        dataType: 'json',
        success: response => {
            // Hide modal
            const installModal = bootstrap.Modal.getInstance(elements.installModal);
            installModal.hide();
            
            // Reset button
            elements.installButton.prop('disabled', false)
                .html('<i class="bi bi-download me-1"></i> Install');
            
            if (response.success) {
                toastManager.success(response.message || 'Plugin installed successfully');
                
                // Refresh installed plugins list
                loadInstalledPlugins();
            } else {
                toastManager.error(response.message || 'Failed to install plugin');
            }
        },
        error: () => {
            // Hide modal
            const installModal = bootstrap.Modal.getInstance(elements.installModal);
            installModal.hide();
            
            // Reset button
            elements.installButton.prop('disabled', false)
                .html('<i class="bi bi-download me-1"></i> Install');
            
            toastManager.error('An error occurred while installing the plugin');
        }
    });
}

function generatePaginationHTML(currentPage, totalPages) {
    // Calculate page range to show
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    let paginationHTML = `
    <div class="pagination-container">
        <div class="pagination-info">
            Showing ${state.currentOffset + 1}-${Math.min(state.currentOffset + state.resultsPerPage, state.totalResults)} 
            of ${state.totalResults} results
        </div>
        <div class="pagination-controls">
    `;
    
    // First and Previous buttons
    paginationHTML += `
        <button class="btn btn-sm ${currentPage === 1 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'} pagination-page" 
                data-page="1" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-double-left"></i>
        </button>
        <button class="btn btn-sm ${currentPage === 1 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'} pagination-page" 
                data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} pagination-page" 
                    data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Next and Last buttons
    paginationHTML += `
        <button class="btn btn-sm ${currentPage === totalPages ? 'btn-outline-secondary disabled' : 'btn-outline-primary'} pagination-page" 
                data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="bi bi-chevron-right"></i>
        </button>
        <button class="btn btn-sm ${currentPage === totalPages ? 'btn-outline-secondary disabled' : 'btn-outline-primary'} pagination-page" 
                data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="bi bi-chevron-double-right"></i>
        </button>
    `;
    
    paginationHTML += `
        </div>
    </div>
    `;
    
    return paginationHTML;
}