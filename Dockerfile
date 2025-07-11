# 1. 파이썬 3.12 버전을 기반으로 시작합니다.
FROM python:3.12-slim

# 2. 컨테이너 안에서 작업할 폴더를 만듭니다.
WORKDIR /app

# 3. 시스템 의존성 설치
RUN apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-kor poppler-utils && rm -rf /var/lib/apt/lists/*

# 4. 파이썬 라이브러리 목록을 복사합니다.
COPY requirements.txt .

# 5. 파이썬 라이브러리를 설치합니다.
RUN pip install --no-cache-dir -r requirements.txt

# 6. 보안을 위해 권한이 없는 'app' 사용자를 만들고 전환합니다.
RUN useradd --create-home app
USER app
WORKDIR /home/app

# 7. 현재 폴더의 모든 파일을 컨테이너 안으로 복사합니다.
COPY . .

# 8. Cloud Run이 사용할 포트를 환경 변수로 설정합니다.
ENV PORT 8080

# 9. 서버가 시작될 때 실행할 명령어를 지정합니다.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--worker-tmp-dir", "/dev/shm", "app:app"]