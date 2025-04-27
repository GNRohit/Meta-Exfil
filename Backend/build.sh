#!/bin/bash
# Install FFmpeg (static build)
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/

# Install ExifTool (Perl script)
wget https://exiftool.org/Image-ExifTool-12.67.tar.gz
tar -xf Image-ExifTool-12.67.tar.gz
cd Image-ExifTool-12.67
perl Makefile.PL
make install