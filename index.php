<?php
require_once 'includes/bootstrap.php';

// Initialize server manager
$serverManager = new ServerManager();

// Get all servers with their status
$servers = $serverManager->getAllServers();

// Output page header
echo pageHeader('My Minecraft Servers');
?>

<div class="container mt-4">
    <div class="header">
        <h1>My Minecraft Servers</h1>
    </div>
    
    <div class="server-grid stagger-animation">
        <?php if (!empty($servers['data'])): ?>
            <?php foreach ($servers['data'] as $index => $server): ?>
                <?php echo renderServerCard($server, $index); ?>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="col-12">
                <div class="alert alert-info animated-card" style="opacity: 1">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    No servers found. Please add a server to get started.
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php
// Output confirmation modal
echo renderConfirmationModal();

// Output page footer
echo pageFooter();
?>