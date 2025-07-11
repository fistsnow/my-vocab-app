// HTML 요소들을 가져옵니다.
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const sourceLanguageSelect = document.getElementById('source-language');
const extractedTextArea = document.getElementById('extracted-text');
const testConfigSection = document.getElementById('test-config-section');
const startTestButton = document.getElementById('start-test-button');
const submitTestButton = document.getElementById('submit-test-button');
const backToStartButton = document.getElementById('back-to-start-button');
const questionsContainer = document.getElementById('questions-container');
const resultDisplaySection = document.getElementById('result-display-section');
const scoreText = document.getElementById('score-text'); // 점수 텍스트 요소 추가
const reviewContainer = document.getElementById('review-container'); // 리뷰 컨테이너 요소 추가
const testSection = document.getElementById('test-section');
const uploadSection = document.querySelector('.upload-section');
const resultSection = document.getElementById('result-section');
const numQuestionsInput = document.getElementById('num-questions');

// 추출된 단어를 저장할 전역 변수 (초기화)
let parsedWords = [];
// 시험 문제 데이터를 저장할 전역 변수 (초기화)
let questionsData = []; 

// UI 상태 관리 함수 (중복 코드를 줄이고 가독성 높임)
function setUIState(state) {
    // 모든 섹션을 기본적으로 숨깁니다.
    uploadSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    testConfigSection.classList.add('hidden');
    testSection.classList.add('hidden');
    resultDisplaySection.classList.add('hidden');
    submitTestButton.classList.remove('hidden'); // '결과 확인' 버튼은 항상 다시 보이게 함

    switch (state) {
        case 'upload':
            uploadSection.classList.remove('hidden');
            fileInput.value = ''; // 파일 입력 초기화
            extractedTextArea.value = ''; // 텍스트 영역 초기화
            scoreText.textContent = ''; // 점수 텍스트 초기화
            reviewContainer.innerHTML = ''; // 리뷰 컨테이너 초기화
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'analysis_result':
            resultSection.classList.remove('hidden');
            testConfigSection.classList.remove('hidden');
            // '새로운 시험 시작하기' 시 이미 추출된 단어가 있다면 이 상태로 돌아옴
            if (parsedWords && parsedWords.length > 0) {
                 numQuestionsInput.max = parsedWords.length;
                 numQuestionsInput.value = Math.min(10, parsedWords.length);
            }
            resultSection.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'test_in_progress':
            testSection.classList.remove('hidden');
            testSection.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'test_result':
            resultDisplaySection.classList.remove('hidden');
            resultDisplaySection.scrollIntoView({ behavior: 'smooth' });
            break;
    }
}


// '단어 추출하기' 버튼에 클릭 이벤트 리스너를 추가합니다.
uploadButton.addEventListener('click', async () => {
    const file = fileInput.files[0];
    
    if (!file) {
        extractedTextArea.value = '파일을 먼저 선택해주세요.';
        return;
    }

    const sourceLanguage = sourceLanguageSelect.value;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_language', sourceLanguage);

    extractedTextArea.value = "파일을 업로드하고 AI로 분석 중입니다...\n잠시만 기다려주세요.";
    setUIState('analysis_result'); // 분석 결과 섹션을 바로 보이게 시작

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.status === 'success') {
            parsedWords = data.parsed_words; 
            extractedTextArea.value = data.text.trim();
            
            setUIState('analysis_result'); // 성공 시 분석 결과 섹션 및 시험 설정 표시
            
        } else {
            extractedTextArea.value = `오류 발생: ${data.message}\n다시 시도해주세요.`;
            setUIState('upload'); // 오류 시 업로드 섹션으로 돌아감
        }
    } catch (error) {
        console.error('Error:', error);
        extractedTextArea.value = '업로드 또는 분석 중 네트워크/서버 오류가 발생했습니다.';
        setUIState('upload'); // 오류 시 업로드 섹션으로 돌아감
    }
});

// --- 시험 시작 로직 ---
startTestButton.addEventListener('click', async () => {
    const testType = document.getElementById('test-type').value;
    const numQuestions = document.getElementById('num-questions').value;

    if (!parsedWords || parsedWords.length === 0) {
        alert('추출된 단어가 없습니다. 파일을 먼저 업로드해주세요.');
        return;
    }
    if (numQuestions <= 0 || numQuestions > parsedWords.length) {
        alert(`문제 수는 1개 이상 ${parsedWords.length}개 이하로 설정해주세요.`);
        return;
    }

    try {
        const response = await fetch('/create-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                words: parsedWords,
                test_type: testType,
                num_questions: numQuestions
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            questionsData = data.questions;
            displayTest(data);
            setUIState('test_in_progress'); // 시험 진행 중 상태로 변경
        } else {
            alert(`시험 생성 실패: ${data.message}`);
        }
    } catch (error) {
        console.error('시험 생성 중 에러:', error);
        alert('시험 생성 중 네트워크/서버 오류가 발생했습니다.');
    }
});

// 시험 문제를 화면에 표시하는 함수
function displayTest(data) {
    questionsContainer.innerHTML = ''; // 기존 문제 초기화

    const testType = document.getElementById('test-type').value; 

    data.questions.forEach(q => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block';
        questionBlock.dataset.questionNum = q.question_num;

        let questionTextHTML = '';
        if (testType === 'word-to-def') {
            questionTextHTML = `<p>${q.question_num}. 다음 단어의 뜻은? : "<strong>${q.question_text}</strong>"</p>`;
        } else { 
            questionTextHTML = `<p>${q.question_num}. 다음 뜻에 해당하는 단어는? : "<strong>${q.question_text}</strong>"</p>`;
        }

        let choicesHTML = '<div class="choices">';
        q.choices.forEach(choice => {
            choicesHTML += `
                <label>
                    <input type="radio" name="question-${q.question_num}" value="${choice}">
                    ${choice}
                </label>
            `;
        });
        choicesHTML += '</div>';

        questionBlock.innerHTML = questionTextHTML + choicesHTML;
        questionsContainer.appendChild(questionBlock);
    });
}


// --- 채점 로직 ---
submitTestButton.addEventListener('click', () => {
    let score = 0;
    const testType = document.getElementById('test-type').value; 

    const allQuestionBlocks = document.querySelectorAll('.question-block');
    reviewContainer.innerHTML = ''; // 이전 리뷰 내용 초기화

    allQuestionBlocks.forEach(block => {
        const questionNum = parseInt(block.dataset.questionNum);
        const selectedRadio = block.querySelector(`input[name="question-${questionNum}"]:checked`);
        
        const questionInfo = questionsData.find(q => q.question_num === questionNum);
        const correctAnswer = questionInfo.correct_answer; 
        
        let reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        let isCorrect = false;

        if (selectedRadio) {
            if (selectedRadio.value === correctAnswer) {
                score++;
                isCorrect = true;
                reviewItem.innerHTML = `<p class="correct-text">✅ 문제 ${questionNum}. 정답! (${questionInfo.question_text} : ${correctAnswer})</p>`;
            } else {
                reviewItem.innerHTML = `<p class="incorrect-text">❌ 문제 ${questionNum}. 오답! 당신의 답: "${selectedRadio.value}", 정답: "${correctAnswer}" (${questionInfo.question_text} : ${correctAnswer})</p>`;
            }
        } else {
            reviewItem.innerHTML = `<p class="skipped-text">⚠️ 문제 ${questionNum}. 미응답. 정답: "${correctAnswer}" (${questionInfo.question_text} : ${correctAnswer})</p>`;
        }
        reviewContainer.appendChild(reviewItem);

        // 시각적 피드백: 정답 및 오답 표시
        block.querySelectorAll('.choices label').forEach(label => {
            const radio = label.querySelector('input');
            if (radio.value === correctAnswer) {
                label.classList.add('correct');
            } else if (selectedRadio && radio === selectedRadio && !isCorrect) {
                label.classList.add('incorrect');
            }
            radio.disabled = true; // 채점 후 모든 라디오 버튼 비활성화
        });
    });

    submitTestButton.classList.add('hidden'); // '결과 확인' 버튼 숨김
    
    scoreText.textContent = `총 ${questionsData.length}문제 중 ${score}개를 맞혔습니다!`; // 점수 텍스트 업데이트
    setUIState('test_result'); // 시험 결과 상태로 변경
});


// --- "새로운 시험 시작하기" 로직 ---
backToStartButton.addEventListener('click', () => {
    // 1. 결과 섹션의 내용 (점수 텍스트 및 상세 리뷰) 초기화
    scoreText.textContent = '';
    reviewContainer.innerHTML = ''; 

    // 2. 이전에 추출된 단어 목록(`parsedWords`)이 있다면 재활용합니다.
    if (parsedWords && parsedWords.length > 0) {
        setUIState('analysis_result'); // 분석 결과/시험 설정 섹션으로 돌아감
    } else {
        // 추출된 단어가 없다면 (예: 페이지 첫 로드, 오류 후 초기화),
        // 파일 업로드 섹션으로 돌아갑니다.
        setUIState('upload');
    }
});