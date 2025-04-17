<?php
require_once 'config.php';
require_once 'api.php';

$serverId = $_GET['id'] ?? null;

if (!$serverId) {
    die('Server ID is required');
}

// Caching setup
$cacheDir = __DIR__ . '/cache';
$cacheTTL = 300; // seconds
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
function getCache($key) {
    global $cacheDir, $cacheTTL;
    $file = $cacheDir . "/{$key}.cache";
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (isset($data['timestamp'], $data['content']) && $data['timestamp'] >= time() - $cacheTTL) {
            return $data['content'];
        }
    }
    return false;
}
function setCache($key, $content) {
    global $cacheDir;
    $file = $cacheDir . "/{$key}.cache";
    $data = ['timestamp' => time(), 'content' => $content];
    file_put_contents($file, json_encode($data));
}

// Application API functions needed for server settings
function makeApplicationApiRequest($endpoint, $method = 'GET', $data = null) {
    global $PTERO_PANEL_URL, $PTERO_APPLICATION_API_KEY;
    
    $url = rtrim($PTERO_PANEL_URL, '/') . '/' . ltrim($endpoint, '/');
    $headers = [
        "Authorization: Bearer " . $PTERO_APPLICATION_API_KEY,
        "Accept: application/json",
        "Content-Type: application/json"
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => ($data !== null && $method !== 'GET') ? json_encode($data) : null,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5
    ]);
    
    $response = curl_exec($ch);
    $result = [
        'response' => $response,
        'httpCode' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'error' => curl_error($ch)
    ];
    curl_close($ch);
    
    return $result;
}

// Get application-level server ID based on client-level server ID
function getApplicationServerId($clientServerId) {
    // First try using client API to get internal ID
    $clientResult = makeApiRequest("/api/client");
    $clientServers = json_decode($clientResult['response'], true);
    
    if (isset($clientServers['data'])) {
        foreach ($clientServers['data'] as $server) {
            if ($server['attributes']['identifier'] === $clientServerId) {
                return $server['attributes']['internal_id'];
            }
        }
    }
    
    // Fall back to application API if needed
    $result = makeApplicationApiRequest('/api/application/servers');
    $serverList = json_decode($result['response'], true);
    
    if (isset($serverList['data'])) {
        foreach ($serverList['data'] as $server) {
            if ($server['attributes']['identifier'] === $clientServerId) {
                return $server['attributes']['id'];
            }
        }
    }
    
    return null;
}

// Handle API requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    $appServerId = getApplicationServerId($serverId);
    
    switch ($_GET['action']) {
        case 'get_server_details':
            $cacheKey = "server_details_{$serverId}";
            if ($cached = getCache($cacheKey)) {
                echo $cached;
                exit;
            }
            if (!$appServerId) {
                echo json_encode(['error' => 'Server not found']);
                exit;
            }
            $result = makeApplicationApiRequest("/api/application/servers/{$appServerId}");
            setCache($cacheKey, $result['response']);
            echo $result['response'];
            exit;
            
        case 'get_available_nests':
            $cacheKey = 'available_nests';
            if ($cached = getCache($cacheKey)) {
                echo $cached;
                exit;
            }
            $result = makeApplicationApiRequest("/api/application/nests");
            setCache($cacheKey, $result['response']);
            echo $result['response'];
            exit;
            
        case 'get_available_eggs':
            $nestId = $_GET['nest_id'] ?? null;
            
            if (!$nestId) {
                echo json_encode(['error' => 'Nest ID is required']);
                exit;
            }
            
            $cacheKey = "available_eggs_{$nestId}";
            if ($cached = getCache($cacheKey)) {
                header('X-Cache: HIT');
                echo $cached;
                exit;
            }
            
            $result = makeApplicationApiRequest("/api/application/nests/{$nestId}/eggs");
            setCache($cacheKey, $result['response']);
            header('X-Cache: MISS');
            echo $result['response'];
            exit;
            
        case 'get_egg_details':
            $nestId = $_GET['nest_id'] ?? 1;
            $eggId = $_GET['egg_id'] ?? null;
            
            if (!$eggId) {
                echo json_encode(['error' => 'Egg ID is required']);
                exit;
            }
            
            $cacheKey = "egg_details_{$nestId}_{$eggId}";
            if ($cached = getCache($cacheKey)) {
                echo $cached;
                exit;
            }
            
            // Get detailed information about the specific egg
            // Make sure to include egg variables using ?include=variables
            $result = makeApplicationApiRequest("/api/application/nests/{$nestId}/eggs/{$eggId}?include=variables");
            
            // If response doesn't contain variables, try to get them separately
            $responseData = json_decode($result['response'], true);
            if (!isset($responseData['attributes']['relationships']['variables']['data']) || empty($responseData['attributes']['relationships']['variables']['data'])) {
                $varsResult = makeApplicationApiRequest("/api/application/nests/{$nestId}/eggs/{$eggId}/variables");
                $varsData = json_decode($varsResult['response'], true);
                
                if (isset($varsData['data']) && !empty($varsData['data'])) {
                    // Add variables to the response
                    $responseData['attributes']['variables'] = $varsData['data'];
                    $result['response'] = json_encode($responseData);
                }
            }
            
            setCache($cacheKey, $result['response']);
            echo $result['response'];
            exit;
            
        case 'get_nest_details':
            $nestId = $_GET['nest_id'] ?? null;
            
            if (!$nestId) {
                echo json_encode(['error' => 'Nest ID is required']);
                exit;
            }
            
            $cacheKey = "nest_details_{$nestId}";
            if ($cached = getCache($cacheKey)) {
                echo $cached;
                exit;
            }
            
            // Get nest information
            $result = makeApplicationApiRequest("/api/application/nests/{$nestId}");
            setCache($cacheKey, $result['response']);
            echo $result['response'];
            exit;
            
        case 'reinstall_server':
            // Send a request to reinstall the server
            $result = makeApiRequest("/api/client/servers/{$serverId}/settings/reinstall", 'POST');
            echo $result['response'];
            exit;
            
        case 'update_settings':
            if (!$appServerId) {
                echo json_encode(['error' => 'Server not found']);
                exit;
            }
            
            $requestData = json_decode(file_get_contents('php://input'), true);
            if (!$requestData) {
                echo json_encode(['error' => 'Invalid request data']);
                exit;
            }
            
            // Ensure we have the required fields
            if (empty($requestData['egg'])) {
                echo json_encode(['error' => 'Egg ID is required']);
                exit;
            }
            
            // Make sure skip_scripts is set
            if (!isset($requestData['skip_scripts'])) {
                $requestData['skip_scripts'] = false;
            }
            
            // Make the update request
            $result = makeApplicationApiRequest(
                "/api/application/servers/{$appServerId}/startup",
                'PATCH',
                $requestData
            );
            
            echo $result['response'];
            exit;
    }
}

$server = getServerDetails($serverId);
?>

<?php
// Output page header
echo pageHeader("Settings - " . htmlspecialchars($server['attributes']['name'] ?? 'Server'));
?>
    <style>
        .section-card {
            margin-bottom: 1.25rem;
            border: none;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        
        .section-card .card-header {
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            padding: 0.75rem 1rem;
        }
        
        .section-card .card-body {
            padding: 0.75rem 1rem;
        }
        
        /* Improved egg and nest card grid layout */
        .egg-selection-grid,
        .nest-selection-grid {
            margin: 0 -0.5rem;
        }
        
        .egg-grid-item,
        .nest-grid-item {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            display: flex;
        }
        
        .egg-card,
        .nest-card {
            border: 1px solid #dee2e6;
            border-radius: 0.5rem;
            padding: 0.75rem;
            width: 100%;
            height: 100%; /* Fill the grid item */
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-height: 100px; /* Minimum height to maintain some consistency */
        }
        
        .egg-card:hover,
        .nest-card:hover {
            border-color: #6c757d;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
            background-color: #f8f9fa;
        }
        
        .egg-card.selected,
        .nest-card.selected {
            border-color: #0d6efd;
            background-color: rgba(13, 110, 253, 0.05);
            box-shadow: 0 0 0 0.15rem rgba(13, 110, 253, 0.25);
        }
        
        .egg-name,
        .nest-name {
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
            line-height: 1.2;
        }
        
        .egg-description,
        .nest-description {
            color: #6c757d;
            font-size: 0.85rem;
            line-height: 1.3;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4; /* Show max 4 lines */
            -webkit-box-orient: vertical;
            margin-bottom: 0;
        }
        
        /* Make sure cards in a row have equal width */
        .row-eq-height {
            display: flex;
            flex-wrap: wrap;
        }
        
        /* Other styles */
        .save-btn {
            padding: 0.5rem 1.25rem;
            font-weight: 500;
            transition: all 0.15s ease;
        }
        
        .save-btn:hover {
            transform: translateY(-1px);
        }
        
        /* Add a subtle animation to the form when it loads */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #settings-form {
            animation: fadeIn 0.3s ease-out;
        }
        
        @media (min-width: 992px) {
            /* Larger screens can have slightly larger text */
            .egg-name,
            .nest-name {
                font-size: 1.15rem;
            }
            .egg-description,
            .nest-description {
                font-size: 0.9rem;
            }
        }
    </style>
</head>

<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><?= htmlspecialchars($server['attributes']['name'] ?? 'Server') ?> - Settings</h1>
            <a href="index.php" class="btn btn-secondary">Back to Servers</a>
        </div>
        
        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-4">
            <?php
            // Include the EggFeatureManager
            require_once 'includes/EggFeatureManager.php';
            $featureManager = EggFeatureManager::getInstance();
            
            // Get the egg ID for this server
            $eggId = $featureManager->getEggIdFromServerId($serverId);
            
            // Define base tabs that are always shown
            $tabs = [
                'console' => 'Console',
                'startup' => 'Startup', 
                'settings' => 'Settings'
            ];
            
            // Add plugins tab if this egg should have it
            if ($eggId === null || $featureManager->hasPluginsTab($eggId)) {
                $tabs['plugins'] = 'Plugins';
            }
            
            // Add mods tab if this egg should have it
            if ($eggId === null || $featureManager->hasModsTab($eggId)) {
                $tabs['mods'] = 'Mods';
            }
            
            // Display the tabs
            foreach ($tabs as $tab => $label) {
                $activeClass = $tab === 'settings' ? 'active' : '';
                echo "<li class=\"nav-item\"><a class=\"nav-link $activeClass\" href=\"$tab.php?id=$serverId\">$label</a></li>";
            }
            ?>
        </ul>
        
        <div id="settings-container">
            <div class="d-flex justify-content-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    </div>
    
<?php
// Output confirmation modal
echo renderConfirmationModal();

// Output page footer with specific JS files
echo pageFooter(['js/app.js', 'js/settings.js']);
?>
<script>
    // Pass server info from PHP to JavaScript
    const serverId = "<?= htmlspecialchars($serverId) ?>";
</script>
