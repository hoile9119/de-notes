
## Step 1: Install Ollama and CodeGPT in VSCode
To run DeepSeek locally, we first need to install Ollama, which allows us to run LLMs on our machine, and CodeGPT, the VSCode extension that integrates these models for coding assistance.

### Install Ollama
Ollama is a lightweight platform that makes running local LLMs simple.

Download Ollama

- Visit the official website: https://ollama.com
- Verify the Installation
- After installation, open a terminal and run:
    ```bash 
    ollama --version
    ```

### Install CodeGPT in Visual Studio Code
- Open VSCode and navigate to the Extensions Marketplace (Ctrl + Shift + X or Cmd + Shift + X on macOS).
- Search for “CodeGPT” and click Install.

## Step 2: Downloading and Setting Up the Models
- Chat model: `deepseek-r1:1.5b`
- Autocompletion model: `deepseek-coder:base`

### Download the Chat Model (deepseek-r1:1.5b)
```bash
ollama pull deepseek-r1:1.5b
```

### Set up Chat Model in VSCode
1. Open VSCode
2. Navigate to the CodeGPT extension in the sidebar
3. Switch to Local LLMs tab
4. Select local provider to Ollama
5. Select the `deepseek-r1:1.5b` model

### Download the Autocompletion Model (deepseek-coder:base)

```bash
ollama pull deepseek-coder:base
```

### Set up the Autocompletion Model in VSCode
1. Open VSCode
2. Navigate to the CodeGPT extension in the sidebar
3. Select Autocompletion settings
4. Enable Status
5. Select AI Mdel to `deepseek-coder:base`

## [Reference](https://medium.com/@dan.avila7/step-by-step-running-deepseek-locally-in-vscode-for-a-powerful-private-ai-copilot-4edc2108b83e)