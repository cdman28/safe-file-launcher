// ============================================================
// 공유파일 보호 열기 - Preload Script
// 역할: Main 프로세스와 Renderer 프로세스 사이의 안전한 통신 브릿지
// ============================================================

const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Renderer에 노출할 API 정의
contextBridge.exposeInMainWorld('api', {
  // ── 데이터 관리 ──
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // ── 파일/폴더 선택 ──
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // ── 핵심 기능: 복사 후 열기 ──
  copyAndOpen: (fileInfo) => ipcRenderer.invoke('copy-and-open', fileInfo),

  // ── 드래그앤드롭 파일 등록 ──
  registerDroppedFiles: (filePaths) => ipcRenderer.invoke('register-dropped-files', filePaths),

  // ── 파일 경로 추출 (UNC/네트워크 경로 지원) ──
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // ── 유틸리티 ──
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
});
