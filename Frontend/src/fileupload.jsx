// import React, { useState } from "react";
// import axios from "axios";
// import "./styling/styles.css";

// const FileUpload = () => {
//     const [file, setFile] = useState(null);
//     const [metadata, setMetadata] = useState(null);

//     const handleFileChange = (event) => {
//         setFile(event.target.files[0]);
//     };

//     const handleUpload = async () => {
//         if (!file) return;

//         const formData = new FormData();
//         formData.append("file", file);

//         try {
//             const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
//                 headers: { "Content-Type": "multipart/form-data" },
//             });
//             setMetadata(response.data.metadata);
//         } catch (error) {
//             console.error("Error uploading file", error);
//         }
//     };

//     return (
//         <div className="files">
//             <h2>Upload a File</h2>
//             <input type="file" onChange={handleFileChange} />
//             <button onClick={handleUpload}>Upload</button>
            
//             {metadata && (
//                 <div>
//                     <h3>Extracted Metadata:</h3>
//                     <pre>{JSON.stringify(metadata, null, 2)}</pre>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default FileUpload;


// import axios from "axios";
// import React, { useState } from "react";

// const FileUpload = () => {
//     const [file, setFile] = useState(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const handleFileChange = (event) => {
//         setFile(event.target.files[0]);
//     };

//     const handleUpload = async () => {
//         if (!file) return alert("Please select a file!");

//         const formData = new FormData();
//         formData.append("file", file);
//         setIsLoading(true);

//         try {
//             const response = await axios.post("https://meta-exfil.onrender.com/upload/", formData, {
//                 headers: { "Content-Type": "multipart/form-data" },
//                 responseType: 'blob',
//                 timeout: 30000 //longer timeout for larger files
//             }); 

//             const url = window.URL.createObjectURL(new Blob([response.data]));
//             const link = document.createElement('a');
//             link.href = url;
//             link.setAttribute('download', `${file.name}_metadata.pdf`);
//             document.body.appendChild(link);
//             link.click();
            
//             // Clean up
//             link.parentNode.removeChild(link);
//             window.URL.revokeObjectURL(url);


//         } catch (error) {
//             console.error("Full error:", error);
//         if (error.response) {
//             // The request was made and the server responded with a status code
//             alert(`Error: ${error.response.status} - ${error.response.data}`);
//         } else if (error.request) {
//             // The request was made but no response was received
//             alert("No response from server. Is the backend running?");
//         } else {
//             // Something happened in setting up the request
//             alert(`Request error: ${error.message}`);
//         }
//         }

//         finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//     //    <div>
//     //         <h2>Upload a File</h2>
//     //         <input type="file" onChange={handleFileChange} />
//     //         <button onClick={handleUpload}>Upload</button>

//     //         {metadata && (
//     //             <div>
//     //                 <h3>Uploaded File Info:</h3>
//     //                 <pre>{JSON.stringify(metadata, null, 2)}</pre>
//     //             </div>
//     //         )}
//     //     </div>

//     <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
//             <h2>Upload a File</h2>
//             <input 
//                 type="file" 
//                 onChange={handleFileChange} 
//                 style={{ margin: '10px 0' }}
//             />
//             <button 
//                 onClick={handleUpload}
//                 disabled={isLoading}
//                 style={{
//                     padding: '8px 16px',
//                     backgroundColor: isLoading ? '#cccccc' : '#4CAF50',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     cursor: 'pointer'
//                 }}
//             >
//                 {isLoading ? 'Processing...' : 'Upload'}
//             </button>
//         </div>
//     ); 
// };

// export default FileUpload;

import axios from "axios";
import React, { useState, useEffect } from "react";

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [backendStatus, setBackendStatus] = useState("checking");
    const [uploadProgress, setUploadProgress] = useState(0);

    const API_URL = "https://meta-exfil.onrender.com";

    // Check backend status when component mounts
    useEffect(() => {
        checkBackendStatus();
    }, []);

    const checkBackendStatus = async () => {
        setBackendStatus("checking");
        try {
            const response = await axios.get(`${API_URL}`, {
                timeout: 10000
            });
            if (response.status === 200) {
                setBackendStatus("online");
                setError(null);
                return true;
            } else {
                setBackendStatus("offline");
                return false;
            }
        } catch (error) {
            console.log("Backend check error:", error);
            setBackendStatus("offline");
            return false;
        }
    };

    const wakeBackend = async () => {
        setBackendStatus("waking");
        setError("Waking up the server. This may take up to 60 seconds on the free tier...");
        
        // Make multiple attempts to wake the server
        for (let i = 0; i < 6; i++) {
            try {
                const response = await axios.get(`${API_URL}`, {
                    timeout: 10000
                });
                if (response.status === 200) {
                    setBackendStatus("online");
                    setError(null);
                    return true;
                }
            } catch (error) {
                console.log(`Wake attempt ${i+1} failed`);
            }
            
            // Wait 5 seconds between attempts
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        setBackendStatus("offline");
        setError("Server wake-up failed. Please try again later.");
        return false;
    };

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setError(null);
        setUploadProgress(0);
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first");
            return;
        }

        // Check backend status first
        if (backendStatus !== "online") {
            const isOnline = await wakeBackend();
            if (!isOnline) return;
        }

        setIsLoading(true);
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${API_URL}/upload/`, formData, {
                headers: { 
                    "Content-Type": "multipart/form-data"
                },
                responseType: 'blob',
                timeout: 120000, // 2 minutes timeout
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                }
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${file.name}_metadata.pdf`);
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Upload error:", error);
            
            if (error.response) {
                // Server responded with an error
                setError(`Server error: ${error.response.status}`);
            } else if (error.request) {
                // No response received
                setError("No response from server. The backend might be starting up. Please try again in a minute.");
                setBackendStatus("offline");
            } else {
                // Request setup error
                setError(`Request error: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Status indicator styles
    const getStatusColor = () => {
        switch (backendStatus) {
            case "online": return "#4CAF50";
            case "offline": return "#F44336";
            case "waking": return "#FF9800";
            default: return "#9E9E9E";
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: '#333', marginBottom: '5px' }}>MetaAnalyser</h1>
            
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '20px',
                fontSize: '14px',
                color: '#666'
            }}>
                <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: getStatusColor(),
                    marginRight: '5px'
                }}></div>
                <span>
                    Server status: {
                        backendStatus === "online" ? "Online" :
                        backendStatus === "offline" ? "Offline" :
                        backendStatus === "waking" ? "Starting up..." :
                        "Checking..."
                    }
                </span>
                {backendStatus !== "online" && backendStatus !== "waking" && (
                    <button 
                        onClick={wakeBackend}
                        style={{
                            marginLeft: '10px',
                            padding: '3px 8px',
                            fontSize: '12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        Wake server
                    </button>
                )}
            </div>

            <h2>Upload a File</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <input 
                    type="file" 
                    onChange={handleFileChange} 
                    style={{ 
                        margin: '10px 0',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '100%'
                    }}
                />
                
                <button 
                    onClick={handleUpload}
                    disabled={isLoading || !file || backendStatus === "checking"}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isLoading ? '#cccccc' : 
                                        backendStatus !== "online" ? '#FF9800' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading || !file || backendStatus === "checking" ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        width: '100%',
                        marginTop: '10px'
                    }}
                >
                    {isLoading ? `Processing... ${uploadProgress}%` : 'Extract Metadata'}
                </button>
            </div>
            
            {error && (
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#ffebee', 
                    color: '#c62828', 
                    borderRadius: '4px',
                    marginTop: '10px'
                }}>
                    {error}
                </div>
            )}
            
            {isLoading && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ 
                        height: '8px', 
                        backgroundColor: '#e0e0e0', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ 
                            height: '100%', 
                            width: `${uploadProgress}%`, 
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;

