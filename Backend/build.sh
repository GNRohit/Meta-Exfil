#!/bin/bash
# Install system dependencies (ExifTool + FFmpeg)
sudo apt-get update
sudo apt-get install -y exiftool ffmpeg

# Install Python dependencies
pip install -r requirements.txt