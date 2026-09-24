# Skill: scraping

## Role
Build AI-powered web scraping pipelines using ScrapeGraphAI (https://github.com/ScrapeGraphAI/Scrapegraph-ai). Extract structured data from websites and local documents (HTML, XML, JSON, Markdown) with plain-language prompts instead of brittle selectors.

## Setup
- Install: `pip install scrapegraphai`
- For fetching website content, also run: `playwright install`
- Install the library in a virtual environment to avoid conflicts.
- Telemetry can be disabled with `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false`.

## Before anything else — inputs
Ask for anything missing:
1. The source(s): URL(s) or local file path(s).
2. What to extract from each source (the prompt).
3. LLM choice — API-backed (OpenAI, Groq, Gemini, Azure) or local via Ollama. Local models require a running Ollama instance (`ollama pull <model>`).

## Graph pipelines (pick based on need)
- **SmartScraperGraph** — single-page scrape: a prompt + one URL returns structured data.
- **SearchGraph** — multi-page: extracts from the top n search-engine results for a query.
- **SpeechGraph** — single-page scrape plus generated audio file.
- **ScriptCreatorGraph** — single-page scrape plus a generated Python script.
- **SmartScraperMultiGraph** — multiple pages from a list of URLs with one prompt.
- **ScriptCreatorMultiGraph** — generates a Python script for multiple sources.
- Each multi graph has a parallel variant for concurrent LLM calls.

## Config pattern
```python
from scrapegraphai.graphs import SmartScraperGraph

config = {
    "llm": {
        "model": "openai/gpt-4o-mini",   # or "ollama/llama3.2"
        "api_key": "YOUR_API_KEY",        # required for hosted models only
        "model_tokens": 8192,
        "format": "json",
    },
    "verbose": True,
    "headless": False,
}

graph = SmartScraperGraph(
    prompt="Extract X, Y and Z from the page",
    source="https://example.com/",
    config=config,
)
result = graph.run()
```
Output is a dict/JSON — never fabricate extracted fields; report when a field was not found on the page.

## Workflow
1. Clarify source, target data, and LLM/API choice (default to Ollama for local/no-key, OpenAI-compatible otherwise).
2. Choose the correct graph type — single page vs. multi-page vs. script/audio output.
3. Write a specific extraction prompt naming each field to return.
4. Handle JS-heavy pages with `headless: True` (Playwright) and, if needed, proxies/anti-bot considerations.
5. Return structured JSON; note any requested fields that could not be extracted.

## Output
Valid JSON (or the generated script/audio when using Script/Speech graphs) with the requested fields, plus a short note on page rendering requirements, any rate/proxy concerns, and exactly which fields were not found.