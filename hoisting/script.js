const sourceCode = `var a = 1;
var outer = function(){ ... };
`;

let tokens = [];
let variableDeclarations = [];
let assignments = [];
let currentTokenIndex = 0;
let isAnimating = false;

function tokenize(code) {
    const tokenRegex = /(\bvar\b|\blet\b|\bconst\b|\bfunction\b)|([a-zA-Z_$][a-zA-Z0-9_$]*)|([=+\-*/(){};])|(\d+\.?\d*)|('[^']*'|"[^"]*")|(\s+)|(.)/g;
    const tokens = [];
    let match;
    let position = 0;

    while ((match = tokenRegex.exec(code)) !== null) {
        if (match[0].trim()) {
            tokens.push({
                value: match[0],
                type: getTokenType(match[0]),
                position: position,
                line: code.substring(0, match.index).split('\n').length - 1
            });
        }
        position++;
    }
    return tokens;
}

function getTokenType(token) {
    if (['var', 'let', 'const'].includes(token)) return 'keyword';
    if (token === 'function') return 'function';
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) return 'identifier';
    if (['=', '+', '-', '*', '/', '(', ')', '{', '}', ';'].includes(token)) return 'operator';
    if (/^\d+\.?\d*$/.test(token)) return 'number';
    if (/^['"].*['"]$/.test(token)) return 'string';
    return 'default';
}

function renderOriginalCode() {
    const container = document.getElementById('originalCode');
    container.innerHTML = '';

    const lines = sourceCode.split('\n');
    lines.forEach((line, lineIndex) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'code-line';
        lineDiv.id = `line-${lineIndex}`;

        const lineTokens = tokenize(line);
        lineTokens.forEach((token, tokenIndex) => {
            const span = document.createElement('span');
            span.className = `token ${token.type}`;
            span.textContent = token.value;
            span.id = `token-${lineIndex}-${tokenIndex}`;
            lineDiv.appendChild(span);
        });

        container.appendChild(lineDiv);
    });
}

function analyzeVariables() {
    variableDeclarations = [];
    assignments = [];
    tokens = tokenize(sourceCode);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (['var', 'let', 'const'].includes(token.value)) {
            const nextToken = tokens[i + 1];
            if (nextToken && nextToken.type === 'identifier') {
                variableDeclarations.push({
                    keyword: token.value,
                    name: nextToken.value,
                    tokenIndex: i
                });

                // Find matching assignment for that variable
                const assignmentIndex = tokens.findIndex((t, idx) =>
                    idx > i + 1 && t.value === '=' && tokens[idx - 1]?.value === nextToken.value
                );

                if (assignmentIndex !== -1 && tokens[assignmentIndex + 1]) {
                    let assignmentValue = '';
                    let j = assignmentIndex + 1;
                    while (j < tokens.length && tokens[j].value !== ';') {
                        assignmentValue += tokens[j].value;
                        j++;
                    }

                    assignments.push({
                        name: nextToken.value,
                        value: assignmentValue.trim()
                    });
                }
            }
        }
    }
}

async function startAnimation() {
    if (isAnimating) return;

    isAnimating = true;
    document.querySelector('.btn').classList.add('animating');
    document.querySelector('.btn').disabled = true;

    resetAnimation();
    analyzeVariables();

    const dot = document.getElementById('scannerDot');
    const progressFill = document.getElementById('progressFillHoist');
    const allTokenElements = document.querySelectorAll('.token');

    let hoistedSet = new Set();

    for (let i = 0; i < allTokenElements.length; i++) {
        const tokenElement = allTokenElements[i];
        const rect = tokenElement.getBoundingClientRect();
        const containerRect = document.querySelector('.original-code').getBoundingClientRect();
        currentTokenIndex = i;

        // Move scanner dot
        dot.style.left = (rect.left - containerRect.left + rect.width / 2 - 6) + 'px';
        dot.style.top = (rect.top - containerRect.top + rect.height / 2 - 6) + 'px';
        dot.classList.add('active');

        progressFill.style.width = ((i + 1) / allTokenElements.length * 100) + '%';

        await sleep(200); // hoisting speed

        const tokenText = tokenElement.textContent;

        if (['var', 'let', 'const'].includes(tokenText)) {
            const nextToken = tokens[currentTokenIndex + 1];
            if (nextToken && nextToken.type === 'identifier') {
                const uniqueKey = `${tokenText}_${nextToken.value}_${currentTokenIndex}`;
                if (!hoistedSet.has(uniqueKey)) {
                    const varDecl = variableDeclarations.find(decl =>
                        decl.keyword === tokenText &&
                        decl.name === nextToken.value &&
                        decl.tokenIndex === currentTokenIndex
                    );
                    if (varDecl) {
                        tokenElement.classList.add('detected');
                        hoistedSet.add(uniqueKey);
                        await hoistVariable(varDecl, tokenElement);
                    }
                }
            }
        }
    }

    dot.classList.remove('active');

    const executeBtn = document.querySelectorAll('.btn')[1];
    executeBtn.disabled = false;
}

async function startExecute() {
    isAnimating = true;
    const executeBtn = document.querySelectorAll('.btn')[1];
    executeBtn.classList.add('animating');
    executeBtn.disabled = true;

    const assignmentContainer = document.getElementById('hoistedAssignments');
    const progressFill = document.getElementById('progressFillExecute');
    const total = assignments.length;

    // SMOOTH HEIGHT GROWTH
    const codeContainer = document.querySelector('.code');
    codeContainer.classList.add('open');
    await sleep(10);
    codeContainer.style.maxHeight = codeContainer.scrollHeight + 'px';

    const separator = document.createElement('div');
    separator.style.borderTop = '1px solid var(--white40)';
    separator.style.margin = '20px 0 10px 0';
    assignmentContainer.appendChild(separator);

    // SMOOTH HEIGHT GROWTH
    codeContainer.classList.add('open');
    await sleep(10);
    codeContainer.style.maxHeight = codeContainer.scrollHeight + 'px';

    const title = document.createElement('div');
    title.textContent = '// Assignments:';
    title.style.color = 'var(--white40)';
    title.style.fontStyle = 'italic';
    title.style.marginBottom = '10px';
    assignmentContainer.appendChild(title);

    // SMOOTH HEIGHT GROWTH
    codeContainer.classList.add('open');
    await sleep(10);
    codeContainer.style.maxHeight = codeContainer.scrollHeight + 'px';

    for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];

        await sleep(100);
        
        const assignmentLine = document.createElement('div');
        assignmentLine.className = 'hoisted-line';
        assignmentLine.textContent = `${assignment.name} = ${assignment.value};`;
        assignmentContainer.appendChild(assignmentLine);

        // Update progress fill
        progressFill.style.width = ((i + 1) / total * 100) + '%';
    }


}

async function hoistVariable(varDecl, tokenElement) {
    const flyingVar = document.createElement('div');
    flyingVar.className = 'flying-variable';
    flyingVar.textContent = `${varDecl.keyword} ${varDecl.name};`;

    const rect = tokenElement.getBoundingClientRect();
    flyingVar.style.position = 'fixed';
    flyingVar.style.left = rect.left + 'px';
    flyingVar.style.top = rect.top + 'px';
    flyingVar.style.zIndex = '1000';

    document.body.appendChild(flyingVar);

    const hoistedContainer = document.getElementById('hoistedDeclarations');
    const targetRect = hoistedContainer.getBoundingClientRect();

    await sleep(100);

    // flyingVar.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    flyingVar.style.transition = 'all 0.8s linear';

    flyingVar.style.left = targetRect.left + 'px';
    flyingVar.style.top = targetRect.top + (hoistedContainer.children.length * 30) + 'px';

    await sleep(1000);

    const hoistedLine = document.createElement('div');
    hoistedLine.textContent = `${varDecl.keyword} ${varDecl.name};`;

    // SMOOTH HEIGHT GROWTH
    const codeContainer = document.querySelector('.code');
    codeContainer.classList.add('open');
    await sleep(20);
    codeContainer.style.maxHeight = codeContainer.scrollHeight + 'px';
    
    hoistedContainer.appendChild(hoistedLine);

    document.body.removeChild(flyingVar);
}

function resetAnimation() {
    document.getElementById('hoistedDeclarations').innerHTML = '';
    document.getElementById('hoistedAssignments').innerHTML = '';
    document.getElementById('progressFillHoist').style.width = '0%';
    document.getElementById('progressFillExecute').style.width = '0%';

    document.querySelectorAll('.token').forEach(token => {
        token.classList.remove('detected');
    });
    document.getElementById('scannerDot').classList.remove('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

renderOriginalCode();