import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaDownload, FaHdd, FaFileAlt, FaExclamationTriangle } from 'react-icons/fa';
import './App.css';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : {
  invoke: () => Promise.resolve(),
  on: () => {},
  removeAllListeners: () => {}
};

function App() {
  const [uploads, setUploads] = useState([]);
  const [filePath, setFilePath] = useState('');
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);
  
  const [totalBytes, setTotalBytes] = useState(0);

  // Helper function to format bytes nicely (KB, MB, GB)
  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const refreshData = () => {
    // Fetch Uploads
    ipcRenderer.invoke('fetch-uploads');
    
    // Fetch Data Usage and update state
    ipcRenderer.invoke("fetch-used-data").then((bytes) => {
      setTotalBytes(bytes);
    });
  };

  useEffect(() => {
    // Initial Load
    refreshData();
    
    const handleUploadsList = (event, data) => setUploads(data);
    
    const handleUploadProgress = (event, { eventId, progress: uploadProgress }) => {
      setProgress((prev) => ({ ...prev, [`upload-${eventId}`]: uploadProgress }));
    };

    const handleDownloadProgress = (event, { eventId, progress: downloadProgress }) => {
      setProgress((prev) => ({ ...prev, [`download-${eventId}`]: downloadProgress }));
    };

    const handleUploadComplete = (event, { eventId, fileName }) => {
      setProgress((prev) => {
        const updated = { ...prev };
        delete updated[`upload-${eventId}`];
        return updated;
      });
      // REFRESH DATA AFTER UPLOAD
      refreshData();
    };

    const handleDownloadComplete = (event, { eventId, fileName, filePath }) => {
      alert(`Download Complete: ${fileName}\nSaved to: ${filePath}`);
      setProgress((prev) => {
        const updated = { ...prev };
        delete updated[`download-${eventId}`];
        return updated;
      });
    };

    const handleUploadError = (event, { error }) => setError(`Upload Error: ${error}`);
    const handleDownloadError = (event, { error }) => setError(`Download Error: ${error}`);

    ipcRenderer.on('uploads-list', handleUploadsList);
    ipcRenderer.on('upload-progress', handleUploadProgress);
    ipcRenderer.on('download-progress', handleDownloadProgress);
    ipcRenderer.on('upload-complete', handleUploadComplete);
    ipcRenderer.on('download-complete', handleDownloadComplete);
    ipcRenderer.on('upload-error', handleUploadError);
    ipcRenderer.on('download-error', handleDownloadError);

    return () => {
      ipcRenderer.removeAllListeners('uploads-list');
      ipcRenderer.removeAllListeners('upload-progress');
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('upload-complete');
      ipcRenderer.removeAllListeners('download-complete');
      ipcRenderer.removeAllListeners('upload-error');
      ipcRenderer.removeAllListeners('download-error');
    };
  }, []);

  const handleStartUpload = () => {
    ipcRenderer.invoke("log", "Start Upload");
    if (!filePath) {
      setError('Please enter a file path first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setError(null);
    ipcRenderer.invoke('start-upload', { filePath });
    setFilePath('');
  };

  const handleFileDownload = (fileName) => {
    ipcRenderer.invoke('start-download', { fileName });
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        {/* Header Section */}
        <header>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <FaCloudUploadAlt className="logo-icon" /> TbeyazT Storage
          </motion.h1>
          
          <motion.div 
            className="stats-badge"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* USE THE FORMATTER HERE */}
            <FaHdd /> <span>Used: {formatBytes(totalBytes)}</span>
          </motion.div>
        </header>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="error-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <FaExclamationTriangle /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Section */}
        <div className="upload-section">
          <div className="input-group">
            <input
              type="text"
              placeholder="Paste file path (e.g., C:/Users/Data/image.png)"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="styled-input"
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartUpload}
              className="primary-btn"
            >
              Upload
            </motion.button>
          </div>
        </div>

        {/* Active Progress Bars */}
        <div className="progress-container">
           <AnimatePresence>
            {Object.entries(progress).map(([key, value]) => (
              <motion.div 
                className="progress-item" 
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <span className="progress-label">{key.includes('upload') ? 'Uploading...' : 'Downloading...'}</span>
                <div className="progress-track">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                  />
                </div>
                <span className="progress-text">{Math.round(value)}%</span>
              </motion.div>
            ))}
           </AnimatePresence>
        </div>

        {/* File List */}
        <div className="file-list-container">
          <h2>Stored Files</h2>
          <div className="file-grid">
            <AnimatePresence>
              {uploads.length === 0 && <p className="empty-state">No files stored yet.</p>}
              {uploads.map((upload, index) => (
                <motion.div 
                  className="file-card" 
                  key={upload.fileName || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(123, 44, 191, 0.4)" }}
                >
                  <div className="file-icon">
                    <FaFileAlt />
                  </div>
                  <div className="file-info">
                    <p className="file-name" title={upload.fileName}>{upload.fileName}</p>
                    <p style={{fontSize: "0.8rem", color: "#aaa"}}>{formatBytes(upload.fileSize || 0)}</p>
                    <span className={`status-badge ${upload.status === 'Complete' || upload.status === 'uploaded' ? 'success' : ''}`}>
                      {upload.status}
                    </span>
                  </div>
                  <motion.button 
                    className="download-btn"
                    whileHover={{ scale: 1.1, backgroundColor: "#fff", color: "#7b2cbf" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleFileDownload(upload.fileName)}
                  >
                    <FaDownload />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
      <footer>
        <p>Discord Data Store System &copy; 2024</p>
      </footer>
    </div>
  );
}

export default App;