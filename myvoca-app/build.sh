#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. 시스템 프로그램 설치
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils

# 2. 파이썬 라이브러리 설치
pip install -r requirements.txt