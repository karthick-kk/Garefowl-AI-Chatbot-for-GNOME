#!/usr/bin/gjs -m

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Pango from 'gi://Pango';
import system from 'system';

const application = new Adw.Application({
    application_id: 'com.gitlab.karthickk.garefowl.chatwindow',
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

let historyFile = null;

application.connect('activate', () => {
    const window = new Adw.ApplicationWindow({
        application: application,
        title: 'Garefowl Chat History',
        default_width: 800,
        default_height: 600,
    });

    const headerBar = new Adw.HeaderBar();
    
    const refreshButton = new Gtk.Button({
        icon_name: 'view-refresh-symbolic',
        tooltip_text: 'Refresh',
    });
    refreshButton.connect('clicked', () => loadHistory(textView));
    headerBar.pack_end(refreshButton);

    const scrolled = new Gtk.ScrolledWindow({
        vexpand: true,
        hexpand: true,
    });

    const textView = new Gtk.TextView({
        editable: false,
        wrap_mode: Gtk.WrapMode.WORD_CHAR,
        left_margin: 20,
        right_margin: 20,
        top_margin: 20,
        bottom_margin: 20,
        monospace: true,
    });

    scrolled.set_child(textView);

    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
    });
    mainBox.append(headerBar);
    mainBox.append(scrolled);

    window.set_content(mainBox);
    
    loadHistory(textView);
    window.present();
});

function convertToMarkup(text) {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    return text;
}

function loadHistory(textView) {
    if (!historyFile) {
        textView.buffer.set_text('No history file specified', -1);
        return;
    }
    
    try {
        const [success, contents] = GLib.file_get_contents(historyFile);
        if (success) {
            const text = new TextDecoder().decode(contents);
            const history = JSON.parse(text);
            
            const buffer = textView.get_buffer();
            buffer.delete(buffer.get_start_iter(), buffer.get_end_iter());
            
            history.forEach((msg, index) => {
                const role = msg.role === 'user' ? 'You' : 'Assistant';
                
                let iter = buffer.get_end_iter();
                buffer.insert_markup(iter, `<b><big>${role}:</big></b>\n`, -1);
                
                iter = buffer.get_end_iter();
                buffer.insert(iter, msg.content, -1);
                
                if (index < history.length - 1) {
                    iter = buffer.get_end_iter();
                    buffer.insert(iter, `\n\n${'─'.repeat(60)}\n\n`, -1);
                }
            });
        }
    } catch (e) {
        textView.buffer.set_text(`Error loading chat: ${e.message}`, -1);
    }
}

// Get history file from command line
print(`[ChatWindow] programArgs: ${JSON.stringify(system.programArgs)}`);
if (system.programArgs.length > 0) {
    historyFile = system.programArgs[0];
    print(`[ChatWindow] Using history file: ${historyFile}`);
} else {
    print('[ChatWindow] No arguments provided');
}

application.run([system.programInvocationName]);
