<?php
/**
 * Bootstrap file
 * 
 * Loads all required classes and initializes the application
 */

// Load core functionality
require_once __DIR__ . '/Core.php';

// Load classes
require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/ApiClient.php';
require_once __DIR__ . '/ModrinthClient.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/ServerManager.php';
require_once __DIR__ . '/ContentManager.php';

// Initialize configuration
try {
    $config = Config::getInstance();
} catch (Exception $e) {
    die('Configuration error: ' . $e->getMessage());
}