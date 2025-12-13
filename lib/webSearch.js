import Soup from "gi://Soup";
import GLib from "gi://GLib";

/**
 * DuckDuckGo web search client
 */
export class DuckDuckGoSearchClient {
    constructor() {
        this._httpSession = new Soup.Session();
        this._httpSession.timeout = 30;
    }

    /**
     * Perform a web search
     * @param {string} query - Search query
     * @param {Function} callback - Callback function (error, results)
     */
    search(query, callback) {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const message = Soup.Message.new("GET", url);
        
        message.request_headers.append("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");

        console.log(`[WebSearch] Searching for: ${query}`);

        this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    const status = message.get_status();
                    
                    if (status !== Soup.Status.OK) {
                        console.error(`[WebSearch] HTTP ${status}`);
                        callback(new Error(`Web search failed: HTTP ${status}`), null);
                        return;
                    }

                    const bytes = session.send_and_read_finish(result);
                    if (!bytes) {
                        callback(new Error('No response from search engine'), null);
                        return;
                    }

                    const decoder = new TextDecoder("utf-8");
                    const html = decoder.decode(bytes.get_data());
                    const results = this._parseHTML(html);
                    
                    console.log(`[WebSearch] Found ${results.length} results`);
                    callback(null, this._formatResults(results));

                } catch (error) {
                    console.error(`[WebSearch] Error: ${error.message}`);
                    callback(error, null);
                }
            }
        );
    }

    /**
     * Parse HTML to extract search results
     * @param {string} html - HTML content
     * @returns {Array} - Array of search results
     * @private
     */
    _parseHTML(html) {
        const results = [];
        const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;
        
        let match;
        let count = 0;
        while ((match = resultRegex.exec(html)) !== null && count < 5) {
            results.push({
                url: match[1],
                title: match[2].trim(),
                snippet: match[3].trim()
            });
            count++;
        }

        return results;
    }

    /**
     * Format search results for LLM consumption
     * @param {Array} results - Array of search results
     * @returns {string} - Formatted results
     * @private
     */
    _formatResults(results) {
        if (results.length === 0) {
            return "No search results found.";
        }

        let formatted = "Web Search Results:\n\n";
        results.forEach((result, index) => {
            formatted += `${index + 1}. ${result.title}\n`;
            formatted += `   URL: ${result.url}\n`;
            formatted += `   ${result.snippet}\n\n`;
        });

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
