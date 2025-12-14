# Garefowl: AI Chatbot 🐧

An assistant interface for GNOME powered by LLM APIs. Supports OpenRouter, Anthropic, OpenAI, Gemini, Groq and Ollama.


# Download & Installation

**The easiest way to install would be directly from GNOME's extensions website** -> [just click here](https://extensions.gnome.org/extension/7338/garefowl-ai-chatbot/)

Alternatively, You can download the latest version of the extension from the [GitHub Releases](https://github.com/karthick-kk/Garefowl-AI-Chatbot-for-GNOME/releases) page.  Download the `.zip` file from the latest release, and then install it using the following command:

```bash
gnome-extensions install garefowl-ai-chatbot@karthickk.gitlab.com.shell-extension.zip --force
```

You may need to restart GNOME Shell after installation (log out and log back in, or press Alt+F2, type `r`, and press Enter).

## Manual Installation (from Source)

If you prefer to build the extension from source, follow these steps:

1.  Clone the repository:

    ```bash
    git clone https://github.com/karthick-kk/Garefowl-AI-Chatbot-for-GNOME.git
    cd Garefowl-AI-Chatbot-for-GNOME
    ```

2.  Build, install and enable the extension:

    ```bash
    make
    ```

# Getting Started

This extension now supports multiple LLM providers.  You will need to obtain an API key from your chosen provider(s):

*   **Anthropic:** Sign up and get your API key from [here](https://console.anthropic.com/account/keys).
*   **OpenAI:** Sign up and get your API key from [here](https://platform.openai.com/api-keys).
*   **Gemini:** Sign up and get your API key from [here](https://makersuite.google.com/app/apikey).
*   **OpenRouter:** Sign up and get your API key from [here](https://openrouter.ai/settings/keys)

## Web Search (Optional)

For real-time web search functionality, this extension uses **SearXNG**:

*   **Self-Hosted (Default):** Deploy your own local instance for better reliability (default: `http://localhost:8080`)
*   **Public Instances:** Use free public instances as alternative - no setup required

### Quick Self-Hosted Setup

For best performance, deploy a local SearXNG instance using the included Docker setup:

```bash
cd searxng/
sed -i "s/change-this-secret-key-to-a-random-string/$(openssl rand -hex 32)/" settings.yml
docker-compose up -d
```

Then in extension settings, set SearXNG Instance URL to `http://localhost:8080`

See `searxng/README.md` for detailed instructions.

Once you have your API key(s):

1.  Install the extension.
2.  Open the extension settings.
3.  Select your preferred LLM provider.
4.  Paste your API key into the corresponding field.
5.  Choose your desired model (refer to the provider's documentation for available models).
6.  (Optional) Enable "Web Search" toggle and configure SearXNG instance URL (default uses local instance)
7.  (Optional) Customize the colors for your messages and the chatbot's messages.
8.  (Optional) Set a keyboard shortcut to quickly open the chat window.
9.  Click Save.

You can now use the extension! Open the chat window by clicking the Garefowl icon in the top panel or by using the keyboard shortcut (default: Super+C).

# Features

*   **Multiple LLM Providers:** Choose between Anthropic, OpenAI, Gemini, OpenRouter, and Ollama.
*   **Customizable Models:** Select different models for each provider.
*   **Web Search:** Enable real-time web search using SearXNG (supports public instances or self-hosted).
*   **Chat History:** Remembers your conversation history.
*   **Customizable Appearance:** Change the background and text colors for messages.
*   **Keyboard Shortcut:** Quickly open the chat window with a customizable shortcut.
*   **Copy to Clipboard:** Click on any message to copy it to your clipboard.
*   **Youtube AI Summarizer:** Supports most videos with captions/subtitles or transcription enabled (requires [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp) installed)

# Showcase 📺

![image](https://github.com/user-attachments/assets/a062ef18-c8ae-4188-908f-24bf8b12315e)

---

[See 👀, Star ✨, or Fork 🍴, on Github](https://github.com/karthick-kk/Garefowl-AI-Chatbot-for-GNOME) 🐙

