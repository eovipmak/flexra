<?php
require_once __DIR__ . '/Config.php';

/**
 * API Client for Pterodactyl Panel
 * 
 * Handles communication with the Pterodactyl API
 */
class ApiClient {
    private $config;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->config = Config::getInstance();
    }
    
    /**
     * Make an API request to the Pterodactyl panel
     * 
     * @param string $endpoint API endpoint path
     * @param string $method HTTP method
     * @param array|null $data Request data
     * @return array Response data
     */
    public function request($endpoint, $method = 'GET', $data = null) {
        $panelUrl = $this->config->get('PTERO_PANEL_URL');
        $apiKey = $this->config->get('PTERO_CLIENT_API_KEY');
        
        $url = rtrim($panelUrl, '/') . '/' . ltrim($endpoint, '/');
        $headers = [
            "Authorization: Bearer " . $apiKey,
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
        
        // Log errors for easier debugging
        if ($result['httpCode'] >= 400 || !empty($result['error'])) {
            error_log("API Error: $endpoint, HTTP Code: {$result['httpCode']}, Error: {$result['error']}");
        }
        
        return $result;
    }
    
    /**
     * Create a server-specific endpoint
     * 
     * @param string $serverId Server identifier
     * @param string $path Endpoint path
     * @return string Full endpoint path
     */
    public function serverEndpoint($serverId, $path) {
        return "/api/client/servers/{$serverId}/{$path}";
    }
    
    /**
     * Get server details
     * 
     * @param string $serverId Server identifier
     * @return array Server details
     */
    public function getServerDetails($serverId) {
        $result = $this->request($this->serverEndpoint($serverId, ''));
        return json_decode($result['response'], true);
    }
    
    /**
     * Get websocket details for console
     * 
     * @param string $serverId Server identifier
     * @return array Websocket details
     */
    public function getWebsocketDetails($serverId) {
        $result = $this->request($this->serverEndpoint($serverId, 'websocket'));
        return json_decode($result['response'], true);
    }
    
    /**
     * Send power command to server
     * 
     * @param string $serverId Server identifier
     * @param string $action Power action (start, stop, restart, kill)
     * @return array Response data
     */
    public function sendPowerCommand($serverId, $action) {
        $result = $this->request(
            $this->serverEndpoint($serverId, 'power'),
            'POST',
            ['signal' => $action]
        );
        return json_decode($result['response'], true);
    }
    
    /**
     * Send command to server
     * 
     * @param string $serverId Server identifier
     * @param string $command Command to send
     * @return array Response data
     */
    public function sendCommand($serverId, $command) {
        $result = $this->request(
            $this->serverEndpoint($serverId, 'command'),
            'POST',
            ['command' => $command]
        );
        return json_decode($result['response'], true);
    }
    
    /**
     * Get list of files in a directory
     * 
     * @param string $serverId Server identifier
     * @param string $directory Directory path
     * @return array Files list
     */
    public function getFilesList($serverId, $directory = '/') {
        $result = $this->request($this->serverEndpoint($serverId, 'files/list') . '?directory=' . urlencode($directory));
        return json_decode($result['response'], true);
    }
    
    /**
     * Get file contents
     * 
     * @param string $serverId Server identifier
     * @param string $file File path
     * @return string File contents
     */
    public function getFileContents($serverId, $file) {
        $result = $this->request($this->serverEndpoint($serverId, 'files/contents') . '?file=' . urlencode($file));
        return $result['response'];  // Return raw content, not JSON decoded
    }
    
    /**
     * Fetch server resources
     * 
     * @param string $serverId Server identifier
     * @return array Server resources
     */
    public function getServerResources($serverId) {
        $result = $this->request($this->serverEndpoint($serverId, 'resources'));
        return json_decode($result['response'], true);
    }
    
    /**
     * Fetch client servers
     * 
     * @return array Client servers
     */
    public function getClientServers() {
        $result = $this->request("/api/client");
        return json_decode($result['response'], true);
    }
    
    /**
     * Delete a file from the server
     * 
     * @param string $serverId Server identifier
     * @param string $filePath File path
     * @return array Response data
     */
    public function deleteServerFile($serverId, $filePath) {
        $result = $this->request(
            $this->serverEndpoint($serverId, 'files/delete'),
            'POST',
            ['root' => '/', 'files' => [ltrim($filePath, '/')]]
        );
        return json_decode($result['response'], true);
    }
    
    /**
     * File operations for the server
     * 
     * @param string $serverId Server identifier
     * @param string $operation Operation type (upload, create-folder, rename)
     * @param array $data Operation data
     * @return bool Operation success
     */
    public function fileOperation($serverId, $operation, $data) {
        $endpoints = [
            'upload' => 'files/upload',
            'create-folder' => 'files/create-folder',
            'rename' => 'files/rename'
        ];
        
        if (!isset($endpoints[$operation])) {
            error_log("Invalid file operation: $operation");
            return false;
        }
        
        $result = $this->request(
            $this->serverEndpoint($serverId, $endpoints[$operation]),
            $operation === 'rename' ? 'PUT' : 'POST',
            $data
        );
        
        return ($result['httpCode'] < 400);
    }
    
    /**
     * Upload a file to the server
     * 
     * @param string $serverId Server identifier
     * @param string $filePath File path
     * @param string $content File content
     * @return bool Upload success
     */
    public function uploadFileToServer($serverId, $filePath, $content) {
        // Remove leading slash to work with Pterodactyl API
        $filePath = ltrim($filePath, '/');
        $fileName = basename($filePath);
        $targetDirectory = dirname($filePath);
        
        // First, ensure parent directory exists
        if ($targetDirectory !== '.') {
            $this->createServerDirectory($serverId, $targetDirectory);
        }
        
        // Get a signed URL for uploading
        $result = $this->request($this->serverEndpoint($serverId, 'files/upload'));
        $data = json_decode($result['response'], true);
        
        if (!isset($data['attributes']['url'])) {
            error_log("Failed to get upload URL: {$result['response']}");
            return false;
        }
        
        // Create temporary file for the binary data
        $tempFile = tempnam(sys_get_temp_dir(), 'mc_plugin_');
        file_put_contents($tempFile, $content);
        
        // Upload the file
        $uploadUrl = $data['attributes']['url'];
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $uploadUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => ['files' => new CURLFile($tempFile, 'application/octet-stream', $fileName)]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Clean up temp file
        unlink($tempFile);
        
        if ($httpCode >= 400) {
            error_log("Failed to upload file. HTTP Code: $httpCode");
            return false;
        }
        
        // If target directory is not root, move the file
        if ($targetDirectory !== '.' && $targetDirectory !== '') {
            return $this->moveServerFile($serverId, $fileName, $filePath);
        }
        
        return true;
    }
    
    /**
     * Create directory on server if it doesn't exist
     * 
     * @param string $serverId Server identifier
     * @param string $directory Directory path
     * @return bool Creation success
     */
    public function createServerDirectory($serverId, $directory) {
        $directory = ltrim($directory, '/');
        if (empty($directory) || $directory === '.') return true;
        
        return $this->fileOperation($serverId, 'create-folder', [
            'root' => '/', 
            'name' => $directory
        ]);
    }
    
    /**
     * Move/rename a file on the server
     * 
     * @param string $serverId Server identifier
     * @param string $sourcePath Source path
     * @param string $destinationPath Destination path
     * @return bool Move success
     */
    public function moveServerFile($serverId, $sourcePath, $destinationPath) {
        $sourcePath = ltrim($sourcePath, '/');
        $destinationPath = ltrim($destinationPath, '/');
        
        return $this->fileOperation($serverId, 'rename', [
            'root' => '/',
            'files' => [
                [
                    'from' => $sourcePath,
                    'to' => $destinationPath
                ]
            ]
        ]);
    }
}