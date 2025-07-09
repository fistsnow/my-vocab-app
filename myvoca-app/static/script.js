// HTML 요소들을 가져옵니다.
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');

// '단어 추출하기' 버튼에 클릭 이벤트 리스너를 추가합니다.
uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    const extractedTextArea = document.getElementById('extracted-text');
    const testConfigSection = document.getElementById('test-config-section');

    if (!file) {
        extractedTextArea.value = '파일을 먼저 선택해주세요.';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    extractedTextArea.value = "파일을 업로드하고 AI로 분석 중입니다...\n잠시만 기다려주세요.";
    testConfigSection.classList.add('hidden');

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            parsedWords = data.parsed_words;

            const extractedTextArea = document.getElementById('extracted-text');
            const testConfigSection = document.getElementById('test-config-section');
            const numQuestionsInput = document.getElementById('num-questions');
            
            extractedTextArea.value = data.text.trim();
            
            // --- 👇 문제 수 제한 로직 추가 👇 ---
            const wordCount = data.word_count;
            numQuestionsInput.max = wordCount; // 최대값을 단어 수로 설정
            // 기본값을 10개 또는 최대 단어 수 중 작은 값으로 설정
            numQuestionsInput.value = Math.min(10, wordCount); 
            // --- 👆 여기까지 추가 ---
            testConfigSection.classList.remove('hidden');
        } else {
            extractedTextArea.value = `오류 발생: ${data.message}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        extractedTextArea.value = '업로드 또는 분석 중 심각한 오류가 발생했습니다.';
    });
});

// --- 시험 시작 로직 ---
const startTestButton = document.getElementById('start-test-button');
let questionsData = []; // 시험 문제 데이터를 저장할 전역 변수

startTestButton.addEventListener('click', () => {
    const text = document.getElementById('extracted-text').value;
    const testType = document.getElementById('test-type').value;
    const numQuestions = document.getElementById('num-questions').value;

    fetch('/create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            test_type: testType,
            num_questions: numQuestions
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            questionsData = data.questions;
            displayTest(data);
        } else {
            alert(`시험 생성 실패: ${data.message}`);
        }
    })
    .catch(error => console.error('시험 생성 중 에러:', error));
});

function displayTest(data) {
    document.querySelector('.upload-section').classList.add('hidden');
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('test-config-section').classList.add('hidden');
    document.getElementById('test-section').classList.remove('hidden');

    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';

    const testType = data.test_type;

    data.questions.forEach(q => {
        const questionBlock = document.createElement('div');
        // ⭐️ 각 질문 블록에 문제 번호를 데이터로 저장합니다.
        questionBlock.className = 'question-block';
        questionBlock.dataset.questionNum = q.question_num;

        let questionText = '';
        if (testType === 'word-to-def') {
            questionText = `<p>${q.question_num}. 다음 단어의 뜻은? : "${q.question_item.word}"</p>`;
        } else {
            questionText = `<p>${q.question_num}. 다음 뜻에 해당하는 단어는? : "${q.question_item.definition}"</p>`;
        }

        let choicesHTML = '<div class="choices">';
        q.choices.forEach(choice => {
            const choiceValue = (testType === 'word-to-def') ? choice.definition : choice.word;
            // ⭐️ value 값에 큰따옴표가 있을 경우를 대비해 작은따옴표로 감싸줍니다.
            choicesHTML += `
                <label>
                    <input type="radio" name="question-${q.question_num}" value='${choiceValue}'>
                    ${choiceValue}
                </label>
            `;
        });
        choicesHTML += '</div>';

        questionBlock.innerHTML = questionText + choicesHTML;
        questionsContainer.appendChild(questionBlock);
    });
}


// --- 채점 및 돌아가기 로직 (수정됨) ---
const submitTestButton = document.getElementById('submit-test-button');

submitTestButton.addEventListener('click', () => {
    let score = 0;
    const testType = document.getElementById('test-type').value;

    const allQuestionBlocks = document.querySelectorAll('.question-block');

    allQuestionBlocks.forEach(block => {
        const questionNum = parseInt(block.dataset.questionNum);
        const selectedRadio = block.querySelector(`input[name="question-${questionNum}"]:checked`);
        
        const questionInfo = questionsData.find(q => q.question_num === questionNum);
        const correctAnswer = (testType === 'word-to-def') ? questionInfo.question_item.definition : questionInfo.question_item.word;
        
        if (selectedRadio) {
            if (selectedRadio.value === correctAnswer) {
                score++;
            } else {
                selectedRadio.parentElement.classList.add('incorrect');
            }
        }

        block.querySelectorAll('.choices label').forEach(label => {
            const radio = label.querySelector('input');
            if (radio.value === correctAnswer) {
                label.classList.add('correct');
            }
        });
    });

    // 모든 라디오 버튼 비활성화
    document.querySelectorAll('#test-section input[type="radio"]').forEach(radio => {
        radio.disabled = true;
    });

    // ⭐️ "결과 확인" 버튼을 숨깁니다.
    submitTestButton.classList.add('hidden');
    
    // ⭐️ 결과 표시 영역을 보여줍니다.
    const resultDisplaySection = document.getElementById('result-display-section');
    document.getElementById('score-text').textContent = `총 ${questionsData.length}문제 중 ${score}개를 맞혔습니다!`;
    resultDisplaySection.classList.remove('hidden');

    // ⭐️ 페이지 맨 아래로 스크롤하여 결과를 바로 확인하게 합니다.
    resultDisplaySection.scrollIntoView({ behavior: 'smooth' });
});


// 돌아가기 버튼 로직
const backToStartButton = document.getElementById('back-to-start-button');
backToStartButton.addEventListener('click', () => {
    // 1. 결과 화면과 이전 시험지를 숨깁니다.
    document.getElementById('result-display-section').classList.add('hidden');
    document.getElementById('test-section').classList.add('hidden');
    // "결과 확인" 버튼도 다시 보이게 합니다. (다음 시험을 위해)
    document.getElementById('submit-test-button').classList.remove('hidden');

    // 2. AI 분석 결과와 시험 설정 화면을 다시 보여줍니다.
    document.getElementById('result-section').classList.remove('hidden');
    const testConfigSection = document.getElementById('test-config-section');
    testConfigSection.classList.remove('hidden');

    // 3. 사용자가 바로 재설정할 수 있도록 시험 설정 부분으로 스크롤합니다.
    testConfigSection.scrollIntoView({ behavior: 'smooth' });
});