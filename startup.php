<?php
require_once 'config.php';
require_once 'api.php';

$serverId = $_GET['id'] ?? null;

if (!$serverId) {
    die('Server ID is required');
}

// Application API functions are still needed for updates
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

// Get server startup details using client API
function getClientStartupDetails($serverId) {
    $result = makeApiRequest(serverEndpoint($serverId, 'startup'));
    return json_decode($result['response'], true);
}

// Get server startup details from application API (needed for the complete update)
function getApplicationStartupDetails($applicationServerId) {
    $result = makeApplicationApiRequest("/api/application/servers/{$applicationServerId}");
    return json_decode($result['response'], true);
}

// Update server startup settings (still using application API)
function updateServerStartup($applicationServerId, $startupData) {
    $result = makeApplicationApiRequest(
        "/api/application/servers/{$applicationServerId}/startup",
        'PATCH',
        $startupData
    );
    return json_decode($result['response'], true);
}

// Handle JSON responses
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Process API requests
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    
    switch ($action) {
        case 'get_startup_info':
            // Use client API for getting startup info
            $startupInfo = getClientStartupDetails($serverId);
            
            // If we have an application server ID, also get the egg ID and current Docker image
            if ($applicationServerId = getApplicationServerId($serverId)) {
                $appDetails = getApplicationStartupDetails($applicationServerId);
                if ($appDetails && isset($appDetails['attributes'])) {
                    // Add egg ID and Docker image to the response
                    $startupInfo['application_details'] = [
                        'egg_id' => $appDetails['attributes']['egg'],
                        'current_image' => $appDetails['attributes']['container']['image'] ?? null
                    ];
                }
            }
            
            jsonResponse($startupInfo);
            break;
            
        case 'update_startup':
            $appServerId = getApplicationServerId($serverId);
            if (!$appServerId) {
                jsonResponse(['error' => 'Server not found'], 404);
            }
            
            // Get JSON data from request body
            $requestData = json_decode(file_get_contents('php://input'), true);
            if (!$requestData) {
                jsonResponse(['error' => 'Invalid request data'], 400);
            }
            
            // Ensure we have the required fields
            if (empty($requestData['egg'])) {
                // Get egg ID from application API if not provided
                $appDetails = getApplicationStartupDetails($appServerId);
                if ($appDetails && isset($appDetails['attributes']['egg'])) {
                    $requestData['egg'] = $appDetails['attributes']['egg'];
                }
            }
            
            // Make sure skip_scripts is set
            if (!isset($requestData['skip_scripts'])) {
                $requestData['skip_scripts'] = false;
            }
            
            // Make the update request
            $updateResult = makeApplicationApiRequest(
                "/api/application/servers/{$appServerId}/startup",
                'PATCH',
                $requestData
            );
            
            // Check for errors
            $responseData = json_decode($updateResult['response'], true);
            if ($updateResult['httpCode'] >= 400) {
                jsonResponse([
                    'error' => 'Failed to update startup settings', 
                    'details' => $responseData,
                    'http_code' => $updateResult['httpCode']
                ], $updateResult['httpCode']);
            } else {
                jsonResponse(['success' => true, 'data' => $responseData]);
            }
            break;
    }
}

// Get application-level server ID for rendering the page
$applicationServerId = getApplicationServerId($serverId);
$server = getServerDetails($serverId); // Get client-level server details for display
?>

<?php
// Output page header
echo pageHeader("Startup - " . htmlspecialchars($server['attributes']['name'] ?? 'Server'));
?>
    <style>
        /* Custom styles for startup page */
        .env-var-card {
            transition: all 0.2s ease;
            border: 1px solid #dee2e6;
            border-radius: 0.25rem;
            margin-bottom: 0.5rem;
            padding: 0.75rem;
        }
        
        .env-var-card:hover {
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
            border-color: #adb5bd;
        }
        
        .docker-image-selector {
            padding: 0.35rem;
            border-radius: 0.25rem;
            border: 1px solid #dee2e6;
            margin-bottom: 0.25rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
        }
        
        .docker-image-selector.selected {
            border-color: #0d6efd;
            background-color: rgba(13, 110, 253, 0.05);
            box-shadow: 0 0 0 0.15rem rgba(13, 110, 253, 0.25);
        }
        
        .docker-image-selector:hover:not(.selected) {
            background-color: #f8f9fa;
            border-color: #6c757d;
        }
        
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
        
        .section-card .card-title {
            font-size: 1.1rem;
        }
        
        .startup-command-preview {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.25rem;
            padding: 0.35rem 0.75rem;
            margin-top: 0.75rem;
            font-family: monospace;
            font-size: 0.85rem;
        }
        
        .save-btn {
            padding: 0.5rem 1.25rem;
            font-weight: 500;
            transition: all 0.15s ease;
        }
        
        .save-btn:hover {
            transform: translateY(-1px);
        }
        
        .image-tag {
            font-size: 0.75rem;
            color: #6c757d;
            display: block;
            margin-top: 0.15rem;
            font-family: monospace;
        }
        
        .image-name {
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        /* Make form labels and inputs more compact */
        .form-label {
            margin-bottom: 0.25rem;
            font-size: 0.9rem;
        }
        
        .form-control {
            padding: 0.35rem 0.75rem;
            font-size: 0.9rem;
        }
        
        .text-muted {
            font-size: 0.85rem;
        }
        
        /* Add more compact spacing in the row layout */
        .g-3 {
            --bs-gutter-y: 0.5rem;
        }
        
        /* Add a subtle animation to the form when it loads */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #startup-form {
            animation: fadeIn 0.3s ease-out;
        }
    </style>
</head>

<body>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><?= htmlspecialchars($server['attributes']['name'] ?? 'Server') ?> - Startup Settings</h1>
            <a href="index.php" class="btn btn-secondary">Back to Servers</a>
        </div>
        
        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-4">
            <?php
            $tabs = ['console' => 'Console', 'plugins' => 'Plugins', 'mods' => 'Mods', 'startup' => 'Startup', 'settings' => 'Settings'];
            foreach ($tabs as $tab => $label) {
                $activeClass = $tab === 'startup' ? 'active' : '';
                echo "<li class=\"nav-item\"><a class=\"nav-link $activeClass\" href=\"$tab.php?id=$serverId\">$label</a></li>";
            }
            ?>
        </ul>
        
        <?php if (!$applicationServerId): ?>
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Could not find the server configuration. Please ensure you have application API access.
        </div>
        <?php else: ?>
        
        <!-- Startup configuration form -->
        <div id="startup-settings-container">
            <div class="d-flex justify-content-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
        
        <?php endif; ?>
    </div>
    
<?php
// Output confirmation modal
echo renderConfirmationModal();

// Output page footer with specific JS files
echo pageFooter(['js/app.js', 'js/startup.js']);
?>
<script>
    // Pass server info from PHP to JavaScript
    const serverId = "<?= htmlspecialchars($serverId) ?>";
    const applicationServerId = <?= $applicationServerId ? $applicationServerId : 'null' ?>;
</script>
