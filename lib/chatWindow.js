import GLib from "gi://GLib";
import Gio from "gi://Gio";

/**
 * Launch standalone GTK window for chat viewing
 */
export class ChatWindow {
    constructor(extension, history) {
        this._extension = extension;
        this._history = history || [];
        this._historyFile = GLib.build_filenamev([GLib.get_tmp_dir(), 'garefowl-chat-history.json']);
    }

    show() {
        this._saveHistory();
        this._launchWindow();
    }

    _saveHistory() {
        try {
            const json = JSON.stringify(this._history);
            GLib.file_set_contents(this._historyFile, json);
        } catch (e) {
            log(`Error saving history: ${e.message}`);
        }
    }

    _launchWindow() {
        try {
            const extensionPath = this._extension.path;
            if (!extensionPath) {
                log('[Garefowl] Error: Could not get extension path');
                log(`[Garefowl] Extension object: ${JSON.stringify(Object.keys(this._extension))}`);
                return;
            }
            
            const appPath = GLib.build_filenamev([extensionPath, 'chatWindowApp.js']);
            log(`[Garefowl] Launching: gjs -m ${appPath} ${this._historyFile}`);
            
            const [success, pid] = GLib.spawn_async(
                null,
                ['gjs', '-m', appPath, this._historyFile],
                null,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );
            
            if (success) {
                log(`[Garefowl] Window launched successfully, PID: ${pid}`);
            } else {
                log('[Garefowl] Failed to launch window');
            }
        } catch (e) {
            log(`[Garefowl] Error launching window: ${e.message}`);
            log(`[Garefowl] Stack: ${e.stack}`);
        }
    }



    updateHistory(history) {
        this._history = history;
    }

    destroy() {
        // Nothing to clean up
    }
}
