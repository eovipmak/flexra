<?php
require_once __DIR__ . '/ApiClient.php';
require_once __DIR__ . '/ModrinthClient.php';

/**
 * Content Manager class
 * 
 * Handles plugins and mods operations
 */
class ContentManager {
    private $apiClient;
    private $modrinthClient;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->apiClient = new ApiClient();
        $this->modrinthClient = new ModrinthClient();
    }
    
    /**
     * Search for plugins
     * 
     * @param string $query Search query
     * @param int $offset Pagination offset
     * @param int $limit Results per page
     * @return array Search results
     */
    public function searchPlugins($query, $offset = 0, $limit = 20) {
        return $this->modrinthClient->searchPlugins($query, $offset, $limit);
    }
    
    /**
     * Search for mods
     * 
     * @param string $query Search query
     * @param int $offset Pagination offset
     * @param int $limit Results per page
     * @return array Search results
     */
    public function searchMods($query, $offset = 0, $limit = 20) {
        return $this->modrinthClient->searchMods($query, $offset, $limit);
    }
    
    /**
     * Get project versions
     * 
     * @param string $projectId Project ID
     * @return array Project versions
     */
    public function getVersions($projectId) {
        return $this->modrinthClient->getVersions($projectId);
    }
    
    /**
     * Install a plugin
     * 
     * @param string $serverId Server identifier
     * @param string $projectId Project ID
     * @param string $versionId Version ID
     * @param string $fileName File name
     * @return bool Installation success
     */
    public function installPlugin($serverId, $projectId, $versionId, $fileName) {
        // Download the plugin from Modrinth
        $pluginContent = $this->modrinthClient->downloadFile($versionId);
        
        if ($pluginContent === false) {
            return false;
        }
        
        // Create plugins directory and upload file
        if (!$this->apiClient->createServerDirectory($serverId, 'plugins')) {
            return false;
        }
        
        return $this->apiClient->uploadFileToServer($serverId, 'plugins/' . $fileName, $pluginContent);
    }
    
    /**
     * Install a mod
     * 
     * @param string $serverId Server identifier
     * @param string $projectId Project ID
     * @param string $versionId Version ID
     * @param string $fileName File name
     * @return bool Installation success
     */
    public function installMod($serverId, $projectId, $versionId, $fileName) {
        // Download the mod from Modrinth
        $modContent = $this->modrinthClient->downloadFile($versionId);
        
        if ($modContent === false) {
            return false;
        }
        
        // Create mods directory and upload file
        if (!$this->apiClient->createServerDirectory($serverId, 'mods')) {
            return false;
        }
        
        return $this->apiClient->uploadFileToServer($serverId, 'mods/' . $fileName, $modContent);
    }
    
    /**
     * Delete a plugin
     * 
     * @param string $serverId Server identifier
     * @param string $pluginPath Plugin path
     * @return array Response data
     */
    public function deletePlugin($serverId, $pluginPath) {
        return $this->apiClient->deleteServerFile($serverId, $pluginPath);
    }
    
    /**
     * Delete a mod
     * 
     * @param string $serverId Server identifier
     * @param string $modPath Mod path
     * @return array Response data
     */
    public function deleteMod($serverId, $modPath) {
        return $this->apiClient->deleteServerFile($serverId, $modPath);
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
}