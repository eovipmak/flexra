<?php
/**
 * Response class for standardizing API responses
 */
class Response {
    /**
     * Send a JSON response
     * 
     * @param mixed $data Response data
     * @param int $statusCode HTTP status code
     */
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    /**
     * Send a success response
     * 
     * @param string $message Success message
     * @param array $data Additional data
     * @param int $statusCode HTTP status code
     */
    public static function success($message = 'Operation successful', $data = [], $statusCode = 200) {
        $response = ['success' => true, 'message' => $message];
        if (!empty($data)) {
            $response = array_merge($response, $data);
        }
        self::json($response, $statusCode);
    }
    
    /**
     * Send an error response
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code
     */
    public static function error($message, $statusCode = 400) {
        self::json(['success' => false, 'message' => $message], $statusCode);
    }
}