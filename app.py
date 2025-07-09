import os
from flask import Flask, render_template, request, jsonify
from PIL import Image
from pdf2image import convert_from_path
import google.generativeai as genai
import random

# --- AI 설정 시작 ---
try:
    # 환경 변수에서 API 키를 가져옵니다.
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.")
    genai.configure(api_key=api_key)
    # Vision 모델을 사용하도록 설정
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    print(f"Gemini 모델 설정 중 에러: {e}")
    model = None
# --- AI 설정 끝 ---


UPLOAD_FOLDER = 'uploads'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/upload", methods=['POST'])
def upload_file():
    if model is None:
        return jsonify({'status': 'error', 'message': 'AI 모델이 준비되지 않았습니다. API 키 설정을 확인하세요.'})

    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': '파일이 없습니다.'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': '파일을 선택하지 않았습니다.'})
    
    if file:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        raw_text = ""
        try:
            prompt = "이 이미지에 있는 단어와 뜻을 '단어: 뜻' 형식으로 한 줄에 하나씩 정리해서 텍스트로 추출해줘. 다른 부가적인 설명은 모두 제외해줘."
            images_to_process = []

            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                images_to_process.append(Image.open(file_path))
            elif filename.lower().endswith('.pdf'):
                images_to_process = convert_from_path(file_path)

            for img in images_to_process:
                response = model.generate_content([prompt, img])
                raw_text += response.text + "\n"
            
            # --- 👇 텍스트 파싱 로직을 더 견고하게 수정했습니다. 👇 ---
            parsed_words = []
            cleaned_text = raw_text.replace("```", "").strip() # 마크다운 코드 블록 제거
            
            for line in cleaned_text.split('\n'):
                # ':'가 포함된 줄만 처리하도록 강화
                if ':' in line:
                    parts = line.split(':', 1)
                    # "단어:" 부분이 비어있거나 "뜻:" 부분이 비어있는 경우를 방지
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        word = parts[0].strip()
                        definition = parts[1].strip()
                        parsed_words.append({'word': word, 'definition': definition})
            # --- 👆 여기까지 수정 ---

            return jsonify({
                'status': 'success', 
                'message': f'{filename} 파일 AI 분석 성공!',
                'text': raw_text,
                'parsed_words': parsed_words,
                'word_count': len(parsed_words)
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'AI 분석 중 에러 발생: {str(e)}'})

@app.route("/create-test", methods=['POST'])
def create_test():
    data = request.get_json()
    # 텍스트 대신 파싱된 단어 리스트를 직접 받습니다.
    word_list = data.get('words')
    test_type = data.get('test_type')
    num_questions = int(data.get('num_questions'))

    if not word_list:
        return jsonify({'status': 'error', 'message': '전달된 단어가 없습니다.'})

    # 문제 수 제한 (백엔드에서도 한번 더 확인)
    if num_questions > len(word_list):
        num_questions = len(word_list)

    random.shuffle(word_list)
    questions_to_ask = word_list[:num_questions]
    
    final_questions = []
    for i, item in enumerate(questions_to_ask):
        correct_answer = item
        
        incorrect_pool = [other for other in word_list if other != correct_answer]
        num_incorrect_choices = min(3, len(incorrect_pool))
        incorrect_choices = random.sample(incorrect_pool, num_incorrect_choices)
        
        choices = [correct_answer] + incorrect_choices
        random.shuffle(choices)

        final_questions.append({
            'question_num': i + 1,
            'question_item': correct_answer,
            'choices': choices
        })

    return jsonify({
        'status': 'success',
        'questions': final_questions,
        'test_type': test_type
    })