<?php
require_once 'includes/bootstrap.php';

// Get server ID from request
$serverId = $_GET['id'] ?? '';
if (empty($serverId)) {
    die('Server ID is required');
}

// Initialize server manager
$serverManager = new ServerManager();

/**
 * API request handler
 * 
 * @param string $action Action name
 * @param callable $callback Callback function
 */
function handleApiRequest($action, $callback) {
    if (isset($_REQUEST['action']) && $_REQUEST['action'] === $action) {
        Response::json($callback());
    }
}

// Handle power commands
if (isset($_POST['power_action'])) {
    $action = $_POST['power_action'];
    if (in_array($action, ['start', 'stop', 'restart', 'kill'])) {
        $serverManager->sendPowerCommand($serverId, $action);
        header("Location: console.php?id=$serverId");
        exit;
    }
}

// Handle command submit through AJAX
if (isset($_POST['command']) && !empty($_POST['command'])) {
    $result = $serverManager->sendCommand($serverId, $_POST['command']);
    Response::json(['success' => true, 'data' => $result]);
}

// Handle various API requests
handleApiRequest('files', function() use ($serverManager, $serverId) {
    return $serverManager->getFilesList($serverId, $_GET['directory'] ?? '/');
});

handleApiRequest('file_contents', function() use ($serverManager, $serverId) {
    $file = $_GET['file'] ?? '';
    if (empty($file)) {
        Response::error('No file specified', 400);
    }
    return $serverManager->getFileContents($serverId, $file);
});

handleApiRequest('resources', function() use ($serverManager, $serverId) {
    return $serverManager->getServerResources($serverId);
});

// Get server details
$server = $serverManager->getServerDetails($serverId);
$serverName = h($server['attributes']['name'] ?? 'Server');
?>

<?php
// Output page header with additional resources
echo pageHeader("Console - $serverName", [], [
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap'
]);
?>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4 animated-card" style="opacity: 1;">
            <h1><i class="bi bi-terminal me-2"></i><?= $serverName ?></h1>
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
                $activeClass = $tab === 'console' ? 'active' : '';
                echo "<li class=\"nav-item\"><a class=\"nav-link $activeClass\" href=\"$tab.php?id=$serverId\">$label</a></li>";
            }
            ?>
        </ul>
        
        <div class="page-section animated-card" style="opacity: 1; animation-delay: 100ms;">
            <!-- Enhanced Server Info Display -->
            <div class="server-info" id="server-resources">
                <div class="server-stat hover-lift">
                    <div><i class="bi bi-circle-fill me-1 blink"></i> SERVER STATUS</div>
                    <div class="value status-offline" id="status-value">
                        <div class="skeleton-loading" style="width: 80px; height: 24px;"></div>
                    </div>
                </div>
                
                <div class="server-stat hover-lift">
                    <div><i class="bi bi-cpu me-1"></i> CPU USAGE</div>
                    <div class="value" id="cpu-value">
                        <div class="skeleton-loading" style="width: 60px; height: 24px;"></div>
                    </div>
                </div>
                
                <div class="server-stat hover-lift">
                    <div><i class="bi bi-memory me-1"></i> MEMORY USAGE</div>
                    <div class="value" id="ram-value">
                        <div class="skeleton-loading" style="width: 70px; height: 24px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Enhanced Power Buttons with icons and animations -->
            <div class="power-buttons animated-card" style="opacity: 1; animation-delay: 200ms;">
                <form method="POST" class="d-flex w-100 justify-content-center">
                    <button type="submit" name="power_action" value="start" class="btn btn-success btn-animated">
                        <i class="bi bi-play-fill me-1"></i> Start Server
                    </button>
                    <button type="submit" name="power_action" value="restart" class="btn btn-warning btn-animated">
                        <i class="bi bi-arrow-repeat me-1"></i> Restart
                    </button>
                    <button type="submit" name="power_action" value="stop" class="btn btn-danger btn-animated">
                        <i class="bi bi-stop-fill me-1"></i> Stop
                    </button>
                    <button type="submit" name="power_action" value="kill" class="btn btn-dark btn-animated">
                        <i class="bi bi-x-octagon-fill me-1"></i> Force Kill
                    </button>
                </form>
            </div>
            
            <!-- Console Output with loading animation -->
            <div id="console" class="animated-card" style="opacity: 1; animation-delay: 300ms;">
                <div class="console-loading">
                    <div class="console-loading-line skeleton-loading" style="width: 80%;"></div>
                    <div class="console-loading-line skeleton-loading" style="width: 60%;"></div>
                    <div class="console-loading-line skeleton-loading" style="width: 75%;"></div>
                    <div class="console-loading-line skeleton-loading" style="width: 40%;"></div>
                    <div class="console-loading-line skeleton-loading" style="width: 65%;"></div>
                    <div class="console-loading-line skeleton-loading" style="width: 70%;"></div>
                </div>
            </div>
            
            <!-- Command Input with enhanced styling -->
            <div class="input-group animated-card" style="opacity: 1; animation-delay: 400ms;">
                <input type="text" id="command" class="form-control" placeholder="Type your command here...">
                <button class="btn btn-primary btn-animated" id="send-command">
                    <i class="bi bi-send-fill me-1"></i> Send
                </button>
            </div>
        </div>
    </div>

<?php
// Output confirmation modal
echo renderConfirmationModal();

// Output page footer with additional scripts
echo pageFooter([
    'js/console.js'
]);
?>
<script>
    window.serverId = "<?= $serverId ?>";
    
    // Immediate execution for faster perceived performance
    document.addEventListener('DOMContentLoaded', function() {
        // Apply initial animations
        document.querySelectorAll('.animated-card').forEach(function(el) {
            setTimeout(function() {
                el.style.opacity = '1';
            }, parseInt(el.style.animationDelay || '0'));
        });
        
        // Add blinking effect to status indicator
        document.querySelector('.blink').classList.add('status-blink');
    });
</script>
