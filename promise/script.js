// CODE
import { sourceCode } from './source.js';

window.onload = () => {
    const codeBlock = document.getElementById('code-block');
    const lines = sourceCode.trim().split('\n');

    codeBlock.innerHTML = '';

    let stepIndex = 1;

    lines.forEach((line) => {
        const div = document.createElement('div');
        div.className = 'code-line';

        if (line.trimStart().startsWith("*")) {
          const cleaned = line.replace("*", ""); // Remove the asterisk, keep indentation
          div.textContent = cleaned;
          div.id = `line-${stepIndex}`;
          div.classList.add('clickable');
          div.setAttribute('onclick', `playStep(${stepIndex})`);
          stepIndex++;
        } else {
          div.textContent = line;
        }

        codeBlock.appendChild(div);
    });
};


function highlightCode(lineId) {
    document.querySelectorAll('.code-line').forEach(line => {
        line.classList.remove('highlighted');
    });
    if (lineId) {
        document.getElementById(lineId).classList.add('highlighted');
    }
}

function hideAll() {
    document.querySelectorAll('.node').forEach(node => {
        gsap.set(node, { opacity: 0 });
    });
    
    document.querySelectorAll('.lines').forEach(conn => {
        conn.style.opacity = 0;
    });

    highlightCode(null);
}


// ANIMATION
const m = 160;

const drawnNodes = {}; // { 'promise-node': lastStepShown }

const nodePositions = [
  {
    id: 'promise-node',
    label: 'Promise',
    steps: [
      { x: 0, y: 0 },       // step 1
      { x: 0, y: 0 },       // step 2 (no change)
      { x: 0, y: 0 },       // step 3
      { x: 0, y: 0 }        // step 4
    ]
  },
  {
    id: 'resolve-node',
    label: 'resolve',
    steps: [
      { x: -m, y: m },  // step 1
      { x: -m, y: m },  // step 2
      { x: -m, y: m * 2 },  // step 3
      { x: -m, y: m * 3 } // step 4 (moves down)
    ]
  },
  {
    id: 'reject-node',
    label: 'reject',
    steps: [
      { x: m, y: m },
      { x: m, y: m },
      { x: m, y: m * 2 },
      { x: m, y: m * 2 }
    ]
  },
  {
    id: 'isnan-node',
    label: 'isNaN',
    steps: [
      { x: 0, y: m },
      { x: 0, y: m },
      { x: 0, y: m },
      { x: 0, y: m },
    ]
  },
  {
    id: 'settimeout-node',
    label: 'setTimeout()',
    steps: [
      { x: -m, y: m * 2 },
      { x: -m, y: m * 2 },
      { x: -m, y: m * 2 },
      { x: -m, y: m * 2 }
    ]
  }
];


function playStep(step) {
  hideAll();

  if (step >= 1) {
    highlightCode('line-1');
    showNode('promise-node', step);
  }


  if (step >= 2) {
    highlightCode('line-2');
    showNode('promise-node', step);
    showNode('resolve-node', step);
    showNode('reject-node', step);

    drawCurvedLine("#promise-node", "#resolve-node", "line1");
    drawCurvedLine("#promise-node", "#reject-node", "line2");
  }

  if (step >= 3) {
    highlightCode('line-3');

    // Wait for all showNode animations to complete
    Promise.all([
      showNode('isnan-node', step, true),
      showNode('resolve-node', step),
      showNode('reject-node', step)
    ]).then(() => {
      drawCurvedLine("#promise-node", "#isnan-node", "line3");
      drawCurvedLine("#isnan-node", "#resolve-node", "line1");
      drawCurvedLine("#isnan-node", "#reject-node", "line2");
    });
  }

  if (step >= 4) {
    highlightCode('line-4');

    Promise.all([
      showNode('settimeout-node', step),
      showNode('resolve-node', step),
    ]).then(() => {
      drawCurvedLine("#isnan-node", "#settimeout-node", "line4");
      drawCurvedLine("#settimeout-node", "#resolve-node", "line1");
      drawCurvedLine("#promise-node", "#isnan-node", "line3", false);
      drawCurvedLine("#isnan-node", "#reject-node", "line2", false);
    });
  }
}

window.playStep = playStep;

function showNode(id, step) {
  return new Promise((resolve) => {
    const config = nodePositions.find(n => n.id === id);
    if (!config || !config.steps[step - 1]) return resolve();

    const pos = config.steps[step - 1];
    const prev = config.steps[step - 2];
    const node = document.getElementById(id);

    const lastStep = drawnNodes[id];
    let startOpa = 0;

    if (lastStep !== undefined) {
      const lastPos = config.steps[lastStep - 1];
      const noChange = lastPos && lastPos.x === pos.x && lastPos.y === pos.y;

      if (noChange) {
        node.style.opacity = 1;
        gsap.set(node, { x: pos.x, y: pos.y });
        return resolve(); // No animation needed
      } else {
        startOpa = 1;
      }
    }

    drawnNodes[id] = step;

    const fromX = prev ? prev.x : pos.x;
    const fromY = prev ? prev.y : pos.y;

    const tl = gsap.timeline();

tl.fromTo(node,
  {
    opacity: startOpa,
    x: fromX,
    y: fromY,
  },
  {
    duration: 1,
    opacity: 1,
    x: pos.x,
    y: pos.y,
    ease: "power1.out",
    onComplete: resolve // resolve immediately after position animation finishes
  },
  0
);

    if (lastStep === undefined) {
      tl.fromTo(node,
        {
          scale: 1.2
        },
        {
          duration: 2,
          scale: 1,
          ease: "elastic.out(1, 0.3)"
        },
        0
      );
    }
  });
}

  // LINES
  function getCenter(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 + window.scrollX,
    y: rect.top + rect.height / 2 + window.scrollY
  };
  }

const lastLinePositions = {};

function drawCurvedLine(fromSelector, toSelector, id, animate = true) {
  const fromEl = document.querySelector(fromSelector);
  const toEl = document.querySelector(toSelector);

  if (!fromEl || !toEl) {
    // Defensive: if either element missing, hide line and return
    const path = document.getElementById(id);
    if (path) gsap.set(path.style, { opacity: 0 });
    return;
  }

  const start = getCenter(fromEl);
  const end = getCenter(toEl);

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Thresholds for straight lines and position changes
  const straightThreshold = 5;  // For straight line detection
  const changeThreshold = 1;    // For detecting meaningful position changes

  // Build path data (curved or straight)
  let pathData;
  if (Math.abs(dx) < straightThreshold || Math.abs(dy) < straightThreshold) {
    pathData = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  } else {
    const curveDirection = dx >= 0 ? 1 : -1;
    const curveAmount = 100;
    const cp1 = { x: start.x + curveAmount * curveDirection, y: start.y };
    const cp2 = { x: end.x - curveAmount * curveDirection, y: end.y };
    pathData = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  }

  let path = document.getElementById(id);
  if (!path) {
    path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "lines");
    path.setAttribute("id", id);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "black");
    path.setAttribute("stroke-width", "2");
    path.style.opacity = 0;
    document.getElementById("svg-container").appendChild(path);
  }

  // Check if positions changed meaningfully
  const lastPos = lastLinePositions[id];
  const positionsUnchanged = lastPos &&
    Math.abs(lastPos.start.x - start.x) < changeThreshold &&
    Math.abs(lastPos.start.y - start.y) < changeThreshold &&
    Math.abs(lastPos.end.x - end.x) < changeThreshold &&
    Math.abs(lastPos.end.y - end.y) < changeThreshold;

  // Update stored positions
  lastLinePositions[id] = {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y }
  };

  // Set new path
  path.setAttribute("d", pathData);

  const pathLength = path.getTotalLength();

  if (positionsUnchanged) {
    // Positions haven't changed, skip animation & just show instantly
    gsap.set(path.style, { opacity: 1, strokeDashoffset: 0, strokeDasharray: pathLength });
  } else if (animate) {
    // Positions changed, animate the redraw
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    gsap.to(path.style, {
      opacity: 1,
      strokeDashoffset: 0,
      duration: 1.5,
      ease: "power1.out"
    });
  } else {
    // Animate is false, so just show instantly
    gsap.set(path.style, { opacity: 1, strokeDashoffset: 0, strokeDasharray: pathLength });
  }
}

// FUNCTION CALL
function animateFlowAlongPath(pathId, color = "red", duration = 2) {
  const basePath = document.getElementById(pathId);
  if (!basePath) return;

  // Create or reuse the flowing path
  const flowPathId = pathId + "-flow";
  let flowPath = document.getElementById(flowPathId);

  if (!flowPath) {
    flowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    flowPath.setAttribute("id", flowPathId);
    flowPath.setAttribute("fill", "none");
    flowPath.setAttribute("stroke", color);
    flowPath.setAttribute("stroke-width", "4");
    flowPath.style.pointerEvents = "none"; // ignore mouse
    document.getElementById("svg-container").appendChild(flowPath);
  }

  // Copy path data
  flowPath.setAttribute("d", basePath.getAttribute("d"));

  const pathLength = flowPath.getTotalLength();

  flowPath.style.strokeDasharray = pathLength;
  flowPath.style.strokeDashoffset = pathLength;
  flowPath.style.opacity = 1;

  // Animate stroke dash offset from full length to 0 - "draw" the path
  return gsap.fromTo(
    flowPath.style,
    { strokeDashoffset: pathLength },
    {
      strokeDashoffset: 0,
      duration: duration,
      ease: "power1.inOut",
      repeat: 0,
      onComplete: () => {
        // Optionally fade out after animation
        gsap.to(flowPath.style, { opacity: 0, duration: 0.5 });
      }
    }
  );
}

function animateFullFlow(flows) {
  const tl = gsap.timeline();

  flows.forEach((flow, i) => {
    const basePath = document.getElementById(flow.id);
    if (!basePath) return;

    const flowPathId = flow.id + "-flow";
    let flowPath = document.getElementById(flowPathId);

    if (!flowPath) {
      flowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      flowPath.setAttribute("id", flowPathId);
      flowPath.setAttribute("fill", "none");
      flowPath.setAttribute("stroke-width", "4");
      flowPath.style.pointerEvents = "none";
      document.getElementById("svg-container").appendChild(flowPath);
    }

    flowPath.setAttribute("d", basePath.getAttribute("d"));
    flowPath.setAttribute("stroke", flow.color);  // <-- Update color here

    const pathLength = flowPath.getTotalLength();
    flowPath.style.strokeDasharray = pathLength;
    flowPath.style.strokeDashoffset = pathLength;
    flowPath.style.opacity = 1;

    tl.fromTo(
      flowPath.style,
      { strokeDashoffset: pathLength },
      {
        strokeDashoffset: 0,
        duration: flow.duration,
        ease: "power1.inOut",
        onComplete: () => {
          gsap.to(flowPath.style, { opacity: 0, duration: 1 });
        }
      },
      i * 0.3 // stagger
    );
  });

  return tl;
}


// Example usage:

const flowsResolve = [
  { id: "line3", color: "red", duration: 1 },
  { id: "line4", color: "red", duration: 1 },
  { id: "line1", color: "red", duration: 1 }
];

const flowsReject = [
  { id: "line3", color: "blue", duration: 1 },
  { id: "line2", color: "blue", duration: 1 }
];

// Attach event listeners with different flows:
document.getElementById("resolve-node").addEventListener("click", () => animateFullFlow(flowsResolve));
document.getElementById("reject-node").addEventListener("click", () => animateFullFlow(flowsReject));

document.getElementById("flow1").addEventListener("click", () => animateFullFlow(flowsResolve));
document.getElementById("flow2").addEventListener("click", () => animateFullFlow(flowsReject));