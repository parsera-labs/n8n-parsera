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
    *   **Extract from URL:** Provide a URL, and Parsera will fetch the content and extract data based on your defined attributes. Supports proxy usage and sending cookies.
    *   **Parse HTML:** Provide raw HTML content, and Parsera will parse it to extract data based on your defined attributes.
*   **Scraping Agent:**
    *   **Scraping Agent:** Utilize a pre-configured scraping agent on the Parsera platform to scrape a given URL. **Note:** The Parsera agent itself must be created separately via the [Parsera application](https://parsera.org) or Parsera API before it can be used by this n8n node operation. This operation uses a different base URL (`https://agents.parsera.org/v1`) and also supports proxy usage and sending cookies.

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

*   **Resource:** Choose between "Extractor" (for direct URL/HTML extraction) and "Scraping Agent" (for using pre-configured Parsera agents).
*   **Operation:** Select the specific action based on the chosen resource.
*   **URL/Content:** Provide the target URL or raw HTML content, depending on the operation.
*   **Prompt:** Provide context and general instructions to scraper.
*   **Attributes Input Mode (for Extractor Resource):**
    *   **Fields:** Define attributes using a user-friendly interface with separate fields for Field Name, Type, and Field Description. This is the default and recommended for most UI-based configurations.
    *   **JSON:** Define attributes as a single JSON object. This mode is powerful for programmatic use, AI tool integration, or complex schemas. The expected format is `{"your_field_name": {"description": "What to extract", "type": "string"}}`.
*   **Attributes (for Extractor Resource):** Depending on the selected input mode, you will either fill out individual fields or provide a JSON object. At least one attribute is required.
    *   **Field Name:** The key for the extracted data in the output (e.g., `productTitle`, `price`).
    *   **Type:** The expected data type (e.g., `string`, `integer`, `number`, `boolean`, `list`, `object`, `any`).
    *   **Field Description:** A natural language instruction telling the AI what data to look for (e.g., "The main title of the product page", "The discounted price of the item").
*   **Mode (for Extractor Resource):**
    *   **Standard:** Balanced approach for speed and accuracy.
    *   **Precision:** Focuses on higher accuracy, potentially at the cost of speed or resources.
*   **Proxy Country:** Optionally route your request through a proxy in a specific country to access geo-restricted content.
*   **Cookies:** Optionally provide cookies as a JSON array to be sent with the request (e.g., for authenticated sessions). Format: `[{"name": "cookieName", "value": "cookieValue", "domain": ".example.com"}]`.
*   **Agent Name (for Scraping Agent Resource):** The name of the pre-configured agent on the Parsera platform. This agent must have been created beforehand in your Parsera account.

The output of the node will be a list of items containing the extracted data.

For more detailed examples and advanced usage, refer to the [Parsera API documentation](https://docs.parsera.org/api/getting-started/).
If you are new to n8n, you might find the [Try it out](https://docs.n8n.io/try-it-out/) documentation helpful to get started with the platform.

## Resources

*   [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
*   [Parsera Website](https://parsera.org)
*   [Parsera API Documentation](https://docs.parsera.org/api/getting-started/)

