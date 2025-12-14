/**
 * Garefowl AI Chatbot for GNOME
 *
 * A GNOME Shell extension that integrates AI chatbot capabilities
 * with support for multiple LLM providers.
 *
 */

/// <reference path="./global.d.ts" />
import GObject from "gi://GObject";
import St from "gi://St";
import GLib from "gi://GLib";


import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { SettingsManager } from "./lib/settings.js";
import { LLMProviderFactory } from "./lib/llmProviders.js";
import { ChatMessageDisplay } from "./lib/chatUI.js";
import { ChatWindow } from "./lib/chatWindow.js";
import { setupShortcut, removeShortcut, focusInput } from "./lib/utils.js";
import { MessageRoles, CSS, UI } from "./lib/constants.js";
import {hideTooltip, showTooltip } from "./lib/tooltip.js";
import { SearXNGSearchClient } from "./lib/webSearch.js";
import { YouTubeTranscriptFetcher } from "./lib/youtubeSummary.js";

/**
 * Main extension class that handles the chat interface
 */
const Garefowl = GObject.registerClass(
    class Garefowl extends PanelMenu.Button {
        /**
        * Initialize the Garefowl chat interface
        * @param {object} params - Initialization parameters
        */
        _init(extensionObj) {
            super._init(0.0, _("Garefowl: AI Chatbot"));

            this._extensionObj = extensionObj;
            this._settingsManager = new SettingsManager(extensionObj.settings);
            this._clipboard = extensionObj.clipboard;
            this._openSettingsCallback = extensionObj.openSettings;
            this._extensionInstance = extensionObj.extensionInstance;

            // Load settings
            this._loadSettings();

            // Initialize UI elements
            this._initializeUI();

            // Set up keyboard shortcut
            this._bindShortcut();

            // Set up timeout handles
            this._timeoutResponse = null;
            this._timeoutFocusInputBox = null;

            // Initialize history
            this._history = [];
            this._loadHistory();

            // Track tool call depth to prevent infinite loops
            this._toolCallDepth = 0;
            this._maxToolCallDepth = 3;

            // Initialize GTK window (lazy)
            this._chatWindow = null;
        }

        /**
        * Initialize the UI elements
        * @private
        */
        _initializeUI() {
        // Add icon to the top bar
            this.add_child(new St.Icon({
                icon_name:   "Garefowl: AI Chatbot",
                style_class: "icon",
            }));

            // Create chat container
            this._chatBox = new St.BoxLayout({
                vertical:    true,
                style_class: CSS.POPUP_MENU_BOX,
                style:       "text-wrap: wrap",
            });

            // Create chat message display
            const styleSettings = this._settingsManager.getStyleSettings();
            this._chatDisplay = new ChatMessageDisplay(
                this._chatBox,
                styleSettings,
                () => this._openSettings(),
                () => this._expandToWindow()
            );
            this._chatDisplay.setClipboard(this._clipboard);

            // Create chat input
            this._chatInput = new St.Entry({
                hint_text:   UI.CHAT_INPUT_PLACEHOLDER,
                can_focus:   true,
                track_hover: true,
                style_class: CSS.MESSAGE_INPUT,
                x_expand:    true,
            });
            this._chatDisplay.setChatInput(this._chatInput);

            // Set up input event handler
            this._chatInput.clutter_text.connect("activate", () => this._handleUserInput());

            // Create new conversation button
            this._newConversationButton = new St.Button({
                style: "width: 16px; height:16px; margin-right: 10px; margin-left: 10px'",
                child: new St.Icon({
                    icon_name: "tab-new-symbolic",
                    style:     "width: 30px; height:30px",
                }),
            });

            // Set up new conversation button event handlers
            this._newConversationButton.connect("clicked", () => this._handleNewConversation());
            this._newConversationButton.connect("enter-event", () => this._handleNewConversationEnter());
            this._newConversationButton.connect("leave-event", () => this._handleNewConversationLeave());

            // Create expand button
            this._expandButton = new St.Button({
                style: "width: 16px; height:16px; margin-right: 10px;",
                child: new St.Icon({
                    icon_name: "view-fullscreen-symbolic",
                    style:     "width: 30px; height:30px",
                }),
            });

            this._expandButton.connect("clicked", () => this._expandToWindow());
            this._expandButton.connect("enter-event", () => {
                showTooltip('Open Chat Window');
            });
            this._expandButton.connect("leave-event", () => {
                hideTooltip();
            });

            // Create preferences button
            this._preferencesButton = new St.Button({
                style: "width: 16px; height:16px; margin-right: 15px;",
                child: new St.Icon({
                    icon_name: "emblem-system-symbolic",
                    style:     "width: 30px; height:30px",
                }),
            });

            // Set up preferences button event handlers
            this._preferencesButton.connect("clicked", () => this._openSettings());
            this._preferencesButton.connect("enter-event", () => {
                showTooltip('Open Preferences');
            });
            this._preferencesButton.connect("leave-event", () => {
                hideTooltip();
            });

            // Create bottom input area
            const entryBox = new St.BoxLayout({
                vertical:    false,
                style_class: CSS.POPUP_MENU_BOX,
            });
            entryBox.add_child(this._chatInput);
            entryBox.add_child(this._newConversationButton);
            entryBox.add_child(this._expandButton);
            entryBox.add_child(this._preferencesButton);

            // Create scrollable chat view
            this._chatView = new St.ScrollView({
                enable_mouse_scrolling: true,
                style_class:            CSS.CHAT_SCROLLING,
                reactive:               true,
            });
            this._chatView.set_child(this._chatBox);
            this._chatDisplay.setScrollView(this._chatView);

            // Create main layout
            const layout = new St.BoxLayout({
                vertical:    true,
                style_class: CSS.POPUP_MENU_BOX,
            });
            layout.add_child(this._chatView);
            layout.add_child(entryBox);

            // Add to popup menu
            const popUp = new PopupMenu.PopupMenuSection();
            popUp.actor.add_child(layout);
            this.menu.addMenuItem(popUp);

            // Setup menu open/close handler
            this.menu.connect("open-state-changed", (self, open) => {
                if (open) {
                    this._focusInputBox();
                }
            });

        }

        /**
        * Load settings and connect to changes
        * @private
        */
        _loadSettings() {
            this._settingsManager.connectToChanges(() => {
                this._chatDisplay.updateStyleSettings(this._settingsManager.getStyleSettings());
            });
        }

        /**
        * Handle user message input
        * @private
        */
        _handleUserInput() {
            if (this._timeoutResponse) {
                GLib.Source.remove(this._timeoutResponse);
                this._timeoutResponse = null;
            }

            const input = this._chatInput.get_text();
            if (!input || input.startsWith('Thinking ')) {
                return;
            }

            // Display user message
            this._chatDisplay.displayMessage(MessageRoles.USER, input);

            // Add to history
            this._history.push({
                role:    MessageRoles.USER,
                content: input,
            });

            // Reset tool call depth for new user input
            this._toolCallDepth = 0;

            // Send to LLM
            this._sendToLLM();

            // Disable input during processing
            this._chatInput.set_reactive(false);
            this._startThinkingTimer();
        }

        /**
        * Start the thinking timer
        * @private
        */
        _startThinkingTimer() {
            this._thinkingStartTime = Date.now();
            this._chatInput.set_text('Thinking 0s');
            
            this._thinkingTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                if (this._chatInput) {
                    const elapsed = Math.floor((Date.now() - this._thinkingStartTime) / 1000);
                    this._chatInput.set_text(`Thinking ${elapsed}s`);
                }
                return GLib.SOURCE_CONTINUE;
            });
        }

        /**
        * Stop the thinking timer
        * @private
        */
        _stopThinkingTimer() {
            if (this._thinkingTimer) {
                GLib.Source.remove(this._thinkingTimer);
                this._thinkingTimer = null;
            }
            this._thinkingStartTime = 0;
        }

        /**
        * Handle new conversation button click
        * @private
        */
        _handleNewConversation() {
            const inputText = this._chatInput.get_text();
            if (inputText === UI.NEW_CONVERSATION_TEXT ||
            !inputText.startsWith('Thinking ')) {
            // Clear history
                this._history = [];
                this._settingsManager.setHistory([]);
                this._chatDisplay.clear();
            } else {
                this._chatDisplay.displayMessage(
                    MessageRoles.ASSISTANT,
                    "You can't create a new conversation while I am thinking"
                );
            }
        }

        /**
        * Handle mouse enter on new conversation button
        * @private
        */
        _handleNewConversationEnter() {
            showTooltip("New conversation (Deletes current)");
        }

        /**
        * Handle mouse leave on new conversation button
        * @private
        */
        _handleNewConversationLeave() {
            hideTooltip();
        }

        /**
        * Load chat history
        * @private
        */
        _loadHistory() {
            this._chatInput.set_reactive(false);
            this._chatInput.set_text(UI.LOADING_HISTORY);

            this._history = this._settingsManager.getHistory();
            this._chatDisplay.loadHistory(this._history);

            this._chatInput.set_reactive(true);
            this._chatInput.set_text("");
            this._focusInputBox();
        }

        /**
        * Send the current conversation to the LLM
        * @private
        */
        _sendToLLM() {
            const provider = this._settingsManager.getLLMProvider();
            const apiKey = this._settingsManager.getApiKey(provider);
            const model = this._settingsManager.getModel(provider);
            const timeout = this._settingsManager.getRequestTimeout();
            const enableWebSearch = this._settingsManager.getEnableWebSearch();
            const llmProvider = LLMProviderFactory.createProvider(provider, apiKey, model, enableWebSearch);
            // Set the configured timeout
            llmProvider.setTimeout(timeout);
            console.log(`[Extension] Created LLM provider: ${llmProvider.constructor.name}`);

            // Callback to handle LLM response
            const callback = (error, response) => {
                console.log("[Extension] Callback entered");
                
                // Stop thinking timer
                this._stopThinkingTimer();
                
                if (error) {
                    console.error(`[Extension] Error: ${error}`);
                    this._chatDisplay.displayError(error.toString(), true);
                    this._chatInput.set_reactive(true);
                    this._chatInput.set_text("");
                    this._focusInputBox();
                    return;
                }
                
                console.log(`[Extension] Response received, type: ${typeof response}`);
                console.log(`[Extension] Tool call depth: ${this._toolCallDepth}`);
                
                // Check if response contains tool calls FIRST (but only if we haven't already done a search)
                let toolCalls = null;
                try {
                    toolCalls = llmProvider._extractToolCalls(response);
                    console.log(`[Extension] Tool calls extracted: ${toolCalls ? JSON.stringify(toolCalls) : 'none'}`);
                } catch (e) {
                    console.error(`[Extension] Error extracting tool calls: ${e.message}`);
                }
                
                // Only handle tool calls if web search is enabled AND we haven't exceeded depth
                if (toolCalls && toolCalls.length > 0 && enableWebSearch && this._toolCallDepth < this._maxToolCallDepth) {
                    console.log(`[Extension] Web search enabled, handling ${toolCalls.length} tool calls...`);
                    this._handleToolCalls(toolCalls, llmProvider, response);
                    return; // Don't process as text response
                }
                
                // If we got tool calls but can't handle them, log it
                if (toolCalls && toolCalls.length > 0) {
                    console.log(`[Extension] Ignoring tool calls (depth: ${this._toolCallDepth}, enabled: ${enableWebSearch})`);
                }
                
                // Normal text response - only if no tool calls
                console.log(`[Extension] Processing as text response`);
                let textResponse = '';
                try {
                    if (typeof response === 'string') {
                        textResponse = response;
                        console.log(`[Extension] Response is string, length: ${textResponse.length}`);
                    } else if (response && typeof response === 'object') {
                        console.log(`[Extension] Response is object, extracting text...`);
                        textResponse = llmProvider._extractResponseText(response);
                        console.log(`[Extension] Extracted text length: ${textResponse ? textResponse.length : 0}`);
                    }
                } catch (e) {
                    console.error(`[Extension] Error extracting text: ${e.message}`);
                    console.error(`[Extension] Response object: ${JSON.stringify(response).substring(0, 500)}`);
                }
                
                if (!textResponse || !textResponse.trim()) {
                    console.error(`[Extension] Empty response! Full response: ${JSON.stringify(response).substring(0, 1000)}`);
                    textResponse = '[No response from LLM - this may be a parsing error]';
                }
                
                this._chatDisplay.displayMessage(MessageRoles.ASSISTANT, textResponse);
                
                // Add to history
                this._history.push({ role: MessageRoles.ASSISTANT, content: textResponse });
                this._settingsManager.setHistory(this._history);
                
                this._chatInput.set_reactive(true);
                this._chatInput.set_text("");
                this._focusInputBox();
            };
            
            llmProvider.sendRequest(this._history, callback);
            console.log(`[Extension] Request sent, waiting for response...`);
        }

        /**
        * Handle tool calls from LLM (e.g., web search)
        * @param {Array} toolCalls - Array of tool calls
        * @param {LLMProvider} llmProvider - The LLM provider instance
        * @param {object} originalResponse - Original response from LLM
        * @private
        */
        _handleToolCalls(toolCalls, llmProvider, originalResponse) {
            console.log(`[Extension] Handling ${toolCalls.length} tool calls (depth: ${this._toolCallDepth})`);
            
            if (this._toolCallDepth >= this._maxToolCallDepth) {
                console.error(`[Extension] Max tool call depth (${this._maxToolCallDepth}) exceeded`);
                this._chatDisplay.displayError(`Web search limit reached. Please try rephrasing your question.`, false);
                this._stopThinkingTimer();
                this._chatInput.set_reactive(true);
                this._chatInput.set_text("");
                this._focusInputBox();
                return;
            }
            
            this._toolCallDepth++;
            const toolCall = toolCalls[0];
            
            if (toolCall.name === 'web_search') {
                const query = toolCall.input.query;
                console.log(`[Extension] Performing web search: ${query}`);
                
                this._chatDisplay.displayMessage(MessageRoles.ASSISTANT, `🔍 Searching the web for: "${query}"...`);
                
                const searxngInstance = this._settingsManager.getSearXNGInstance();
                const searchClient = new SearXNGSearchClient(searxngInstance);
                
                searchClient.search(query, (error, results) => {
                    if (error) {
                        console.error(`[Extension] Search error: ${error}`);
                        this._chatDisplay.displayError(`Web search failed: ${error.message}`, false);
                        this._stopThinkingTimer();
                        this._toolCallDepth = 0;
                        this._chatInput.set_reactive(true);
                        this._chatInput.set_text("");
                        this._focusInputBox();
                        return;
                    }
                    
                    console.log(`[Extension] Search completed, got results`);
                    console.log(`[Extension] Search results: ${results.substring(0, 200)}...`);
                    
                    const currentDate = new Date().toLocaleString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
                    });
                    
                    // Add search results as a new user message with clear instructions
                    this._history.push({
                        role: MessageRoles.USER,
                        content: `[WEB SEARCH RESULTS - Current time: ${currentDate}]\n\n${results}\n\n[END SEARCH RESULTS]\n\nUsing ONLY the search results above (which are current as of ${currentDate}), please answer the original question. Do not use your training data. If the search results don't contain the answer, say so.`
                    });
                    
                    this._settingsManager.setHistory(this._history);
                    
                    // Send to LLM again with search results
                    this._sendToLLM();
                });
            } else if (toolCall.name === 'youtube_summary') {
                const videoUrl = toolCall.input.video_url;
                console.log(`[Extension] Fetching YouTube transcript: ${videoUrl}`);
                
                this._chatDisplay.displayMessage(MessageRoles.ASSISTANT, `📺 Fetching YouTube video transcript...`);
                
                YouTubeTranscriptFetcher.fetchTranscript(videoUrl, (error, transcript) => {
                    if (error) {
                        console.error(`[Extension] YouTube fetch error: ${error}`);
                        this._chatDisplay.displayError(`YouTube transcript fetch failed: ${error.message}`, false);
                        this._stopThinkingTimer();
                        this._toolCallDepth = 0;
                        this._chatInput.set_reactive(true);
                        this._chatInput.set_text("");
                        this._focusInputBox();
                        return;
                    }
                    
                    console.log(`[Extension] Transcript fetched, length: ${transcript.length}`);
                    
                    const formatted = YouTubeTranscriptFetcher.formatTranscript(videoUrl, transcript);
                    
                    // Add transcript as a new user message
                    this._history.push({
                        role: MessageRoles.USER,
                        content: formatted
                    });
                    
                    this._settingsManager.setHistory(this._history);
                    
                    // Send to LLM again with transcript
                    this._sendToLLM();
                });
            } else {
                console.log(`[Extension] Unknown tool: ${toolCall.name}`);
                this._chatDisplay.displayError(`Unknown tool requested: ${toolCall.name}`, false);
                this._stopThinkingTimer();
                this._toolCallDepth = 0;
                this._chatInput.set_reactive(true);
                this._chatInput.set_text("");
                this._focusInputBox();
            }
        }

        /**
        * Set up keyboard shortcut
        * @private
        */
        _bindShortcut() {
            const shortcut = this._settingsManager.getOpenChatShortcut();
            setupShortcut(shortcut, this._extensionObj.settings, this._toggleChatWindow.bind(this));
        }

        /**
        * Remove keyboard shortcut
        * @private
        */
        _unbindShortcut() {
            removeShortcut();
        }

        /**
        * Focus the input box after a short delay
        * @private
        */
        _focusInputBox() {
            if (this._timeoutFocusInputBox) {
                GLib.Source.remove(this._timeoutFocusInputBox);
            }

            this._timeoutFocusInputBox = focusInput(this._chatInput);
        }

        /**
        * Toggle the chat window open/closed
        * @private
        */
        _toggleChatWindow() {
            if (this.menu.isOpen) {
                this.menu.close();
            } else {
                this.menu.open();
                this._focusInputBox();
            }
        }

        /**
        * Expand chat to GTK window for selection
        * @private
        */
        _expandToWindow() {
            log('[Garefowl] Expand button clicked');
            log(`[Garefowl] History length: ${this._history.length}`);
            
            const chatWindow = new ChatWindow(
                this._extensionInstance,
                this._history
            );
            chatWindow.show();
        }

        /**
        * Open extension settings
        * @private
        */
        _openSettings() {
            if (this._openSettingsCallback) {
                try {
                    this._openSettingsCallback();
                } catch (e) {
                    logError(e, '[Garefowl] Error opening settings');
                }
            }
        }

        /**
        * Clean up resources
        */
        destroy() {
            this._stopThinkingTimer();
            
            if (this._timeoutResponse) {
                GLib.Source.remove(this._timeoutResponse);
                this._timeoutResponse = null;
            }

            if (this._timeoutFocusInputBox) {
                GLib.Source.remove(this._timeoutFocusInputBox);
                this._timeoutFocusInputBox = null;
            }



            this._unbindShortcut();
            this._settingsManager.disconnectAll();
            this._chatDisplay.destroy();
            hideTooltip();

            super.destroy();
        }
    });

/**
 * Extension entry point class
 */
export default class GarefowlExtension extends Extension {
    enable() {
        this._garefowl = new Garefowl({
            settings:     this.getSettings(),
            openSettings: () => this.openPreferences(),
            clipboard:    St.Clipboard.get_default(),
            uuid:         this.uuid,
            extensionInstance: this,
        });

        Main.panel.addToStatusArea(this.uuid, this._garefowl);
    }

    disable() {
        this._garefowl.destroy();
        this._garefowl = null;
    }
}
