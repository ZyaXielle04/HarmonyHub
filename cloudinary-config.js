// Cloudinary configuration - replace with your actual cloud name
window.cloudinaryConfig = {
    cloudName: 'dwp3zume8',
    uploadPreset: 'user-uploads',
    sources: ['local', 'url', 'camera'],
    multiple: false,
    clientAllowedFormats: ['image', 'video', 'pdf', 'doc', 'docx', 'ppt', 'pptx'],
    maxFileSize: 100000000
};