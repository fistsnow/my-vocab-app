#!/usr/bin/env bash
# exit on error
set -o errexit

# ⭐️ Read-only file system 에러 해결을 위해 폴더를 직접 생성합니다.
mkdir -p /var/lib/apt/lists/partial

# 시스템 프로그램 설치
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils

# 파이썬 라이브러리 설치
pip install -r requirements.txt