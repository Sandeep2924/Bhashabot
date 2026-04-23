#!/usr/bin/env bash
# Install Tesseract and the Hindi language pack
apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-hin

# Install Python dependencies
pip install -r requirements.txt
