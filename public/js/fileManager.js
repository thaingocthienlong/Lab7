document.addEventListener('DOMContentLoaded', function() {
    // File upload handling
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('customFile');
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.progress');
    const uploadButton = document.querySelector('#upload-form button[type="button"]');
    
    if (uploadForm) {
      uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) {
          alert('Please select a file to upload');
          return;
        }
        
        // File size validation (20MB max)
        if (file.size > 20 * 1024 * 1024) {
          alert('File size exceeds 20MB limit');
          return;
        }
        
        // File type validation
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (['exe', 'msi', 'sh'].includes(fileExt)) {
          alert('Executable files are not allowed');
          return;
        }
        
        // Show progress bar and disable button
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        uploadButton.disabled = true;
        
        // Create FormData object
        const formData = new FormData();
        formData.append('file', file);
        formData.append('currentPath', document.querySelector('input[name="currentPath"]').value);
        
        // Create and configure XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);
        
        // Handle response
        xhr.onload = function() {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                // Reload the page to show the new file
                window.location.reload();
              } else {
                alert(response.message || 'Upload failed');
                progressContainer.style.display = 'none';
                uploadButton.disabled = false;
              }
            } catch (e) {
              alert('Error processing response');
              progressContainer.style.display = 'none';
              uploadButton.disabled = false;
            }
          } else {
            alert('Upload failed');
            progressContainer.style.display = 'none';
            uploadButton.disabled = false;
          }
        };
        
        // Handle errors
        xhr.onerror = function() {
          alert('Upload failed due to network error');
          progressContainer.style.display = 'none';
          uploadButton.disabled = false;
        };
        
        // Track upload progress
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentComplete + '%';
          }
        };
        
        // Send the form data
        xhr.send(formData);
      });
    }
    
    // File search handling
    const searchInput = document.getElementById('search-input');
    const fileTable = document.querySelector('table tbody');
    const originalContent = fileTable ? fileTable.innerHTML : '';
    
    if (searchInput && fileTable) {
      let debounceTimer;
      
      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        
        const query = this.value.trim();
        if (query === '') {
          // Reset to original content if search is cleared
          fileTable.innerHTML = originalContent;
          return;
        }
        
        // Debounce the search to avoid too many requests
        debounceTimer = setTimeout(function() {
          const currentPath = document.querySelector('input[name="currentPath"]').value;
          
          // Make AJAX request for search
          fetch(`/search?query=${encodeURIComponent(query)}&currentPath=${encodeURIComponent(currentPath)}`)
            .then(response => response.json())
            .then(data => {
              if (data.files && Array.isArray(data.files)) {
                // Clear the table
                fileTable.innerHTML = '';
                
                // Add search results to the table
                data.files.forEach(file => {
                  const row = document.createElement('tr');
                  
                  // File/folder name with icon
                  const nameCell = document.createElement('td');
                  const icon = document.createElement('i');
                  icon.className = file.isDirectory ? 'fa fa-folder' : getIconClass(file.name);
                  
                  const link = document.createElement('a');
                  link.href = file.isDirectory ? `/folder/${file.path}` : `#`;
                  link.textContent = file.name;
                  if (!file.isDirectory) {
                    link.setAttribute('data-path', file.path);
                    link.className = 'file-link';
                  }
                  
                  nameCell.appendChild(icon);
                  nameCell.appendChild(document.createTextNode(' '));
                  nameCell.appendChild(link);
                  
                  // Type
                  const typeCell = document.createElement('td');
                  typeCell.textContent = file.type;
                  
                  // Size
                  const sizeCell = document.createElement('td');
                  sizeCell.textContent = file.isDirectory ? '-' : formatFileSize(file.size);
                  
                  // Last modified
                  const dateCell = document.createElement('td');
                  dateCell.textContent = formatDate(new Date(file.lastModified));
                  
                  // Actions
                  const actionsCell = document.createElement('td');
                  
                  // Download
                  const downloadSpan = document.createElement('span');
                  const downloadIcon = document.createElement('i');
                  downloadIcon.className = 'fa fa-download action';
                  downloadIcon.setAttribute('data-path', file.path);
                  downloadIcon.setAttribute('data-type', file.isDirectory ? 'folder' : 'file');
                  downloadSpan.appendChild(downloadIcon);
                  
                  // Edit/Rename
                  const editSpan = document.createElement('span');
                  const editIcon = document.createElement('i');
                  editIcon.className = 'fa fa-edit action';
                  editIcon.setAttribute('data-path', file.path);
                  editIcon.setAttribute('data-name', file.name);
                  editSpan.appendChild(editIcon);
                  
                  // Delete
                  const deleteSpan = document.createElement('span');
                  const deleteIcon = document.createElement('i');
                  deleteIcon.className = 'fa fa-trash action';
                  deleteIcon.setAttribute('data-path', file.path);
                  deleteIcon.setAttribute('data-name', file.name);
                  deleteSpan.appendChild(deleteIcon);
                  
                  actionsCell.appendChild(downloadSpan);
                  actionsCell.appendChild(editSpan);
                  actionsCell.appendChild(deleteSpan);
                  
                  // Add cells to row
                  row.appendChild(nameCell);
                  row.appendChild(typeCell);
                  row.appendChild(sizeCell);
                  row.appendChild(dateCell);
                  row.appendChild(actionsCell);
                  
                  // Add row to table
                  fileTable.appendChild(row);
                });
                
                // If no results found
                if (data.files.length === 0) {
                  const row = document.createElement('tr');
                  const cell = document.createElement('td');
                  cell.colSpan = 5;
                  cell.textContent = 'No matching files or folders found';
                  cell.style.textAlign = 'center';
                  row.appendChild(cell);
                  fileTable.appendChild(row);
                }
                
                // Re-attach event listeners for the new elements
                attachEventListeners();
              }
            })
            .catch(error => {
              console.error('Search error:', error);
            });
        }, 300); // 300ms debounce
      });
    }
    
    // Helper functions
    function getIconClass(fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      
      const iconMap = {
        'txt': 'fas fa-file-alt',
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive',
        'mp3': 'fas fa-file-audio',
        'mp4': 'fas fa-file-video',
        'avi': 'fas fa-file-video',
        'mov': 'fas fa-file-video'
      };
      
      return iconMap[ext] || 'fas fa-file';
    }
    
    function formatFileSize(size) {
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
      if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
      return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    
    function formatDate(date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    function attachEventListeners() {
      // Attach event listeners for file actions (download, rename, delete)
      // This would be implemented to handle the dynamically added elements
    }
    
    // Initial attachment of event listeners
    attachEventListeners();
  });