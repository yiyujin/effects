const sourceCode = `var a = 1;
var outer = function(){
var inner = function(){
var a = 3;
};
inner();
};
outer();`;

let tokens = [];
let variableDeclarations = [];
let assignments = [];
let currentTokenIndex = 0;
let isAnimating = false;
let currentScope = 0;
let lineScopeMapping = []; // Track scope level for each line
let starts = [0, 1, 2]; // Starting line for each scope (0-indexed)
let scopeEndLines = [7, 6, 4]; // End line for each scope (0-indexed)

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
    lineScopeMapping = []; // Reset scope mapping

    let scopeLevel = 0;
    const lines = sourceCode.split('\n');

    lines.forEach((line, lineIndex) => {
        const closeBraces = (line.match(/}/g) || []).length;
        scopeLevel -= closeBraces;
        if (scopeLevel < 0) scopeLevel = 0;

        // Store scope level for this line
        lineScopeMapping[lineIndex] = scopeLevel;

        const lineDiv = document.createElement('div');
        lineDiv.className = 'code-line';
        lineDiv.id = `line-${lineIndex}`;
        lineDiv.style.display = 'flex';
        lineDiv.style.alignItems = 'center';

        const lineNumberSpan = document.createElement('span');
        lineNumberSpan.className = 'line-number';
        lineNumberSpan.textContent = (lineIndex + 1);
        lineDiv.appendChild(lineNumberSpan);

        const codeTokensDiv = document.createElement('div');
        codeTokensDiv.style.marginLeft = (scopeLevel * 40) + 'px';
        codeTokensDiv.style.flex = '1';

        const lineTokens = tokenize(line);
        lineTokens.forEach((token, tokenIndex) => {
            const span = document.createElement('span');
            span.className = `token ${token.type}`;
            span.textContent = token.value;
            span.id = `token-${lineIndex}-${tokenIndex}`;

            if (
                token.type === 'identifier' &&
                lineTokens[tokenIndex + 1]?.value === '(' &&
                lineTokens[tokenIndex + 2]?.value === ')'
            ) {
                span.classList.add('func-call');
                if (lineTokens[tokenIndex + 1]) lineTokens[tokenIndex + 1].__highlightFuncCall = true;
                if (lineTokens[tokenIndex + 2]) lineTokens[tokenIndex + 2].__highlightFuncCall = true;
            }

            codeTokensDiv.appendChild(span);
        });

        Array.from(codeTokensDiv.children).forEach((span, idx) => {
            if (lineTokens[idx]?.__highlightFuncCall) {
                span.classList.add('func-call');
            }
        });

        lineDiv.appendChild(codeTokensDiv);
        container.appendChild(lineDiv);

        const openBraces = (line.match(/{/g) || []).length;
        scopeLevel += openBraces;
    });
}

function analyzeVariables() {
    variableDeclarations = [];
    assignments = [];
    tokens = tokenize(sourceCode);

    let scopeLevel = 0;
    let lineIndex = 0;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Update line index based on token line
        if (token.line !== undefined) {
            lineIndex = token.line;
        }

        // Track scope level
        if (token.value === '{') {
            scopeLevel++;
        } else if (token.value === '}') {
            scopeLevel--;
        }

        // Detect variable declarations with their scope
        if (['var', 'let', 'const'].includes(token.value)) {
            const nextToken = tokens[i + 1];
            if (nextToken && nextToken.type === 'identifier') {
                variableDeclarations.push({
                    keyword: token.value,
                    name: nextToken.value,
                    tokenIndex: i,
                    scope: lineScopeMapping[lineIndex] || 0,
                    line: lineIndex
                });

                // Find matching assignment for that variable
                const assignmentIndex = tokens.findIndex((t, idx) =>
                    idx > i + 1 && t.value === '=' && tokens[idx - 1]?.value === nextToken.value
                );

                if (assignmentIndex !== -1 && tokens[assignmentIndex + 1]) {
                    let assignmentValue = '';
                    let j = assignmentIndex + 1;
                    const assignmentTokens = [];
                    
                    while (j < tokens.length && tokens[j].value !== ';') {
                        assignmentTokens.push(tokens[j].value);
                        j++;
                    }
                    
                    // Check if this is a function assignment
                    if (assignmentTokens.includes('function')) {
                        assignmentValue = 'function(){ ... }';
                    } else {
                        // Join tokens with appropriate spacing
                        assignmentValue = assignmentTokens.join(' ').replace(/\s+/g, ' ').trim();
                    }

                    assignments.push({
                        name: nextToken.value,
                        value: assignmentValue,
                        scope: lineScopeMapping[lineIndex] || 0
                    });
                }
            }
        }
    }
}

async function startAnimation() {
    if (isAnimating) return;

    isAnimating = true;

    const hoistBtn = document.querySelectorAll('.btn')[0];
    hoistBtn.classList.add('animating');

    drawScopeIndicator(currentScope, 'hoisting');

    analyzeVariables();
    await animateScope(currentScope);

    const executeBtn = document.querySelectorAll('.btn')[1];
    executeBtn.disabled = false;
    hoistBtn.classList.add('completed');

    isAnimating = false;
}

async function startExecute() {
    if (isAnimating) return;
    isAnimating = true;

    const executeBtn = document.querySelectorAll('.btn')[1];
    executeBtn.classList.add('animating');
    executeBtn.disabled = true;

    drawScopeIndicator(currentScope, 'executing');

    await executeScope(currentScope);

    executeBtn.classList.remove('animating');
    executeBtn.classList.add('completed');
    executeBtn.disabled = false;
    isAnimating = false;
}

async function animateScope(targetScope) {
    const dot = document.getElementById('scannerDot');
    const progressFill = document.getElementById('progressFillHoist');
    const allTokenElements = document.querySelectorAll('.token');

    // Filter tokens for the target scope
    const scopeVariables = variableDeclarations.filter(decl => decl.scope === targetScope);
    let hoistedSet = new Set();

    // Get starting and ending lines for this scope
    const startLine = starts[targetScope] || 0;
    const endLine = scopeEndLines[targetScope] || (sourceCode.split('\n').length - 1);
    
    // Filter tokens to scan within the scope boundaries
    const tokensInScope = [];
    for (let i = 0; i < allTokenElements.length; i++) {
        const tokenElement = allTokenElements[i];
        const tokenId = tokenElement.id;
        if (tokenId) {
            const [, lineIndex] = tokenId.split('-').map(Number);
            if (lineIndex >= startLine && lineIndex <= endLine) {
                tokensInScope.push({ element: tokenElement, originalIndex: i });
            }
        }
    }

    const totalTokensToScan = tokensInScope.length;
    
    if (totalTokensToScan === 0) {
        progressFill.style.width = '100%';
        return;
    }

    // During HOISTING: Scan all tokens in the scope
    for (let i = 0; i < tokensInScope.length; i++) {
        const { element: tokenElement, originalIndex } = tokensInScope[i];
        const rect = tokenElement.getBoundingClientRect();
        const containerRect = document.querySelector('.original-code').getBoundingClientRect();
        currentTokenIndex = originalIndex;

        // Move scanner dot
        dot.style.left = (rect.left - containerRect.left + rect.width / 2 - 6) + 'px';
        dot.style.top = (rect.top - containerRect.top + rect.height / 2 - 6) + 'px';
        dot.classList.add('active');

        // Update progress based on scanning progress (not variable count)
        progressFill.style.width = ((i + 1) / totalTokensToScan * 100) + '%';

        await sleep(100);

        const tokenText = tokenElement.textContent;

        // Check for variable declarations and hoist them
        if (['var', 'let', 'const'].includes(tokenText)) {
            const nextToken = tokens[currentTokenIndex + 1];
            if (nextToken && nextToken.type === 'identifier') {
                const uniqueKey = `${tokenText}_${nextToken.value}_${currentTokenIndex}`;
                if (!hoistedSet.has(uniqueKey)) {
                    const varDecl = variableDeclarations.find(decl =>
                        decl.keyword === tokenText &&
                        decl.name === nextToken.value &&
                        decl.tokenIndex === currentTokenIndex &&
                        decl.scope === targetScope
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
}

function getScopeLineRange(scope) {
    return {
        start: starts[scope] || 0,
        end: scopeEndLines[scope] || (sourceCode.split('\n').length - 1),
    };
}

async function executeScope(targetScope) {
    const dot = document.getElementById('scannerDot');
    const assignmentContainer = document.getElementById('hoistedAssignments');
    const progressFill = document.getElementById('progressFillExecute');
    const allTokenElements = document.querySelectorAll('.token');

    const { start: startLine, end: endLine } = getScopeLineRange(targetScope);

    // Filter assignments for current scope
    const scopeAssignments = assignments.filter(assignment => assignment.scope === targetScope);

    // Find the function call that enters the next scope
    const nextScopeCall = findNextScopeFunctionCall(targetScope);

    // Filter tokens to scan only within the start–end line range
    const tokensFromStartLine = [];
    for (let i = 0; i < allTokenElements.length; i++) {
        const tokenElement = allTokenElements[i];
        const tokenId = tokenElement.id;
        if (tokenId) {
            const [, lineIndex] = tokenId.split('-').map(Number);
            if (lineIndex >= startLine && lineIndex <= endLine) {
                tokensFromStartLine.push({ element: tokenElement, originalIndex: i });
            }
        }
    }

    const separator = document.createElement('div');
    separator.style.borderTop = '1px solid var(--white40)';
    separator.style.margin = '20px 0 10px 0';
    assignmentContainer.appendChild(separator);

    const title = document.createElement('div');
    title.textContent = `// Assignments (Scope ${currentScope}):`;
    title.style.color = 'var(--white40)';
    title.style.fontStyle = 'italic';
    title.style.marginBottom = '10px';
    assignmentContainer.appendChild(title);

    let assignmentIndex = 0;

    // During EXECUTION: Scan and stop at function calls
    for (let i = 0; i < tokensFromStartLine.length; i++) {
        const { element: tokenElement, originalIndex } = tokensFromStartLine[i];
        const rect = tokenElement.getBoundingClientRect();
        const containerRect = document.querySelector('.original-code').getBoundingClientRect();
        currentTokenIndex = originalIndex;

        // Move scanner dot
        dot.style.left = (rect.left - containerRect.left + rect.width / 2 - 6) + 'px';
        dot.style.top = (rect.top - containerRect.top + rect.height / 2 - 6) + 'px';
        dot.classList.add('active');

        await sleep(100); // execution speed

        const tokenText = tokenElement.textContent;

        // Update progress based on scanning position
        progressFill.style.width = ((i + 1) / tokensFromStartLine.length * 100) + '%';

        // Stop at function call
        if (nextScopeCall && isMatchingFunctionCall(tokenElement, nextScopeCall)) {
            tokenElement.style.backgroundColor = 'rgba(255, 165, 0, 0.6)';
            tokenElement.style.borderRadius = '3px';
            tokenElement.style.padding = '1px 2px';

            const nextScopeBtn = document.querySelectorAll('.btn')[2];
            nextScopeBtn.textContent = `Enter ${nextScopeCall.name}()`;
            nextScopeBtn.disabled = false;

            return;
        }

        // Process assignment
        if (assignmentIndex < scopeAssignments.length && tokenText === '=') {
            const assignment = scopeAssignments[assignmentIndex];

            const assignmentLine = document.createElement('div');
            assignmentLine.className = 'hoisted-line';
            assignmentLine.textContent = `${assignment.name} = ${assignment.value};`;
            assignmentContainer.appendChild(assignmentLine);

            assignmentIndex++;
        }
    }

    // dot.classList.remove('active'); // Optional: leave it active until next action
}


function findNextScopeFunctionCall(currentScope) {
    // Map scopes to their corresponding function calls
    const scopeToFunctionCall = {
        0: { name: 'outer', targetScope: 1 },
        1: { name: 'inner', targetScope: 2 }
    };
    
    return scopeToFunctionCall[currentScope] || null;
}

function isMatchingFunctionCall(tokenElement, expectedCall) {
    const tokenText = tokenElement.textContent;
    
    // Check if this token is the function name we're looking for
    if (tokenText === expectedCall.name) {
        // Get the token element's ID to find its position
        const tokenId = tokenElement.id;
        if (tokenId) {
            const [, lineIndex, tokenIndex] = tokenId.split('-').map(Number);
            
            // Check if the next tokens are '(' and ')'
            const nextToken1 = document.getElementById(`token-${lineIndex}-${tokenIndex + 1}`);
            const nextToken2 = document.getElementById(`token-${lineIndex}-${tokenIndex + 2}`);
            
            if (nextToken1?.textContent === '(' && nextToken2?.textContent === ')') {
                return true;
            }
        }
    }
    return false;
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

    flyingVar.style.transition = 'all 0.8s linear';
    flyingVar.style.left = targetRect.left + 'px';
    flyingVar.style.top = targetRect.top + (hoistedContainer.children.length * 30) + 'px';

    await sleep(1000);

    const hoistedLine = document.createElement('div');
    hoistedLine.textContent = `${varDecl.keyword} ${varDecl.name};`;

    hoistedContainer.appendChild(hoistedLine);

    document.body.removeChild(flyingVar);
}

function resetButtonStates() {
    const buttons = document.querySelectorAll('.btn');
    
    // Reset all button classes
    buttons.forEach(btn => {
        btn.classList.remove('animating', 'completed');
    });
    
    // Set button states based on current scope
    if (currentScope === 0) {
        buttons[0].disabled = false;
        buttons[1].disabled = true;
        buttons[2].disabled = true;
    } else {
        buttons[0].disabled = false;
        buttons[1].disabled = true;
        buttons[2].disabled = true;
    }

    const nextScopeBtn = buttons[2];
    nextScopeBtn.textContent = 'Next Scope';
    nextScopeBtn.style.backgroundColor = '';

    // isAnimating = false;
}

function resetAnimation() {
    document.getElementById('hoistedDeclarations').innerHTML = '';
    document.getElementById('hoistedAssignments').innerHTML = '';
    document.getElementById('progressFillHoist').style.width = '0%';
    document.getElementById('progressFillExecute').style.width = '0%';

    document.querySelectorAll('.token').forEach(token => {
        token.classList.remove('detected');
        token.style.backgroundColor = '';
        token.style.borderRadius = '';
        token.style.padding = '';
    });
    document.getElementById('scannerDot').classList.remove('active');

    resetButtonStates();
}

function nextScope() {
    if (isAnimating) return;

    // REMOVE INDICATOR
    const container = document.getElementById('originalCodeContainer');
    const existing = container.querySelector('.scope-indicator');
    if (existing) existing.remove();
    
    // Clear any function call highlights
    document.querySelectorAll('.token').forEach(token => {
        if (token.style.backgroundColor === 'rgba(255, 165, 0, 0.6)') {
            token.style.backgroundColor = '';
            token.style.borderRadius = '';
            token.style.padding = '';
        }
    });
    
    // Increment scope
    currentScope++;
    
    // Check if we have variables in this scope
    analyzeVariables();
    const maxScope = Math.max(...variableDeclarations.map(decl => decl.scope));
    
    if (currentScope > maxScope) {
        currentScope = 0; // Reset to beginning
    }
    
    // Update scope display
    document.getElementById('scope').textContent = `Scope : ${currentScope}`;
    
    // Show which variables are in this scope
    const scopeVars = variableDeclarations.filter(decl => decl.scope === currentScope);
    console.log(`Scope ${currentScope} variables:`, scopeVars.map(v => v.name));
    
    // Reset everything for the new scope
    resetAnimation();
}

function drawScopeIndicator(scope, mode = 'hoisting') {
    // Remove previous indicator
    const container = document.getElementById('originalCodeContainer');
    const existing = container.querySelector('.scope-indicator');

    if (existing) existing.remove();

    const startLine = starts[scope];
    const endLine = scopeEndLines[scope];

    const startElem = document.getElementById(`line-${startLine}`);
    const endElem = document.getElementById(`line-${endLine}`);

    if (!startElem || !endElem) return;

    const startRect = startElem.getBoundingClientRect();
    const endRect = endElem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const top = startRect.top - containerRect.top;
    const height = endRect.bottom - startRect.top;

    const indicator = document.createElement('div');
    indicator.className = 'scope-indicator ' + (mode === 'hoisting' ? 'scope-hoisting' : 'scope-executing');
    indicator.style.top = `${top}px`;
    indicator.style.height = `${height}px`;

    container.appendChild(indicator);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
renderOriginalCode();
analyzeVariables();
document.getElementById('scope').textContent = `Scope : ${currentScope}`;