const board = document.getElementById('board');
const boardWrapper = document.getElementById('boardWrapper');
const scaleLabel = document.getElementById('scaleLabel');

let notes = {};
let scale = 1;

// Center the board's origin (10000, 10000) on the screen
let offset = {
  x: -(10000 - window.innerWidth / 2),
  y: -(10000 - (window.innerHeight - 64) / 2) // 64 is new topbar height
};

const COLORS = ['#FFFB7D', '#FFD6A5', '#FDFFAB', '#CBFFA9', '#BDE0FE', '#E9D8FD'];

applyTransform();

let isPanning = false;
let lastPan = { x: 0, y: 0 };

function applyTransform(){
  board.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  scaleLabel.textContent = `scale: ${scale.toFixed(2)}`;
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function createStickyEl(note){
  const el = document.createElement('div');
  el.className = 'sticky';
  el.style.left = `${note.x}px`;
  el.style.top = `${note.y}px`;
  el.style.background = note.color || COLORS[note.id % COLORS.length];

  const rotation = Math.random() * 6 - 3;
  el.style.setProperty('--rotation', `${rotation}deg`);
  el.style.transform = `translate(-50%,-50%) rotate(${rotation}deg)`;

  el.innerHTML = `
    <div class="text">${escapeHtml(note.text)}</div>
    <div class="meta">— ${escapeHtml(note.name || 'Anonymous')}</div>
  `;
  return el;
}

// NEW: AUTO POSITIONING with Fermat's Spiral (guaranteed no overlap)
// This algorithm arranges items in a spiral like sunflower seeds.
function autoPositionNotes(arr) {
  const centerX = 10000;
  const centerY = 10000;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // The magic angle for spacing
  
  // This constant determines the spacing between notes.
  // A larger value means more space.
  const spacing = 150;

  arr.forEach((note, i) => {
    // Calculate the radius and angle for the current note
    const radius = spacing * Math.sqrt(i + 1); // Get further from center for each note
    const angle = i * goldenAngle;

    note.x = centerX + radius * Math.cos(angle);
    note.y = centerY + radius * Math.sin(angle);
  });
}


function renderAll(){
  board.innerHTML = '';
  Object.values(notes).forEach(n => board.appendChild(createStickyEl(n)));
}

async function loadFromJson() {
  try {
    const resp = await fetch('/data.json', {cache: "no-store"});
    if (!resp.ok) throw new Error('no data.json');
    const arr = await resp.json();
    autoPositionNotes(arr);
    notes = {};
    arr.forEach(n => { notes[n.id] = n; });
    renderAll();
  } catch(e) {
    console.warn('Could not load data.json', e);
    notes = {};
    renderAll();
  }
}

// Panning + zoom
window.addEventListener('pointermove', (e)=>{
  if(isPanning){
    const dx = e.clientX - lastPan.x;
    const dy = e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    offset.x += dx; offset.y += dy;
    applyTransform();
  }
});

window.addEventListener('pointerup', ()=>{
  isPanning = false;
  boardWrapper.style.cursor = 'grab';
});

boardWrapper.addEventListener('pointerdown', (e)=>{
  if(e.target === boardWrapper || e.target === board){
    if(e.button !== 0) return;
    isPanning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    boardWrapper.style.cursor = 'grabbing';
  }
});

boardWrapper.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = boardWrapper.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const before = {
    x: (mx - offset.x)/scale,
    y: (my - offset.y)/scale
  };

  const zf = e.deltaY < 0 ? 1.08 : 1/1.08;
  scale = Math.min(3, Math.max(0.4, scale*zf));

  offset.x = mx - before.x * scale;
  offset.y = my - before.y * scale;

  applyTransform();
}, { passive:false });

loadFromJson();
applyTransform();