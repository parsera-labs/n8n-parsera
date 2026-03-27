# n8n-nodes-aiscraper

This is an n8n community node. It lets you use the Parsera AI Scraper API in your n8n workflows.

## Quickstart
[![Quickstart Video](https://img.youtube.com/vi/VUzKFRuqvGM/0.jpg)](https://www.youtube.com/watch?v=VUzKFRuqvGM)

Parsera AI Scraper is a service that uses AI to extract structured data from web pages, either by providing a URL or raw HTML content. It simplifies web scraping by allowing users to define data fields through natural language descriptions or by using pre-configured scraping agents.

[https://parsera.org](https://parsera.org)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)
[Compatibility](#compatibility)  
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The Parsera AI Scraper node supports the following operations:

*   **Extractor:**
    *   **Extract URL:** Provide a URL, and Parsera will fetch the content and extract structured data based on your defined columns. Supports proxy usage and sending cookies.
    *   **Parse HTML:** Provide raw HTML content, and Parsera will parse it to extract structured data based on your defined columns.
    *   **Extract Markdown:** Convert a URL to clean markdown text. Supports proxy usage.
*   **Scraping Agent:**
    *   **Interact and Extract:** Use an AI agent that can navigate, interact with, and extract data from a webpage. Provide a URL and a prompt describing what data to extract. Optionally define an output schema to structure the results.
*   **Reusable Scraper:**
    *   **Run Configured Scraper:** Run a scraper that has been pre-configured on the [Parsera platform](https://parsera.org). Select from your existing scrapers, optionally override the URL, and use proxy/cookies. **Note:** Scrapers must be created separately via the Parsera application or API before they can be used here.

## Credentials

To use this node, you need to create AI Scraper credentials within n8n. This requires an API Key from Parsera.

1.  Sign up for an account at [https://parsera.org](https://parsera.org).
2.  Once logged in, navigate to your API settings to find your API Key.
3.  In n8n, create new credentials of type "AI Scraper API".
4.  Enter the API Key obtained from Parsera into the API Key field in the n8n credential configuration.

## Compatibility

*   **Minimum n8n Version:** While the node might work with earlier versions, it has been developed and tested primarily on **n8n version 1.19.3**.

## Usage

This node allows you to extract structured data from websites.

**Key Parameters:**

*   **Resource:** Choose between "Extractor" (for direct URL/HTML/markdown extraction), "Scraping Agent" (for AI-driven navigation and extraction), or "Reusable Scraper" (for running pre-configured scrapers).
*   **Operation:** Select the specific action based on the chosen resource.
*   **URL/Content:** Provide the target URL or raw HTML content, depending on the operation.
*   **Prompt:** Provide context and general instructions to the scraper (Extractor), or describe what data to extract (Scraping Agent).
*   **Columns Input Mode (for Extractor and Scraping Agent):**
    *   **Fields:** Define columns using a user-friendly interface with separate fields for Name, Type, and Column Prompt. This is the default and recommended for most UI-based configurations.
    *   **JSON:** Define columns as a single JSON object. This mode is powerful for programmatic use, AI tool integration, or complex schemas. The expected format is `{"your_field_name": {"description": "What to extract", "type": "string"}}`.
*   **Columns:** Depending on the selected input mode, you will either fill out individual fields or provide a JSON object.
    *   **Name:** The key for the extracted data in the output (e.g., `productName`, `price`).
    *   **Type:** The expected data type (`any`, `string`, `integer`, `number`, `bool`, `list`).
    *   **Column Prompt:** A natural language instruction telling the AI what data to look for (e.g., "The main title of the product page").
*   **Mode (for Extractor):**
    *   **Standard:** Balanced approach for speed and accuracy.
    *   **Precision:** Extract data hidden inside HTML structures with higher accuracy.
*   **Proxy Country:** Optionally route your request through a proxy in a specific country to access geo-restricted content.
*   **Cookies:** Optionally provide cookies as a JSON array to be sent with the request (e.g., for authenticated sessions). Format: `[{"name": "cookieName", "value": "cookieValue", "domain": ".example.com"}]`.
*   **Scraper Name (for Reusable Scraper):** Select a pre-configured scraper from your Parsera account. Must be created beforehand via the Parsera application or API.

The output of the node will be a list of items containing the extracted data.

For more detailed examples and advanced usage, refer to the [Parsera API documentation](https://docs.parsera.org/api/getting-started/).
If you are new to n8n, you might find the [Try it out](https://docs.n8n.io/try-it-out/) documentation helpful to get started with the platform.

## Resources

*   [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
*   [Parsera Website](https://parsera.org)
*   [Parsera API Documentation](https://docs.parsera.org/api/getting-started/)

## Version history

*   **0.3.0** — Added Extract Markdown operation, Scraping Agent (Interact and Extract) resource, renamed old scraping agents to Reusable Scrapers, restructured resources, URL validation, polished operation names.
*   **0.2.1** — Unified API, simplified scraper interface.
*   **0.2.0** — Added templates, load available agents from API, rearranged actions.
*   **0.1.6** — Documentation updates and naming tweaks.
*   **0.1.5** — Fixed broken extractor URL, refactored to separate files.

