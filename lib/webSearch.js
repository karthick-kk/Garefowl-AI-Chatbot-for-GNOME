import Soup from "gi://Soup";
import GLib from "gi://GLib";

/**
 * SearXNG web search client
 * Supports both public instances and self-hosted instances
 */
export class SearXNGSearchClient {
    /**
     * @param {string} instanceUrl - SearXNG instance URL (e.g., 'https://searx.be')
     */
    constructor(instanceUrl = 'https://searx.be') {
        this._httpSession = new Soup.Session();
        this._httpSession.timeout = 30;
        this._instanceUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Perform a web search using SearXNG
     * @param {string} query - Search query
     * @param {Function} callback - Callback function (error, results)
     */
    search(query, callback) {
        // Use SearXNG JSON API
        const url = `${this._instanceUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
        const message = Soup.Message.new("GET", url);
        
        message.request_headers.append("User-Agent", "GarefowlChatbot/1.0");
        message.request_headers.append("Accept", "application/json");
        message.request_headers.append("X-Forwarded-For", "127.0.0.1");

        console.log(`[WebSearch] ========== STARTING WEB SEARCH ==========`);
        console.log(`[WebSearch] Query: "${query}"`);
        console.log(`[WebSearch] Instance: ${this._instanceUrl}`);
        console.log(`[WebSearch] Full URL: ${url}`);

        this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    const status = message.get_status();
                    console.log(`[WebSearch] HTTP Status: ${status}`);
                    
                    if (status !== Soup.Status.OK) {
                        console.error(`[WebSearch] HTTP ${status}`);
                        callback(new Error(`Search failed: HTTP ${status}. Check your SearXNG instance URL.`), null);
                        return;
                    }

                    const bytes = session.send_and_read_finish(result);
                    if (!bytes) {
                        console.error(`[WebSearch] No bytes received`);
                        callback(new Error('No response from SearXNG instance'), null);
                        return;
                    }

                    const decoder = new TextDecoder("utf-8");
                    const jsonText = decoder.decode(bytes.get_data());
                    console.log(`[WebSearch] Response length: ${jsonText.length} chars`);
                    const data = JSON.parse(jsonText);
                    console.log(`[WebSearch] Parsed JSON, results array length: ${data.results?.length || 0}`);
                    const results = this._parseResults(data);
                    
                    console.log(`[WebSearch] Found ${results.length} results after parsing`);
                    if (results.length > 0) {
                        console.log(`[WebSearch] First result: ${results[0].title}`);
                    }
                    const formatted = this._formatResults(results, query);
                    console.log(`[WebSearch] Formatted results length: ${formatted.length} chars`);
                    console.log(`[WebSearch] ========== WEB SEARCH COMPLETE ==========`);
                    callback(null, formatted);

                } catch (error) {
                    console.error(`[WebSearch] Error: ${error.message}`);
                    console.error(`[WebSearch] Stack: ${error.stack}`);
                    callback(error, null);
                }
            }
        );
    }

    /**
     * Parse JSON response from SearXNG
     * @param {object} data - JSON response from SearXNG
     * @returns {Array} - Array of search results
     * @private
     */
    _parseResults(data) {
        const results = [];
        
        if (!data.results || !Array.isArray(data.results)) {
            return results;
        }
        
        // Get top 5 results
        for (let i = 0; i < Math.min(data.results.length, 5); i++) {
            const result = data.results[i];
            if (result.title && result.url) {
                results.push({
                    title: result.title,
                    snippet: result.content || '',
                    url: result.url
                });
            }
        }
        
        return results;
    }

    /**
     * Format search results for LLM consumption
     * @param {Array} results - Array of search results
     * @param {string} query - Original search query
     * @returns {string} - Formatted results
     * @private
     */
    _formatResults(results, query) {
        const currentDate = new Date().toLocaleString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
        });

        if (results.length === 0) {
            return `[WEB SEARCH RESULTS - Current time: ${currentDate}]\n\nSearch query: "${query}"\n\nNo results found. Please answer based on your general knowledge and inform the user that you don't have access to current real-time data for this query.\n\n[END SEARCH RESULTS]`;
        }

        let formatted = `[WEB SEARCH RESULTS - Current time: ${currentDate}]\n\nSearch query: "${query}"\n\n`;
        results.forEach((result, index) => {
            formatted += `${index + 1}. ${result.title}\n`;
            formatted += `   Source: ${result.url}\n`;
            if (result.snippet) {
                formatted += `   ${result.snippet}\n`;
            }
            formatted += `\n`;
        });
        formatted += "[END SEARCH RESULTS]\n\nPlease use the above information to answer the user's question.";

        return formatted;
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
