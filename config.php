<?php
/**
 * Configuration file
 * 
 * This file is kept for backward compatibility.
 * New code should use the Config class directly.
 */

// Load bootstrap file
require_once __DIR__ . '/includes/bootstrap.php';

// Define global variables for backward compatibility
$config = Config::getInstance();
$PTERO_CLIENT_API_KEY = $config->get('PTERO_CLIENT_API_KEY');
$PTERO_APPLICATION_API_KEY = $config->get('PTERO_APPLICATION_API_KEY');
$PTERO_PANEL_URL = $config->get('PTERO_PANEL_URL');
?>