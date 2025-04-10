<?php
/**
 * Core functionality for the Minecraft Server Management application
 * 
 * This file consolidates common functions and utilities used throughout the application
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Create logs directory if it doesn't exist
if (!is_dir(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0755, true);
}

/**
 * Helper function to format bytes to human-readable format
 * 
 * @param int $bytes Bytes to format
 * @param int $precision Decimal precision
 * @return string Formatted size
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    
    $bytes /= (1 << (10 * $pow));
    
    return round($bytes, $precision) . ' ' . $units[$pow];
}

/**
 * Helper function to format numbers in compact form
 * 
 * @param int $number Number to format
 * @return string Formatted number
 */
function formatCompactNumber($number) {
    if ($number >= 1000000) {
        return round($number / 1000000, 1) . 'M';
    } elseif ($number >= 1000) {
        return round($number / 1000, 1) . 'K';
    }
    return $number;
}

/**
 * Helper function to escape HTML
 * 
 * @param string $string String to escape
 * @return string Escaped string
 */
function h($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

/**
 * Helper function to generate a page header with common elements
 * 
 * @param string $title Page title
 * @param array $cssFiles Additional CSS files to include
 * @param array $preloadResources Resources to preload
 * @return string HTML header
 */
function pageHeader($title, $cssFiles = [], $preloadResources = []) {
    $header = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . h($title) . ' - Minecraft Server Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="css/main.css">';
    
    // Add additional CSS files
    foreach ($cssFiles as $cssFile) {
        $header .= "\n    <link rel=\"stylesheet\" href=\"" . h($cssFile) . "\">";
    }
    
    // Preload resources
    foreach ($preloadResources as $resource) {
        $type = pathinfo($resource, PATHINFO_EXTENSION);
        $as = 'script';
        
        if (in_array($type, ['css', 'woff2', 'woff', 'ttf', 'otf'])) {
            $as = 'style';
        } else if (in_array($type, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])) {
            $as = 'image';
        } else if (in_array($type, ['woff', 'woff2', 'ttf', 'otf'])) {
            $as = 'font';
        }
        
        $header .= "\n    <link rel=\"preload\" href=\"" . h($resource) . "\" as=\"" . $as . "\">";
    }
    
    // No preloading of app.js - it will be loaded conditionally in the footer
    
    $header .= '
</head>
<body>';
    
    return $header;
}

/**
 * Helper function to generate a page footer with common elements
 * 
 * @param array $jsFiles Additional JS files to include
 * @return string HTML footer
 */
function pageFooter($jsFiles = []) {
    $footer = '
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>';
    
    // Check if toast.js or app.js is already included in the additional JS files
    $includeAppJs = true;
    foreach ($jsFiles as $jsFile) {
        if (strpos($jsFile, 'toast.js') !== false || strpos($jsFile, 'app.js') !== false) {
            $includeAppJs = false;
            break;
        }
    }
    
    // Only include app.js if neither toast.js nor app.js is already included
    if ($includeAppJs) {
        $footer .= "\n    <script src=\"js/app.js\"></script>";
    }
    
    // Add additional JS files
    foreach ($jsFiles as $jsFile) {
        $footer .= "\n    <script src=\"" . h($jsFile) . "\"></script>";
    }
    
    $footer .= '
</body>
</html>';
    
    return $footer;
}

/**
 * Helper function to render a confirmation modal
 * 
 * @return string HTML for confirmation modal
 */
function renderConfirmationModal() {
    return '
<!-- Confirmation Modal -->
<div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="confirmation-title">Confirm Action</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex align-items-start">
                    <div class="confirmation-icon me-3">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div>
                        <p id="confirmation-message">Are you sure you want to proceed with this action?</p>
                        <p id="confirmation-details" class="text-muted small"></p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-action-btn">Confirm</button>
            </div>
        </div>
    </div>
</div>';
}

/**
 * Helper function to render a server card
 * 
 * @param array $server Server data
 * @param int $index Server index for animation delay
 * @return string HTML for server card
 */
function renderServerCard($server, $index) {
    $serverId = h($server['attributes']['identifier']);
    $serverName = h($server['attributes']['name']);
    $serverNode = h($server['attributes']['node']);
    $serverStatus = h($server['attributes']['current_state'] ?? $server['attributes']['status'] ?? 'Unknown');
    $animationDelay = $index * 100;
    $statusClass = ServerManager::getStatusClass($serverStatus);
    
    return '
<div class="server-card animated-card hover-lift" style="animation-delay: ' . $animationDelay . 'ms">
    <div class="card-body">
        <h5 class="card-title text-center">' . $serverName . '</h5>
        <p class="card-text">
            <strong><i class="bi bi-fingerprint"></i> ID:</strong> ' . $serverId . '<br>
            <strong><i class="bi bi-hdd-network"></i> Node:</strong> ' . $serverNode . '<br>
            <strong><i class="bi bi-activity"></i> Status:</strong> 
            <span class="status-badge ' . $statusClass . '">
                ' . $serverStatus . '
            </span>
        </p>
        <a href="console.php?id=' . $serverId . '" class="btn btn-primary w-100 btn-animated">
            <i class="bi bi-terminal"></i> Manage Server
        </a>
    </div>
</div>';
}

// Set default timezone
date_default_timezone_set('UTC');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}