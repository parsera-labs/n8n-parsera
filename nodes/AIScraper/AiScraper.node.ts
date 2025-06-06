import {
	INodeType,
	INodeTypeDescription,
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
		description: 'Scrape data from websites using the Parsera API',
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
			// baseURL: 'https://api.parsera.org/v1',
			baseURL: 'http://0.0.0.0:8080/v1',
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
					{ name: 'Extractor', value: 'extractor' },
					{ name: 'Agent Scrape', value: 'agent' },
				],
				default: 'extractor',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['extractor'] } },
				options: [
					{
						name: 'Extract From URL',
						value: 'extractUrl',
						description: 'Extract data from a webpage using URL',
						action: 'Extract from URL',
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
						description: 'Parse data from the raw HTML input',
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
				default: 'extractUrl',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['agent'],
					}
				},
				options: [
					{
						name: 'Agent Scrape',
						value: 'agentScrape',
						description: 'Scrape webpage with pre-configured agent',
						action: 'Scrape with agent',
						routing: {
							request: {
								method: 'POST',
								baseURL: 'https://agents.parsera.org/v1', // Specific baseURL for this operation
								url: '/scrape',
								body: {
									name: '={{$parameter["agentName"]}}',
									url: '={{$parameter["url"]}}',
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
				default: 'agentScrape',
			},
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the agent to use for scraping',
				displayOptions: {
					show: {
						operation: ['agentScrape'],
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
						operation: ['extractUrl', 'agentScrape'],
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
						operation: ['extractUrl', 'parseHtml'],
					},
				},
				placeholder: 'Enter a prompt',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Attributes Input Mode',
				name: 'attributesInputMode',
				type: 'options',
				options: [
					{
						name: 'Fields',
						value: 'fields',
						description: 'Define using individual fields'
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Define as a single JSON object'
					},
				],
				default: 'fields',
				description: 'Select how to define attributes. "JSON" is often preferred for AI tool integration or complex schemas.',
				displayOptions: {
					show: {
						operation: ['extractUrl', 'parseHtml'],
					},
				},
				noDataExpression: true,
			},
			{
				displayName: 'Attributes',
				name: 'attributesFields',
				type: 'fixedCollection',
				default: { fieldValues: [{ fieldName: '', fieldType: 'any', fieldDescription: '' }] },
				description: 'Define data fields to extract. Each attribute requires a Field Name and Type. Description is optional.',
				placeholder: 'Add Attribute',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						name: 'fieldValues',
						displayName: 'Attribute Definitions',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
								description: 'The name of the data field (e.g., productName, price). This will be the key in the output JSON.',
								placeholder: 'Enter field name',
							},
							{
								displayName: 'Type',
								name: 'fieldType',
								type: 'options',
								default: 'any',
								required: true,
								description: 'The type of the data field',
								options: [
									{ name: 'Any', value: 'any', description: 'Any data type' },
									{ name: 'Boolean', value: 'bool', description: 'True or false' },
									{ name: 'Integer', value: 'integer', description: 'Whole number' },
									{ name: 'List', value: 'list', description: 'An array of values' },
									{ name: 'Number', value: 'number', description: 'Number with decimals' },
									{ name: 'Object', value: 'object', description: 'A key-value map' },
									{ name: 'String', value: 'string', description: 'Text value' },
								]
							},
							{
								displayName: 'Field Description (Optional)',
								name: 'fieldDescription',
								type: 'string',
								default: '',
								description: 'Natural language instruction on what data to extract for this field',
								placeholder: 'Enter field description'
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['extractUrl', 'parseHtml'],
						attributesInputMode: ['fields'],
					},
				},
			},
			{
				displayName: 'Attributes (JSON)',
				name: 'attributesJson',
				type: 'json',
				default: '{\n  "example_attribute_name": {\n    "description": "Optional: Natural language description of what data to extract.",\n    "type": "string"\n  }\n}',
				description: 'Define attributes as a JSON object. Each key is a field name, and its value is an object like: `{"description": "details...", "type": "string"}`. Description is optional. Allowed types: any, string, integer, number, bool, list, object.',
				typeOptions: { rows: 8 },
				displayOptions: {
					show: {
						resource: ['extractor'],
						operation: ['extractUrl', 'parseHtml'],
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
						resource: ['extractor'],
						operation: ['extractUrl', 'parseHtml']
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
				displayOptions: { show: { operation: ['extractUrl', 'agentScrape'] } },
			},
			{
				displayName: 'Cookies',
				name: 'cookies',
				type: 'json',
				default: '[]',
				description: 'Optional. Provide cookies as a JSON array of objects, e.g., `[{"name": "session", "value": "abc", "domain": ".example.com"}]`.',
				displayOptions: { show: { operation: ['extractUrl', 'agentScrape'] } },
			},
		]
	} as INodeTypeDescription;
}
