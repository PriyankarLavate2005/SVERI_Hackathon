import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

const pinataApiKey = ""; // Replace with your API Key
const pinataSecretApiKey = ""; // Replace with your Secret Key

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [shareEmail, setShareEmail] = useState("");

  const navigate = useNavigate();

  // Initialize with mock data
  useEffect(() => {
    // Get user info from localStorage or session
    const user = JSON.parse(localStorage.getItem("user")) || { username: "User" };
    setUsername(user.username);

    // Load folders from localStorage if available
    const savedFolders = JSON.parse(localStorage.getItem("folders")) || [
      { id: "1", name: "Documents", path: "/", created: "2025-03-10" },
      { id: "2", name: "Images", path: "/", created: "2025-03-12" },
    ];
    setFolders(savedFolders);

    // Load files from localStorage if available
    const savedFiles = JSON.parse(localStorage.getItem("files")) || [];
    setFiles(savedFiles);
  }, []);

  // Save files and folders to localStorage when they change
  useEffect(() => {
    localStorage.setItem("files", JSON.stringify(files));
    localStorage.setItem("folders", JSON.stringify(folders));
  }, [files, folders]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleFileChange = (event) => {
    setFileToUpload(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!fileToUpload) {
      alert("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    const pinataMetadata = JSON.stringify({
      name: fileToUpload.name,
      keyvalues: {
        path: currentPath
      }
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", pinataOptions);

    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
        }
      );

      const ipfsHash = response.data.IpfsHash;
      console.log("File uploaded to IPFS:", ipfsHash);

      // Add the new file to the list
      const newFile = {
        id: Date.now().toString(),
        name: fileToUpload.name,
        type: fileToUpload.name.split(".").pop(),
        size: `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`,
        modified: new Date().toISOString().split("T")[0],
        path: currentPath,
        hash: ipfsHash,
      };

      setFiles([...files, newFile]);
      setFileToUpload(null);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error("IPFS upload error:", error);
      alert("Failed to upload file to IPFS");
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    // Create a new folder
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      path: currentPath,
      created: new Date().toISOString().split("T")[0],
    };

    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsCreateFolderModalOpen(false);
  };

  const handleViewFile = (file) => {
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${file.hash}`;
    window.open(ipfsUrl, "_blank");
  };

  const handleShareFile = () => {
    if (!selectedFile || !shareEmail.trim()) return;

    // In a real app, this would integrate with your blockchain contract to share access
    // For now, just show a success message
    alert(`File ${selectedFile.name} shared with ${shareEmail}`);
    setShareEmail("");
    setSelectedFile(null);
    setIsShareModalOpen(false);
  };

  const handleDeleteFile = (file) => {
    // In a production app, you might want to unpin from Pinata
    // For now, just remove from the local list
    const updatedFiles = files.filter((f) => f.id !== file.id);
    setFiles(updatedFiles);
  };

  const handleDeleteFolder = (folder) => {
    // Remove folder from list
    const updatedFolders = folders.filter((f) => f.id !== folder.id);
    setFolders(updatedFolders);
  };

  const openFolder = (folder) => {
    // Navigate to folder
    setCurrentPath(`${currentPath}${folder.name}/`);
  };

  const navigateUp = () => {
    if (currentPath === "/") return;

    // Remove the last folder from the path
    const newPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(newPath);
  };

  // Calculate total storage used
  const totalStorageUsed = files.reduce((total, file) => {
    const sizeInMB = parseFloat(file.size);
    return total + (isNaN(sizeInMB) ? 0 : sizeInMB);
  }, 0);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo">BlockStore</div>
        <div className="user-info">
          <span>Welcome, {username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="sidebar">
          <div className="storage-info">
            <h3>Storage</h3>
            <div className="storage-bar">
              <div
                className="storage-used"
                style={{ width: `${Math.min((totalStorageUsed / 15) * 100, 100)}%` }}
              ></div>
            </div>
            <p>{totalStorageUsed.toFixed(2)} MB / 15 GB used</p>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li className="active">My Files</li>
              <li>Shared with Me</li>
              <li>Recent</li>
              <li>Favorites</li>
              <li>Trash</li>
            </ul>
          </nav>
        </div>

        <main className="content-area">
          <div className="actions-bar">
            <div className="path-navigation">
              <button
                className="nav-btn"
                onClick={navigateUp}
                disabled={currentPath === "/"}
              >
                &#8593; Up
              </button>
              <span className="current-path">{currentPath}</span>
            </div>
            <div className="action-buttons">
              <button
                className="action-btn upload"
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload File
              </button>
              <button
                className="action-btn create-folder"
                onClick={() => setIsCreateFolderModalOpen(true)}
              >
                Create Folder
              </button>
            </div>
          </div>

          <div className="files-container">
            <h2>Folders</h2>
            {folders.filter((folder) => folder.path === currentPath).length > 0 ? (
              <div className="folders-grid">
                {folders
                  .filter((folder) => folder.path === currentPath)
                  .map((folder) => (
                    <div className="folder-item" key={folder.id}>
                      <div
                        className="folder-icon"
                        onClick={() => openFolder(folder)}
                      >
                        📁
                      </div>
                      <div className="folder-name">{folder.name}</div>
                      <div className="folder-actions">
                        <button
                          className="item-action delete"
                          onClick={() => handleDeleteFolder(folder)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="no-items">No folders found</p>
            )}

            <h2>Files</h2>
            {files.filter((file) => file.path === currentPath).length > 0 ? (
              <div className="files-table-container">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files
                      .filter((file) => file.path === currentPath)
                      .map((file) => (
                        <tr key={file.id}>
                          <td className="file-name">
                            <span className="file-icon">
                              {file.type === "pdf" && "📄"}
                              {file.type === "jpg" && "🖼️"}
                              {file.type === "png" && "🖼️"}
                              {file.type === "sol" && "📝"}
                              {!["pdf", "jpg", "png", "sol"].includes(
                                file.type
                              ) && "📄"}
                            </span>
                            {file.name}
                          </td>
                          <td>{file.size}</td>
                          <td>{file.modified}</td>
                          <td className="file-actions">
                            <button
                              className="item-action view"
                              onClick={() => handleViewFile(file)}
                            >
                              View
                            </button>
                            <button
                              className="item-action share"
                              onClick={() => {
                                setSelectedFile(file);
                                setIsShareModalOpen(true);
                              }}
                            >
                              Share
                            </button>
                            <button
                              className="item-action delete"
                              onClick={() => handleDeleteFile(file)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-items">No files found</p>
            )}
          </div>
        </main>
      </div>

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Upload File to IPFS</h2>
            <div className="modal-content">
              <input type="file" onChange={handleFileChange} />
              {fileToUpload && (
                <div className="file-info">
                  <p>Name: {fileToUpload.name}</p>
                  <p>
                    Size: {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn upload"
                onClick={handleFileUpload}
                disabled={!fileToUpload}
              >
                Upload to IPFS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Folder</h2>
            <div className="modal-content">
              <input
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setIsCreateFolderModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn create"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share File Modal */}
      {isShareModalOpen && selectedFile && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Share File</h2>
            <div className="modal-content">
              <p>
                Sharing: <strong>{selectedFile.name}</strong>
              </p>
              <p>IPFS Hash: {selectedFile.hash}</p>
              <input
                type="email"
                placeholder="Enter recipient's email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setIsShareModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn share"
                onClick={handleShareFile}
                disabled={!shareEmail.trim()}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
















