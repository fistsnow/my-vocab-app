#!/usr/bin/env bash
# exit on error
set -o errexit

# sudo를 모두 제거합니다.
apt-get clean
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils

# 파이썬 라이브러리 설치
pip install -r requirements.txt