/**
 * Constants for the Garefowl AI Chatbot extension
 */

// LLM Provider identifiers
export const LLMProviders = {
    ANTHROPIC:  "anthropic",
    OPENAI:     "openai",
    GEMINI:     "gemini",
    OPENROUTER: "openrouter",
    OLLAMA:     "ollama",
    GROQ:       "groq",
};

// Settings keys
export const SettingsKeys = {
    LLM_PROVIDER:             "llm-provider",
    ANTHROPIC_API_KEY:        "anthropic-api-key",
    OPENAI_API_KEY:           "openai-api-key",
    GEMINI_API_KEY:           "gemini-api-key",
    OPENROUTER_API_KEY:       "openrouter-api-key",
    GROQ_API_KEY:             "groq-api-key",
    ANTHROPIC_MODEL:          "anthropic-model",
    OPENAI_MODEL:             "openai-model",
    GEMINI_MODEL:             "gemini-model",
    OPENROUTER_MODEL:         "openrouter-model",
    OLLAMA_MODEL:             "ollama-model",
    GROQ_MODEL:               "groq-model",
    REQUEST_TIMEOUT:          "request-timeout",
    ENABLE_WEB_SEARCH:        "enable-web-search",
    SEARXNG_INSTANCE:         "searxng-instance",
    HUMAN_MESSAGE_COLOR:      "human-message-color",
    LLM_MESSAGE_COLOR:        "llm-message-color",
    HUMAN_MESSAGE_TEXT_COLOR: "human-message-text-color",
    LLM_MESSAGE_TEXT_COLOR:   "llm-message-text-color",
    HISTORY:                  "history",
    OPEN_CHAT_SHORTCUT:       "open-chat-shortcut",
};

// Message role identifiers
export const MessageRoles = {
    USER:      "user",
    ASSISTANT: "assistant",
    MODEL:     "model", // Used for Gemini
};

// UI text constants
export const UI = {
    CHAT_INPUT_PLACEHOLDER: "Chat with me",
    THINKING_TEXT:          "I am thinking...",
    NEW_CONVERSATION_TEXT:  "Create a new conversation (Deletes current)",
    COPY_TEXT_HINT:         "Click on text to copy",
    LOADING_HISTORY:        "Loading history...",
    ERROR_API_KEY:          "Hmm, an error occurred when trying to reach out to the assistant.\nCheck your API key and model settings for {0} and try again. It could also be your internet connection!",
    ERROR_GENERIC:          "We are having trouble getting a response from the assistant. \nHere is the error - if it helps at all: \n\n{0} \n\nSome tips:\n\n- Check your internet connection\n- If you recently changed your provider, try deleting your history.",
    SETTINGS_BUTTON_TEXT:   "Click here to go to settings",
    PREFERENCES_SAVED:      "Preferences Saved",
    SAVE_PREFERENCES:       "Save Preferences",
    SAVE_PREFERENCES_HINT:  "Click 'Save Preferences' to apply your changes.",
};

// CSS class names
export const CSS = {
    HUMAN_MESSAGE:     "humanMessage",
    LLM_MESSAGE:       "llmMessage",
    HUMAN_MESSAGE_BOX: "humanMessage-box",
    LLM_MESSAGE_BOX:   "llmMessage-box",
    MESSAGE_INPUT:     "messageInput",
    POPUP_MENU_BOX:    "popup-menu-box",
    CHAT_SCROLLING:    "chat-scrolling",
};

// Web search tool definition
export const WEB_SEARCH_TOOL = {
    name: "web_search",
    description: "Search the web for current, real-time information. ALWAYS use this tool when the user asks about: current weather, today's date/time, latest news, recent events, current stock prices, live sports scores, or anything containing words like 'today', 'now', 'current', 'latest', 'recent'. This tool provides up-to-date information that you don't have in your training data.",
    input_schema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search query with relevant keywords. Be specific and include temporal terms like 'today', 'current', 'latest' when relevant."
            }
        },
        required: ["query"]
    }
};

// YouTube summary tool definition
export const YOUTUBE_SUMMARY_TOOL = {
    name: "youtube_summary",
    description: "Get transcript and summary of a YouTube video. Use this when user provides a YouTube URL or asks to summarize a YouTube video. The video must have subtitles/captions available.",
    input_schema: {
        type: "object",
        properties: {
            video_url: {
                type: "string",
                description: "YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)"
            }
        },
        required: ["video_url"]
    }
};
