<?php
require_once 'includes/bootstrap.php';

// Initialize server manager
$serverManager = new ServerManager();

// Get all servers with their status
$servers = $serverManager->getAllServers();

// Output page header
echo pageHeader('My Servers');
?>

<div class="page-header">
    <div class="container">
        <h1><i class="bi bi-hdd-rack me-2"></i>My Servers</h1>
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item active" aria-current="page">Home</li>
            </ol>
        </nav>
    </div>
</div>

<div class="container">
    <div class="row mb-4">
        <div class="col-md-12">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2 class="mb-0">Server Dashboard</h2>
                    <p class="text-muted">Manage your servers</p>
                </div>
            </div>
        </div>
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