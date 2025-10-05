// Firebase initialization and authentication check
document.addEventListener('DOMContentLoaded', function() {
    // Check if Cloudinary configuration is available
    if (typeof cloudinaryConfig === 'undefined') {
        console.error('Cloudinary configuration not found. Make sure cloudinary-config.js is loaded before resources.js');
        // Provide a minimal fallback configuration
        const cloudinaryConfig = {
            cloudName: 'dwp3zume8',
            uploadPreset: 'user-uploads',
            sources: ['local', 'url'],
            multiple: false,
            clientAllowedFormats: ['image', 'video', 'pdf'],
            maxFileSize: 100000000
        };
    }

    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = '../index.html';
        } else {
            // Check if user is admin
            const db = firebase.database();
            db.ref('users/' + user.uid).once('value').then((snapshot) => {
                const userData = snapshot.val();
                if (!userData || userData.role !== 'admin') {
                    Swal.fire('Access Denied', 'You do not have permission to access this page.', 'error');
                    setTimeout(() => {
                    window.location.href = '../index.html';
                    }, 2000);
                } else {
                    // User is authenticated and is admin, load resources
                    loadResources();
                    setupEventListeners();
                    initializeCloudinaryWidget();
                }
            });
        }
    });
});

// Global variables
let resources = [];
let currentEditId = null;
let currentDeleteId = null;
let cloudinaryWidget = null;
let uploadedFileData = null;

// Initialize Cloudinary upload widget
function initializeCloudinaryWidget() {
    // Check if Cloudinary SDK is available
    if (typeof cloudinary === 'undefined') {
        console.error('Cloudinary SDK not loaded');
        // Hide upload button or show error message
        document.getElementById('cloudinary-upload-btn').style.display = 'none';
        document.getElementById('file-upload-group').innerHTML = '<p class="error-message">File upload functionality is currently unavailable.</p>';
        return;
    }
    
    // Check if configuration is available
    if (typeof cloudinaryConfig === 'undefined') {
        console.error('Cloudinary config not loaded');
        document.getElementById('cloudinary-upload-btn').style.display = 'none';
        document.getElementById('file-upload-group').innerHTML = '<p class="error-message">File upload configuration error.</p>';
        return;
    }
    
    try {
        cloudinaryWidget = cloudinary.createUploadWidget(
            cloudinaryConfig,
            (error, result) => {
                if (!error && result && result.event === 'success') {
                    handleCloudinaryUpload(result.info);
                } else if (error) {
                    console.error('Cloudinary upload error:', error);
                    Swal.fire('Error', 'File upload failed. Please try again.', 'error');
                }
            }
        );
        
        document.getElementById('cloudinary-upload-btn').addEventListener('click', () => {
            cloudinaryWidget.open();
        });
    } catch (error) {
        console.error('Error initializing Cloudinary widget:', error);
        document.getElementById('cloudinary-upload-btn').style.display = 'none';
        document.getElementById('file-upload-group').innerHTML = '<p class="error-message">Failed to initialize file upload.</p>';
    }
}

// Handle Cloudinary upload result
function handleCloudinaryUpload(fileInfo) {
    uploadedFileData = fileInfo;
    
    // Show file info
    const fileInfoDiv = document.getElementById('uploaded-file-info');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    
    fileInfoDiv.style.display = 'block';
    
    // Extract file extension correctly - FIXED HERE
    let fileExtension = fileInfo.format;
    if (!fileExtension) {
        // If format is not provided, try to extract from resource_type or original_filename
        if (fileInfo.resource_type === 'raw' && fileInfo.original_filename) {
            const parts = fileInfo.original_filename.split('.');
            if (parts.length > 1) {
                fileExtension = parts.pop();
            }
        }
    }
    
    // Display file name with extension
    fileName.textContent = fileInfo.original_filename + (fileExtension ? '.' + fileExtension : '');
    
    // Create appropriate preview based on file type
    if (fileInfo.resource_type === 'image') {
        filePreview.innerHTML = `<img src="${fileInfo.secure_url}" alt="${fileInfo.original_filename}">`;
    } else if (fileInfo.resource_type === 'video') {
        filePreview.innerHTML = `<video controls><source src="${fileInfo.secure_url}" type="video/${fileInfo.format}"></video>`;
    } else {
        // For documents, show an icon - FIXED HERE
        const iconClass = getFileIconClass(fileExtension || fileInfo.resource_type);
        filePreview.innerHTML = `<div class="file-preview-icon"><i class="fas ${iconClass}"></i></div>`;
    }
    
    // Hide progress indicator (Cloudinary handles this internally)
    document.getElementById('file-upload-progress').style.display = 'none';
}

// Helper function to determine icon class based on file extension
function getFileIconClass(extension) {
    extension = (extension || '').toLowerCase();
    
    switch(extension) {
        case 'doc':
        case 'docx':
            return 'fa-file-word';
        case 'pdf':
            return 'fa-file-pdf';
        case 'xls':
        case 'xlsx':
            return 'fa-file-excel';
        case 'ppt':
        case 'pptx':
            return 'fa-file-powerpoint';
        case 'zip':
        case 'rar':
        case '7z':
            return 'fa-file-archive';
        case 'txt':
            return 'fa-file-alt';
        case 'mp3':
        case 'wav':
        case 'ogg':
            return 'fa-file-audio';
        default:
            return 'fa-file';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Helper to safely add event listeners
    function addListenerSafe(selectorOrId, event, handler, useQuerySelector = false) {
        if (useQuerySelector) {
            const elements = document.querySelectorAll(selectorOrId);
            elements.forEach(el => {
                if (el) el.addEventListener(event, handler);
            });
        } else {
            const el = document.getElementById(selectorOrId);
            if (el) el.addEventListener(event, handler);
        }
    }

    // Search and filter controls
    addListenerSafe('resource-search', 'input', filterResources);
    addListenerSafe('category-filter', 'change', filterResources);
    addListenerSafe('access-filter', 'change', filterResources);

    // Add resource button
    addListenerSafe('add-resource-btn', 'click', openAddResourceModal);

    // Resource category toggle (file vs link)
    addListenerSafe('resource-category', 'change', toggleResourceInput);

    // Resource form submission
    addListenerSafe('resource-form', 'submit', handleResourceSubmit);

    // Modal close buttons
    addListenerSafe('.close-modal', 'click', closeModals, true);

    // Cancel buttons
    addListenerSafe('cancel-resource-btn', 'click', closeModals);
    addListenerSafe('cancel-delete-btn', 'click', closeModals);

    // Confirm delete button
    addListenerSafe('confirm-delete-btn', 'click', confirmDeleteResource);

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Dynamic resource action buttons (preview, edit, delete, view links)
    function attachResourceActionButtons() {
        addListenerSafe('.view-btn', 'click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) viewResource(id);
        }, true);

        addListenerSafe('.preview-btn', 'click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) previewResource(id);
        }, true);

        addListenerSafe('.edit-btn', 'click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) editResource(id);
        }, true);

        addListenerSafe('.delete-btn', 'click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) showDeleteConfirmation(id);
        }, true);
    }

    // Call it once now; also call it after resources are loaded
    attachResourceActionButtons();

    // Override displayResources to attach buttons after each render
    const originalDisplayResources = displayResources;
    displayResources = function(resourcesToDisplay) {
        originalDisplayResources(resourcesToDisplay);
        attachResourceActionButtons();
    };
}


// Load resources from Firebase
function loadResources() {
    showLoading(true);
    
    const db = firebase.database();
    db.ref('resources').once('value').then((snapshot) => {
        resources = [];
        snapshot.forEach((childSnapshot) => {
            const resource = childSnapshot.val();
            resource.id = childSnapshot.key;
            resources.push(resource);
        });
        
        updateResourceStats();
        displayResources(resources);
        showLoading(false);
    }).catch((error) => {
        console.error('Error loading resources:', error);
        showLoading(false);
        showNoResourcesMessage(true);
        Swal.fire('Error', 'Failed to load resources. Please try again.', 'error');
    });
}

// Update resource statistics
function updateResourceStats() {
    const totalResources = resources.length;
    const documentResources = resources.filter(r => r.category === 'documents').length;
    const videoResources = resources.filter(r => r.category === 'videos').length;
    const linkResources = resources.filter(r => r.category === 'links').length;
    
    document.getElementById('total-resources').textContent = totalResources;
    document.getElementById('document-resources').textContent = documentResources;
    document.getElementById('video-resources').textContent = videoResources;
    document.getElementById('link-resources').textContent = linkResources;
}

// Display resources in cards
function displayResources(resourcesToDisplay) {
    const resourcesGrid = document.getElementById('resources-grid');
    resourcesGrid.innerHTML = '';
    
    if (resourcesToDisplay.length === 0) {
        showNoResourcesMessage(true);
        return;
    }
    
    showNoResourcesMessage(false);
    
    resourcesToDisplay.forEach(resource => {
        // Format date
        const uploadDate = new Date(resource.uploadDate);
        const formattedDate = uploadDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Determine type class and icon
        let typeClass = '';
        let typeIcon = '';
        switch(resource.category) {
            case 'documents':
                typeClass = 'type-document';
                typeIcon = '📄';
                break;
            case 'videos':
                typeClass = 'type-video';
                typeIcon = '🎬';
                break;
            case 'images':
                typeClass = 'type-image';
                typeIcon = '🖼️';
                break;
            case 'links':
                typeClass = 'type-link';
                typeIcon = '🔗';
                break;
        }
        
        // Determine access class and text
        let accessClass = '';
        let accessText = '';
        switch(resource.accessLevel) {
            case 'public':
                accessClass = 'access-public';
                accessText = 'Public';
                break;
            case 'members':
                accessClass = 'access-members';
                accessText = 'Members Only';
                break;
            case 'staff':
                accessClass = 'access-staff';
                accessText = 'Staff Only';
                break;
        }
        
        // Create resource card
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
            <div class="resource-card-header">
                <div class="resource-type ${typeClass}">${typeIcon} ${resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}</div>
                <div class="resource-access ${accessClass}">${accessText}</div>
            </div>
            <div class="resource-card-body">
                <h3 class="resource-name">${resource.name}</h3>
                <p class="resource-description">${resource.description || 'No description provided'}</p>
                <div class="resource-meta">
                    <span class="resource-date">${formattedDate}</span>
                </div>
            </div>
            <div class="resource-card-actions">
                ${resource.category === 'links' ? 
                    `<button class="action-btn view-btn" data-id="${resource.id}" title="Open Link">
                        <i class="fas fa-external-link-alt"></i>
                    </button>` : 
                    `<button class="action-btn preview-btn" data-id="${resource.id}" title="Preview">
                        <i class="fas fa-eye"> </i>
                    </button>`
                }
                <button class="action-btn edit-btn" data-id="${resource.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${resource.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        resourcesGrid.appendChild(card);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const resourceId = e.currentTarget.getAttribute('data-id');
            viewResource(resourceId);
        });
    });
    
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const resourceId = e.currentTarget.getAttribute('data-id');
            previewResource(resourceId);
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const resourceId = e.currentTarget.getAttribute('data-id');
            editResource(resourceId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const resourceId = e.currentTarget.getAttribute('data-id');
            showDeleteConfirmation(resourceId);
        });
    });
}

// Filter resources based on search and filters
function filterResources() {
    const searchTerm = document.getElementById('resource-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const accessFilter = document.getElementById('access-filter').value;
    
    let filteredResources = resources;
    
    // Apply search filter
    if (searchTerm) {
        filteredResources = filteredResources.filter(resource => 
            resource.name.toLowerCase().includes(searchTerm) || 
            (resource.description && resource.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
        filteredResources = filteredResources.filter(resource => resource.category === categoryFilter);
    }
    
    // Apply access filter
    if (accessFilter !== 'all') {
        filteredResources = filteredResources.filter(resource => resource.accessLevel === accessFilter);
    }
    
    displayResources(filteredResources);
}

// Open add resource modal
function openAddResourceModal() {
    currentEditId = null;
    uploadedFileData = null;
    document.getElementById('resource-modal-title').textContent = 'Add New Resource';
    document.getElementById('resource-form').reset();
    document.getElementById('uploaded-file-info').style.display = 'none';
    document.getElementById('file-upload-group').style.display = 'block';
    document.getElementById('external-link-group').style.display = 'none';
    document.getElementById('resource-modal').style.display = 'flex';
}

// Toggle between file upload and external link input
function toggleResourceInput() {
    const category = document.getElementById('resource-category').value;
    
    if (category === 'links') {
        document.getElementById('file-upload-group').style.display = 'none';
        document.getElementById('external-link-group').style.display = 'block';
    } else {
        document.getElementById('file-upload-group').style.display = 'block';
        document.getElementById('external-link-group').style.display = 'none';
    }
}

// Handle resource form submission
function handleResourceSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('resource-name').value;
    const description = document.getElementById('resource-description').value;
    const category = document.getElementById('resource-category').value;
    const accessLevel = document.getElementById('resource-access').value;
    const externalLink = document.getElementById('resource-link').value;
    
    // Validate form
    if (category !== 'links' && !uploadedFileData && !currentEditId) {
        Swal.fire('Error', 'Please upload a file.', 'error');
        return;
    }
    
    if (category === 'links' && !externalLink) {
        Swal.fire('Error', 'Please enter a valid URL.', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-resource-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    if (currentEditId) {
        updateResource(currentEditId, name, description, category, accessLevel, externalLink);
    } else {
        if (category === 'links') {
            saveResourceToDatabase(name, description, category, accessLevel, externalLink);
        } else {
            // Use the Cloudinary uploaded file data
            saveResourceToDatabase(name, description, category, accessLevel, uploadedFileData.secure_url, uploadedFileData);
        }
    }
}

// Save resource to Firebase Database
function saveResourceToDatabase(name, description, category, accessLevel, fileUrl, cloudinaryData = null) {
    const db = firebase.database();
    const currentUser = firebase.auth().currentUser;

    const resourceData = {
        name: name,
        description: description,
        category: category,
        accessLevel: accessLevel,
        fileUrl: fileUrl,
        uploadDate: Date.now(),
        uploadedBy: currentUser.uid
    };

    // Add Cloudinary data if available
    if (cloudinaryData) {
        resourceData.cloudinaryData = cloudinaryData;
    }

    const ref = currentEditId ? db.ref('resources/' + currentEditId) : db.ref('resources').push();

    ref.set(resourceData).then(() => {
        Swal.fire('Success', `Resource ${currentEditId ? 'updated' : 'added'} successfully!`, 'success');
        closeModals();
        loadResources();

        const submitBtn = document.getElementById('submit-resource-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Resource';

        // ✅ Log activity if new resource is added
        if (!currentEditId) {
            logResourceActivity(resourceData, ref.key, currentUser.uid);
        }
    }).catch((error) => {
        console.error('Error saving resource:', error);
        Swal.fire('Error', 'Failed to save resource. Please try again.', 'error');

        const submitBtn = document.getElementById('submit-resource-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Resource';
    });
}

// 🔔 Function to log resource upload to activity_table
function logResourceActivity(resourceData, resourceId, userId) {
    const db = firebase.database();

    const activity = {
        type: "resource_upload",
        resourceId: resourceId,
        resourceName: resourceData.name,
        category: resourceData.category,
        accessLevel: resourceData.accessLevel,
        uploadedBy: userId,
        timestamp: Date.now(),
        readBy: {} // start with empty read receipts
    };

    db.ref("activity_table").push(activity);
}

// Edit existing resource
function editResource(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    currentEditId = resourceId;
    document.getElementById('resource-modal-title').textContent = 'Edit Resource';
    document.getElementById('resource-name').value = resource.name;
    document.getElementById('resource-description').value = resource.description || '';
    document.getElementById('resource-category').value = resource.category;
    document.getElementById('resource-access').value = resource.accessLevel;
    
    if (resource.category === 'links') {
        document.getElementById('resource-link').value = resource.fileUrl;
        document.getElementById('file-upload-group').style.display = 'none';
        document.getElementById('external-link-group').style.display = 'block';
    } else {
        document.getElementById('file-upload-group').style.display = 'block';
        document.getElementById('external-link-group').style.display = 'none';
        
        // If we have Cloudinary data, show the file info
        if (resource.cloudinaryData) {
            uploadedFileData = resource.cloudinaryData;
            const fileInfoDiv = document.getElementById('uploaded-file-info');
            const filePreview = document.getElementById('file-preview');
            const fileName = document.getElementById('file-name');
            
            fileInfoDiv.style.display = 'block';
            
            // Extract file extension correctly - FIXED HERE
            let fileExtension = uploadedFileData.format;
            if (!fileExtension && uploadedFileData.original_filename) {
                const parts = uploadedFileData.original_filename.split('.');
                if (parts.length > 1) {
                    fileExtension = parts.pop();
                }
            }
            
            fileName.textContent = uploadedFileData.original_filename + (fileExtension ? '.' + fileExtension : '');
            
            if (uploadedFileData.resource_type === 'image') {
                filePreview.innerHTML = `<img src="${uploadedFileData.secure_url}" alt="${uploadedFileData.original_filename}">`;
            } else if (uploadedFileData.resource_type === 'video') {
                filePreview.innerHTML = `<video controls><source src="${uploadedFileData.secure_url}" type="video/${uploadedFileData.format}"></video>`;
            } else {
                const iconClass = getFileIconClass(fileExtension || uploadedFileData.resource_type);
                filePreview.innerHTML = `<div class="file-preview-icon"><i class="fas ${iconClass}"></i></div>`;
            }
        }
    }
    
    document.getElementById('resource-modal').style.display = 'flex';
}

// Update existing resource
function updateResource(resourceId, name, description, category, accessLevel, externalLink) {
    const db = firebase.database();
    const resourceRef = db.ref('resources/' + resourceId);
    
    resourceRef.once('value').then((snapshot) => {
        const resourceData = snapshot.val();
        
        const updatedData = {
            name: name,
            description: description,
            category: category,
            accessLevel: accessLevel,
            fileUrl: category === 'links' ? externalLink : resourceData.fileUrl,
            uploadDate: resourceData.uploadDate,
            uploadedBy: resourceData.uploadedBy
        };
        
        // Preserve Cloudinary data if it exists
        if (resourceData.cloudinaryData) {
            updatedData.cloudinaryData = resourceData.cloudinaryData;
        }
        
        // If a new file was uploaded, update the file URL and Cloudinary data
        if (category !== 'links' && uploadedFileData) {
            updatedData.fileUrl = uploadedFileData.secure_url;
            updatedData.cloudinaryData = uploadedFileData;
        }
        
        // ✅ Update both resources and activity_table
        resourceRef.set(updatedData).then(() => {
            // Find activity entries with this resourceId
            db.ref("activity_table")
              .orderByChild("resourceId")
              .equalTo(resourceId)
              .once("value", (snapshot) => {
                  snapshot.forEach((child) => {
                      const activityKey = child.key;
                      const activityRef = db.ref("activity_table/" + activityKey);

                      activityRef.update({
                          resourceName: updatedData.name,
                          category: updatedData.category,
                          accessLevel: updatedData.accessLevel
                      });
                  });
              });

            Swal.fire('Success', 'Resource updated successfully!', 'success');
            closeModals();
            loadResources();
            
            const submitBtn = document.getElementById('submit-resource-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Resource';
        }).catch((error) => {
            console.error('Error updating resource:', error);
            Swal.fire('Error', 'Failed to update resource. Please try again.', 'error');
            
            const submitBtn = document.getElementById('submit-resource-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Resource';
        });
    });
}

// View resource (for external links)
function viewResource(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    window.open(resource.fileUrl, '_blank');
}

// Preview resource (for uploaded files)
function previewResource(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    const previewModal = document.getElementById('preview-modal');
    const previewContent = document.getElementById('preview-content');
    const previewTitle = document.getElementById('preview-modal-title');
    
    previewTitle.textContent = resource.name;
    
    if (resource.category === 'images') {
        previewContent.innerHTML = `
            <img src="${resource.fileUrl}" alt="${resource.name}">
            <div style="margin-top: 20px;">
                <a href="${resource.fileUrl}" download="${resource.name}" class="download-btn">
                    <i class="fas fa-download"></i> Download Image
                </a>
            </div>
        `;
    } else if (resource.category === 'videos') {
        previewContent.innerHTML = `
            <video controls style="max-width: 100%;">
                <source src="${resource.fileUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div style="margin-top: 20px;">
                <a href="${resource.fileUrl}" download="${resource.name}" class="download-btn">
                    <i class="fas fa-download"></i> Download Video
                </a>
            </div>
        `;
    } else if (resource.category === 'documents') {
        // For documents, show a download link
        let fileExtension = 'file';
        if (resource.cloudinaryData) {
            fileExtension = resource.cloudinaryData.format;
            if (!fileExtension && resource.cloudinaryData.original_filename) {
                const parts = resource.cloudinaryData.original_filename.split('.');
                if (parts.length > 1) {
                    fileExtension = parts.pop();
                }
            }
        }
        
        const iconClass = getFileIconClass(fileExtension);
        previewContent.innerHTML = `
            <div class="file-preview-icon">
                <i class="fas ${iconClass}" style="font-size: 64px;"></i>
            </div>
            <p>This document cannot be previewed in the browser.</p>
            <div style="margin-top: 20px;">
                <a href="${resource.fileUrl}" download="${resource.name}" class="download-btn">
                    <i class="fas fa-download"></i> Download Document
                </a>
            </div>
        `;
    }
    
    previewModal.style.display = 'flex';
}

// Show delete confirmation modal
function showDeleteConfirmation(resourceId) {
    currentDeleteId = resourceId;
    document.getElementById('delete-confirm-modal').style.display = 'flex';
}

// Confirm resource deletion
function confirmDeleteResource() {
    if (!currentDeleteId) return;
    
    const db = firebase.database();
    db.ref('resources/' + currentDeleteId).remove().then(() => {
        Swal.fire('Success', 'Resource deleted successfully!', 'success');
        closeModals();
        loadResources();
    }).catch((error) => {
        console.error('Error deleting resource:', error);
        Swal.fire('Error', 'Failed to delete resource. Please try again.', 'error');
    });
}

// Close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    currentEditId = null;
    currentDeleteId = null;
    uploadedFileData = null;
    
    const submitBtn = document.getElementById('submit-resource-btn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Resource';
}

// Show/hide loading indicator
function showLoading(show) {
    document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
}

// Show/hide no resources message
function showNoResourcesMessage(show) {
    document.getElementById('no-resources-message').style.display = show ? 'block' : 'none';
    document.getElementById('resources-grid').style.display = show ? 'none' : 'grid';
}