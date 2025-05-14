import {
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IExecuteSingleFunctions,
	NodeOperationError,
	IDataObject,
	INodeExecutionData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { ProxyCountryList, ProxyCountryOption } from './proxy-countries.data';

export class AiScraper implements INodeType {

	private static _addAttributesToBody(
		context: IExecuteSingleFunctions,
		body: Record<string, any>
	): void {
		const currentItemIndex = context.getItemIndex();
		const node = context.getNode();
		const attributesParam = context.getNodeParameter('attributes', currentItemIndex) as {
			fieldValues: Array<{
				fieldName: string;
				fieldType: string;
				fieldDescription: string;
			}>
		};

		const fieldValues = (attributesParam && attributesParam.fieldValues) ? attributesParam.fieldValues : [];

		if (fieldValues.length === 0) {
			throw new NodeOperationError(
				node,
				'At least one attribute is required. Please add attributes to extract.',
				{ itemIndex: currentItemIndex }
			);
		}

		const transformedAttributes: { [key: string]: { description: string; type: string } } = {};
		for (const [index, item] of fieldValues.entries()) {
			const fieldName = item.fieldName.trim();
			const fieldDescription = item.fieldDescription.trim();

			if (fieldName === '') {
				throw new NodeOperationError(
					node,
					`Attribute at index ${index} has an empty Field Name.`,
					{ itemIndex: currentItemIndex }
				);
			}
			if (fieldDescription === '') {
				throw new NodeOperationError(
					node,
					`Attribute "${fieldName}" (at index ${index}) has an empty Field Description.`,
					{ itemIndex: currentItemIndex }
				);
			}

			transformedAttributes[fieldName] = {
				description: fieldDescription,
				type: item.fieldType
			};
		}

		body.attributes = transformedAttributes;
	}

	// New helper method for handling cookies
	private static _addCookiesToBody(
		context: IExecuteSingleFunctions,
		body: Record<string, any>
	): void {
		const currentItemIndex = context.getItemIndex();
		const node = context.getNode();
		const cookiesStringParam = context.getNodeParameter('cookies', currentItemIndex) as string;

		if (cookiesStringParam && cookiesStringParam.trim() !== '') {
			let parsedCookies;
			try {
				parsedCookies = JSON.parse(cookiesStringParam);
			} catch (error: any) {
				throw new NodeOperationError(node, `Invalid JSON in Cookies field: ${error.message}`, { itemIndex: currentItemIndex });
			}

			if (!Array.isArray(parsedCookies)) {
				throw new NodeOperationError(node, 'Cookies field must be a JSON array.', { itemIndex: currentItemIndex });
			}

			if (parsedCookies.length === 0) {
				body.cookies = null;
			} else {
				body.cookies = parsedCookies;
			}
		} else {
			body.cookies = null;
		}
	}


	static async prepareExtractRequestBody(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		const node = this.getNode();
		const currentItemIndex = this.getItemIndex();

		if (!requestOptions.body || typeof requestOptions.body !== 'object') {
			requestOptions.body = {};
		}
		const body = requestOptions.body as Record<string, any>;

		const urlFromBody = body.url;
		if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
			throw new NodeOperationError(node, 'URL is required.', { itemIndex: currentItemIndex });
		}
		body.url = urlFromBody.trim();

		AiScraper._addAttributesToBody(this, body);
		AiScraper._addCookiesToBody(this, body); // Use the refactored helper method

		return requestOptions;
	}

	static async prepareAttributesForRequestBody(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		const node = this.getNode();
		const currentItemIndex = this.getItemIndex();

		if (!requestOptions.body || typeof requestOptions.body !== 'object') {
			requestOptions.body = {};
		}
		const body = requestOptions.body as Record<string, any>;

		const contentFromBody = body.content;
		if (typeof contentFromBody !== 'string' || !contentFromBody.trim()) {
			throw new NodeOperationError(node, 'Content is required for Parse HTML.', { itemIndex: currentItemIndex });
		}
		body.content = contentFromBody.trim();

		AiScraper._addAttributesToBody(this, body);

		return requestOptions;
	}

	// New preSend function for Agent Scrape operation
	static async prepareScrapeRequestBody(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		const node = this.getNode();
		const currentItemIndex = this.getItemIndex();

		if (!requestOptions.body || typeof requestOptions.body !== 'object') {
			requestOptions.body = {};
		}
		const body = requestOptions.body as Record<string, any>;

		// Agent Name validation (value comes from routing `body.name`)
		const agentNameFromBody = body.name;
		if (typeof agentNameFromBody !== 'string' || !agentNameFromBody.trim()) {
			throw new NodeOperationError(node, 'Agent Name is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
		}
		body.name = agentNameFromBody.trim();

		// URL validation (value comes from routing `body.url`)
		const urlFromBody = body.url;
		if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
			throw new NodeOperationError(node, 'URL is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
		}
		body.url = urlFromBody.trim();

		// Add cookies using the helper method
		AiScraper._addCookiesToBody(this, body);

		return requestOptions;
	}

	static async unpackResponseData(
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const responseBody = response.body;

		if (typeof responseBody === 'object' && responseBody !== null && 'data' in responseBody) {
			const extractedContent = (responseBody as IDataObject).data;

			if (Array.isArray(extractedContent)) {
				return extractedContent.map(item => ({ json: item as IDataObject }));
			} else if (typeof extractedContent === 'object' && extractedContent !== null) {
				return [{ json: extractedContent as IDataObject }];
			}
		}
		return items;
	}

	description: INodeTypeDescription = {
		displayName: 'AI Scraper',
		name: 'aiScraper',
		icon: 'file:aiscraper.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Scrape data from websites using the Parsera API',
		defaults: {
			name: 'AI Scraper',
		},
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
					{
						name: 'Extractor',
						value: 'extractor',
					},
					{
						name: 'Agent Scrape',
						value: 'agent',
					},
				],
				default: 'extractor',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['extractor'],
					}
				},
				options: [
					{
						name: 'Extract from URL',
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
									AiScraper.prepareExtractRequestBody,
								],
							},
							output: {
								postReceive: [AiScraper.unpackResponseData],
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
									AiScraper.prepareAttributesForRequestBody,
								],
							},
							output: {
								postReceive: [AiScraper.unpackResponseData],
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
						action: 'Scrape with Agent',
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
									AiScraper.prepareScrapeRequestBody,
								],
							},
							output: {
								postReceive: [AiScraper.unpackResponseData], // Reusing existing unpacker
							},
						},
					},
				],
				default: 'agentScrape',
			},
			// New property for Agent Scrape
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
				displayOptions: {
					show: {
						operation: ['extractUrl', 'agentScrape'], // Updated
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
				displayOptions: {
					show: {
						operation: ['parseHtml'],
					},
				},
			},
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'fixedCollection',
				default: { fieldValues: [{ fieldName: '', fieldType: 'any', fieldDescription: '' }] },
				description: 'Define the data fields to extract. Each attribute must have a Field Name, Type, and Field Description. At least one attribute is required.',
				placeholder: 'Add Attribute',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						name: 'fieldValues',
						displayName: '',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
								description: 'The name of the data field (e.g., productName, price). This will be the key in the output JSON.',
							},
							{
								displayName: 'Type',
								name: 'fieldType',
								type: 'options',
								default: 'any',
								required: true,
								description: 'The type of the data field.',
								options: [
									{ name: 'Any', value: 'any', description: 'Any data type' },
									{ name: 'String', value: 'string', description: 'Text value' },
									{ name: 'Integer', value: 'integer', description: 'Integer number' },
									{ name: 'Number', value: 'number', description: 'Floating point number' },
									{ name: 'Boolean', value: 'bool', description: '`true` or `false`' },
									{ name: 'List', value: 'list', description: 'List of values' },
									{ name: 'Object', value: 'object', description: 'Map of keys and values' },
								]
							},
							{
								displayName: 'Field Description',
								name: 'fieldDescription',
								type: 'string',
								default: '',
								required: true,
								description: 'A natural language description of what data to extract for this field.',
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['extractUrl', 'parseHtml'],
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'standard',
				description: 'Mode of the extractor',
				options: [
					{ name: 'Standard', value: 'standard', description: 'Standard Mode' },
					{ name: 'Precision', value: 'precision', description: 'Precision Mode' },
				],
				displayOptions: {
					show: {
						operation: ['extractUrl', 'parseHtml'],
					},
				},
			},
			{
				displayName: 'Proxy Country',
				name: 'proxyCountry',
				type: 'options',
				options: ProxyCountryList.map((country: ProxyCountryOption) => ({
					name: country.name,
					value: country.value,
				})),
				default: 'UnitedStates',
				displayOptions: {
					show: {
						operation: ['extractUrl', 'agentScrape'],
					},
				},
			},
			{
				displayName: 'Cookies',
				name: 'cookies',
				type: 'json',
				default: '[]',
				description: 'Optional. Provide cookies as a JSON array.',
				displayOptions: {
					show: {
						operation: ['extractUrl', 'agentScrape'],
					},
				},
			},
		]
	};
}
