<?php
/**
 * Configuration management class
 * 
 * Handles loading environment variables and providing access to configuration settings
 */
class Config {
    private static $instance = null;
    private $config = [];
    
    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {
        $this->loadEnvFile();
        $this->validateRequiredVariables();
    }
    
    /**
     * Get singleton instance
     * 
     * @return Config
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Load environment variables from .env file
     */
    private function loadEnvFile() {
        $envPath = dirname(__DIR__) . '/.env';
        
        if (!file_exists($envPath)) {
            throw new Exception('Environment file not found. Please create a .env file.');
        }
        
        $env = file_get_contents($envPath);
        $lines = explode("\n", $env);
        
        foreach ($lines as $line) {
            $line = trim($line);
            // Skip empty lines or comments
            if (empty($line) || strpos($line, '//') === 0) continue;
            
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Store in both environment and internal config
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $this->config[$key] = $value;
            }
        }
    }
    
    /**
     * Validate that required variables are present
     */
    private function validateRequiredVariables() {
        $required = ['PTERO_CLIENT_API_KEY', 'PTERO_PANEL_URL'];
        
        foreach ($required as $var) {
            if (empty($this->config[$var])) {
                throw new Exception("Missing required environment variable: $var");
            }
        }
    }
    
    /**
     * Get a configuration value
     * 
     * @param string $key Configuration key
     * @param mixed $default Default value if key not found
     * @return mixed Configuration value
     */
    public function get($key, $default = null) {
        return $this->config[$key] ?? $default;
    }
    
    /**
     * Check if a configuration key exists
     * 
     * @param string $key Configuration key
     * @return bool True if key exists
     */
    public function has($key) {
        return isset($this->config[$key]);
    }
}