# import os
# import subprocess
# import json
# from fastapi import FastAPI, File, UploadFile, Form
# from fastapi.responses import FileResponse
# from fpdf import FPDF
# import shutil

# app = FastAPI()

# UPLOAD_DIR = "uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)


# def extract_metadata(file_path):
#     """Extract metadata using ExifTool."""
#     try:
#         result = subprocess.run(
#             ["exiftool", "-json", file_path],
#             capture_output=True,
#             text=True
#         )
#         metadata_list = json.loads(result.stdout)
#         return metadata_list[0] if metadata_list else {}
#     except Exception as e:
#         return {"Error": str(e)}


# def get_file_dates(file_path):
#     """Get file creation and modification dates."""
#     return {
#         "Date Created": os.path.getctime(file_path),
#         "Date Modified": os.path.getmtime(file_path)
#     }


# def generate_metadata_report(metadata, file_name):
#     """Generate a metadata report PDF."""
#     pdf_path = os.path.join(UPLOAD_DIR, f"{file_name}_metadata.pdf")
    
#     pdf = FPDF()
#     pdf.set_auto_page_break(auto=True, margin=15)
#     pdf.add_page()
#     pdf.set_font("Arial", size=12)
#     pdf.cell(200, 10, txt="Metadata Report", ln=True, align='C')
#     pdf.ln(10)

#     for key, value in metadata.items():
#         pdf.multi_cell(0, 10, f"{key}: {value}")
#         pdf.ln(2)

#     pdf.output(pdf_path)
#     return pdf_path


# @app.post("/upload/")
# async def upload_file(file: UploadFile = File(...)):
#     """Handle file upload and metadata extraction."""
#     file_location = os.path.join(UPLOAD_DIR, file.filename)
    
#     with open(file_location, "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)

#     metadata = extract_metadata(file_location)
#     metadata.update(get_file_dates(file_location))

#     pdf_path = generate_metadata_report(metadata, file.filename)
    
#     return {"filename": file.filename, "metadata": metadata, "pdf_report": pdf_path}


# @app.get("/download/")
# async def download_report(file_name: str):
#     """Allow the user to download the metadata PDF."""
#     pdf_path = os.path.join(UPLOAD_DIR, f"{file_name}_metadata.pdf")
    
#     if os.path.exists(pdf_path):
#         return FileResponse(pdf_path, media_type='application/pdf', filename=f"{file_name}_metadata.pdf")
    
#     return {"error": "File not found"}

# @app.get("/")
# def home():
#     return {"message": "Welcome to MetaAnalyser API"}

import os
import subprocess
import json
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fpdf import FPDF
import uvicorn
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change "*" to specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sanitize_filename(filename):
    """Remove problematic characters from filenames"""
    # Keep alphanumeric, spaces, dots, and hyphens
    return re.sub(r'[^\w .-]', '', filename).strip()

def extract_metadata(file_path):
    """Extract metadata using ExifTool and ffprobe, then merge them."""
    metadata = {}

    # Extract metadata using ExifTool
    try:
        result = subprocess.run(
            ["exiftool", "-json", file_path],
            capture_output=True,
            text=True
        )
        exif_metadata = json.loads(result.stdout)
        if exif_metadata:
            metadata.update(exif_metadata[0])
    except Exception as e:
        metadata["Metadata Extraction Error"] = str(e)

    # Extract metadata using ffprobe
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", file_path
            ],
            capture_output=True,
            text=True
        )
        ffmpeg_metadata = json.loads(result.stdout)

        # Merge general format details
        if "format" in ffmpeg_metadata:
            metadata.update(ffmpeg_metadata["format"])

        # Merge stream details
        if "streams" in ffmpeg_metadata:
            for stream in ffmpeg_metadata["streams"]:
                if stream.get("codec_type") == "video":
                    metadata.update({
                        "Video Codec": stream.get("codec_name"),
                        "Resolution": f"{stream.get('width')}x{stream.get('height')}",
                        "Frame Rate": stream.get("r_frame_rate"),
                    })
                elif stream.get("codec_type") == "audio":
                    metadata.update({
                        "Audio Codec": stream.get("codec_name"),
                        "Sample Rate": stream.get("sample_rate"),
                        "Audio Channels": stream.get("channels"),
                    })
    except Exception as e:
        metadata["Metadata Extraction Error (FFmpeg)"] = str(e)

    return metadata

def get_file_dates(file_path):
    """Extract file creation and modification dates and format them."""
    created = os.path.getctime(file_path)
    modified = os.path.getmtime(file_path)
    
    return {
        "Date Created": datetime.fromtimestamp(created).strftime('%Y-%m-%d %H:%M:%S'),
        "Date Modified": datetime.fromtimestamp(modified).strftime('%Y-%m-%d %H:%M:%S')
    }

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def generate_metadata_pdf(metadata, filename):
    """Generate a well-formatted PDF with metadata."""
    pdf = FPDF()
    pdf.add_page()
    
    # Add title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, f"Metadata Report for: {filename}", 0, 1, 'C')
    pdf.ln(10)
    
    # Add report generation time
    pdf.set_font("Arial", 'I', 10)
    pdf.cell(0, 10, f"Report generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.ln(10)
    
    # Add metadata
    pdf.set_font("Arial", size=12)
    
    for key, value in metadata.items():
        # Handle long values by splitting into multiple lines
        value_str = str(value)
        if len(value_str) > 80:
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(40, 10, f"{key}:", 0, 0)
            pdf.set_font("Arial", size=12)
            pdf.multi_cell(0, 10, value_str)
        else:
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(40, 10, f"{key}:", 0, 0)
            pdf.set_font("Arial", size=12)
            pdf.cell(0, 10, value_str, 0, 1)
        pdf.ln(2)
    
    pdf_path = os.path.join(UPLOAD_DIR, f"{filename}_metadata.pdf")
    pdf.output(pdf_path)
    return pdf_path

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_path = None  # Initialize to handle cleanup in finally
    pdf_path = None   # Track PDF path for cleanup
    
    try:
        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)
        if not safe_filename:  # Check if filename became empty after sanitization
            raise HTTPException(
                status_code=400,
                detail="Filename contains only invalid characters after sanitization"
            )

        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Generate metadata
        metadata = extract_metadata(file_path)
        metadata.update(get_file_dates(file_path))

        # Generate PDF
        pdf_path = generate_metadata_pdf(metadata, safe_filename)

        # Return PDF file with proper headers
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"{safe_filename}_metadata.pdf",
            headers={"Content-Disposition": f"attachment; filename={safe_filename}_metadata.pdf"}
        )

    except HTTPException:
        # Re-raise HTTP exceptions we generated
        raise 

    except json.JSONDecodeError as e:
        # Handle metadata extraction errors
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse file metadata: {str(e)}"
        )

    except subprocess.CalledProcessError as e:
        # Handle exiftool/ffprobe errors
        raise HTTPException(
            status_code=500,
            detail=f"Metadata extraction tool failed: {str(e)}"
        )

    except OSError as e:
        # Handle filesystem errors
        raise HTTPException(
            status_code=500,
            detail=f"File system error: {str(e)}"
        )

    except Exception as e:
        # Catch-all for other unexpected errors
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error processing file: {str(e)}"
        )

    finally:
        # Cleanup resources
        try:
            # Close the uploaded file handle
            await file.close()
            
            # Remove temporary files if they exist
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                
            if pdf_path and os.path.exists(pdf_path) and os.path.exists(file_path):
                # Only remove PDF if original file still exists (success case)
                pass
            elif pdf_path and os.path.exists(pdf_path):
                # Remove PDF if there was an error
                os.remove(pdf_path)
                
        except Exception as cleanup_error:
            # Don't let cleanup errors mask original errors
            print(f"Cleanup failed: {str(cleanup_error)}")

@app.get("/")
def home():
    return {"message": "Welcome to MetaAnalyser API"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)

