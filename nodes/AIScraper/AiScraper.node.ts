import {
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { ProxyCountryList, ProxyCountryOption } from './proxy-countries.data';
import {
	prepareParseRequestBody,
	prepareExtractRequestBody,
	prepareScrapeRequestBody,
} from './preSend';
import { unpackResponseData } from './postReceive';

export class AiScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Scraper',
		name: 'aiScraper',
		icon: 'file:aiscraper.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Scrape any Website with just a URL and Data Description using Parsera API (10K+ downloads)',
		defaults: {
			name: 'AI Scraper',
			attributesInputMode: 'fields',
			prompt: '',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aiScraperApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.parsera.org/v1',
			headers: {
				'Content-Type': 'application/json',
			},
			json: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'New Scraper', value: 'new-scraper' },
					{ name: 'Existing Scraper', value: 'existing-scraper' },
				],
				default: 'new-scraper',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['new-scraper'] } },
				options: [
					{
						name: 'Scrape URL',
						value: 'scrapeUrl',
						description: 'Provide URL and Data Description',
						action: 'Scrape URL',
						routing: {
							request: {
								method: 'POST',
								url: '/extract',
								body: {
									url: '={{$parameter["url"]}}',
									mode: '={{$parameter["mode"]}}',
									proxy_country: '={{$parameter["proxyCountry"]}}',
								}
							},
							send: {
								preSend: [
									prepareExtractRequestBody,
								],
							},
							output: {
								postReceive: [unpackResponseData],
							},
						},
					},
					{
						name: 'Parse HTML',
						value: 'parseHtml',
						description: 'Provide HTML content and Data Description',
						action: 'Parse HTML',
						routing: {
							request: {
								method: 'POST',
								url: '/parse',
								body: {
									content: '={{$parameter["content"]}}',
									mode: '={{$parameter["mode"]}}',
								}
							},
							send: {
								preSend: [
									prepareParseRequestBody,
								],
							},
							output: {
								postReceive: [unpackResponseData],
							},
						},
					},
				],
				default: 'scrapeUrl',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['existing-scraper'],
					}
				},
				options: [
					{
						name: 'Existing Scraper',
						value: 'runScraper',
						description: 'Scraper made in parsera.org with advanced features, such as scraping code generation',
						action: 'Scraper made in parsera org with advanced features',
						routing: {
							request: {
								method: 'POST',
								// baseURL and url will be determined dynamically in preSend
								baseURL: 'https://agents.parsera.org/v1',
								url: '/scrape',
								body: {
									name: '={{$parameter["existingScraperName"]}}',
									url: '={{$parameter["url"] || undefined}}',
									proxy_country: '={{$parameter["proxyCountry"]}}',
									// cookies are added by preSend function
								},
							},
							send: {
								preSend: [
									prepareScrapeRequestBody,
								],
							},
							output: {
								postReceive: [unpackResponseData],
							},
						},
					},
				],
				default: 'runScraper',
			},
			{
				displayName: 'Scraper Name or ID',
				name: 'existingScraperName',
				type: 'options',
				default: '',
				required: true,
				description: 'Name of the existing scraper to use for scraping. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'loadExistingScrapers',
				},
				displayOptions: {
					show: {
						operation: ['runScraper'],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'URL of the webpage to extract data from',
				placeholder: 'Enter URL',
				displayOptions: {
					show: {
						operation: ['scrapeUrl'],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Optional URL of the webpage to scrape. If not provided, the scraper will use its default URL configuration.',
				placeholder: 'Enter URL (optional)',
				displayOptions: {
					show: {
						operation: ['runScraper'],
					},
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 5,
				},
				description: 'Raw HTML or text content to extract data from',
				placeholder: 'Enter HTML or text content',
				displayOptions: {
					show: {
						operation: ['parseHtml'],
					},
				},
			},
			{
				displayName: 'Prompt (Optional)',
				name: 'prompt',
				type: 'string',
				default: '',
				description: 'Use to provide context and general instructions',
				displayOptions: {
					show: {
						operation: ['scrapeUrl', 'parseHtml'],
					},
				},
				placeholder: 'Enter a prompt',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Columns Input Mode',
				name: 'attributesInputMode',
				type: 'options',
				options: [
					{
						name: 'Fields',
						value: 'fields',
						description: 'Define in separate fields'
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Define with a JSON Schema'
					},
				],
				default: 'fields',
				description: 'Select how to define columns. "JSON" is often preferred for AI tool integration or complex schemas.',
				displayOptions: {
					show: {
						operation: ['scrapeUrl', 'parseHtml'],
					},
				},
				noDataExpression: true,
			},
			{
				displayName: 'Columns',
				name: 'attributesFields',
				type: 'fixedCollection',
				default: { fieldValues: [{ fieldName: '', fieldType: 'any', fieldDescription: '' }] },
				description: 'Define data fields to extract. Each column requires a Name and Type.',
				placeholder: 'Add Column',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						name: 'fieldValues',
						displayName: 'Column Definitions',
						values: [
							{
								displayName: 'Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
								description: 'The name of the column (e.g., productName, price). This will be the key in the output JSON.',
								placeholder: 'Enter field name',
							},
							{
								displayName: 'Type',
								name: 'fieldType',
								type: 'options',
								default: 'any',
								required: true,
								description: 'The type of the column',
								options: [
									{ name: 'Any', value: 'any', description: 'Any data type' },
									{ name: 'Boolean', value: 'bool', description: 'True or false' },
									{ name: 'Integer', value: 'integer', description: 'Whole number' },
									{ name: 'List', value: 'list', description: 'An array of values' },
									{ name: 'Number', value: 'number', description: 'Number with decimals' },
									{ name: 'String', value: 'string', description: 'Text value' },
								]
							},
							{
								displayName: 'Column Prompt (Optional)',
								name: 'fieldDescription',
								type: 'string',
								default: '',
								description: 'Describe what data to place in this column',
								placeholder: 'Enter column description'
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['scrapeUrl', 'parseHtml'],
						attributesInputMode: ['fields'],
					},
				},
			},
			{
				displayName: 'Schema (JSON)',
				name: 'attributesJson',
				type: 'json',
				default: '{\n  "example_attribute_name": {\n    "description": "Optional: Natural language description of what data to extract.",\n    "type": "string"\n  }\n}',
				description: 'Define columns as a JSON object. Each key is a field name, and its value is an object like: `{"description": "details...", "type": "string"}`. Description is optional. Allowed types: any, string, integer, number, bool, list, object.',
				typeOptions: { rows: 8 },
				displayOptions: {
					show: {
						resource: ['new-scraper'],
						operation: ['scrapeUrl', 'parseHtml'],
						attributesInputMode: ['json'],
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'standard',
				description: 'Extraction mode. "Precision" may yield better results for data hidden deeper in HTML.',
				options: [
					{ name: 'Standard', value: 'standard', description: 'Balanced speed and accuracy' },
					{ name: 'Precision', value: 'precision', description: 'Extract data hidden inside HTML structures' },
				],
				displayOptions: {
					show: {
						resource: ['new-scraper'],
						operation: ['scrapeUrl', 'parseHtml']
					}
				},
			},
			{
				displayName: 'Proxy Country',
				name: 'proxyCountry',
				type: 'options',
				default: '',
				options: ProxyCountryList.map((country: ProxyCountryOption) => ({
					name: country.name,
					value: country.value,
				})),
				description: 'Route request through a proxy in the selected country to access geo-specific content',
				displayOptions: { show: { operation: ['scrapeUrl', 'runScraper'] } },
			},
			{
				displayName: 'Cookies',
				name: 'cookies',
				type: 'json',
				default: '[]',
				description: 'Optional. Provide cookies as a JSON array of objects, e.g., `[{"name": "session", "value": "abc", "domain": ".example.com"}]`.',
				displayOptions: { show: { operation: ['scrapeUrl', 'runScraper'] } },
			},
		]
	} as INodeTypeDescription;

	methods = {
		loadOptions: {
			async loadExistingScrapers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const options: INodePropertyOptions[] = [];

				// Fetch existing scrapers from agents.parsera.org
				try {
					const existingScrapersResponse = await this.helpers.requestWithAuthentication.call(this, 'aiScraperApi', {
						method: 'GET',
						baseURL: 'https://agents.parsera.org/v1',
						url: '/list',
						json: true,
					});

					const existingScrapers = (existingScrapersResponse as any)?.agents?.user || [];
					
					const existingScraperOptions = existingScrapers
						.filter((existingScraper: any) => existingScraper.status === 'ready')
						.map((existingScraper: any) => {
							const existingScraperName = existingScraper.name || existingScraper.id;
							return {
								name: `[Scraper] ${existingScraperName}`,
								value: `scraper:${existingScraperName}`,
							};
						});
					
					options.push(...existingScraperOptions);
				} catch (error) {
					// Silently fail if agents.parsera.org is unavailable
					// Error is ignored to allow fallback to template scrapers
				}

				// Fetch scrapers/templates from v1/scrapers
				try {
					const scrapersResponse = await this.helpers.requestWithAuthentication.call(this, 'aiScraperApi', {
						method: 'GET',
						baseURL: 'https://api.parsera.org/v1',
						url: '/scrapers',
						json: true,
					});

					const scrapers = Array.isArray(scrapersResponse) ? scrapersResponse : [];
					
					const scraperOptions = scrapers.map((scraper: any) => ({
						name: scraper.name || scraper.id,
						value: scraper.id,
						description: `ID: ${scraper.id}`,
					}));
					
					options.push(...scraperOptions);
				} catch (error) {
					// Silently fail if v1/scrapers is unavailable
					// Error is ignored to allow fallback to existing scrapers
				}

				return options;
			},
		},
	};
}
