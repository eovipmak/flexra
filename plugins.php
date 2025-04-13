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

// Check if this server's egg supports plugins
$featureManager = EggFeatureManager::getInstance();
$eggId = $featureManager->getEggIdFromServerId($serverId);

// If egg ID is known and doesn't support plugins, redirect to console
if ($eggId !== null && !$featureManager->hasPluginsTab($eggId)) {
    header("Location: console.php?id=$serverId");
    exit;
}

/**
 * API request handler
 * 
 * @param string $action Action name
 * @param callable $callback Callback function
 */
function handleApiRequest($action, $callback) {
    if (isset($_REQUEST['action']) && $_REQUEST['action'] === $action) {
        $result = $callback();
        Response::json($result ?: ['error' => 'No data returned']);
    }
}

// Plugin installation handler
handleApiRequest('install', function() use ($contentManager, $serverId) {
    if (empty($_POST['project_id']) || empty($_POST['version_id'])) {
        return ['success' => false, 'message' => 'Missing project or version ID'];
    }
    
    $projectId = $_POST['project_id'];
    $versionId = $_POST['version_id'];
    $fileName = $_POST['file_name'] ?? "unknown.jar";
    
    try {
        $result = $contentManager->installPlugin($serverId, $projectId, $versionId, $fileName);
        return [
            'success' => $result !== false,
            'message' => $result !== false ? 'Plugin installed successfully' : 'Failed to upload plugin'
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
    }
});

// Delete plugin handler
handleApiRequest('delete', function() use ($contentManager, $serverId) {
    if (empty($_POST['plugin_path'])) {
        return ['success' => false, 'message' => 'Missing plugin path'];
    }
    
    $result = $contentManager->deletePlugin($serverId, $_POST['plugin_path']);
    return [
        'success' => $result === null || (is_array($result) && !isset($result['errors'])),
        'message' => $result === null || (is_array($result) && !isset($result['errors'])) 
            ? 'Plugin deleted successfully' 
            : 'Failed to delete plugin'
    ];
});

// Handle search request
handleApiRequest('search', function() use ($contentManager) {
    $query = $_GET['query'] ?? '';
    $offset = (int)($_GET['offset'] ?? 0);
    $limit = (int)($_GET['limit'] ?? 20);
    
    return $contentManager->searchPlugins($query, $offset, $limit);
});

// Handle plugin version fetch
handleApiRequest('versions', function() use ($contentManager) {
    $projectId = $_GET['project_id'] ?? '';
    if (empty($projectId)) return [];
    return $contentManager->getVersions($projectId) ?: [];
});

// Handle download progress tracking
handleApiRequest('download_progress', function() {
    $downloadId = $_GET['download_id'] ?? '';
    if (empty($downloadId)) {
        return ['error' => 'Missing download ID'];
    }
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $sessionKey = 'download_' . $downloadId;
    $progress = $_SESSION[$sessionKey] ?? ['progress' => 0];
    
    return $progress;
});

// Get server plugins
handleApiRequest('server_plugins', function() use ($contentManager, $serverId) {
    $plugins = $contentManager->getServerPlugins($serverId);
    return ['plugins' => $plugins];
});

// Get server details
$server = $serverManager->getServerDetails($serverId);
$serverName = h($server['attributes']['name'] ?? 'Server');

// Output page header
echo pageHeader("Plugins - $serverName");
?>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4 animated-card" style="opacity: 1;">
        <h1><i class="bi bi-puzzle me-2"></i><?= h($serverName) ?></h1>
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
            $activeClass = $tab === 'plugins' ? 'active' : '';
            echo "<li class=\"nav-item\"><a class=\"nav-link $activeClass\" href=\"$tab.php?id=$serverId\">$label</a></li>";
        }
        ?>
    </ul>
    
    <!-- Installed plugins section -->
    <div class="page-section animated-card" style="opacity: 1; animation-delay: 100ms;">
        <div class="section-header d-flex justify-content-between align-items-center">
            <h3 class="m-0"><i class="bi bi-check-circle me-2"></i>Installed Plugins</h3>
        </div>
        <div id="installed-plugins-grid" class="plugin-grid stagger-animation">
            <!-- Skeleton loading will be inserted here by JavaScript -->
        </div>
    </div>
    
    <!-- Browse plugins section -->
    <div class="page-section animated-card" style="opacity: 1; animation-delay: 200ms;">
        <div class="section-header d-flex justify-content-between align-items-center">
            <h3 class="m-0"><i class="bi bi-search me-2"></i>Browse Plugins</h3>
        </div>
        
        <!-- Search box -->
        <div class="search-box">
            <div class="input-group">
                <input type="text" id="search-plugin" class="form-control" placeholder="Search for plugins...">
                <button class="btn btn-primary btn-animated" id="search-button">
                    <i class="bi bi-search me-1"></i> Search
                </button>
            </div>
        </div>
        
        <!-- Plugin grid -->
        <div id="plugin-results" class="plugin-grid stagger-animation">
            <!-- Skeleton loading will be inserted here by JavaScript -->
        </div>
    </div>
</div>

<!-- Plugin installation modal -->
<div class="modal fade" id="installModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-box-arrow-in-down me-2"></i>Install Plugin</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p id="modal-plugin-name" class="fw-bold mb-3">Plugin Name</p>
                
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
                <button type="button" class="btn btn-primary btn-animated" id="install-plugin-btn">
                    <i class="bi bi-download me-1"></i> Install
                </button>
            </div>
        </div>
    </div>
</div>

<?php
// Output confirmation modal
echo renderConfirmationModal();

// Output page footer with specific JS files
echo pageFooter(['js/app.js', 'js/plugins.js']);
?>

<script>
    const serverId = "<?= h($serverId) ?>";
    
    // Immediate execution for faster perceived performance
    document.addEventListener('DOMContentLoaded', function() {
        // Apply initial animations
        document.querySelectorAll('.animated-card').forEach(function(el) {
            setTimeout(function() {
                el.style.opacity = '1';
            }, parseInt(el.style.animationDelay || '0'));
        });
    });
</script>