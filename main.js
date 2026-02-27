// ============================================================
// 공유파일 보호 열기 - Main Process (Electron)
// 역할: 시스템 API 접근, 파일 복사/열기, 데이터 저장
// ============================================================

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── 상수 정의 ──
const DATA_FILE = 'settings.json';
const DEFAULT_DATA = {
  destinationFolder: '',
  files: [],
  history: []
};

// ── 데이터 저장 경로 (AppData) ──
function getDataPath() {
  return path.join(app.getPath('userData'), DATA_FILE);
}

// ── 데이터 로드 ──
function loadData() {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('데이터 로드 실패:', err);
  }
  return { ...DEFAULT_DATA };
}

// ── 데이터 저장 ──
function saveData(data) {
  try {
    const dataPath = getDataPath();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('데이터 저장 실패:', err);
    return false;
  }
}

// ── 고유 ID 생성 ──
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── 파일 확장자 추출 ──
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase().replace('.', '');
}

// ── 메인 윈도우 생성 ──
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 580,
    height: 680,
    minWidth: 480,
    minHeight: 520,
    title: '공유파일 보호 열기',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    // 맞춤 타이틀바 (프레임 있는 상태에서)
    autoHideMenuBar: true,
    backgroundColor: '#f0f4f8'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 개발 모드에서 DevTools 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ── IPC 핸들러: 데이터 가져오기 ──
ipcMain.handle('get-data', async () => {
  return loadData();
});

// ── IPC 핸들러: 데이터 저장 ──
ipcMain.handle('save-data', async (_event, data) => {
  return saveData(data);
});

// ── IPC 핸들러: 파일 선택 다이얼로그 ──
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '등록할 파일을 선택하세요',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '모든 파일', extensions: ['*'] },
      { name: '문서', extensions: ['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'pdf', 'txt', 'csv'] },
      { name: '이미지', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  // 선택된 파일 정보를 구성
  return result.filePaths.map(filePath => ({
    id: generateId(),
    name: path.basename(filePath),
    originalPath: filePath,
    extension: getFileExtension(filePath),
    color: getRandomColor(),
    addedAt: new Date().toISOString()
  }));
});

// ── IPC 핸들러: 폴더 선택 다이얼로그 ──
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '파일을 복사할 작업 폴더를 선택하세요',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// ── IPC 핸들러: 파일 복사 후 열기 ──
ipcMain.handle('copy-and-open', async (_event, fileInfo) => {
  const data = loadData();

  // 복사 대상 폴더 확인
  if (!data.destinationFolder) {
    return { success: false, error: '작업 폴더가 설정되지 않았습니다.\n설정에서 작업 폴더를 먼저 지정해 주세요.' };
  }

  // 복사 대상 폴더가 존재하는지 확인, 없으면 생성
  if (!fs.existsSync(data.destinationFolder)) {
    try {
      fs.mkdirSync(data.destinationFolder, { recursive: true });
    } catch (err) {
      return { success: false, error: `작업 폴더를 생성할 수 없습니다:\n${err.message}` };
    }
  }

  // 원본 파일 존재 확인
  if (!fs.existsSync(fileInfo.originalPath)) {
    return { success: false, error: `원본 파일을 찾을 수 없습니다:\n${fileInfo.originalPath}\n\n공유 폴더 연결을 확인해 주세요.` };
  }

  // 복사할 파일 경로 생성 (이름 충돌 시 번호 추가)
  let destPath = path.join(data.destinationFolder, fileInfo.name);
  let counter = 1;
  const nameWithoutExt = path.parse(fileInfo.name).name;
  const ext = path.parse(fileInfo.name).ext;

  while (fs.existsSync(destPath)) {
    // 기존 파일이 있으면 덮어쓰기 (최신 복사본 사용)
    try {
      fs.unlinkSync(destPath);
    } catch {
      // 삭제 실패 시 새 이름으로 복사
      destPath = path.join(data.destinationFolder, `${nameWithoutExt} (${counter})${ext}`);
      counter++;
    }
    break;
  }

  try {
    // 파일 복사
    fs.copyFileSync(fileInfo.originalPath, destPath);

    // 복사된 파일 열기
    await shell.openPath(destPath);

    // 이력 저장
    const historyEntry = {
      id: generateId(),
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      originalPath: fileInfo.originalPath,
      copiedTo: destPath,
      openedAt: new Date().toISOString()
    };

    data.history.unshift(historyEntry);
    // 이력은 최근 50개만 유지
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50);
    }
    saveData(data);

    return { success: true, copiedTo: destPath };
  } catch (err) {
    return { success: false, error: `파일 복사/열기 실패:\n${err.message}` };
  }
});

// ── IPC 핸들러: 드래그앤드롭으로 파일 등록 ──
ipcMain.handle('register-dropped-files', async (_event, filePaths) => {
  return filePaths.map(filePath => ({
    id: generateId(),
    name: path.basename(filePath),
    originalPath: filePath,
    extension: getFileExtension(filePath),
    color: getRandomColor(),
    addedAt: new Date().toISOString()
  }));
});

// ── IPC 핸들러: 파일 존재 여부 확인 ──
ipcMain.handle('check-file-exists', async (_event, filePath) => {
  return fs.existsSync(filePath);
});

// ── IPC 핸들러: 작업 폴더 탐색기에서 열기 ──
ipcMain.handle('open-folder', async (_event, folderPath) => {
  if (fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

// ── 랜덤 색상 생성 (카드 구분용) ──
const CARD_COLORS = [
  '#3B82F6', // 파랑
  '#10B981', // 초록
  '#F59E0B', // 노랑
  '#EF4444', // 빨강
  '#8B5CF6', // 보라
  '#EC4899', // 분홍
  '#06B6D4', // 시안
  '#F97316', // 주황
  '#6366F1', // 인디고
  '#14B8A6', // 틸
];

let colorIndex = 0;
function getRandomColor() {
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length];
  colorIndex++;
  return color;
}

// ── 앱 라이프사이클 ──
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
