# LangChain Test Project

- <https://js.langchain.com/docs/tutorials/rag/>
- <https://js.langchain.com/docs/how_to/code_splitter/#markdown>

A project for experimenting with LangChain and language models.

## Setup

1. Install dependencies:

```
pnpm install
```

2. Configure environment variables:
   - Copy the `.env` file: `cp .env.example .env`
   - Edit `.env` and add your API keys

## Environment Variables

This project uses dotenv for managing environment variables. The following variables are used:

- `OPENAI_API_KEY`: Your OpenAI API key

Add additional variables as needed for your specific implementation.

## Start Chroma DB

- <https://docs.trychroma.com/production/containers/docker#run-chroma-in-a-docker-container>

```bash
sudo docker pull chromadb/chroma

# -d
# https://docs.docker.com/reference/cli/docker/container/run/#detach
# -v
# https://docs.docker.com/reference/cli/docker/container/run/#volume
sudo docker run -d --name chroma-persistent -v ./chroma-data:/data -p 8000:8000 chromadb/chroma
```

## Running the Project

```
pnpm start
```

## TODO

- move to all gemini
  - <https://www.philschmid.de/gemini-langchain-cheatsheet>
