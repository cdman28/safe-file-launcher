// ============================================================
// 공유파일 보호 열기 - Renderer (앱 로직)
// 역할: UI 렌더링, 사용자 인터랙션, Main 프로세스와 통신
// ============================================================

// ── 전역 상태 ──
let appData = {
  destinationFolder: '',
  files: [],
  history: []
};

// 색상 변경 중인 파일 ID
let colorEditingFileId = null;

// ── 사용할 색상 목록 ──
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
];

// ── 파일 확장자별 아이콘 매핑 ──
const FILE_ICONS = {
  xlsx: { emoji: '📊', bg: '#DCFCE7', label: 'Excel' },
  xls:  { emoji: '📊', bg: '#DCFCE7', label: 'Excel' },
  csv:  { emoji: '📊', bg: '#DCFCE7', label: 'CSV' },
  docx: { emoji: '📝', bg: '#DBEAFE', label: 'Word' },
  doc:  { emoji: '📝', bg: '#DBEAFE', label: 'Word' },
  pptx: { emoji: '📑', bg: '#FEE2E2', label: 'PPT' },
  ppt:  { emoji: '📑', bg: '#FEE2E2', label: 'PPT' },
  pdf:  { emoji: '📕', bg: '#FEF3C7', label: 'PDF' },
  txt:  { emoji: '📄', bg: '#F1F5F9', label: 'Text' },
  jpg:  { emoji: '🖼️', bg: '#FCE7F3', label: 'Image' },
  jpeg: { emoji: '🖼️', bg: '#FCE7F3', label: 'Image' },
  png:  { emoji: '🖼️', bg: '#FCE7F3', label: 'Image' },
  gif:  { emoji: '🖼️', bg: '#FCE7F3', label: 'Image' },
  zip:  { emoji: '📦', bg: '#E0E7FF', label: 'ZIP' },
  hwp:  { emoji: '📃', bg: '#DBEAFE', label: 'HWP' },
  hwpx: { emoji: '📃', bg: '#DBEAFE', label: 'HWPX' },
};

const DEFAULT_ICON = { emoji: '📁', bg: '#F1F5F9', label: 'File' };

// ── 파일 아이콘 가져오기 ──
function getFileIcon(extension) {
  return FILE_ICONS[extension] || DEFAULT_ICON;
}

// ══════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadAppData();
  renderUI();
  setupEventListeners();
  setupDragAndDrop();
});

// ── 데이터 로드 ──
async function loadAppData() {
  try {
    appData = await window.api.getData();
    if (!appData.files) appData.files = [];
    if (!appData.history) appData.history = [];
  } catch (err) {
    console.error('데이터 로드 실패:', err);
    showToast('error', '설정 데이터를 불러오지 못했습니다.');
  }
}

// ── 데이터 저장 ──
async function saveAppData() {
  try {
    await window.api.saveData(appData);
  } catch (err) {
    console.error('데이터 저장 실패:', err);
    showToast('error', '설정 저장에 실패했습니다.');
  }
}

// ══════════════════════════════════════════════
// UI 렌더링
// ══════════════════════════════════════════════
function renderUI() {
  renderFolderBar();
  renderFileGrid();
  renderEmptyState();
}

// ── 폴더 바 렌더링 ──
function renderFolderBar() {
  const folderBar = document.getElementById('folderBar');
  const folderPathText = document.getElementById('folderPathText');
  const btnOpenFolder = document.getElementById('btnOpenFolder');

  if (appData.destinationFolder) {
    folderBar.classList.remove('warning');
    folderPathText.textContent = `작업 폴더: ${appData.destinationFolder}`;
    btnOpenFolder.style.display = 'flex';
  } else {
    folderBar.classList.add('warning');
    folderPathText.textContent = '⚠️ 작업 폴더를 설정해 주세요 (우측 상단 ⚙️ 설정 클릭)';
    btnOpenFolder.style.display = 'none';
  }
}

// ── 파일 카드 그리드 렌더링 ──
function renderFileGrid() {
  const fileGrid = document.getElementById('fileGrid');
  fileGrid.innerHTML = '';

  appData.files.forEach(file => {
    const card = createFileCard(file);
    fileGrid.appendChild(card);
  });
}

// ── 파일 카드 생성 ──
function createFileCard(file) {
  const card = document.createElement('div');
  card.className = 'file-card';
  card.dataset.fileId = file.id;

  const icon = getFileIcon(file.extension);

  card.innerHTML = `
    <div class="file-card-color-bar" style="background: ${file.color}"></div>
    <div class="file-card-body">
      <div class="file-card-top">
        <div class="file-card-icon" style="background: ${icon.bg}">
          ${icon.emoji}
        </div>
        <div class="file-card-info">
          <div class="file-card-name" title="${file.name}">${file.name}</div>
          <div class="file-card-path" title="${file.originalPath}">${file.originalPath}</div>
        </div>
      </div>
      <div class="file-card-actions">
        <button class="btn-open" data-action="open" data-file-id="${file.id}" title="복사 후 열기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15,3 21,3 21,9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          복사 후 열기
        </button>
        <button class="btn-card-action color-btn" data-action="color" data-file-id="${file.id}" title="색상 변경">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </button>
        <button class="btn-card-action danger" data-action="delete" data-file-id="${file.id}" title="등록 해제">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  return card;
}

// ── 빈 상태 표시/숨기기 ──
function renderEmptyState() {
  const emptyState = document.getElementById('emptyState');
  const fileGrid = document.getElementById('fileGrid');

  if (appData.files.length === 0) {
    emptyState.style.display = 'block';
    fileGrid.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    fileGrid.style.display = 'grid';
  }
}

// ══════════════════════════════════════════════
// 이벤트 리스너
// ══════════════════════════════════════════════
function setupEventListeners() {
  // ── 파일 추가 버튼 ──
  document.getElementById('btnAddFile').addEventListener('click', handleAddFile);

  // ── 설정 모달 ──
  document.getElementById('btnSettings').addEventListener('click', openSettingsModal);
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettingsModal);
  document.getElementById('btnSelectFolder').addEventListener('click', handleSelectFolder);
  document.getElementById('btnSaveSettings').addEventListener('click', handleSaveSettings);

  // ── 이력 패널 ──
  document.getElementById('btnHistory').addEventListener('click', openHistoryPanel);
  document.getElementById('btnCloseHistory').addEventListener('click', closeHistoryPanel);
  document.getElementById('historyOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('historyOverlay')) closeHistoryPanel();
  });
  document.getElementById('btnClearHistory').addEventListener('click', handleClearHistory);

  // ── 색상 모달 ──
  document.getElementById('btnCloseColor').addEventListener('click', closeColorModal);

  // ── 파일 카드 액션 (이벤트 위임) ──
  document.getElementById('fileGrid').addEventListener('click', handleCardAction);

  // ── 폴더 열기 ──
  document.getElementById('btnOpenFolder').addEventListener('click', () => {
    if (appData.destinationFolder) {
      window.api.openFolder(appData.destinationFolder);
    }
  });

  // ── 모달 오버레이 클릭으로 닫기 ──
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeSettingsModal();
  });
  document.getElementById('colorModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeColorModal();
  });
}

// ══════════════════════════════════════════════
// 핵심 기능: 파일 추가
// ══════════════════════════════════════════════
async function handleAddFile() {
  try {
    const newFiles = await window.api.selectFiles();
    if (!newFiles || newFiles.length === 0) return;

    // 이미 등록된 파일인지 확인 (경로 기준)
    const existingPaths = new Set(appData.files.map(f => f.originalPath));
    const uniqueFiles = newFiles.filter(f => !existingPaths.has(f.originalPath));

    if (uniqueFiles.length === 0) {
      showToast('warning', '선택한 파일은 이미 등록되어 있습니다.');
      return;
    }

    appData.files.push(...uniqueFiles);
    await saveAppData();
    renderUI();

    const count = uniqueFiles.length;
    showToast('success', `${count}개 파일이 등록되었습니다.`);
  } catch (err) {
    console.error('파일 추가 실패:', err);
    showToast('error', '파일 추가 중 오류가 발생했습니다.');
  }
}

// ══════════════════════════════════════════════
// 핵심 기능: 복사 후 열기
// ══════════════════════════════════════════════
async function handleCopyAndOpen(fileId) {
  const file = appData.files.find(f => f.id === fileId);
  if (!file) return;

  // 버튼 로딩 상태
  const btn = document.querySelector(`[data-action="open"][data-file-id="${fileId}"]`);
  if (btn) {
    btn.classList.add('loading');
    btn.innerHTML = '<div class="spinner"></div> 복사 중...';
  }

  try {
    const result = await window.api.copyAndOpen(file);

    if (result.success) {
      showToast('success', `"${file.name}" 파일을 복사하여 열었습니다.`);
      // 이력 데이터 새로고침
      appData = await window.api.getData();
    } else {
      showToast('error', result.error);
    }
  } catch (err) {
    console.error('복사/열기 실패:', err);
    showToast('error', '파일 복사 또는 열기에 실패했습니다.');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        복사 후 열기
      `;
    }
  }
}

// ══════════════════════════════════════════════
// 파일 카드 액션 처리 (이벤트 위임)
// ══════════════════════════════════════════════
function handleCardAction(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const fileId = btn.dataset.fileId;

  switch (action) {
    case 'open':
      handleCopyAndOpen(fileId);
      break;
    case 'delete':
      handleDeleteFile(fileId);
      break;
    case 'color':
      openColorModal(fileId);
      break;
  }
}

// ── 파일 삭제 (등록 해제) ──
async function handleDeleteFile(fileId) {
  const file = appData.files.find(f => f.id === fileId);
  if (!file) return;

  // 확인 대화 대신 직접 삭제 (간단한 UI)
  const card = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
  if (card) {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
  }

  setTimeout(async () => {
    appData.files = appData.files.filter(f => f.id !== fileId);
    await saveAppData();
    renderUI();
    showToast('info', `"${file.name}" 등록이 해제되었습니다.`);
  }, 300);
}

// ══════════════════════════════════════════════
// 드래그 앤 드롭
// ══════════════════════════════════════════════
function setupDragAndDrop() {
  const addArea = document.getElementById('addArea');

  // 전체 창에도 드래그 가능하도록
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  addArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    addArea.classList.add('drag-over');
  });

  addArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    addArea.classList.add('drag-over');
  });

  addArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    // 자식 요소로 이동할 때는 무시
    if (!addArea.contains(e.relatedTarget)) {
      addArea.classList.remove('drag-over');
    }
  });

  addArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    addArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const allFiles = Array.from(files);
    const filePaths = allFiles
      .map(f => {
        try {
          // Electron 공식 API: UNC/네트워크 경로 정상 지원
          return window.api.getPathForFile(f);
        } catch {
          // 펴백: file.path 시도
          return f.path || '';
        }
      })
      .filter(p => p && p.trim() !== '');

    // 경로를 전혀 가져올 수 없는 극히 드문 경우에만 안내
    if (filePaths.length === 0) {
      showToast('warning', '파일 경로를 읽을 수 없습니다.\n"파일 선택하여 등록" 버튼을 사용해 주세요.');
      return;
    }

    // 일부만 실패한 경우 성공한 것만 진행
    if (filePaths.length < allFiles.length) {
      showToast('info', `${allFiles.length}개 중 ${filePaths.length}개 파일만 등록 가능합니다.`);
    }

    try {
      const newFiles = await window.api.registerDroppedFiles(filePaths);

      // 이미 등록된 파일 제외
      const existingPaths = new Set(appData.files.map(f => f.originalPath));
      const uniqueFiles = newFiles.filter(f => !existingPaths.has(f.originalPath));

      if (uniqueFiles.length === 0) {
        showToast('warning', '해당 파일은 이미 등록되어 있습니다.');
        return;
      }

      appData.files.push(...uniqueFiles);
      await saveAppData();
      renderUI();

      showToast('success', `${uniqueFiles.length}개 파일이 등록되었습니다.`);
    } catch (err) {
      console.error('드래그앤드롭 등록 실패:', err);
      showToast('error', '파일 등록 중 오류가 발생했습니다.');
    }
  });
}

// ══════════════════════════════════════════════
// 설정 모달
// ══════════════════════════════════════════════
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const input = document.getElementById('inputDestFolder');
  input.value = appData.destinationFolder || '';
  modal.classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

async function handleSelectFolder() {
  try {
    const folder = await window.api.selectFolder();
    if (folder) {
      document.getElementById('inputDestFolder').value = folder;
    }
  } catch (err) {
    console.error('폴더 선택 실패:', err);
  }
}

async function handleSaveSettings() {
  const folder = document.getElementById('inputDestFolder').value;

  if (!folder) {
    showToast('warning', '작업 폴더를 선택해 주세요.');
    return;
  }

  appData.destinationFolder = folder;
  await saveAppData();
  renderFolderBar();
  closeSettingsModal();
  showToast('success', '설정이 저장되었습니다.');
}

// ══════════════════════════════════════════════
// 이력 패널
// ══════════════════════════════════════════════
function openHistoryPanel() {
  const overlay = document.getElementById('historyOverlay');
  overlay.classList.add('active');
  renderHistory();
}

function closeHistoryPanel() {
  document.getElementById('historyOverlay').classList.remove('active');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';

  if (!appData.history || appData.history.length === 0) {
    list.innerHTML = `
      <div class="history-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <p>아직 열기 이력이 없습니다.</p>
      </div>
    `;
    return;
  }

  appData.history.forEach(item => {
    const date = new Date(item.openedAt);
    const timeStr = formatDateTime(date);

    const ext = item.fileName.split('.').pop().toLowerCase();
    const icon = getFileIcon(ext);

    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-name">${icon.emoji} ${item.fileName}</div>
      <div class="history-item-time">🕐 ${timeStr}</div>
      <div class="history-item-path" title="${item.copiedTo}">→ ${item.copiedTo}</div>
    `;
    list.appendChild(div);
  });
}

async function handleClearHistory() {
  appData.history = [];
  await saveAppData();
  renderHistory();
  showToast('info', '이력이 모두 삭제되었습니다.');
}

// ══════════════════════════════════════════════
// 색상 변경 모달
// ══════════════════════════════════════════════
function openColorModal(fileId) {
  colorEditingFileId = fileId;
  const modal = document.getElementById('colorModal');
  const grid = document.getElementById('colorGrid');

  const file = appData.files.find(f => f.id === fileId);
  if (!file) return;

  grid.innerHTML = '';
  COLORS.forEach(color => {
    const btn = document.createElement('div');
    btn.className = `color-option ${file.color === color ? 'selected' : ''}`;
    btn.style.background = color;
    btn.addEventListener('click', () => handleColorSelect(color));
    grid.appendChild(btn);
  });

  modal.classList.add('active');
}

function closeColorModal() {
  document.getElementById('colorModal').classList.remove('active');
  colorEditingFileId = null;
}

async function handleColorSelect(color) {
  if (!colorEditingFileId) return;

  const file = appData.files.find(f => f.id === colorEditingFileId);
  if (!file) return;

  file.color = color;
  await saveAppData();
  renderFileGrid();
  closeColorModal();
  showToast('success', '카드 색상이 변경되었습니다.');
}

// ══════════════════════════════════════════════
// 토스트 알림
// ══════════════════════════════════════════════
function showToast(type, message) {
  const container = document.getElementById('toastContainer');

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // 3초 후 자동 제거
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ══════════════════════════════════════════════
// 유틸리티
// ══════════════════════════════════════════════
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
}
