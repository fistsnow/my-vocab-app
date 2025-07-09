#!/usr/bin/env bash
# exit on error
set -o errexit

# ⭐️ 관리자 권한으로 실행하기 위해 sudo 추가
sudo apt-get clean
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils

# 파이썬 라이브러리 설치 (sudo 불필요)
pip install -r requirements.txt