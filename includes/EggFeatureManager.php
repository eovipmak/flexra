<?php
/**
 * EggFeatureManager.php
 * 
 * Manages which features (tabs) are available for different eggs in the Pterodactyl panel
 */
class EggFeatureManager {
    // Singleton instance
    private static $instance = null;
    
    // Arrays to store egg IDs that should have specific features
    private $modsEggs = [];
    private $pluginsEggs = [];
    
    /**
     * Private constructor for singleton pattern
     */
    private function __construct() {
        // Initialize the egg feature mappings
        $this->initializeFeatureMappings();
    }
    
    /**
     * Get singleton instance
     * 
     * @return EggFeatureManager Instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Initialize the mappings of eggs to features
     */
    private function initializeFeatureMappings() {
        // Eggs that should have the mods tab
        // These are typically Forge, Fabric, etc. based Minecraft servers
        $this->modsEggs = [
            2,
            15,
            18,
            22,
	    24
            // Add more egg IDs as needed
        ];
        
        // Eggs that should have the plugins tab
        // These are typically Bukkit, Spigot, Paper, etc. based Minecraft servers
        $this->pluginsEggs = [
            4,
            16,
            17,
	    24
            // Add more egg IDs as needed
        ];
    }
    
    /**
     * Check if an egg should have the mods tab
     * 
     * @param int $eggId Egg ID to check
     * @return bool True if the egg should have the mods tab
     */
    public function hasModsTab($eggId) {
        return in_array($eggId, $this->modsEggs);
    }
    
    /**
     * Check if an egg should have the plugins tab
     * 
     * @param int $eggId Egg ID to check
     * @return bool True if the egg should have the plugins tab
     */
    public function hasPluginsTab($eggId) {
        return in_array($eggId, $this->pluginsEggs);
    }
    
    /**
     * Get egg ID from server ID using application API
     * 
     * @param string $serverId Client-side server ID
     * @return int|null Egg ID or null if not found
     */
    public function getEggIdFromServerId($serverId) {
        // First try to get server details from client API
        $apiClient = new ApiClient();
        $serverDetails = $apiClient->getServerDetails($serverId);
        
        if (isset($serverDetails['attributes']['egg'])) {
            return (int)$serverDetails['attributes']['egg'];
        }
        
        // If client API doesn't provide egg ID, try application API
        // This requires the application API key to be configured
        $config = Config::getInstance();
        $applicationApiKey = $config->get('PTERO_APPLICATION_API_KEY');
        
        if (empty($applicationApiKey)) {
            return null; // Can't proceed without application API key
        }
        
        // Get application-level server ID from client-level server ID
        $internalId = $this->getApplicationServerId($serverId);
        if (!$internalId) {
            return null;
        }
        
        // Get server details from application API
        $panelUrl = $config->get('PTERO_PANEL_URL');
        $url = rtrim($panelUrl, '/') . "/api/application/servers/{$internalId}";
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$applicationApiKey}",
                "Accept: application/json",
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400 || !$response) {
            return null;
        }
        
        $data = json_decode($response, true);
        return isset($data['attributes']['egg']) ? (int)$data['attributes']['egg'] : null;
    }
    
    /**
     * Get application-level server ID from client-level server ID
     * 
     * @param string $clientServerId Client-side server ID
     * @return int|null Application-level server ID or null if not found
     */
    private function getApplicationServerId($clientServerId) {
        $config = Config::getInstance();
        $panelUrl = $config->get('PTERO_PANEL_URL');
        $applicationApiKey = $config->get('PTERO_APPLICATION_API_KEY');
        
        // Try to find the server in the application API
        $url = rtrim($panelUrl, '/') . "/api/application/servers";
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$applicationApiKey}",
                "Accept: application/json",
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400 || !$response) {
            return null;
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['data'])) {
            foreach ($data['data'] as $server) {
                if ($server['attributes']['identifier'] === $clientServerId) {
                    return $server['attributes']['id'];
                }
            }
        }
        
        return null;
    }
}