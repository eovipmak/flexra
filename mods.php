<?php
require_once 'includes/bootstrap.php';
require_once 'includes/EggFeatureManager.php';

// Get server ID from request
$serverId = $_GET['id'] ?? '';
if (empty($serverId)) {
    die('Server ID is required');
}

// Initialize managers
$serverManager = new ServerManager();
$contentManager = new ContentManager();

// Check if this server's egg supports mods
$featureManager = EggFeatureManager::getInstance();
$eggId = $featureManager->getEggIdFromServerId($serverId);

// If egg ID is known and doesn't support mods, redirect to console
if ($eggId !== null && !$featureManager->hasModsTab($eggId)) {
    header("Location: console.php?id=$serverId");
    exit;
}

// Update the mod installation handler
if (isset($_POST['install_mod']) && !empty($_POST['project_id']) && !empty($_POST['version_id'])) {
    $projectId = $_POST['project_id'];
    $versionId = $_POST['version_id'];
    $fileName = $_POST['file_name'] ?? "unknown.jar";
    
    try {
        $result = $contentManager->installMod($serverId, $projectId, $versionId, $fileName);
        
        if ($result) {
            Response::success('Mod installed successfully');
        } else {
            Response::error('Failed to install mod');
        }
    } catch (Exception $e) {
        Response::error('Error: ' . $e->getMessage());
    }
}

// Update the delete mod handler section
if (isset($_POST['delete_mod']) && !empty($_POST['mod_path'])) {
    $result = $contentManager->deleteMod($serverId, $_POST['mod_path']);
    
    // Pterodactyl sometimes returns null on successful deletion
    // or an empty response, so check for absence of errors
    if ($result === null || (is_array($result) && !isset($result['errors']))) {
        Response::success('Mod deleted successfully');
    } else {
        Response::error('Failed to delete mod');
    }
}

// Handle API requests
$action = $_GET['action'] ?? '';
if ($action) {
    switch ($action) {
        case 'search':
            $query = $_GET['query'] ?? '';
            $offset = (int)($_GET['offset'] ?? 0);
            $limit = (int)($_GET['limit'] ?? 20);
            $results = $contentManager->searchMods($query, $offset, $limit);
            Response::json($results);
            break;
            
        case 'versions':
            $projectId = $_GET['project_id'] ?? '';
            $versions = $contentManager->getVersions($projectId);
            Response::json($versions);
            break;
            
        case 'server_mods':
            $mods = $contentManager->getServerMods($serverId);
            Response::json(['mods' => $mods]);
            break;
    }
}

// Get server details
$server = $serverManager->getServerDetails($serverId);
?>

<?php
// Output page header
echo pageHeader("Mods - " . htmlspecialchars($server['attributes']['name'] ?? 'Server'));
?>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4 animated-card" style="opacity: 1;">
            <h1><i class="bi bi-box me-2"></i><?= htmlspecialchars($server['attributes']['name'] ?? 'Server Mods') ?></h1>
            <a href="index.php" class="btn btn-secondary btn-animated">
                <i class="bi bi-arrow-left me-1"></i> Back to Servers
            </a>
        </div>
        
        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-4 animated-card" style="opacity: 1;">
            <?php
            // Include the EggFeatureManager
            require_once 'includes/EggFeatureManager.php';
            $featureManager = EggFeatureManager::getInstance();
            
            // Get the egg ID for this server
            $eggId = $featureManager->getEggIdFromServerId($serverId);
            
            // Define base tabs that are always shown
            $tabs = [
                'console' => '<i class="bi bi-terminal me-1"></i> Console',
                'startup' => '<i class="bi bi-gear me-1"></i> Startup', 
                'settings' => '<i class="bi bi-sliders me-1"></i> Settings'
            ];
            
            // Add plugins tab if this egg should have it
            if ($eggId === null || $featureManager->hasPluginsTab($eggId)) {
                $tabs['plugins'] = '<i class="bi bi-puzzle me-1"></i> Plugins';
            }
            
            // Add mods tab if this egg should have it
            if ($eggId === null || $featureManager->hasModsTab($eggId)) {
                $tabs['mods'] = '<i class="bi bi-box me-1"></i> Mods';
            }
            
            // Display the tabs
            foreach ($tabs as $tab => $label) {
                $activeClass = $tab === 'mods' ? 'active' : '';
                echo "<li class=\"nav-item\"><a class=\"nav-link $activeClass\" href=\"$tab.php?id=$serverId\">$label</a></li>";
            }
            ?>
        </ul>
        
        <!-- Installed mods section -->
        <div id="server-mods" class="page-section animated-card" style="opacity: 1; animation-delay: 100ms;">
            <div class="section-header d-flex justify-content-between align-items-center">
                <h3 class="m-0"><i class="bi bi-check-circle me-2"></i>Installed Mods</h3>
            </div>
            <div id="installed-mods-grid" class="plugin-grid stagger-animation">
                <!-- Skeleton loading will be inserted here by JavaScript -->
            </div>
        </div>
        
        <!-- Browse mods section -->
        <div class="page-section animated-card" style="opacity: 1; animation-delay: 200ms;">
            <div class="section-header d-flex justify-content-between align-items-center">
                <h3 class="m-0"><i class="bi bi-search me-2"></i>Browse Mods</h3>
            </div>
            
            <!-- Search box -->
            <div class="search-box">
                <div class="input-group">
                    <input type="text" id="search-mod" class="form-control" placeholder="Search for mods...">
                    <button class="btn btn-primary btn-animated" id="search-button">
                        <i class="bi bi-search me-1"></i> Search
                    </button>
                </div>
            </div>
            
            <!-- Mod grid -->
            <div id="mod-results" class="plugin-grid stagger-animation">
                <!-- Skeleton loading will be inserted here by JavaScript -->
            </div>
        </div>
    </div>
    
    <!-- Mod installation modal -->
    <div class="modal fade" id="installModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-box-arrow-in-down me-2"></i>Install Mod</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p id="modal-mod-name" class="fw-bold mb-3">Mod Name</p>
                    
                    <!-- Filters for version selection -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="game-version-filter" class="form-label">
                                <i class="bi bi-tag me-1"></i> Game Version
                            </label>
                            <select class="form-select" id="game-version-filter">
                                <option value="all">All Versions</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label for="platform-filter" class="form-label">
                                <i class="bi bi-layers me-1"></i> Platform
                            </label>
                            <select class="form-select" id="platform-filter">
                                <option value="all">All Platforms</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="version-select" class="form-label">
                            <i class="bi bi-code-square me-1"></i> Select Version
                        </label>
                        <select class="form-select" id="version-select">
                            <option value="">Loading versions...</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-animated" data-bs-dismiss="modal">
                        <i class="bi bi-x-lg me-1"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-primary btn-animated" id="install-mod-btn">
                        <i class="bi bi-download me-1"></i> Install
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Confirmation modal for deletions -->
    <div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmation-title">
                        <i class="bi bi-exclamation-triangle me-2"></i>Confirm Action
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="confirmation-icon text-warning me-3">
                            <i class="bi bi-exclamation-triangle-fill fs-1"></i>
                        </div>
                        <p id="confirmation-message" class="mb-0">Are you sure you want to proceed with this action?</p>
                    </div>
                    <p class="text-muted small" id="confirmation-details"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-animated" data-bs-dismiss="modal">
                        <i class="bi bi-x-lg me-1"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-danger btn-animated" id="confirm-action-btn">
                        <i class="bi bi-check-lg me-1"></i> Confirm
                    </button>
                </div>
            </div>
        </div>
    </div>

<?php
// Output page footer with specific JS files
echo pageFooter(['js/app.js', 'js/mods.js']);
?>

<script>
    // Pass server ID from PHP to JavaScript as a global variable
    const serverId = "<?= htmlspecialchars($serverId) ?>";
    
    // Immediate execution for faster perceived performance
    document.addEventListener('DOMContentLoaded', function() {
        // Apply initial animations
        document.querySelectorAll('.animated-card').forEach(function(el) {
            setTimeout(function() {
                el.style.opacity = '1';
            }, parseInt(el.style.animationDelay || '0'));
        });
        
        // Initialize skeleton loading
        createSkeletonCards(document.getElementById('installed-mods-grid'), 4, 'plugin');
        createSkeletonCards(document.getElementById('mod-results'), 6, 'plugin');
    });
</script>