/**
 * Main JavaScript file - Consolidated from multiple JS files
 * 
 * This file contains all client-side functionality for the Flexa Server Management application
 * - Toast notifications
 * - Confirmation dialogs
 * - UI enhancements (lazy loading, animations)
 * - Progress tracking
 */

/**
 * Toast notification system
 * 
 * Provides a modern, non-intrusive way to display notifications to the user
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.counter = 0;
        this.initialize();
    }
    
    /**
     * Initialize the toast container
     */
    initialize() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * Show a toast notification
     * 
     * @param {string} message - The message to display
     * @param {Object} options - Toast options
     * @param {string} options.title - Toast title
     * @param {string} options.type - Toast type (success, error, warning, info)
     * @param {number} options.duration - Duration in milliseconds
     * @param {boolean} options.dismissible - Whether the toast can be dismissed
     * @returns {number} Toast ID
     */
    show(message, options = {}) {
        const id = ++this.counter;
        const {
            title = 'Notification',
            type = 'info',
            duration = 5000,
            dismissible = true
        } = options;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = `toast-${id}`;
        
        // Set icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="bi bi-check-circle-fill"></i>';
                break;
            case 'error':
                icon = '<i class="bi bi-exclamation-circle-fill"></i>';
                break;
            case 'warning':
                icon = '<i class="bi bi-exclamation-triangle-fill"></i>';
                break;
            default:
                icon = '<i class="bi bi-info-circle-fill"></i>';
        }
        
        // Build toast HTML
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${dismissible ? '<div class="toast-close"><i class="bi bi-x"></i></div>' : ''}
            <div class="toast-progress">
                <div class="toast-progress-bar" style="color: var(--${type === 'success' ? 'running' : type === 'error' ? 'offline' : type === 'warning' ? 'starting' : 'primary'}-color);"></div>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(toast);
        
        // Add to tracking array
        this.toasts.push({ id, element: toast, timeout: null });
        
        // Show toast with animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Set up auto-dismiss
        if (duration > 0) {
            const timeout = setTimeout(() => this.dismiss(id), duration);
            this.toasts.find(t => t.id === id).timeout = timeout;
            
            // Animate progress bar
            const progressBar = toast.querySelector('.toast-progress-bar');
            progressBar.style.transition = `width ${duration}ms linear`;
            
            // Force reflow to ensure transition works
            progressBar.getBoundingClientRect();
            
            // Start animation
            progressBar.style.width = '0%';
        }
        
        // Set up click handler for close button
        if (dismissible) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.dismiss(id));
        }
        
        return id;
    }
    
    /**
     * Show a success toast
     * 
     * @param {string} message - The message to display
     * @param {Object} options - Toast options
     * @returns {number} Toast ID
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success', title: options.title || 'Success' });
    }
    
    /**
     * Show an error toast
     * 
     * @param {string} message - The message to display
     * @param {Object} options - Toast options
     * @returns {number} Toast ID
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error', title: options.title || 'Error' });
    }
    
    /**
     * Show a warning toast
     * 
     * @param {string} message - The message to display
     * @param {Object} options - Toast options
     * @returns {number} Toast ID
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning', title: options.title || 'Warning' });
    }
    
    /**
     * Show an info toast
     * 
     * @param {string} message - The message to display
     * @param {Object} options - Toast options
     * @returns {number} Toast ID
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info', title: options.title || 'Information' });
    }
    
    /**
     * Dismiss a toast
     * 
     * @param {number} id - Toast ID
     */
    dismiss(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;
        
        const { element, timeout } = this.toasts[index];
        
        // Clear timeout if exists
        if (timeout) clearTimeout(timeout);
        
        // Remove from DOM with animation
        element.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.splice(index, 1);
        }, 300);
    }
    
    /**
     * Dismiss all toasts
     */
    dismissAll() {
        [...this.toasts].forEach(toast => this.dismiss(toast.id));
    }
}

/**
 * Confirmation utility for handling user confirmations
 * 
 * Provides a modern, non-intrusive way to confirm user actions
 */
class ConfirmationManager {
    constructor() {
        this.modal = null;
        this.callback = null;
        this.params = null;
        this.initialize();
    }
    
    /**
     * Initialize the confirmation manager
     */
    initialize() {
        // Get modal element
        const modalElement = document.getElementById('confirmationModal');
        if (!modalElement) {
            console.error('Confirmation modal not found in the DOM');
            return;
        }
        
        // Initialize Bootstrap modal
        this.modal = new bootstrap.Modal(modalElement);
        
        // Set up event listeners
        document.getElementById('confirm-action-btn').addEventListener('click', () => {
            this.modal.hide();
            if (typeof this.callback === 'function') {
                this.callback(...(this.params || []));
            }
            // Reset callback and params
            this.callback = null;
            this.params = null;
        });
        
        // Reset on modal hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
            document.getElementById('confirmation-message').textContent = 'Are you sure you want to proceed with this action?';
            document.getElementById('confirmation-details').textContent = '';
            document.getElementById('confirmation-title').textContent = 'Confirm Action';
        });
    }
    
    /**
     * Show confirmation dialog
     * 
     * @param {Object} options - Confirmation options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Main confirmation message
     * @param {string} options.details - Additional details (optional)
     * @param {string} options.confirmText - Text for confirm button (optional)
     * @param {string} options.cancelText - Text for cancel button (optional)
     * @param {string} options.confirmButtonClass - CSS class for confirm button (optional)
     * @param {Function} callback - Function to call when confirmed
     * @param {Array} params - Parameters to pass to callback
     */
    confirm(options, callback, params = []) {
        if (!this.modal) {
            console.error('Modal not initialized');
            return;
        }
        
        // Store callback and params
        this.callback = callback;
        this.params = params;
        
        // Set modal content
        document.getElementById('confirmation-title').textContent = options.title || 'Confirm Action';
        document.getElementById('confirmation-message').textContent = options.message || 'Are you sure you want to proceed with this action?';
        document.getElementById('confirmation-details').textContent = options.details || '';
        
        // Set button text if provided
        const confirmButton = document.getElementById('confirm-action-btn');
        if (options.confirmText) {
            confirmButton.textContent = options.confirmText;
        }
        
        // Set button class if provided
        if (options.confirmButtonClass) {
            confirmButton.className = options.confirmButtonClass;
        } else {
            confirmButton.className = 'btn btn-danger';
        }
        
        // Set cancel button text if provided
        const cancelButton = document.querySelector('#confirmationModal .btn-secondary');
        if (options.cancelText) {
            cancelButton.textContent = options.cancelText;
        } else {
            cancelButton.textContent = 'Cancel';
        }
        
        // Show modal
        this.modal.show();
    }
}

/**
 * Lazy Loading Implementation
 */
class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '0px 0px 200px 0px',
            threshold: 0.1,
            loadingClass: 'loading',
            loadedClass: 'loaded',
            ...options
        };
        
        this.items = [];
        this.observer = null;
        this.init();
    }
    
    init() {
        // Create IntersectionObserver if supported
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            });
            
            // Find all lazy elements and observe them
            this.observe();
        } else {
            // Fallback for browsers that don't support IntersectionObserver
            this.loadAllItems();
        }
        
        // Re-check for new elements periodically
        setInterval(() => this.observe(), 1000);
    }
    
    observe() {
        const lazyItems = document.querySelectorAll('[data-lazy]');
        lazyItems.forEach(item => {
            if (!this.items.includes(item)) {
                this.items.push(item);
                if (this.observer) {
                    this.observer.observe(item);
                } else {
                    this.loadItem(item);
                }
            }
        });
    }
    
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadItem(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }
    
    loadItem(item) {
        const type = item.getAttribute('data-lazy');
        
        switch (type) {
            case 'image':
                this.loadImage(item);
                break;
            case 'background':
                this.loadBackground(item);
                break;
            case 'component':
                this.loadComponent(item);
                break;
            default:
                console.warn('Unknown lazy loading type:', type);
        }
    }
    
    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src) return;
        
        img.classList.add(this.options.loadingClass);
        
        // Create a new image to preload
        const tempImage = new Image();
        tempImage.onload = () => {
            img.src = src;
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.loadedClass);
            img.removeAttribute('data-lazy');
            img.removeAttribute('data-src');
        };
        
        tempImage.onerror = () => {
            img.classList.remove(this.options.loadingClass);
            console.error('Failed to load image:', src);
        };
        
        tempImage.src = src;
    }
    
    loadBackground(element) {
        const src = element.getAttribute('data-src');
        if (!src) return;
        
        element.classList.add(this.options.loadingClass);
        
        // Create a new image to preload
        const tempImage = new Image();
        tempImage.onload = () => {
            element.style.backgroundImage = `url(${src})`;
            element.classList.remove(this.options.loadingClass);
            element.classList.add(this.options.loadedClass);
            element.removeAttribute('data-lazy');
            element.removeAttribute('data-src');
        };
        
        tempImage.onerror = () => {
            element.classList.remove(this.options.loadingClass);
            console.error('Failed to load background image:', src);
        };
        
        tempImage.src = src;
    }
    
    loadComponent(element) {
        // For components that need to be loaded via AJAX
        const url = element.getAttribute('data-src');
        if (!url) return;
        
        element.classList.add(this.options.loadingClass);
        
        fetch(url)
            .then(response => response.text())
            .then(html => {
                element.innerHTML = html;
                element.classList.remove(this.options.loadingClass);
                element.classList.add(this.options.loadedClass);
                element.removeAttribute('data-lazy');
                element.removeAttribute('data-src');
            })
            .catch(error => {
                element.classList.remove(this.options.loadingClass);
                console.error('Failed to load component:', error);
            });
    }
    
    loadAllItems() {
        this.items.forEach(item => this.loadItem(item));
    }
}

/**
 * Progress Tracker for Downloads
 */
class ProgressTracker {
    constructor(options = {}) {
        this.options = {
            updateInterval: 500, // ms
            ...options
        };
        
        this.activeDownloads = new Map();
        this.callbacks = new Map();
    }
    
    startDownload(id, options = {}) {
        const downloadInfo = {
            id,
            startTime: Date.now(),
            progress: 0,
            status: 'downloading',
            ...options
        };
        
        this.activeDownloads.set(id, downloadInfo);
        this.notifyListeners(id, downloadInfo);
        return id;
    }
    
    updateProgress(id, progress, additionalInfo = {}) {
        if (!this.activeDownloads.has(id)) return false;
        
        const downloadInfo = this.activeDownloads.get(id);
        downloadInfo.progress = Math.min(Math.max(0, progress), 100);
        Object.assign(downloadInfo, additionalInfo);
        
        this.notifyListeners(id, downloadInfo);
        return true;
    }
    
    completeDownload(id, status = 'completed', additionalInfo = {}) {
        if (!this.activeDownloads.has(id)) return false;
        
        const downloadInfo = this.activeDownloads.get(id);
        downloadInfo.progress = 100;
        downloadInfo.status = status;
        downloadInfo.endTime = Date.now();
        Object.assign(downloadInfo, additionalInfo);
        
        this.notifyListeners(id, downloadInfo);
        
        // Remove after a delay to allow UI to show completion
        setTimeout(() => {
            this.activeDownloads.delete(id);
        }, 3000);
        
        return true;
    }
    
    failDownload(id, error = 'Failed to download', additionalInfo = {}) {
        if (!this.activeDownloads.has(id)) return false;
        
        const downloadInfo = this.activeDownloads.get(id);
        downloadInfo.status = 'failed';
        downloadInfo.error = error;
        downloadInfo.endTime = Date.now();
        Object.assign(downloadInfo, additionalInfo);
        
        this.notifyListeners(id, downloadInfo);
        
        // Remove after a delay to allow UI to show error
        setTimeout(() => {
            this.activeDownloads.delete(id);
        }, 5000);
        
        return true;
    }
    
    onProgressUpdate(id, callback) {
        if (!this.callbacks.has(id)) {
            this.callbacks.set(id, []);
        }
        
        this.callbacks.get(id).push(callback);
        
        // If download already exists, notify immediately
        if (this.activeDownloads.has(id)) {
            callback(this.activeDownloads.get(id));
        }
        
        // Return a function to remove the listener
        return () => {
            const callbacks = this.callbacks.get(id);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        };
    }
    
    notifyListeners(id, downloadInfo) {
        if (this.callbacks.has(id)) {
            this.callbacks.get(id).forEach(callback => callback(downloadInfo));
        }
    }
    
    getDownloadInfo(id) {
        return this.activeDownloads.get(id) || null;
    }
    
    getAllDownloads() {
        return Array.from(this.activeDownloads.values());
    }
}

/**
 * Animation Controller
 */
class AnimationController {
    constructor() {
        this.animationQueue = [];
        this.isProcessing = false;
    }
    
    animate(element, animationName, options = {}) {
        const config = {
            duration: 300,
            delay: 0,
            easing: 'ease',
            fill: 'forwards',
            onStart: null,
            onComplete: null,
            ...options
        };
        
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }
            
            const animation = element.animate(
                this.getKeyframes(animationName),
                {
                    duration: config.duration,
                    delay: config.delay,
                    easing: config.easing,
                    fill: config.fill
                }
            );
            
            if (config.onStart) config.onStart(element);
            
            animation.onfinish = () => {
                if (config.onComplete) config.onComplete(element);
                resolve(element);
            };
        });
    }
    
    getKeyframes(animationName) {
        const keyframes = {
            fadeIn: [
                { opacity: 0 },
                { opacity: 1 }
            ],
            fadeOut: [
                { opacity: 1 },
                { opacity: 0 }
            ],
            slideUp: [
                { opacity: 0, transform: 'translateY(20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            slideDown: [
                { opacity: 0, transform: 'translateY(-20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            slideInLeft: [
                { opacity: 0, transform: 'translateX(-20px)' },
                { opacity: 1, transform: 'translateX(0)' }
            ],
            slideInRight: [
                { opacity: 0, transform: 'translateX(20px)' },
                { opacity: 1, transform: 'translateX(0)' }
            ],
            scale: [
                { transform: 'scale(0.8)' },
                { transform: 'scale(1.05)' },
                { transform: 'scale(1)' }
            ],
            pulse: [
                { transform: 'scale(1)' },
                { transform: 'scale(1.05)' },
                { transform: 'scale(1)' }
            ],
            shake: [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ]
        };
        
        return keyframes[animationName] || keyframes.fadeIn;
    }
    
    // Queue animations to run in sequence
    queue(element, animationName, options = {}) {
        return new Promise((resolve) => {
            this.animationQueue.push({
                element,
                animationName,
                options,
                resolve
            });
            
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }
    
    async processQueue() {
        if (this.animationQueue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        const { element, animationName, options, resolve } = this.animationQueue.shift();
        
        await this.animate(element, animationName, options);
        resolve(element);
        
        this.processQueue();
    }
    
    // Animate multiple elements with staggered timing
    stagger(elements, animationName, options = {}) {
        const staggerDelay = options.staggerDelay || 50;
        const promises = [];
        
        elements.forEach((element, index) => {
            const elementOptions = {
                ...options,
                delay: (options.delay || 0) + (index * staggerDelay)
            };
            
            promises.push(this.animate(element, animationName, elementOptions));
        });
        
        return Promise.all(promises);
    }
}

/**
 * UI Enhancer - Main class for UI enhancements
 */
class UIEnhancer {
    constructor() {
        this.initialized = false;
        this.features = {
            lazyLoading: true,
            animations: true,
            progressTracking: true,
            rippleEffects: true,
            skeletonLoading: true
        };
    }
    
    init(options = {}) {
        if (this.initialized) return;
        
        // Merge options
        this.features = { ...this.features, ...options };
        
        // Initialize core components
        this._initCore();
        
        // Initialize optional features
        if (this.features.lazyLoading) this._initLazyLoading();
        if (this.features.animations) this._initAnimations();
        if (this.features.rippleEffects) this._initRippleEffects();
        if (this.features.skeletonLoading) this._initSkeletonLoading();
        
        this.initialized = true;
        console.log('UI Enhancements initialized');
    }
    
    _initCore() {
        // Initialize progress tracker
        window.progressTracker = new ProgressTracker();
        
        // Initialize animation controller
        window.animationController = new AnimationController();
    }
    
    _initLazyLoading() {
        // Initialize lazy loading
        window.lazyLoader = new LazyLoader();
    }
    
    _initAnimations() {
        // Apply staggered animations to cards
        const cards = document.querySelectorAll('.plugin-card, .server-card, .mod-card');
        if (cards.length) {
            window.animationController.stagger(
                Array.from(cards),
                'slideUp',
                { duration: 500, staggerDelay: 50 }
            );
        }
        
        // Apply fade-in animations to sections
        document.querySelectorAll('.page-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.classList.add('fade-in-up');
            section.style.animationDelay = `${index * 100}ms`;
            setTimeout(() => {
                section.style.opacity = '1';
            }, index * 100);
        });
        
        // Apply hover animations to buttons
        document.querySelectorAll('.btn').forEach(btn => {
            if (!btn.classList.contains('btn-animated')) {
                btn.classList.add('btn-animated');
            }
        });
    }
    
    _initRippleEffects() {
        // Add ripple effect to buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }
    
    _initSkeletonLoading() {
        // Find containers that need skeleton loading
        const skeletonContainers = document.querySelectorAll('[data-skeleton]');
        skeletonContainers.forEach(container => {
            const type = container.getAttribute('data-skeleton-type') || 'plugin';
            const count = parseInt(container.getAttribute('data-skeleton-count') || '3', 10);
            
            // Create skeleton elements
            for (let i = 0; i < count; i++) {
                const skeleton = document.createElement('div');
                skeleton.className = `skeleton-card skeleton-${type}`;
                skeleton.innerHTML = this._getSkeletonTemplate(type);
                container.appendChild(skeleton);
            }
        });
    }
    
    _getSkeletonTemplate(type) {
        switch (type) {
            case 'plugin':
                return `
                    <div class="skeleton-image skeleton-loading"></div>
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-meta skeleton-loading"></div>
                    <div class="skeleton-description skeleton-loading"></div>
                    <div class="skeleton-button skeleton-loading"></div>
                `;
            case 'server':
                return `
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-meta skeleton-loading"></div>
                    <div class="skeleton-button skeleton-loading"></div>
                `;
            default:
                return `
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-description skeleton-loading"></div>
                `;
        }
    }
}

/**
 * Helper function to create a progress bar
 * 
 * @param {string} containerId - ID of the container element
 * @param {number} progress - Initial progress (0-100)
 * @param {Object} options - Progress bar options
 * @returns {Object} Progress bar control object
 */
function createProgressBar(containerId, progress = 0, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    const config = {
        showLabel: true,
        animated: true,
        type: 'primary',
        height: '8px',
        ...options
    };
    
    // Create progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = `progress-container ${config.type ? 'progress-' + config.type : ''}`;
    progressContainer.style.height = config.height;
    
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = config.animated ? 'progress-bar-animated' : 'progress-indicator-bar';
    progressBar.style.width = `${progress}%`;
    
    // Create label if needed
    let label = null;
    if (config.showLabel) {
        label = document.createElement('div');
        label.className = 'progress-label';
        label.textContent = `${progress}%`;
        progressContainer.appendChild(label);
    }
    
    // Add to DOM
    progressContainer.appendChild(progressBar);
    container.appendChild(progressContainer);
    
    // Return control object
    return {
        update: (newProgress) => {
            const value = Math.min(Math.max(0, newProgress), 100);
            progressBar.style.width = `${value}%`;
            if (label) label.textContent = `${value}%`;
            return value;
        },
        setType: (type) => {
            progressContainer.className = `progress-container progress-${type}`;
        },
        remove: () => {
            container.removeChild(progressContainer);
        }
    };
}

/**
 * Helper function to update a progress bar
 * 
 * @param {string} containerId - ID of the container element
 * @param {number} progress - Progress value (0-100)
 * @param {string} type - Progress bar type (primary, success, warning, danger)
 */
function updateProgressBar(containerId, progress, type = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const progressBar = container.querySelector('.progress-bar-animated, .progress-indicator-bar');
    if (!progressBar) return;
    
    // Update progress
    progressBar.style.width = `${Math.min(Math.max(0, progress), 100)}%`;
    
    // Update label if exists
    const label = container.querySelector('.progress-label');
    if (label) {
        label.textContent = `${Math.round(progress)}%`;
    }
    
    // Update type if provided
    if (type) {
        const progressContainer = container.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.className = `progress-container progress-${type}`;
        }
    }
}

/**
 * Helper function to create skeleton loading cards
 * 
 * @param {string} containerId - ID of the container element
 * @param {number} count - Number of skeleton cards to create
 * @param {string} type - Type of skeleton card (plugin, server, etc.)
 */
function createSkeletonCards(containerId, count = 3, type = 'plugin') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create skeleton cards
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = `skeleton-card skeleton-${type}`;
        
        // Add skeleton elements based on type
        switch (type) {
            case 'plugin':
                card.innerHTML = `
                    <div class="skeleton-image skeleton-loading"></div>
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-meta skeleton-loading"></div>
                    <div class="skeleton-description skeleton-loading"></div>
                    <div class="skeleton-button skeleton-loading"></div>
                `;
                break;
            case 'server':
                card.innerHTML = `
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-meta skeleton-loading"></div>
                    <div class="skeleton-button skeleton-loading"></div>
                `;
                break;
            default:
                card.innerHTML = `
                    <div class="skeleton-title skeleton-loading"></div>
                    <div class="skeleton-description skeleton-loading"></div>
                `;
        }
        
        container.appendChild(card);
    }
}

/**
 * Helper function to make AJAX requests with progress tracking
 * 
 * @param {Object} options - Request options
 * @param {string} options.url - Request URL
 * @param {string} options.method - HTTP method
 * @param {Object} options.data - Request data
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {XMLHttpRequest} The XMLHttpRequest object
 */
function ajaxWithProgress(options) {
    const xhr = new XMLHttpRequest();
    
    xhr.open(options.method || 'GET', options.url);
    
    if (options.headers) {
        Object.keys(options.headers).forEach(key => {
            xhr.setRequestHeader(key, options.headers[key]);
        });
    }
    
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            if (options.onSuccess) {
                let response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    response = xhr.responseText;
                }
                options.onSuccess(response, xhr);
            }
        } else {
            if (options.onError) {
                options.onError(xhr);
            }
        }
    };
    
    xhr.onerror = function() {
        if (options.onError) {
            options.onError(xhr);
        }
    };
    
    if (options.onProgress) {
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                options.onProgress(percentComplete, e);
            }
        };
    }
    
    xhr.send(options.data);
    
    return xhr;
}

// Initialize global instances only if they don't already exist
if (!window.toastManager) {
    window.toastManager = new ToastManager();
}

if (!window.confirmationManager) {
    window.confirmationManager = new ConfirmationManager();
}

if (!window.uiEnhancer) {
    window.uiEnhancer = new UIEnhancer();
}

// Initialize UI enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if not already initialized
    if (window.uiEnhancer && !window.uiEnhancer.initialized) {
        window.uiEnhancer.init();
    }
    
    // Apply initial animations
    document.querySelectorAll('.animated-card').forEach(function(el) {
        setTimeout(function() {
            el.style.opacity = '1';
        }, parseInt(el.style.animationDelay || '0'));
    });
});