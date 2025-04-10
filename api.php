<?php
/**
 * API functions file
 * 
 * This file is kept for backward compatibility.
 * New code should use the ApiClient, ServerManager, and ContentManager classes directly.
 */

require_once 'config.php';

// Initialize API client and managers
$apiClient = new ApiClient();
$serverManager = new ServerManager();
$contentManager = new ContentManager();

/**
 * Helper function to make API requests with improved error handling
 * 
 * @param string $endpoint API endpoint path
 * @param string $method HTTP method
 * @param array|null $data Request data
 * @return array Response data
 */
function makeApiRequest($endpoint, $method = 'GET', $data = null) {
    global $apiClient;
    return $apiClient->request($endpoint, $method, $data);
}

/**
 * Creates API endpoint for a server
 */
function serverEndpoint($serverId, $path) {
    global $apiClient;
    return $apiClient->serverEndpoint($serverId, $path);
}

/**
 * Fetch server details
 */
function getServerDetails($serverId) {
    global $serverManager;
    return $serverManager->getServerDetails($serverId);
}

/**
 * Get websocket details for console
 */
function getWebsocketDetails($serverId) {
    global $serverManager;
    return $serverManager->getWebsocketDetails($serverId);
}

/**
 * Send power command to server
 */
function sendPowerCommand($serverId, $action) {
    global $serverManager;
    return $serverManager->sendPowerCommand($serverId, $action);
}

/**
 * Send command to server
 */
function sendCommand($serverId, $command) {
    global $serverManager;
    return $serverManager->sendCommand($serverId, $command);
}

/**
 * Get list of files in a directory
 */
function getFilesList($serverId, $directory = '/') {
    global $serverManager;
    return $serverManager->getFilesList($serverId, $directory);
}

/**
 * Get file contents
 */
function getFileContents($serverId, $file) {
    global $serverManager;
    return $serverManager->getFileContents($serverId, $file);
}

/**
 * Fetch server resources
 */
function getServerResources($serverId) {
    global $serverManager;
    return $serverManager->getServerResources($serverId);
}

/**
 * Fetch client servers
 */
function getClientServers() {
    global $serverManager;
    return $serverManager->getAllServers();
}

/**
 * Delete a file from the server
 */
function deleteServerFile($serverId, $filePath) {
    global $serverManager;
    return $serverManager->deleteFile($serverId, $filePath);
}

/**
 * File operations for the server
 */
function fileOperation($serverId, $operation, $data) {
    global $apiClient;
    return $apiClient->fileOperation($serverId, $operation, $data);
}

/**
 * Upload a file to the server
 */
function uploadFileToServer($serverId, $filePath, $content) {
    global $serverManager;
    return $serverManager->uploadFile($serverId, $filePath, $content);
}

/**
 * Create directory on server if it doesn't exist
 */
function createServerDirectory($serverId, $directory) {
    global $serverManager;
    return $serverManager->createDirectory($serverId, $directory);
}

/**
 * Move/rename a file on the server
 */
function moveServerFile($serverId, $sourcePath, $destinationPath) {
    global $apiClient;
    return $apiClient->moveServerFile($serverId, $sourcePath, $destinationPath);
}
?>