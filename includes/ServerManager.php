<?php
require_once __DIR__ . '/ApiClient.php';

/**
 * Server Manager class
 * 
 * Handles server operations and provides a higher-level API
 */
class ServerManager {
    private $apiClient;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->apiClient = new ApiClient();
    }
    
    /**
     * Get all client servers with status
     * 
     * @return array Servers with status
     */
    public function getAllServers() {
        $servers = $this->apiClient->getClientServers();
        
        // Update servers with real-time status
        if (!empty($servers['data'])) {
            foreach ($servers['data'] as &$server) {
                $resources = $this->apiClient->getServerResources($server['attributes']['identifier']);
                if (!empty($resources['attributes']['current_state'])) {
                    $server['attributes']['current_state'] = $resources['attributes']['current_state'];
                }
            }
            unset($server); // Avoid reference issues
        }
        
        return $servers;
    }
    
    /**
     * Get server details
     * 
     * @param string $serverId Server identifier
     * @return array Server details
     */
    public function getServerDetails($serverId) {
        return $this->apiClient->getServerDetails($serverId);
    }
    
    /**
     * Get server resources
     * 
     * @param string $serverId Server identifier
     * @return array Server resources
     */
    public function getServerResources($serverId) {
        return $this->apiClient->getServerResources($serverId);
    }
    
    /**
     * Send power command to server
     * 
     * @param string $serverId Server identifier
     * @param string $action Power action (start, stop, restart, kill)
     * @return array Response data
     */
    public function sendPowerCommand($serverId, $action) {
        return $this->apiClient->sendPowerCommand($serverId, $action);
    }
    
    /**
     * Send command to server
     * 
     * @param string $serverId Server identifier
     * @param string $command Command to send
     * @return array Response data
     */
    public function sendCommand($serverId, $command) {
        return $this->apiClient->sendCommand($serverId, $command);
    }
    
    /**
     * Get websocket details for console
     * 
     * @param string $serverId Server identifier
     * @return array Websocket details
     */
    public function getWebsocketDetails($serverId) {
        return $this->apiClient->getWebsocketDetails($serverId);
    }
    
    /**
     * Get list of files in a directory
     * 
     * @param string $serverId Server identifier
     * @param string $directory Directory path
     * @return array Files list
     */
    public function getFilesList($serverId, $directory = '/') {
        return $this->apiClient->getFilesList($serverId, $directory);
    }
    
    /**
     * Get file contents
     * 
     * @param string $serverId Server identifier
     * @param string $file File path
     * @return string File contents
     */
    public function getFileContents($serverId, $file) {
        return $this->apiClient->getFileContents($serverId, $file);
    }
    
    /**
     * Delete a file from the server
     * 
     * @param string $serverId Server identifier
     * @param string $filePath File path
     * @return array Response data
     */
    public function deleteFile($serverId, $filePath) {
        return $this->apiClient->deleteServerFile($serverId, $filePath);
    }
    
    /**
     * Upload a file to the server
     * 
     * @param string $serverId Server identifier
     * @param string $filePath File path
     * @param string $content File content
     * @return bool Upload success
     */
    public function uploadFile($serverId, $filePath, $content) {
        return $this->apiClient->uploadFileToServer($serverId, $filePath, $content);
    }
    
    /**
     * Create directory on server
     * 
     * @param string $serverId Server identifier
     * @param string $directory Directory path
     * @return bool Creation success
     */
    public function createDirectory($serverId, $directory) {
        return $this->apiClient->createServerDirectory($serverId, $directory);
    }
    
    /**
     * Get server plugins
     * 
     * @param string $serverId Server identifier
     * @return array Plugins list
     */
    public function getServerPlugins($serverId) {
        $pluginsFolder = $this->apiClient->getFilesList($serverId, '/plugins');
        $plugins = [];
        
        if (isset($pluginsFolder['data'])) {
            $plugins = array_values(array_filter($pluginsFolder['data'], function($file) {
                return isset($file['attributes']['is_file']) && 
                      $file['attributes']['is_file'] && 
                      preg_match('/\.jar$/', $file['attributes']['name']);
            }));
        }
        
        return $plugins;
    }
    
    /**
     * Get server mods
     * 
     * @param string $serverId Server identifier
     * @return array Mods list
     */
    public function getServerMods($serverId) {
        $modsFolder = $this->apiClient->getFilesList($serverId, '/mods');
        $mods = [];
        
        if (isset($modsFolder['data'])) {
            $mods = array_values(array_filter($modsFolder['data'], function($file) {
                return isset($file['attributes']['is_file']) && 
                      $file['attributes']['is_file'] && 
                      preg_match('/\.jar$/', $file['attributes']['name']);
            }));
        }
        
        return $mods;
    }
    
    /**
     * Determine status class for UI
     * 
     * @param string $status Server status
     * @return string CSS class for status
     */
    public static function getStatusClass($status) {
        $status = strtolower($status ?? 'unknown');
        if ($status === 'running') return 'status-running';
        if ($status === 'starting') return 'status-starting';
        return 'status-offline';
    }
}