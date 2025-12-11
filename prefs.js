/**
 * Preferences for Garefowl AI Chatbot
 *
 * Provides the UI for configuring the extension.
 */

/// <reference path="./global.d.ts" />
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Gdk from "gi://Gdk";

import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { SettingsKeys, LLMProviders } from "./lib/constants.js";

/**
 * Extension preferences management class
 */
export default class GarefowlPreferences extends ExtensionPreferences {
    /**
     * Fill the preferences window with the settings UI
     * @param {Adw.PreferencesWindow} window - The preferences window
     */
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
        
        // Set window size - increased width to accommodate all content
        window.set_default_size(1000, 700);
        window.set_search_enabled(false);
        
        const settingsUI = new SettingsUI(window._settings);
        const page = new Adw.PreferencesPage();
        page.add(settingsUI.ui);
        window.add(page);
    }
}

/**
 * Settings UI builder class
 */
class SettingsUI {
    /**
     * Create the settings UI
     * @param {Gio.Settings} schema - Extension settings schema
     */
    constructor(schema) {
        this.schema = schema;
        this.ui = new Adw.PreferencesGroup({ title: _("Settings:") });
        this.main = this._createMainGrid();

        // Load current settings
        this._loadCurrentSettings();

        // Create all UI sections
        this._createProviderSection();
        this._createAPIKeySection();
        this._createModelSection();
        this._createTimeoutSection();
        this._createShortcutSection();
        this._createColorSection();
        this._createSaveSection();

        this.ui.add(this.main);
    }

    /**
     * Create the main grid layout
     * @returns {Gtk.Grid} - The main grid
     * @private
     */
    _createMainGrid() {
        const grid = new Gtk.Grid({
            margin_top:         10,
            margin_bottom:      10,
            margin_start:       10,
            margin_end:         10,
            row_spacing:        10,
            column_spacing:     14,
            column_homogeneous: false,
            row_homogeneous:    false,
            hexpand:            true,
            vexpand:            false,
        });
        
        // Set column properties for better layout
        // Column 0: Labels (left aligned, natural width)
        grid.set_column_spacing(10);
        
        return grid;
    }

    /**
     * Load current settings from schema
     * @private
     */
    _loadCurrentSettings() {
        // Provider settings
        this.defaultProvider = this.schema.get_string(SettingsKeys.LLM_PROVIDER);

        // API keys
        this.defaultAnthropicKey = this.schema.get_string(SettingsKeys.ANTHROPIC_API_KEY);
        this.defaultOpenAIKey = this.schema.get_string(SettingsKeys.OPENAI_API_KEY);
        this.defaultGeminiKey = this.schema.get_string(SettingsKeys.GEMINI_API_KEY);
        this.defaultOpenRouterKey = this.schema.get_string(SettingsKeys.OPENROUTER_API_KEY);

        // Models
        this.defaultModel = this.schema.get_string(SettingsKeys.ANTHROPIC_MODEL);
        this.defaultOpenAIModel = this.schema.get_string(SettingsKeys.OPENAI_MODEL);
        this.defaultGeminiModel = this.schema.get_string(SettingsKeys.GEMINI_MODEL);
        this.defaultOpenRouterModel = this.schema.get_string(SettingsKeys.OPENROUTER_MODEL);
        this.defaultOllamaModel = this.schema.get_string(SettingsKeys.OLLAMA_MODEL);

        // Colors
        this.defaultHumanColor = this.schema.get_string(SettingsKeys.HUMAN_MESSAGE_COLOR);
        this.defaultLLMColor = this.schema.get_string(SettingsKeys.LLM_MESSAGE_COLOR);
        this.defaultHumanTextColor = this.schema.get_string(SettingsKeys.HUMAN_MESSAGE_TEXT_COLOR);
        this.defaultLLMTextColor = this.schema.get_string(SettingsKeys.LLM_MESSAGE_TEXT_COLOR);

        // Shortcut
        this.defaultShortcut = this.schema.get_strv(SettingsKeys.OPEN_CHAT_SHORTCUT)[0];

        // Timeout
        this.defaultTimeout = this.schema.get_int(SettingsKeys.REQUEST_TIMEOUT);
    }

    /**
     * Create the LLM provider selection section
     * @private
     */
    _createProviderSection() {
        const labelProvider = new Gtk.Label({
            label:        _("Choose LLM Provider:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Select the Large Language Model (LLM) provider you want to use."),
        });

        const providerList = new Gtk.StringList();
        providerList.append(_("Anthropic"));
        providerList.append(_("OpenAI"));
        providerList.append(_("Gemini"));
        providerList.append(_("OpenRouter"));
        providerList.append(_("Ollama"));

        this.provider = new Gtk.DropDown({
            model:      providerList,
            expression: new Gtk.ConstantExpression(0),
            hexpand:    true,
        });

        // Set the default provider
        let defaultProviderIndex = 0; // Default to Anthropic
        const providers = [
            LLMProviders.ANTHROPIC,
            LLMProviders.OPENAI,
            LLMProviders.GEMINI,
            LLMProviders.OPENROUTER,
            LLMProviders.OLLAMA,
        ];

        for (let i = 0; i < providers.length; i++) {
            if (providers[i] === this.defaultProvider) {
                defaultProviderIndex = i;
                break;
            }
        }

        this.provider.set_selected(defaultProviderIndex);

        // Add to grid
        this.main.attach(labelProvider, 0, 0, 1, 1);
        this.main.attach(this.provider, 2, 0, 2, 1);
    }

    /**
     * Create the API key section
     * @private
     */
    _createAPIKeySection() {
        // Anthropic API Key
        const labelAnthropicAPI = new Gtk.Label({
            label:        _("Anthropic API Key:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Enter your Anthropic API key here."),
        });

        this.anthropicApiKey = new Gtk.Entry({
            buffer:     new Gtk.EntryBuffer(),
            visibility: false, // hide the key
            hexpand:    true,
            width_chars: 30,
        });
        this.anthropicApiKey.set_placeholder_text(_("Paste your Anthropic API key"));
        this.anthropicApiKey.set_text(this.defaultAnthropicKey);

        const howToAnthropicAPI = new Gtk.LinkButton({
            label:   _("Get Anthropic API Key"),
            uri:     "https://console.anthropic.com/account/keys",
            halign:  Gtk.Align.START,
        });

        // OpenAI API Key
        const labelOpenAIAPI = new Gtk.Label({
            label:        _("OpenAI API Key:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Enter your OpenAI API key here."),
        });

        this.openaiApiKey = new Gtk.Entry({
            buffer:     new Gtk.EntryBuffer(),
            visibility: false,
            hexpand:    true,
            width_chars: 30,
        });
        this.openaiApiKey.set_placeholder_text(_("Paste your OpenAI API key"));
        this.openaiApiKey.set_text(this.defaultOpenAIKey);

        const howToOpenAIAPI = new Gtk.LinkButton({
            label:   _("Get OpenAI API Key"),
            uri:     "https://platform.openai.com/api-keys",
            halign:  Gtk.Align.START,
        });

        // Gemini API Key
        const labelGeminiAPI = new Gtk.Label({
            label:        _("Gemini API Key:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Enter your Gemini API key here."),
        });

        this.geminiApiKey = new Gtk.Entry({
            buffer:     new Gtk.EntryBuffer(),
            visibility: false,
            hexpand:    true,
            width_chars: 30,
        });
        this.geminiApiKey.set_placeholder_text(_("Paste your Gemini API key"));
        this.geminiApiKey.set_text(this.defaultGeminiKey);

        const howToGeminiAPI = new Gtk.LinkButton({
            label:   _("Get Gemini API Key"),
            uri:     "https://makersuite.google.com/app/apikey",
            halign:  Gtk.Align.START,
        });

        // OpenRouter API Key
        const labelOpenRouterAPI = new Gtk.Label({
            label:        _("OpenRouter API Key:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Enter your OpenRouter API key here."),
        });

        this.openRouterApiKey = new Gtk.Entry({
            buffer:     new Gtk.EntryBuffer(),
            visibility: false,
            hexpand:    true,
            width_chars: 30,
        });
        this.openRouterApiKey.set_placeholder_text(_("Paste your OpenRouter API key"));
        this.openRouterApiKey.set_text(this.defaultOpenRouterKey);

        const howToOpenRouterAPI = new Gtk.LinkButton({
            label:   _("Get OpenRouter API Key"),
            uri:     "https://openrouter.ai/settings/keys",
            halign:  Gtk.Align.START,
        });

        // Add to grid
        this.main.attach(labelAnthropicAPI, 0, 1, 1, 1);
        this.main.attach(this.anthropicApiKey, 2, 1, 2, 1);
        this.main.attach(howToAnthropicAPI, 4, 1, 2, 1);

        this.main.attach(labelOpenAIAPI, 0, 2, 1, 1);
        this.main.attach(this.openaiApiKey, 2, 2, 2, 1);
        this.main.attach(howToOpenAIAPI, 4, 2, 1, 1);

        this.main.attach(labelGeminiAPI, 0, 3, 1, 1);
        this.main.attach(this.geminiApiKey, 2, 3, 2, 1);
        this.main.attach(howToGeminiAPI, 4, 3, 1, 1);

        this.main.attach(labelOpenRouterAPI, 0, 4, 1, 1);
        this.main.attach(this.openRouterApiKey, 2, 4, 2, 1);
        this.main.attach(howToOpenRouterAPI, 4, 4, 1, 1);
    }

    /**
     * Create the model selection section
     * @private
     */
    _createModelSection() {
        // Anthropic Model
        const labelModel = new Gtk.Label({
            label:        _("Anthropic Model:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Specify the Anthropic model you want to use. Example: claude-v1.3"),
        });

        this.model = new Gtk.Entry({
            buffer: new Gtk.EntryBuffer(),
            hexpand: true,
            width_chars: 30,
        });
        this.model.set_placeholder_text(_("e.g., claude-v1.3"));
        this.model.set_text(this.defaultModel);

        const howToModel = new Gtk.LinkButton({
            label:   _("Available Anthropic Models"),
            uri:     "https://docs.anthropic.com/claude/docs/models-overview",
            halign:  Gtk.Align.START,
        });

        // OpenAI Model
        const labelOpenAIModel = new Gtk.Label({
            label:        _("OpenAI Model:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Specify the OpenAI model you want to use. Example: gpt-3.5-turbo"),
        });

        this.openaiModel = new Gtk.Entry({
            buffer: new Gtk.EntryBuffer(),
            hexpand: true,
            width_chars: 30,
        });
        this.openaiModel.set_placeholder_text(_("e.g., gpt-3.5-turbo"));
        this.openaiModel.set_text(this.defaultOpenAIModel);

        const howToOpenAIModel = new Gtk.LinkButton({
            label:   _("Available OpenAI Models"),
            uri:     "https://platform.openai.com/docs/models",
            halign:  Gtk.Align.START,
        });

        // Gemini Model
        const labelGeminiModel = new Gtk.Label({
            label:        _("Gemini Model:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Specify the Gemini model you want to use. Example: gemini-1.0-pro"),
        });

        this.geminiModel = new Gtk.Entry({
            buffer: new Gtk.EntryBuffer(),
            hexpand: true,
            width_chars: 30,
        });
        this.geminiModel.set_placeholder_text(_("e.g., gemini-1.0-pro"));
        this.geminiModel.set_text(this.defaultGeminiModel);

        const howToGeminiModel = new Gtk.LinkButton({
            label:   _("Available Gemini Models"),
            uri:     "https://ai.google.dev/models/gemini",
            halign:  Gtk.Align.START,
        });

        // OpenRouter Model
        const labelOpenRouterModel = new Gtk.Label({
            label:        _("OpenRouter Model:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Specify the OpenRouter model you want to use. Example: meta-llama/llama-3.3-70b-instruct:free"),
        });

        this.openRouterModel = new Gtk.Entry({
            buffer: new Gtk.EntryBuffer(),
            hexpand: true,
            width_chars: 30,
        });
        this.openRouterModel.set_placeholder_text(_("e.g., meta-llama/llama-3.3-70b-instruct:free"));
        this.openRouterModel.set_text(this.defaultOpenRouterModel);

        const howToOpenRouterModel = new Gtk.LinkButton({
            label:   _("Available OpenRouter Models"),
            uri:     "https://openrouter.ai/models",
            halign:  Gtk.Align.START,
        });

        // Ollama Model
        const labelOllamaModel = new Gtk.Label({
            label:        _("Ollama Model:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Specify the Ollama model you want to use. Example: llama2"),
        });

        this.ollamaModel = new Gtk.Entry({
            buffer: new Gtk.EntryBuffer(),
            hexpand: true,
            width_chars: 30,
        });
        this.ollamaModel.set_placeholder_text(_("e.g., llama2"));
        this.ollamaModel.set_text(this.defaultOllamaModel);

        const howToOllamaModel = new Gtk.LinkButton({
            label:   _("Available Ollama Models"),
            uri:     "https://ollama.com/models",
            halign:  Gtk.Align.START,
        });

        // Add to grid
        this.main.attach(labelModel, 0, 5, 1, 1);
        this.main.attach(this.model, 2, 5, 2, 1);
        this.main.attach(howToModel, 4, 5, 1, 1);

        this.main.attach(labelOpenAIModel, 0, 6, 1, 1);
        this.main.attach(this.openaiModel, 2, 6, 2, 1);
        this.main.attach(howToOpenAIModel, 4, 6, 1, 1);

        this.main.attach(labelGeminiModel, 0, 7, 1, 1);
        this.main.attach(this.geminiModel, 2, 7, 2, 1);
        this.main.attach(howToGeminiModel, 4, 7, 1, 1);

        this.main.attach(labelOpenRouterModel, 0, 8, 1, 1);
        this.main.attach(this.openRouterModel, 2, 8, 2, 1);
        this.main.attach(howToOpenRouterModel, 4, 8, 1, 1);

        this.main.attach(labelOllamaModel, 0, 9, 1, 1);
        this.main.attach(this.ollamaModel, 2, 9, 2, 1);
        this.main.attach(howToOllamaModel, 4, 9, 1, 1);
    }

    /**
     * Create the timeout configuration section
     * @private
     */
    _createTimeoutSection() {
        const labelTimeout = new Gtk.Label({
            label:        _("Request Timeout (seconds):"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Timeout for LLM API requests in seconds. Increase for slower models or reasoning models that take longer to respond."),
        });

        this.timeout = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower:          30,     // Minimum 30 seconds
                upper:          1800,   // Maximum 30 minutes  
                step_increment: 30,     // Step by 30 seconds
                page_increment: 60,     // Page step by 1 minute
                value:          300,    // Default 5 minutes
            }),
            climb_rate: 1,
            digits:     0,
        });
        this.timeout.set_value(this.defaultTimeout);

        const timeoutInfo = new Gtk.Label({
            label:        _("30-1800 seconds"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Reasoning models (like deepseek-r1) may need 5-10 minutes."),
        });

        // Add to grid
        this.main.attach(labelTimeout, 0, 10, 1, 1);
        this.main.attach(this.timeout, 2, 10, 1, 1);
        this.main.attach(timeoutInfo, 3, 10, 1, 1);
    }

    /**
     * Create the color selection section
     * @private
     */
    _createColorSection() {
        // Helper to create a color preview row using Gtk.ColorButton
        const createColorRow = (defaultColor, labelText, tooltip, row, onColorChanged) => {
            const label = new Gtk.Label({
                label: labelText,
                halign: Gtk.Align.START,
                tooltip_text: tooltip,
            });
            // Correct RGBA parsing
            let rgba = new Gdk.RGBA();
            rgba.parse(defaultColor);
            const colorButton = new Gtk.ColorButton({
                rgba: rgba,
                use_alpha: false,
                tooltip_text: tooltip,
            });
            colorButton.connect('color-set', () => {
                const rgba = colorButton.get_rgba();
                const colorStr = rgba.to_string();
                if (onColorChanged) onColorChanged(colorStr);
            });
            this.main.attach(label, 0, row, 1, 1);
            this.main.attach(colorButton, 2, row, 1, 1);
            return colorButton;
        };

        // Human Message Background Color
        this.humanColorButton = createColorRow(
            this.defaultHumanColor,
            _("Your Message Background Color:"),
            _("Select the background color for your messages."),
            11,
            (color) => { this.humanColorValue = color; }
        );

        // Human Message Text Color
        this.humanTextColorButton = createColorRow(
            this.defaultHumanTextColor,
            _("Your Message Text Color:"),
            _("Select the text color for your messages."),
            12,
            (color) => { this.humanTextColorValue = color; }
        );

        // LLM Message Background Color
        this.llmColorButton = createColorRow(
            this.defaultLLMColor,
            _("Chatbot Message Background Color:"),
            _("Select the background color for the chatbot's messages."),
            13,
            (color) => { this.llmColorValue = color; }
        );

        // LLM Message Text Color
        this.llmTextColorButton = createColorRow(
            this.defaultLLMTextColor,
            _("Chatbot Message Text Color:"),
            _("Select the text color for the chatbot's messages."),
            14,
            (color) => { this.llmTextColorValue = color; }
        );
    }

    /**
     * Create the keyboard shortcut section
     * @private
     */
    _createShortcutSection() {
        const labelShortcut = new Gtk.Label({
            label:        _("Open Chat Shortcut:"),
            halign:       Gtk.Align.START,
            tooltip_text: _("Set the keyboard shortcut to open the chat window."),
        });

        this.shortcutLabel = new Gtk.ShortcutLabel({
            accelerator: this.defaultShortcut,
            halign:      Gtk.Align.CENTER,
            valign:      Gtk.Align.CENTER,
        });

        this.shortcutButton = new Gtk.Button({
            label:  _("Change"),
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });

        const shortcutController = Gtk.EventControllerKey.new();
        this.shortcutButton.add_controller(shortcutController);
        this.changingShortcut = false;

        this.shortcutButton.connect("clicked", () => {
            this.changingShortcut = true;
            this.shortcutButton.label = _("Press new shortcut...");
        });

        shortcutController.connect("key-pressed", (controller, keyval, keycode, state) => {
            if (!this.changingShortcut) return Gdk.EVENT_PROPAGATE;

            const mask = state & Gtk.accelerator_get_default_mod_mask();
            const shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
            this.shortcutLabel.accelerator = shortcut;

            return Gdk.EVENT_STOP;
        });

        shortcutController.connect("key-released", () => {
            if (!this.changingShortcut) return;

            this.changingShortcut = false;
            this.shortcutButton.label = _("Change");
            const newShortcut = this.shortcutLabel.accelerator;
            this.schema.set_strv(SettingsKeys.OPEN_CHAT_SHORTCUT, [newShortcut]);
        });

        this.schema.connect("changed::open-chat-shortcut", () => {
            const newShortcut = this.schema.get_strv(SettingsKeys.OPEN_CHAT_SHORTCUT)[0];
            this.shortcutLabel.accelerator = newShortcut;
        });

        // Add to grid
        this.main.attach(labelShortcut, 0, 15, 1, 1);
        this.main.attach(this.shortcutLabel, 2, 15, 1, 1);
        this.main.attach(this.shortcutButton, 3, 15, 1, 1);
    }

    /**
     * Create the save button section
     * @private
     */
    _createSaveSection() {
        this.saveButton = new Gtk.Button({
            label: _("Save Preferences"),
        });

        this.statusLabel = new Gtk.Label({
            label:     _("Click 'Save Preferences' to apply your changes."),
            useMarkup: true,
            halign:    Gtk.Align.CENTER,
        });

        this.saveButton.connect("clicked", () => this._saveSettings());

        // Add to grid
        this.main.attach(this.saveButton, 2, 16, 1, 1);
        this.main.attach(this.statusLabel, 0, 17, 4, 1);
    }

    /**
     * Save settings to schema
     * @private
     */
    _saveSettings() {
        // Get provider
        const providerList = [
            LLMProviders.ANTHROPIC,
            LLMProviders.OPENAI,
            LLMProviders.GEMINI,
            LLMProviders.OPENROUTER,
            LLMProviders.OLLAMA,
        ];
        const selectedProvider = providerList[this.provider.get_selected()];

        // Save provider
        this.schema.set_string(SettingsKeys.LLM_PROVIDER, selectedProvider);

        // Save API keys
        this.schema.set_string(SettingsKeys.ANTHROPIC_API_KEY, this.anthropicApiKey.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.OPENAI_API_KEY, this.openaiApiKey.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.GEMINI_API_KEY, this.geminiApiKey.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.OPENROUTER_API_KEY, this.openRouterApiKey.get_buffer().get_text());

        // Save models
        this.schema.set_string(SettingsKeys.ANTHROPIC_MODEL, this.model.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.OPENAI_MODEL, this.openaiModel.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.GEMINI_MODEL, this.geminiModel.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.OPENROUTER_MODEL, this.openRouterModel.get_buffer().get_text());
        this.schema.set_string(SettingsKeys.OLLAMA_MODEL, this.ollamaModel.get_buffer().get_text());

        // Save colors
        this.schema.set_string(SettingsKeys.HUMAN_MESSAGE_COLOR, this.humanColorValue || this.defaultHumanColor);
        this.schema.set_string(SettingsKeys.LLM_MESSAGE_COLOR, this.llmColorValue || this.defaultLLMColor);
        this.schema.set_string(SettingsKeys.HUMAN_MESSAGE_TEXT_COLOR, this.humanTextColorValue || this.defaultHumanTextColor);
        this.schema.set_string(SettingsKeys.LLM_MESSAGE_TEXT_COLOR, this.llmTextColorValue || this.defaultLLMTextColor);

        // Save shortcut
        this.schema.set_strv(SettingsKeys.OPEN_CHAT_SHORTCUT, [this.shortcutLabel.accelerator]);

        // Save timeout
        this.schema.set_int(SettingsKeys.REQUEST_TIMEOUT, this.timeout.get_value());

        // Show success message
        this.statusLabel.set_label(_("Preferences saved successfully!"));
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            this.statusLabel.set_label(_("Click 'Save Preferences' to apply your changes."));
            return GLib.SOURCE_REMOVE;
        });
    }
}