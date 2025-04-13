<?php
/**
 * Modrinth API Client
 * 
 * Handles communication with the Modrinth API for plugins and mods
 */
class ModrinthClient {
    private $baseUrl = 'https://api.modrinth.com/v2';
    private $userAgent = 'MinecraftServerManager/1.0';
    
    /**
     * Make a request to the Modrinth API
     * 
     * @param string $endpoint API endpoint
     * @param array $params Query parameters
     * @return array|false Response data or false on error
     */
    public function request($endpoint, $params = []) {
        $url = $this->baseUrl . '/' . ltrim($endpoint, '/');
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["User-Agent: {$this->userAgent}"],
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($httpCode >= 400 || !$response) {
            error_log("Modrinth API Error: $endpoint, HTTP Code: $httpCode, Error: $error");
            return false;
        }
        
        return json_decode($response, true) ?: [];
    }
    
    /**
     * Search for projects (plugins or mods)
     * 
     * @param string $query Search query
     * @param int $offset Pagination offset
     * @param int $limit Results per page
     * @param array $facets Search facets
     * @return array Search results
     */
    public function search($query, $offset = 0, $limit = 20, $facets = []) {
        $params = [
            'limit' => $limit,
            'offset' => $offset
        ];
        
        if (!empty($facets)) {
            $params['facets'] = json_encode($facets);
        }
        
        // Add query if provided, otherwise sort by downloads
        if (!empty(trim($query))) {
            $params['query'] = trim($query);
        } else {
            $params['index'] = 'downloads';
        }
        
        return $this->request('search', $params) ?: ['hits' => [], 'total_hits' => 0];
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
        // Server plugins categories
        $facets = [["categories:paper"], ["categories:spigot"], ["categories:purpur"], ["categories:bukkit"]];
        return $this->search($query, $offset, $limit, $facets);
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
        // Mod categories (fabric, forge, quilt)
        $facets = [
            ["project_type:mod"],
            ["categories:fabric", "categories:forge", "categories:quilt"]
        ];
        return $this->search($query, $offset, $limit, $facets);
    }
    
    /**
     * Get project versions
     * 
     * @param string $projectId Project ID
     * @return array Project versions
     */
    public function getVersions($projectId) {
        return $this->request("project/{$projectId}/version") ?: [];
    }
    
    /**
     * Get version details
     * 
     * @param string $versionId Version ID
     * @return array|false Version details or false on error
     */
    public function getVersionDetails($versionId) {
        return $this->request("version/{$versionId}");
    }
    
    /**
     * Download a file from a version
     * 
     * @param string $versionId Version ID
     * @return string|false File content or false on error
     */
    public function downloadFile($versionId) {
        // First get version info to find download URL
        $versionData = $this->getVersionDetails($versionId);
        
        if (!$versionData || empty($versionData['files'])) {
            return false;
        }
        
        // Use first file's download URL
        $downloadUrl = $versionData['files'][0]['url'];
        $fileSize = $versionData['files'][0]['size'] ?? 0;
        
        // Set up session variable to track download progress
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $downloadId = 'download_' . $versionId;
        $_SESSION[$downloadId] = [
            'progress' => 0,
            'total' => $fileSize,
            'start_time' => microtime(true)
        ];
        session_write_close(); // Write and close to prevent blocking
        
        // Download the file with progress tracking
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $downloadUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["User-Agent: {$this->userAgent}"],
            CURLOPT_NOPROGRESS => false,
            CURLOPT_PROGRESSFUNCTION => function($resource, $downloadSize, $downloaded, $uploadSize, $uploaded) use ($downloadId) {
                if ($downloadSize > 0) {
                    $progress = round(($downloaded / $downloadSize) * 100);
                    
                    // Update progress in session
                    session_start();
                    $_SESSION[$downloadId]['progress'] = $progress;
                    $_SESSION[$downloadId]['downloaded'] = $downloaded;
                    session_write_close();
                }
            }
        ]);
        
        $fileContent = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Mark download as complete
        if ($httpCode < 400 && $fileContent) {
            session_start();
            $_SESSION[$downloadId]['progress'] = 100;
            $_SESSION[$downloadId]['end_time'] = microtime(true);
            session_write_close();
            
            return $fileContent;
        }
        
        // Mark download as failed
        session_start();
        $_SESSION[$downloadId]['error'] = "HTTP Error: $httpCode";
        session_write_close();
        
        return false;
    }
}