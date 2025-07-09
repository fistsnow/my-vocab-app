#!/usr/bin/env bash
# exit on error
set -o errexit

# ⭐️ Read-only file system 에러 해결을 위해 clean을 먼저 실행
apt-get clean
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils

# 파이썬 라이브러리 설치
pip install -r requirements.txt