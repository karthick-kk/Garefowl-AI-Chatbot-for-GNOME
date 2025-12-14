import GLib from "gi://GLib";
import Gio from "gi://Gio";

/**
 * YouTube transcript fetcher using yt-dlp
 */
export class YouTubeTranscriptFetcher {
    /**
     * Extract video ID from YouTube URL
     * @param {string} url - YouTube URL
     * @returns {string|null} - Video ID or null
     */
    static extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Fetch transcript for a YouTube video
     * @param {string} videoUrl - YouTube video URL or ID
     * @param {Function} callback - Callback (error, transcript)
     */
    static fetchTranscript(videoUrl, callback) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            callback(new Error('Invalid YouTube URL'), null);
            return;
        }

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        try {
            const proc = Gio.Subprocess.new(
                ['yt-dlp', '--skip-download', '--write-auto-sub', '--sub-lang', 'en', '--sub-format', 'vtt', '--output', '/tmp/%(id)s', url],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    
                    if (!proc.get_successful()) {
                        callback(new Error(`yt-dlp failed: ${stderr}`), null);
                        return;
                    }

                    const subtitleFile = `/tmp/${videoId}.en.vtt`;
                    const file = Gio.File.new_for_path(subtitleFile);
                    
                    if (!file.query_exists(null)) {
                        callback(new Error('No subtitles available for this video'), null);
                        return;
                    }

                    const [success, contents] = file.load_contents(null);
                    if (!success) {
                        callback(new Error('Failed to read subtitle file'), null);
                        return;
                    }

                    const decoder = new TextDecoder('utf-8');
                    const vttContent = decoder.decode(contents);
                    const transcript = this._parseVTT(vttContent);
                    
                    // Cleanup
                    try { file.delete(null); } catch (e) {}
                    
                    callback(null, transcript);
                } catch (error) {
                    callback(error, null);
                }
            });
        } catch (error) {
            callback(error, null);
        }
    }

    /**
     * Parse VTT subtitle format
     * @param {string} vttContent - VTT file content
     * @returns {string} - Plain text transcript
     */
    static _parseVTT(vttContent) {
        const lines = vttContent.split('\n');
        const textLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip timestamps and empty lines
            if (line && !line.includes('-->') && !line.startsWith('WEBVTT') && !/^\d+$/.test(line)) {
                // Remove HTML tags
                const cleaned = line.replace(/<[^>]*>/g, '').trim();
                if (cleaned && !textLines.includes(cleaned)) {
                    textLines.push(cleaned);
                }
            }
        }
        
        return textLines.join(' ');
    }

    /**
     * Format transcript for LLM
     * @param {string} videoUrl - Video URL
     * @param {string} transcript - Transcript text
     * @returns {string} - Formatted transcript
     */
    static formatTranscript(videoUrl, transcript) {
        const videoId = this.extractVideoId(videoUrl);
        return `[YOUTUBE VIDEO TRANSCRIPT]\n\nVideo: https://www.youtube.com/watch?v=${videoId}\n\nTranscript:\n${transcript}\n\n[END TRANSCRIPT]\n\nPlease summarize the above video transcript.`;
    }
}
