import os
import sys
from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QAction, QIcon
from PyQt6.QtWidgets import QApplication, QMainWindow, QMenu, QSystemTrayIcon
from PyQt6.QtWebEngineCore import (
    QWebEnginePage,
    QWebEngineProfile,
    QWebEngineScript,
    QWebEngineSettings,
)
from PyQt6.QtWebEngineWidgets import QWebEngineView

# =========================================================================
# HẰNG SỐ CẤU HÌNH HỆ THỐNG
# =========================================================================
GAME_URL_TARGET = "https://hoainiem2003.net/vl4/"
SCRIPT_FILENAME = "auto_s4_v2.1.9.js"
WINDOW_DEFAULT_WIDTH = 1366
WINDOW_DEFAULT_HEIGHT = 860
WINDOW_TITLE_TEXT = "Võ Lâm Idle - Desktop Client"
PROFILE_STORAGE_NAME = "VlIdleProfile"

# Script UI bổ trợ: Kéo thả, 2 chế độ Full/Mini, Nút nổi gọi lại, Nạp lại Auto
INJECTED_UI_CONTROLLER_JS = r"""
(function() {
  'use strict';
  if (window.__AUTO_UI_CONTROLLER_LOADED) return;
  window.__AUTO_UI_CONTROLLER_LOADED = true;

  const UI_STORAGE_KEY = 'auto_s4_ui_pos_mode_v1';
  const uiState = {
    mode: 'full',
    posX: 20,
    posY: 70,
    visible: true,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  };

  function loadUIPrefs() {
    try {
      const raw = localStorage.getItem(UI_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (['full', 'mini'].includes(d.mode)) uiState.mode = d.mode;
        if (Number.isFinite(d.posX)) uiState.posX = Math.max(0, Math.min(window.innerWidth - 80, d.posX));
        if (Number.isFinite(d.posY)) uiState.posY = Math.max(0, Math.min(window.innerHeight - 40, d.posY));
        if (typeof d.visible === 'boolean') uiState.visible = d.visible;
      }
    } catch (_) {}
  }

  function saveUIPrefs() {
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
        mode: uiState.mode,
        posX: uiState.posX,
        posY: uiState.posY,
        visible: uiState.visible
      }));
    } catch (_) {}
  }

  loadUIPrefs();

  function ensureLauncherButton() {
    let btn = document.getElementById('vl4-dt-launcher');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'vl4-dt-launcher';
      btn.innerHTML = '⚡ Auto';
      Object.assign(btn.style, {
        position: 'fixed',
        left: '14px',
        bottom: '14px',
        zIndex: '999999',
        padding: '6px 14px',
        backgroundColor: '#1b2820',
        color: '#ffd24a',
        border: '1px solid #e6c67a',
        borderRadius: '18px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 3px 10px rgba(0,0,0,0.85)',
        display: uiState.visible ? 'none' : 'block'
      });
      btn.onclick = () => {
        uiState.visible = true;
        saveUIPrefs();
        updatePanelUI();
      };
      document.body.appendChild(btn);
    } else {
      btn.style.display = uiState.visible ? 'none' : 'block';
    }
  }

  function makeDraggable(panel, handle) {
    handle.style.cursor = 'move';
    handle.onmousedown = (e) => {
      if (['BUTTON', 'INPUT', 'SELECT', 'A'].includes(e.target.tagName)) return;
      uiState.isDragging = true;
      uiState.dragStartX = e.clientX - panel.offsetLeft;
      uiState.dragStartY = e.clientY - panel.offsetTop;

      const onMouseMove = (ev) => {
        if (!uiState.isDragging) return;
        ev.preventDefault();
        let newX = ev.clientX - uiState.dragStartX;
        let newY = ev.clientY - uiState.dragStartY;
        newX = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newY));

        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        uiState.posX = newX;
        uiState.posY = newY;
      };

      const onMouseUp = () => {
        if (uiState.isDragging) {
          uiState.isDragging = false;
          saveUIPrefs();
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
  }

  function reloadAutoRoutine() {
    try {
      if (window.__AUTO_S4 && typeof window.__AUTO_S4.stop === 'function') {
        window.__AUTO_S4.stop();
        window.__AUTO_S4.remove();
      }
    } catch (_) {}
    document.getElementById('vl4-dt-panel')?.remove();
    document.getElementById('vl4-dt-launcher')?.remove();
    window.__AUTO_UI_CONTROLLER_LOADED = false;
    location.reload();
  }

  function updatePanelUI() {
    ensureLauncherButton();
    const panel = document.getElementById('vl4-dt-panel');
    if (!panel) return;

    if (!uiState.visible) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    panel.style.position = 'fixed';
    panel.style.left = uiState.posX + 'px';
    panel.style.top = ui
