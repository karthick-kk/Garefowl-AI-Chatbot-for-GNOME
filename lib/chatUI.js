import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import { MessageRoles, CSS, UI } from "./constants.js";
import { MarkdownRenderer } from "./markdownRenderer.js";
import { hideTooltip, showTooltip } from "./tooltip.js";

/**
 * Manages the chat message display
 */
export class ChatMessageDisplay {
    /**
     * Create a chat message display
     * @param {St.BoxLayout} container - Container for the chat messages
     * @param {object} styleSettings - Styling settings
     * @param {Function} onSettingsRequested - Callback when settings button is clicked
     */



    constructor(container, styleSettings, onSettingsRequested, onExpandToWindow) {
        this._container = container;
        this._styleSettings = styleSettings;
        this._onSettingsRequested = onSettingsRequested;
        this._onExpandToWindow = onExpandToWindow;
        this._timeoutCopy = null;
    }

    /**
     * Update the style settings
     * @param {object} styleSettings - New style settings
     */
    updateStyleSettings(styleSettings) {
        this._styleSettings = styleSettings;
    }


    

    /**
     * Display a message
     * @param {string} role - Role of the message sender (user or assistant)
     * @param {string} text - Message content
     */
    displayMessage(role, text) {
        const isUserMessage = role === MessageRoles.USER;
        const messageType = isUserMessage ? CSS.HUMAN_MESSAGE : CSS.LLM_MESSAGE;
        const messageBoxType = isUserMessage ? CSS.HUMAN_MESSAGE_BOX : CSS.LLM_MESSAGE_BOX;
        const backgroundColor = isUserMessage ?
            this._styleSettings.humanMessageColor :
            this._styleSettings.llmMessageColor;
        const textColor = isUserMessage ?
            this._styleSettings.humanMessageTextColor :
            this._styleSettings.llmMessageTextColor;

        this._createMessageBox(messageType, messageBoxType, text, backgroundColor, textColor);

        // Automatically scroll to the bottom when a new message is added
        this._scrollToBottom();
    }

    /**
     * Display an error message
     * @param {string} errorMessage - Error message to display
     * @param {boolean} showSettingsButton - Whether to show settings button
     */
    displayError(errorMessage, showSettingsButton = true) {
        this.displayMessage(MessageRoles.ASSISTANT, errorMessage);

        if (showSettingsButton) {
            const settingsButton = new St.Button({
                label: UI.SETTINGS_BUTTON_TEXT,
                can_focus: true,
                toggle_mode: true,
            });

            settingsButton.connect("clicked", () => {
                if (this._onSettingsRequested) {
                    this._onSettingsRequested();
                }
            });

            this._container.add_child(settingsButton);
        }

        this._scrollToBottom();
    }

    /**
     * Create a message box with the given content
     * @param {string} messageType - CSS class for message type
     * @param {string} messageBoxType - CSS class for message box type
     * @param {string} text - Message content"garefowl-ai-chatbot@karthickk.gitlab.com"
     * @param {string} backgroundColor - Background color
     * @param {string} textColor - Text color
     * @private
     */
    _createMessageBox(messageType, messageBoxType, text, backgroundColor, textColor) {
        const box = new St.BoxLayout({
            vertical: true,
            style_class: messageBoxType,
            style: `background-color: ${backgroundColor}; padding: 12px; border-radius: 8px;`,
            reactive: true,
        });

        // Render markdown content
        const renderer = new MarkdownRenderer(backgroundColor, textColor);
        const content = renderer.render(text || "[[EMPTY RESPONSE]]");
        
        // Store plain text for copying
        const plainText = text || "[[EMPTY RESPONSE]]";

        // Click to copy functionality
        box.connect('button-press-event', () => {
            if (this._clipboard) {
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, plainText);
                showTooltip('Copied!');
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                    hideTooltip();
                    return GLib.SOURCE_REMOVE;
                });
            }
            return Clutter.EVENT_STOP;
        });

        // Show tooltip on hover
        box.connect('enter-event', () => {
            showTooltip('Click to copy');
        });

        box.connect('leave-event', () => {
            hideTooltip();
        });

        box.add_child(content);
        this._container.add_child(box);
    }



    /**
     * Set the clipboard for copy operations
     * @param {St.Clipboard} clipboard - Clipboard object
     */
    setClipboard(clipboard) {
        this._clipboard = clipboard;
    }

    /**
     * Get expand to window callback
     * @returns {Function} Callback function
     */
    getExpandCallback() {
        return this._onExpandToWindow;
    }

    /**
     * Set the chat input for copy hint operations
     * @param {St.Entry} chatInput - Chat input element
     */
    setChatInput(chatInput) {
        this._chatInput = chatInput;
    }

    /**
     * Set the scroll view reference
     * @param {St.ScrollView} scrollView - Scroll view containing the messages
     */
    setScrollView(scrollView) {
        this._scrollView = scrollView;
    }

    /**
     * Clear all messages
     */
    clear() {
        this._container.destroy_all_children();
    }

    /**
     * Load a chat history
     * @param {Array} history - Chat history to display
     */
    loadHistory(history) {
        this.clear();

        if (Array.isArray(history)) {
            history.forEach((message) => {
                this.displayMessage(message.role, message.content);
            });
        }

        this._scrollToBottom();
    }

    /**
     * Scroll to the bottom of the chat
     * @private
     */
    _scrollToBottom() {
        if (!this._scrollView) {
            return;
        }

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            const vadjustment = this._scrollView.vadjustment;
            if (vadjustment) {
                vadjustment.value = vadjustment.upper - vadjustment.page_size;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._timeoutCopy) {
            GLib.Source.remove(this._timeoutCopy);
            this._timeoutCopy = null;
        }
    }


}
