import os
from flask import Flask, render_template, request, jsonify
from PIL import Image
from pdf2image import convert_from_path
import google.generativeai as genai
import random

# --- AI 설정 시작 ---
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.")
    genai.configure(api_key=api_key)
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
    
    # --- 👇 추가된 부분: 언어 쌍 정보 받기 👇 ---
    source_lang = request.form.get('source_language', '중국어') # 기본값: 중국어
    target_lang = request.form.get('target_language', '한국어') # 기본값: 한국어
    # --- 👆 추가된 부분 끝 ---
    
    if file:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        raw_text = ""
        try:
            # --- 👇 수정된 부분: 프롬프트 동적 생성 👇 ---
            prompt = f"이 이미지에 있는 {source_lang} 단어와 {target_lang} 뜻을 '{source_lang} 단어: {target_lang} 뜻' 형식으로 한 줄에 하나씩 정리해서 텍스트로 추출해줘. 다른 부가적인 설명은 모두 제외해줘. 예를 들어, '{source_lang} 단어 예시: {target_lang} 뜻 예시' 와 같이 정리해줘."
            # 프롬프트 예시를 좀 더 구체적으로 제공하는 것이 좋습니다.
            if source_lang == "중국어" and target_lang == "한국어":
                prompt += " 예시: '你好: 안녕하세요'"
            elif source_lang == "중국어" and target_lang == "영어":
                prompt += " 예시: '你好: Hello'"
            elif source_lang == "영어" and target_lang == "한국어":
                prompt += " 예시: 'Apple: 사과'"
            elif source_lang == "영어" and target_lang == "중국어":
                prompt += " 예시: 'Apple: 苹果'"
            # --- 👆 수정된 부분 끝 ---

            images_to_process = []

            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                images_to_process.append(Image.open(file_path))
            elif filename.lower().endswith('.pdf'):
                images_to_process = convert_from_path(file_path)

            for img in images_to_process:
                response = model.generate_content([prompt, img])
                raw_text += response.text + "\n"
            
            print(f"--- AI Raw Response ---\n{raw_text}\n-------------------------")

            parsed_words = []
            cleaned_text = raw_text.replace("```", "").strip()
            
            for line in cleaned_text.split('\n'):
                if ':' in line:
                    parts = line.split(':', 1)
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        word = parts[0].strip()
                        definition = parts[1].strip()
                        parsed_words.append({'word': word, 'definition': definition})

            return jsonify({
                'status': 'success', 
                'message': f'{filename} 파일 AI 분석 성공!',
                'text': raw_text,
                'parsed_words': parsed_words,
                'word_count': len(parsed_words),
                'source_language': source_lang, # 클라이언트에 언어 정보 다시 전달
                'target_language': target_lang  # 클라이언트에 언어 정보 다시 전달
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'AI 분석 중 에러 발생: {str(e)}'})

# create_test 라우트는 이전과 동일하게 유지됩니다.
@app.route("/create-test", methods=['POST'])
def create_test():
    data = request.get_json()
    word_list = data.get('words')
    test_type = data.get('test_type') 
    num_questions = int(data.get('num_questions'))

    if not word_list:
        return jsonify({'status': 'error', 'message': '전달된 단어가 없습니다.'})

    if num_questions > len(word_list):
        num_questions = len(word_list)

    random.shuffle(word_list)
    questions_to_ask = word_list[:num_questions]
    
    final_questions = []
    for i, item in enumerate(questions_to_ask):
        if test_type == 'word_to_definition':
            question_text = item['word']
            correct_answer = item['definition']
            
            incorrect_pool = [other['definition'] for other in word_list if other['definition'] != correct_answer]
            
        else: # test_type == 'definition_to_word'
            question_text = item['definition']
            correct_answer = item['word']
            
            incorrect_pool = [other['word'] for other in word_list if other['word'] != correct_answer]

        incorrect_pool = list(set(incorrect_pool))
        num_incorrect_choices = min(3, len(incorrect_pool))
        
        incorrect_choices = random.sample(incorrect_pool, num_incorrect_choices)
        
        choices = [correct_answer] + incorrect_choices
        random.shuffle(choices)

        final_questions.append({
            'question_num': i + 1,
            'question_text': question_text,
            'correct_answer': correct_answer,
            'choices': choices
        })

    return jsonify({
        'status': 'success',
        'questions': final_questions,
        'test_type': test_type
    })

if __name__ == '__main__':
    app.run(debug=True)