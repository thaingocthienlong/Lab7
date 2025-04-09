const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

// Helper function to get user's directory
function getUserDir(userId) {
  return path.join(process.env.USER_FILES_DIR, userId.toString());
}

// Helper function to get full path
function getFullPath(userId, relativePath = '') {
  return path.join(getUserDir(userId), relativePath);
}

// Helper function to get file information
async function getFileInfo(filePath, relativePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      name: path.basename(filePath),
      path: relativePath,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      lastModified: stats.mtime,
      type: stats.isDirectory() ? 'Folder' : getFileType(filePath)
    };
  } catch (error) {
    console.error(`Error getting file info for ${filePath}:`, error);
    return null;
  }
}

// Helper function to get file type
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.txt': 'Text Document',
    '.pdf': 'PDF Document',
    '.doc': 'Word Document',
    '.docx': 'Word Document',
    '.xls': 'Excel Spreadsheet',
    '.xlsx': 'Excel Spreadsheet',
    '.ppt': 'PowerPoint Presentation',
    '.pptx': 'PowerPoint Presentation',
    '.jpg': 'JPG Image',
    '.jpeg': 'JPG Image',
    '.png': 'PNG Image',
    '.gif': 'GIF Image',
    '.zip': 'Compressed file',
    '.rar': 'Compressed file',
    '.mp3': 'Audio file',
    '.mp4': 'Video file',
    '.avi': 'Video file',
    '.mov': 'Video file'
  };
  
  return typeMap[ext] || 'File';
}

// Helper function to format file size
function formatFileSize(size) {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Controller methods
exports.getIndex = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userDir = getUserDir(userId);
    
    // Ensure user directory exists
    await fs.ensureDir(userDir);
    
    // Read directory contents
    const items = await fs.readdir(userDir);
    
    // Get file information for each item
    const filesAndFolders = await Promise.all(
      items.map(async (item) => {
        const fullPath = path.join(userDir, item);
        return getFileInfo(fullPath, item);
      })
    );
    
    // Filter out null values (from errors) and sort (folders first, then files)
    const validItems = filesAndFolders.filter(item => item !== null);
    const sortedItems = validItems.sort((a, b) => {
      // Sort folders first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Render the index view
    res.render('index', {
      files: sortedItems,
      currentPath: '',
      breadcrumbs: [],
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    req.flash('error', 'Error reading directory');
    res.render('index', {
      files: [],
      currentPath: '',
      breadcrumbs: [],
      csrfToken: req.csrfToken()
    });
  }
};

exports.getFolder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const folderPath = req.params.path;
    const fullPath = getFullPath(userId, folderPath);
    
    // Check if path exists and is a directory
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      req.flash('error', 'Not a valid directory');
      return res.redirect('/');
    }
    
    // Read directory contents
    const items = await fs.readdir(fullPath);
    
    // Get file information for each item
    const filesAndFolders = await Promise.all(
      items.map(async (item) => {
        const itemFullPath = path.join(fullPath, item);
        const itemRelativePath = path.join(folderPath, item);
        return getFileInfo(itemFullPath, itemRelativePath);
      })
    );
    
    // Filter and sort items
    const validItems = filesAndFolders.filter(item => item !== null);
    const sortedItems = validItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Create breadcrumbs
    const breadcrumbs = [];
    if (folderPath) {
      // Add Home
      breadcrumbs.push({ name: 'Home', path: '' });
      
      // Add intermediate folders
      const parts = folderPath.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? path.join(currentPath, parts[i]) : parts[i];
        breadcrumbs.push({
          name: parts[i],
          path: currentPath
        });
      }
    }
    
    // Render the index view with folder contents
    res.render('index', {
      files: sortedItems,
      currentPath: folderPath,
      breadcrumbs,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error reading folder:', error);
    req.flash('error', 'Error reading folder');
    res.redirect('/');
  }
};

exports.createFolder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { folderName, currentPath } = req.body;
    
    // Validate folder name
    if (!folderName || folderName.includes('/') || folderName.includes('\\')) {
      req.flash('error', 'Invalid folder name');
      return res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

    }
    
    // Create the new folder
    const newFolderPath = currentPath 
      ? path.join(getUserDir(userId), currentPath, folderName)
      : path.join(getUserDir(userId), folderName);
    
    // Check if folder already exists
    if (await fs.pathExists(newFolderPath)) {
      req.flash('error', 'Folder already exists');
    } else {
      await fs.mkdir(newFolderPath);
      req.flash('success', 'Folder created successfully');
    }
    
    // Redirect back to current folder
    res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

  } catch (error) {
    console.error('Error creating folder:', error);
    req.flash('error', 'Error creating folder');
    res.redirect('/');
  }
};

exports.createFile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { fileName, fileContent, currentPath } = req.body;
    
    // Validate file name
    if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
      req.flash('error', 'Invalid file name');
      return res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

    }
    
    // Create the new file
    const newFilePath = currentPath 
      ? path.join(getUserDir(userId), currentPath, fileName)
      : path.join(getUserDir(userId), fileName);
    
    // Check if file already exists
    if (await fs.pathExists(newFilePath)) {
      req.flash('error', 'File already exists');
    } else {
      await fs.writeFile(newFilePath, fileContent || '');
      req.flash('success', 'File created successfully');
    }
    
    // Redirect back to current folder
    res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

  } catch (error) {
    console.error('Error creating file:', error);
    req.flash('error', 'Error creating file');
    res.redirect('/');
  }
};

exports.uploadFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.json({
        success: false,
        message: 'No file selected'
      });
    }
    
    const userId = req.session.userId;
    const currentPath = req.body.currentPath || '';
    const { path: tempPath, originalname } = req.file;
    
    // Create target path
    const targetPath = currentPath 
      ? path.join(getUserDir(userId), currentPath, originalname)
      : path.join(getUserDir(userId), originalname);
    
    // Check if file already exists
    if (await fs.pathExists(targetPath)) {
      await fs.unlink(tempPath); // Delete temp file
      return res.json({
        success: false,
        message: 'File already exists'
      });
    }
    
    // Move file from temp location to user directory
    await fs.move(tempPath, targetPath);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: originalname,
        path: path.join(currentPath, originalname)
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.json({
      success: false,
      message: error.message || 'Error uploading file'
    });
  }
};

exports.renameItem = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { itemPath, newName, currentPath } = req.body;
    
    // Validate new name
    if (!newName || newName.includes('/') || newName.includes('\\')) {
      req.flash('error', 'Invalid name');
      return res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

    }
    
    // Get current item path
    const oldPath = path.join(getUserDir(userId), itemPath);
    
    // Create new path (in same directory)
    const itemDir = path.dirname(itemPath);
    const newItemPath = path.join(itemDir, newName);
    const newPath = path.join(getUserDir(userId), newItemPath);
    
    // Check if target already exists
    if (await fs.pathExists(newPath)) {
      req.flash('error', 'An item with this name already exists');
    } else {
      await fs.rename(oldPath, newPath);
      req.flash('success', 'Item renamed successfully');
    }
    
    // Redirect back to current folder
    res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

  } catch (error) {
    console.error('Error renaming item:', error);
    req.flash('error', 'Error renaming item');
    res.redirect('/');
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { itemPath, currentPath } = req.body;
    
    // Get full path
    const fullPath = path.join(getUserDir(userId), itemPath);
    
    // Check if path exists
    if (!(await fs.pathExists(fullPath))) {
      req.flash('error', 'Item does not exist');
    } else {
      await fs.remove(fullPath);
      req.flash('success', 'Item deleted successfully');
    }
    
    // Redirect back to current folder
    res.redirect(currentPath ? `/files/folder/${currentPath}` : '/files');

  } catch (error) {
    console.error('Error deleting item:', error);
    req.flash('error', 'Error deleting item');
    res.redirect('/');
  }
};

exports.downloadItem = async (req, res) => {
  try {
    const userId = req.session.userId;
    const itemPath = req.params.path;
    const type = req.params.type; // 'file' or 'folder'
    
    // Get full path
    const fullPath = path.join(getUserDir(userId), itemPath);
    
    // Check if path exists
    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).send('Item not found');
    }
    
    const stats = await fs.stat(fullPath);
    
    if (type === 'file' && stats.isFile()) {
      // Set headers
      const fileName = path.basename(fullPath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
    } else if (type === 'folder' && stats.isDirectory()) {
      // Create a zip file of the folder
      const folderName = path.basename(fullPath);
      const zipFileName = `${folderName}.zip`;
      const zipFilePath = path.join('static/uploads', zipFileName);
      
      // Create write stream
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression level
      });
      
      // Listen for events
      output.on('close', function() {
        // Set headers
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.setHeader('Content-Type', 'application/zip');
        
        // Stream the zip file
        const zipStream = fs.createReadStream(zipFilePath);
        zipStream.on('end', () => {
          // Delete the zip file after download
          fs.unlink(zipFilePath).catch(err => {
            console.error('Error deleting zip file:', err);
          });
        });
        
        zipStream.pipe(res);
      });
      
      archive.on('error', function(err) {
        console.error('Error creating zip:', err);
        res.status(500).send('Error creating zip file');
      });
      
      // Pipe archive to the file
      archive.pipe(output);
      
      // Add the directory to the archive
      archive.directory(fullPath, folderName);
      
      // Finalize
      archive.finalize();
    } else {
      res.status(400).send('Invalid request');
    }
  } catch (error) {
    console.error('Error downloading item:', error);
    res.status(500).send('Error downloading item');
  }
};

exports.searchItems = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { query, currentPath } = req.query;
    
    if (!query) {
      return res.json({ files: [] });
    }
    
    // Define the search directory
    const searchDir = currentPath 
      ? path.join(getUserDir(userId), currentPath)
      : getUserDir(userId);
    
    // Function to recursively search for files
    async function searchFiles(dir, searchQuery, basePath = '') {
      const results = [];
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stats = await fs.stat(itemPath);
        
        // Check if name matches the query
        if (item.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            name: item,
            path: relativePath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            lastModified: stats.mtime,
            type: stats.isDirectory() ? 'Folder' : getFileType(itemPath)
          });
        }
        
        // If it's a directory, search recursively
        if (stats.isDirectory()) {
          const subResults = await searchFiles(itemPath, searchQuery, relativePath);
          results.push(...subResults);
        }
      }
      
      return results;
    }
    
    // Perform the search
    const searchResults = await searchFiles(searchDir, query);
    
    // Sort results: folders first, then files
    const sortedResults = searchResults.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    res.json({ files: sortedResults });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Error performing search' });
  }
};