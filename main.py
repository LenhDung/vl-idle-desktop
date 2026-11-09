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

# --- HẰNG SỐ CẤU HÌNH ---
GAME_URL_TARGET = "https://hoainiem2003.net/vl4/"
SCRIPT_FILENAME = "auto_s4_v2.1.9.js"
WINDOW_DEFAULT_WIDTH = 1280
WINDOW_DEFAULT_HEIGHT = 800
WINDOW_TITLE_TEXT = "Võ Lâm Idle - Desktop Client"
PROFILE_STORAGE_NAME = "VlIdleProfile"


def read_external_script(script_path: str) -> str:
    """Đọc nội dung script JS từ file ngoài.

    Nếu chưa có, trả về chuỗi rỗng an toàn.
    """
    if os.path.exists(script_path):
        try:
            with open(script_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as err:
            print(f"[Cảnh báo] Không thể đọc file script: {err}")
    return ""


def setup_web_profile(profile: QWebEngineProfile, base_dir: str) -> None:
    """Cấu hình bộ nhớ cache và lưu trữ phiên đăng nhập bền vững."""
    storage_path = os.path.join(base_dir, PROFILE_STORAGE_NAME)
    os.makedirs(storage_path, exist_ok=True)

    profile.setPersistentStoragePath(storage_path)
    profile.setPersistentCookiesPolicy(
        QWebEngineProfile.PersistentCookiesPolicy.ForcePersistentCookies
    )

    # Đăng ký script tự động chạy mỗi khi hoàn tất tải trang
    script_full_path = os.path.join(base_dir, SCRIPT_FILENAME)
    script_content = read_external_script(script_full_path)

    if script_content:
        web_script = QWebEngineScript()
        web_script.setName("AutoScriptLoader")
        web_script.setInjectionPoint(
            QWebEngineScript.InjectionPoint.DocumentReady
        )
        web_script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        web_script.setSourceCode(script_content)
        profile.scripts().insert(web_script)
        print(f"[Khởi tạo] Đã nạp tự động kịch bản: {SCRIPT_FILENAME}")
    else:
        print(
            f"[Thông báo] Chưa tìm thấy {SCRIPT_FILENAME}. App vẫn chạy chế độ duyệt thông thường."
        )


class GameMainWindow(QMainWindow):

    def __init__(self, base_dir: str):
        super().__init__()
        self.base_dir = base_dir
        self.init_ui()
        self.init_browser()
        self.init_tray_icon()

    def init_ui(self) -> None:
        self.setWindowTitle(WINDOW_TITLE_TEXT)
        self.resize(WINDOW_DEFAULT_WIDTH, WINDOW_DEFAULT_HEIGHT)

    def init_browser(self) -> None:
        self.browser_view = QWebEngineView(self)
        self.setCentralWidget(self.browser_view)

        profile = QWebEngineProfile.defaultProfile()
        setup_web_profile(profile, self.base_dir)

        page_settings = self.browser_view.settings()
        page_settings.setAttribute(
            QWebEngineSettings.WebAttribute.JavascriptEnabled, True
        )
        page_settings.setAttribute(
            QWebEngineSettings.WebAttribute.LocalStorageEnabled, True
        )
        page_settings.setAttribute(
            QWebEngineSettings.WebAttribute.AutoLoadImages, True
        )

        self.browser_view.load(QUrl(GAME_URL_TARGET))

    def init_tray_icon(self) -> None:
        """Khởi tạo biểu tượng chạy ẩn dưới khay hệ thống (System Tray)."""
        self.tray_icon = QSystemTrayIcon(self)
        self.tray_icon.setIcon(self.style().standardIcon(self.style().StandardPixmap.SP_ComputerIcon))

        tray_menu = QMenu()

        show_action = QAction("Hiện cửa sổ", self)
        show_action.triggered.connect(self.show_window_normal)
        tray_menu.addAction(show_action)

        reload_script_action = QAction("Nạp lại Auto Script", self)
        reload_script_action.triggered.connect(self.reload_injected_script)
        tray_menu.addAction(reload_script_action)

        exit_action = QAction("Thoát", self)
        exit_action.triggered.connect(QApplication.instance().quit)
        tray_menu.addAction(exit_action)

        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.on_tray_activated)
        self.tray_icon.show()

    def on_tray_activated(
        self, reason: QSystemTrayIcon.ActivationReason
    ) -> None:
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.show_window_normal()

    def show_window_normal(self) -> None:
        self.show()
        self.activateWindow()

    def closeEvent(self, event) -> None:
        """Thu nhỏ xuống System Tray thay vì tắt hẳn ứng dụng khi bấm X."""
        if self.tray_icon.isVisible():
            self.hide()
            self.tray_icon.showMessage(
                WINDOW_TITLE_TEXT,
                "Ứng dụng đang chạy ngầm trong khay hệ thống.",
                QSystemTrayIcon.MessageIcon.Information,
                2000,
            )
            event.ignore()
        else:
            event.accept()

    def reload_injected_script(self) -> None:
        """Đọc lại file JS từ đĩa và bơm trực tiếp vào trang mà không cần bật lại app."""
        script_full_path = os.path.join(self.base_dir, SCRIPT_FILENAME)
        script_content = read_external_script(script_full_path)
        if script_content:
            self.browser_view.page().runJavaScript(script_content)
            self.tray_icon.showMessage(
                WINDOW_TITLE_TEXT,
                "Đã nạp lại script Auto thành công!",
                QSystemTrayIcon.MessageIcon.Information,
                1500,
            )


def main():
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    base_directory = os.path.dirname(os.path.abspath(__file__))
    window = GameMainWindow(base_directory)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()