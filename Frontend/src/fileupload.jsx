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


import axios from "axios";
import React, { useState } from "react";

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return alert("Please select a file!");

        const formData = new FormData();
        formData.append("file", file);
        setIsLoading(true);

        try {
            const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                responseType: 'blob',
                timeout: 30000 //longer timeout for larger files
            }); 

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
            console.error("Full error:", error);
        if (error.response) {
            // The request was made and the server responded with a status code
            alert(`Error: ${error.response.status} - ${error.response.data}`);
        } else if (error.request) {
            // The request was made but no response was received
            alert("No response from server. Is the backend running?");
        } else {
            // Something happened in setting up the request
            alert(`Request error: ${error.message}`);
        }
        }

        finally {
            setIsLoading(false);
        }
    };

    return (
    //    <div>
    //         <h2>Upload a File</h2>
    //         <input type="file" onChange={handleFileChange} />
    //         <button onClick={handleUpload}>Upload</button>

    //         {metadata && (
    //             <div>
    //                 <h3>Uploaded File Info:</h3>
    //                 <pre>{JSON.stringify(metadata, null, 2)}</pre>
    //             </div>
    //         )}
    //     </div>

    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Upload a File</h2>
            <input 
                type="file" 
                onChange={handleFileChange} 
                style={{ margin: '10px 0' }}
            />
            <button 
                onClick={handleUpload}
                disabled={isLoading}
                style={{
                    padding: '8px 16px',
                    backgroundColor: isLoading ? '#cccccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                {isLoading ? 'Processing...' : 'Upload'}
            </button>
        </div>
    ); 
};

export default FileUpload;

