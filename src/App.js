import React, { useState, useEffect } from 'react';
import './App.css';

const { ipcRenderer } = window.require('electron');

function App() {
  const [uploads, setUploads] = useState([]);
  const [filePath, setFilePath] = useState('');
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);
  const [totalDataUsed, setTotalDataUsed] = useState(0);

  useEffect(() => {
    ipcRenderer.invoke('fetch-uploads');
    ipcRenderer.invoke("fetch-used-data")
    
    ipcRenderer.on('uploads-list', (event, data) => {
      setUploads(data);
    });

    ipcRenderer.on('total-data-used', (event, data) => {
      setTotalDataUsed(data);
    });

    ipcRenderer.on('upload-progress', (event, { eventId, progress: uploadProgress }) => {
      setProgress((prev) => ({
        ...prev,
        [`upload-${eventId}`]: uploadProgress,
      }));
    });

    ipcRenderer.on('download-progress', (event, { eventId, progress: downloadProgress }) => {
      setProgress((prev) => ({
        ...prev,
        [`download-${eventId}`]: downloadProgress,
      }));
    });

    ipcRenderer.on('upload-complete', (event, { eventId, fileName }) => {
      alert(`Upload Complete: ${fileName}`);
      setProgress((prev) => {
        const updatedProgress = { ...prev };
        delete updatedProgress[`upload-${eventId}`];
        return updatedProgress;
      });
      ipcRenderer.invoke('fetch-uploads');
    });

    ipcRenderer.on('download-complete', (event, { eventId, fileName, filePath }) => {
      alert(`Download Complete: ${fileName}\nSaved to: ${filePath}`);
      setProgress((prev) => {
        const updatedProgress = { ...prev };
        delete updatedProgress[`download-${eventId}`];
        return updatedProgress;
      });
    });

    ipcRenderer.on('upload-error', (event, { error }) => {
      setError(`Upload Error: ${error}`);
    });

    ipcRenderer.on('download-error', (event, { error }) => {
      setError(`Download Error: ${error}`);
    });
  }, []);

  const handleStartUpload = () => {
    ipcRenderer.invoke("log", "Start Upload");

    if (!filePath) {
      alert('Please enter the file path to upload');
      return;
    }

    ipcRenderer.invoke('start-upload', { filePath });
  };

  const handleFileDownload = (fileName) => {
    ipcRenderer.invoke('start-download', { fileName });
  };

  return (
    <div className="App">
      <div className="container">
        <h1>discorddan calinti data store yeri</h1>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <p>kullanılan : {totalDataUsed}GB :-D</p>
        <div>
          <input
            type="text"
            placeholder="Enter file path"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />
          <button onClick={handleStartUpload}>Start Upload</button>
        </div>

        <h1>Uploads</h1>
        {uploads.map((upload) => (
          <div className="card" key={upload.fileName}>
            <p>{upload.fileName} - {upload.status}</p>
            <button onClick={() => handleFileDownload(upload.fileName)}>Download</button>
          </div>
        ))}

        <h1>Progress</h1>
        {Object.entries(progress).map(([key, value]) => (
          <div className="progress-bar" key={key}>
            <div style={{ width: `${value}%` }}></div>
          </div>
        ))}
      </div>
      <footer>Cloud Storage App</footer>
    </div>
  );
}

export default App;
