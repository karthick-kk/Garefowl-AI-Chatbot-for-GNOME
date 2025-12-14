import Soup from "gi://Soup";
import GLib from "gi://GLib";
import { LLMProviders, MessageRoles, WEB_SEARCH_TOOL, YOUTUBE_SUMMARY_TOOL } from "./constants.js";

/**
 * Base class for LLM providers
 */
class LLMProvider {
    /**
     * Create a base LLM provider
     * @param {string} apiKey - API key for the provider
     * @param {string} model - Model name to use
     * @param {boolean} enableWebSearch - Whether to enable web search tools
     */
    constructor(apiKey, model, enableWebSearch = false) {
        this._apiKey = apiKey;
        this._model = model;
        this._enableWebSearch = enableWebSearch;
        this._httpSession = new Soup.Session();
        // Default timeout for reasoning models
        this._httpSession.timeout = 300; // 5 minutes timeout for reasoning models
    }

    /**
     * Set the request timeout
     * @param {number} timeoutSeconds - Timeout in seconds
     */
    setTimeout(timeoutSeconds) {
        this._httpSession.timeout = timeoutSeconds;
    }

    /**
     * Prepare HTTP message for the API request
     * @param {string} url - API endpoint URL
     * @param {object} requestBody - Request body object
     * @returns {Soup.Message} - Configured message object
     */
    _prepareRequest(url, requestBody) {
        const message = Soup.Message.new("POST", url);
        message.request_headers.append("content-type", "application/json");

        // Add provider-specific headers in subclasses
        this._addRequestHeaders(message);

        const body = JSON.stringify(requestBody);
        const bytes = GLib.Bytes.new(body);
        message.set_request_body_from_bytes("application/json", bytes);

        return message;
    }

    /**
     * Add provider-specific headers to the request
     * @param {Soup.Message} message - Message to modify
     */
    _addRequestHeaders(message) {
        // Implemented by subclasses
    }

    /**
     * Extract the response text from API response
     * @param {object} response - Parsed API response
     * @returns {string} - Extracted text
     */
    _extractResponseText(response) {
        // Implemented by subclasses
        return "";
    }

    /**
     * Format the chat history for the provider's API
     * @param {Array} history - Chat history array
     * @returns {object} - Formatted messages for the API
     */
    _formatMessages(history) {
        // Implemented by subclasses
        return [];
    }

    /**
     * Generate the request body for the API call
     * @param {Array} history - Chat history
     * @returns {object} - Request body object
     */
    _generateRequestBody(history) {
        // Implemented by subclasses
        return {};
    }

    /**
     * Check if this provider/model supports function calling
     * @returns {boolean} - True if function calling is supported
     */
    supportsTools() {
        return false; // Override in subclasses
    }

    /**
     * Extract tool calls from the response
     * @param {object} response - API response
     * @returns {Array|null} - Array of tool calls or null
     */
    _extractToolCalls(response) {
        return null; // Override in subclasses
    }

    /**
     * Send a request to the LLM API
     * @param {Array} history - Chat history
     * @param {Function} callback - Callback function for the response
     */
    sendRequest(history, callback) {
        const requestBody = this._generateRequestBody(history);
        const url = this._getEndpointUrl();
        const message = this._prepareRequest(url, requestBody);

        // Debug logging
        console.log(`[LLMProvider] Sending request to: ${url}`);

        this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    let bytes;
                    try {
                        bytes = session.send_and_read_finish(result);
                    } catch (networkError) {
                        const errMsg = `Network error: ${networkError.message}\nURL: ${url}`;
                        console.error(`[LLMProvider] Network error: ${errMsg}`);
                        callback(new Error(errMsg), null);
                        return;
                    }
                    
                    if (!bytes) {
                        const errMsg = `No response data received\nURL: ${url}`;
                        console.error(`[LLMProvider] No data: ${errMsg}`);
                        callback(new Error(errMsg), null);
                        return;
                    }
                    
                    const decoder = new TextDecoder("utf-8");
                    const raw = decoder.decode(bytes.get_data());
                    const statusCode = message.status_code;
                    console.log(`[LLMProvider] Response status: ${statusCode}`);
                    console.log(`[LLMProvider] Response length: ${raw.length} chars`);
                    
                    if (statusCode === 200) {
                        let json;
                        try {
                            json = JSON.parse(raw);
                        } catch (parseError) {
                            const errMsg = `Failed to parse JSON: ${parseError.message}\nURL: ${url}\nRequest: ${JSON.stringify(requestBody)}\nRaw: ${raw}`;
                            console.error(`[LLMProvider] Parse error: ${errMsg}`);
                            callback(new Error(errMsg), null);
                            return;
                        }
                        
                        // Pass the full JSON response to callback so it can check for tool calls
                        console.log(`[LLMProvider] Calling callback with full response`);
                        try {
                            callback(null, json);
                            console.log(`[LLMProvider] Callback completed successfully`);
                        } catch (callbackError) {
                            console.error(`[LLMProvider] Error in callback: ${callbackError.message}`);
                            console.error(`[LLMProvider] Callback stack: ${callbackError.stack}`);
                        }
                    } else {
                        const errMsg = `HTTP error ${statusCode}\nURL: ${url}\nRequest: ${JSON.stringify(requestBody)}\nResponse: ${raw}`;
                        console.error(`[LLMProvider] HTTP error: ${errMsg}`);
                        callback(new Error(errMsg), null);
                    }
                } catch (error) {
                    const errMsg = `Exception in response handler: ${error.message}\nURL: ${url}\nRequest: ${JSON.stringify(requestBody)}`;
                    console.error(`[LLMProvider] Exception: ${errMsg}`);
                    callback(new Error(errMsg), null);
                }
            }
        );
    }

    /**
     * Get the API endpoint URL
     * @returns {string} - Endpoint URL
     */
    _getEndpointUrl() {
        // Implemented by subclasses
        return "";
    }

    /**
     * Abort any ongoing requests
     */
    abort() {
        if (this._httpSession) {
            this._httpSession.abort();
        }
    }
}

/**
 * Anthropic Claude API provider
 */
class AnthropicProvider extends LLMProvider {
    /**
     * @inheritdoc
     */
    _addRequestHeaders(message) {
        message.request_headers.append("x-api-key", this._apiKey);
        message.request_headers.append("anthropic-version", "2023-06-01");
    }

    /**
     * @inheritdoc
     */
    _getEndpointUrl() {
        return "https://api.anthropic.com/v1/messages";
    }

    /**
     * @inheritdoc
     */
    _generateRequestBody(history) {
        const body = {
            model:    this._model,
            messages: history.map((msg) => ({
                role:    msg.role === MessageRoles.USER ? MessageRoles.USER : MessageRoles.ASSISTANT,
                content: msg.content,
            })),
            max_tokens: 4096,
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [
                {
                    name: WEB_SEARCH_TOOL.name,
                    description: WEB_SEARCH_TOOL.description,
                    input_schema: WEB_SEARCH_TOOL.input_schema
                },
                {
                    name: YOUTUBE_SUMMARY_TOOL.name,
                    description: YOUTUBE_SUMMARY_TOOL.description,
                    input_schema: YOUTUBE_SUMMARY_TOOL.input_schema
                }
            ];
            body.system = "You have access to web_search and youtube_summary tools. Use web_search for real-time info and youtube_summary when user provides YouTube URLs. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data.";
        }

        return body;
    }

    /**
     * @inheritdoc
     */
    supportsTools() {
        return true;
    }

    /**
     * @inheritdoc
     */
    _extractToolCalls(response) {
        if (response.content) {
            for (const block of response.content) {
                if (block.type === 'tool_use') {
                    return [{
                        id: block.id,
                        name: block.name,
                        input: block.input
                    }];
                }
            }
        }
        return null;
    }

    /**
     * @inheritdoc
     */
    _extractResponseText(response) {
        if (!response.content || !Array.isArray(response.content)) {
            console.error('[AnthropicProvider] Invalid response structure');
            return '';
        }
        
        // Find the first text block in the content array
        for (const block of response.content) {
            if (block.type === 'text' && block.text) {
                return block.text;
            }
        }
        
        console.error('[AnthropicProvider] No text block found in response');
        return '';
    }
}

/**
 * OpenAI API provider
 */
class OpenAIProvider extends LLMProvider {
    /**
     * @inheritdoc
     */
    _addRequestHeaders(message) {
        message.request_headers.append("Authorization", `Bearer ${this._apiKey}`);
    }

    /**
     * @inheritdoc
     */
    _getEndpointUrl() {
        return "https://api.openai.com/v1/chat/completions";
    }

    /**
     * @inheritdoc
     */
    _generateRequestBody(history) {
        const messages = history.map((msg) => ({
            role:    msg.role === MessageRoles.USER ? MessageRoles.USER : MessageRoles.ASSISTANT,
            content: msg.content,
        }));

        if (this._enableWebSearch && this.supportsTools()) {
            messages.unshift({
                role: "system",
                content: "You have web_search and youtube_summary tools. Use them when appropriate. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data."
            });
        }

        const body = {
            model:    this._model,
            messages: messages,
            temperature:           1,
            max_completion_tokens: 4096,
            top_p:                 1,
            frequency_penalty:     0,
            presence_penalty:      0,
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [
                {
                    type: "function",
                    function: {
                        name: WEB_SEARCH_TOOL.name,
                        description: WEB_SEARCH_TOOL.description,
                        parameters: WEB_SEARCH_TOOL.input_schema
                    }
                },
                {
                    type: "function",
                    function: {
                        name: YOUTUBE_SUMMARY_TOOL.name,
                        description: YOUTUBE_SUMMARY_TOOL.description,
                        parameters: YOUTUBE_SUMMARY_TOOL.input_schema
                    }
                }
            ];
        }

        return body;
    }

    /**
     * @inheritdoc
     */
    supportsTools() {
        return true;
    }

    /**
     * @inheritdoc
     */
    _extractToolCalls(response) {
        if (response.choices?.[0]?.message?.tool_calls) {
            return response.choices[0].message.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments)
            }));
        }
        return null;
    }

    /**
     * @inheritdoc
     */
    _extractResponseText(response) {
        return response.choices[0].message.content;
    }
}

/**
 * Google Gemini API provider
 */
class GeminiProvider extends LLMProvider {
    /**
     * @inheritdoc
     */
    _getEndpointUrl() {
        return `https://generativelanguage.googleapis.com/v1beta/models/${this._model}:generateContent?key=${this._apiKey}`;
    }

    /**
     * @inheritdoc
     */
    _generateRequestBody(history) {
        const contents = history.map((msg) => ({
            role:  msg.role === MessageRoles.USER ? MessageRoles.USER : "model",
            parts: [{ text: msg.content }],
        }));

        if (this._enableWebSearch && this.supportsTools() && contents.length > 0) {
            contents[0].parts[0].text = "[SYSTEM: You have web_search and youtube_summary tools. Use them when appropriate. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data.]\n\n" + contents[0].parts[0].text;
        }

        const body = {
            contents: contents,
            generationConfig: {
                temperature:      1,
                topK:             40,
                topP:             0.95,
                maxOutputTokens:  8192,
                responseMimeType: "text/plain",
            },
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [{
                function_declarations: [
                    {
                        name: WEB_SEARCH_TOOL.name,
                        description: WEB_SEARCH_TOOL.description,
                        parameters: WEB_SEARCH_TOOL.input_schema
                    },
                    {
                        name: YOUTUBE_SUMMARY_TOOL.name,
                        description: YOUTUBE_SUMMARY_TOOL.description,
                        parameters: YOUTUBE_SUMMARY_TOOL.input_schema
                    }
                ]
            }];
        }

        return body;
    }

    /**
     * @inheritdoc
     */
    supportsTools() {
        return true;
    }

    /**
     * @inheritdoc
     */
    _extractToolCalls(response) {
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.functionCall) {
                    return [{
                        id: 'gemini_call',
                        name: part.functionCall.name,
                        input: part.functionCall.args
                    }];
                }
            }
        }
        return null;
    }

    /**
     * @inheritdoc
     */
    _extractResponseText(response) {
        return response.candidates[0].content.parts[0].text;
    }
}

/**
 * OpenRouter API provider
 */
class OpenRouterProvider extends LLMProvider {
    /**
     * @inheritdoc
     */
    _addRequestHeaders(message) {
        message.request_headers.append("Authorization", `Bearer ${this._apiKey}`);
    }

    /**
     * @inheritdoc
     */
    _getEndpointUrl() {
        return "https://openrouter.ai/api/v1/chat/completions";
    }

    /**
     * @inheritdoc
     */
    _generateRequestBody(history) {
        const messages = [...history];

        if (this._enableWebSearch && this.supportsTools()) {
            messages.unshift({
                role: "system",
                content: "You have web_search and youtube_summary tools. Use them when appropriate. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data."
            });
        }

        const body = {
            messages: messages,
            model:    this._model,
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [
                {
                    type: "function",
                    function: {
                        name: WEB_SEARCH_TOOL.name,
                        description: WEB_SEARCH_TOOL.description,
                        parameters: WEB_SEARCH_TOOL.input_schema
                    }
                },
                {
                    type: "function",
                    function: {
                        name: YOUTUBE_SUMMARY_TOOL.name,
                        description: YOUTUBE_SUMMARY_TOOL.description,
                        parameters: YOUTUBE_SUMMARY_TOOL.input_schema
                    }
                }
            ];
        }

        return body;
    }

    /**
     * @inheritdoc
     */
    supportsTools() {
        // OpenRouter support depends on the model
        return true;
    }

    /**
     * @inheritdoc
     */
    _extractToolCalls(response) {
        if (response.choices?.[0]?.message?.tool_calls) {
            return response.choices[0].message.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments)
            }));
        }
        return null;
    }

    /**
     * @inheritdoc
     */
    _extractResponseText(response) {
        return response.choices[0].message.content;
    }
}

/**
 * Groq API provider
 */
class GroqProvider extends LLMProvider {
    _addRequestHeaders(message) {
        message.request_headers.append("Authorization", `Bearer ${this._apiKey}`);
    }

    _getEndpointUrl() {
        return "https://api.groq.com/openai/v1/chat/completions";
    }

    _generateRequestBody(history) {
        const messages = history.map((msg) => ({
            role:    msg.role === MessageRoles.USER ? MessageRoles.USER : MessageRoles.ASSISTANT,
            content: msg.content,
        }));

        if (this._enableWebSearch && this.supportsTools()) {
            messages.unshift({
                role: "system",
                content: "You have web_search and youtube_summary tools. Use them when appropriate. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data."
            });
        }

        const body = {
            model:    this._model,
            messages: messages,
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [
                {
                    type: "function",
                    function: {
                        name: WEB_SEARCH_TOOL.name,
                        description: WEB_SEARCH_TOOL.description,
                        parameters: WEB_SEARCH_TOOL.input_schema
                    }
                },
                {
                    type: "function",
                    function: {
                        name: YOUTUBE_SUMMARY_TOOL.name,
                        description: YOUTUBE_SUMMARY_TOOL.description,
                        parameters: YOUTUBE_SUMMARY_TOOL.input_schema
                    }
                }
            ];
        }

        return body;
    }

    supportsTools() {
        return true;
    }

    _extractToolCalls(response) {
        if (response.choices?.[0]?.message?.tool_calls) {
            return response.choices[0].message.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments)
            }));
        }
        return null;
    }

    _extractResponseText(response) {
        return response.choices[0].message.content;
    }
}

/**
 * Ollama local API provider
 */
class OllamaProvider extends LLMProvider {
    _getEndpointUrl() {
        // Use /api/chat for chat-based Ollama API
        return 'http://127.0.0.1:11434/api/chat';
    }

    _addRequestHeaders(message) {
        // No auth required for local Ollama Serve
    }

    _generateRequestBody(history) {
        // Only include messages with valid roles and non-empty content
        const messages = history
            .filter(msg => msg.role === MessageRoles.USER || msg.role === MessageRoles.ASSISTANT)
            .map(msg => ({
                role: msg.role === MessageRoles.USER ? 'user' : 'assistant',
                content: msg.content || ''
            }));

        if (this._enableWebSearch && this.supportsTools()) {
            messages.unshift({
                role: 'system',
                content: "You have web_search and youtube_summary tools. Use them when appropriate. When messages contain [WEB SEARCH RESULTS] or [YOUTUBE VIDEO TRANSCRIPT], answer ONLY using that data."
            });
        }

        // Ensure at least one user message exists
        if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
            // Fallback: send a dummy user message to avoid 400 error
            messages.push({ role: 'user', content: '' });
        }
        
        // Debug the model name
        console.log(`[OllamaProvider] Using model: "${this._model}"`);
        if (!this._model || this._model.trim() === '') {
            console.error('[OllamaProvider] Model name is empty! Check extension settings.');
        }
        
        const body = { 
            model: this._model, 
            messages,
            stream: false  // Disable streaming for better compatibility with GNOME extension
        };

        if (this._enableWebSearch && this.supportsTools()) {
            body.tools = [
                {
                    type: "function",
                    function: {
                        name: WEB_SEARCH_TOOL.name,
                        description: WEB_SEARCH_TOOL.description,
                        parameters: WEB_SEARCH_TOOL.input_schema
                    }
                },
                {
                    type: "function",
                    function: {
                        name: YOUTUBE_SUMMARY_TOOL.name,
                        description: YOUTUBE_SUMMARY_TOOL.description,
                        parameters: YOUTUBE_SUMMARY_TOOL.input_schema
                    }
                }
            ];
        }

        return body;
    }

    /**
     * @inheritdoc
     */
    supportsTools() {
        // Only certain Ollama models support tools
        const modelLower = this._model.toLowerCase();
        const toolModels = [
            'llama3.1', 'llama3.2', 'llama-3.1', 'llama-3.2',
            'mistral', 'mixtral', 'ministral',
            'qwen2.5', 'qwen-2.5',
            'command-r', 'command-r-plus',
            'deepseek-r1'
        ];
        return toolModels.some(m => modelLower.includes(m));
    }

    /**
     * @inheritdoc
     */
    _extractToolCalls(response) {
        if (response.message?.tool_calls && Array.isArray(response.message.tool_calls)) {
            console.log(`[OllamaProvider] Found ${response.message.tool_calls.length} tool calls`);
            return response.message.tool_calls.map(tc => {
                // Ollama returns arguments as an object, not a string
                const args = typeof tc.function.arguments === 'string' 
                    ? JSON.parse(tc.function.arguments) 
                    : tc.function.arguments;
                console.log(`[OllamaProvider] Tool call: ${tc.function.name}, args: ${JSON.stringify(args)}`);
                return {
                    id: tc.id || 'ollama_call',
                    name: tc.function.name,
                    input: args
                };
            });
        }
        return null;
    }

    _extractResponseText(response) {
        // With stream: false, Ollama /api/chat returns a single JSON object with message.content
        if (response.message && typeof response.message.content === 'string') {
            let content = response.message.content;
            // For deepseek-r1 and similar reasoning models, the content might contain 
            // <think>...</think> tags followed by the actual answer
            // Try to extract content after </think> tag if it exists
            const thinkEndIndex = content.indexOf('</think>');
            if (thinkEndIndex !== -1) {
                const afterThink = content.substring(thinkEndIndex + 8).trim(); // 8 = '</think>'.length
                if (afterThink) {
                    return afterThink;
                } else {
                }
            }
            return content;
        }
        if (typeof response.response === 'string') {
            return response.response;
        }
        if (response.choices?.[0]?.message?.content) {
            return response.choices[0].message.content;
        }
        if (response.completions?.[0]?.text) {
            return response.completions[0].text;
        }
        return '';
    }

}

/**
 * Factory for creating LLM provider instances
 */
export class LLMProviderFactory {
    /**
     * @param {string} providerType - Provider type identifier
     * @param {string} apiKey - API key for the provider
     * @param {string} model - Model to use
     * @param {boolean} enableWebSearch - Whether to enable web search
     * @returns {LLMProvider} - Provider instance
     */
    static createProvider(providerType, apiKey, model, enableWebSearch = false) {
        switch (providerType) {
            case LLMProviders.ANTHROPIC:
                return new AnthropicProvider(apiKey, model, enableWebSearch);
            case LLMProviders.OPENAI:
                return new OpenAIProvider(apiKey, model, enableWebSearch);
            case LLMProviders.GEMINI:
                return new GeminiProvider(apiKey, model, enableWebSearch);
            case LLMProviders.OPENROUTER:
                return new OpenRouterProvider(apiKey, model, enableWebSearch);
            case LLMProviders.OLLAMA:
                return new OllamaProvider(apiKey, model, enableWebSearch);
            case LLMProviders.GROQ:
                return new GroqProvider(apiKey, model, enableWebSearch);
            default:
                return new AnthropicProvider(apiKey, model, enableWebSearch);
        }
    }
}

export {
    LLMProvider,
    AnthropicProvider,
    OpenAIProvider,
    GeminiProvider,
    OpenRouterProvider,
    OllamaProvider,
    GroqProvider,
};
