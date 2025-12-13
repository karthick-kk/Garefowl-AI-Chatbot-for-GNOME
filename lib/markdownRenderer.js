import St from "gi://St";
import Pango from "gi://Pango";

/**
 * Renders markdown content using native GTK widgets
 */
export class MarkdownRenderer {
    constructor(backgroundColor, textColor) {
        this.backgroundColor = backgroundColor;
        this.textColor = textColor;
    }

    /**
     * Parse and render markdown text into a container
     * @param {string} text - Markdown text
     * @returns {St.BoxLayout} Container with rendered content
     */
    render(text) {
        const container = new St.BoxLayout({
            vertical: true,
            style: `spacing: 8px;`,
        });

        const lines = text.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Code blocks
            if (line.trim().startsWith('```')) {
                const codeLines = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                container.add_child(this._createCodeBlock(codeLines.join('\n')));
                i++;
                continue;
            }
            
            // Headers
            if (line.startsWith('# ')) {
                container.add_child(this._createHeader(line.substring(2), 1));
            } else if (line.startsWith('## ')) {
                container.add_child(this._createHeader(line.substring(3), 2));
            } else if (line.startsWith('### ')) {
                container.add_child(this._createHeader(line.substring(4), 3));
            }
            // Lists
            else if (line.match(/^\s*[\*\-]\s/)) {
                container.add_child(this._createListItem(line.replace(/^\s*[\*\-]\s/, '')));
            } else if (line.match(/^\s*\d+\.\s/)) {
                container.add_child(this._createListItem(line));
            }
            // Tables
            else if (line.includes('|') && line.trim().startsWith('|')) {
                const tableLines = [line];
                i++;
                while (i < lines.length && lines[i].includes('|')) {
                    tableLines.push(lines[i]);
                    i++;
                }
                container.add_child(this._createTable(tableLines));
                continue;
            }
            // Regular text
            else if (line.trim()) {
                container.add_child(this._createParagraph(line));
            }
            
            i++;
        }

        return container;
    }

    _createHeader(text, level) {
        const sizes = ['x-large', 'large', 'medium'];
        const label = new St.Label({
            text: text.trim(),
            style: `
                font-size: ${sizes[level - 1]};
                font-weight: bold;
                color: ${this.textColor};
                margin-top: 8px;
                margin-bottom: 4px;
            `,
        });
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    _createParagraph(text) {
        const label = new St.Label({
            style: `color: ${this.textColor};`,
        });
        label.clutter_text.use_markup = true;
        label.clutter_text.set_markup(this._parseInlineStyles(text));
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    _createCodeBlock(code) {
        const label = new St.Label({
            text: code,
            style: `
                background-color: rgba(0, 0, 0, 0.3);
                color: #e0e0e0;
                font-family: monospace;
                padding: 12px;
                border-radius: 4px;
            `,
        });
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        label.clutter_text.selectable = true;
        return label;
    }

    _createListItem(text) {
        const label = new St.Label({
            style: `color: ${this.textColor}; padding-left: 8px;`,
        });
        label.clutter_text.use_markup = true;
        label.clutter_text.set_markup('• ' + this._parseInlineStyles(text));
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    _createTable(lines) {
        const box = new St.BoxLayout({
            vertical: true,
            style: `
                background-color: rgba(0, 0, 0, 0.2);
                padding: 8px;
                border-radius: 4px;
            `,
        });

        lines.forEach((line, idx) => {
            // Skip separator lines
            if (line.match(/^\s*\|[\s\-:|]+\|\s*$/)) return;
            
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            const rowBox = new St.BoxLayout({
                style: `spacing: 12px;`,
            });

            cells.forEach(cell => {
                const label = new St.Label({
                    text: cell,
                    style: `
                        color: ${this.textColor};
                        font-family: monospace;
                        ${idx === 0 ? 'font-weight: bold;' : ''}
                    `,
                });
                label.clutter_text.line_wrap = true;
                label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
                label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                rowBox.add_child(label);
            });

            box.add_child(rowBox);
        });

        return box;
    }

    _parseInlineStyles(text) {
        // Escape HTML entities
        text = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
        
        // Bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        // Italic
        text = text.replace(/\*(.+?)\*/g, '<i>$1</i>');
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<tt>$1</tt>');
        // Links (just show text)
        text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        return text;
    }
}
