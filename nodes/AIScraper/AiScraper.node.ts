import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { ProxyCountryList, ProxyCountryOption } from './proxy-countries.data';

type AttributeDefinition = {
	description?: string;
	type: string;
};
type TransformedAttributesMap = Record<string, AttributeDefinition>;

type AttributeFieldItem = {
	fieldName: string;
	fieldType: string;
	fieldDescription?: string;
};
type AttributesFieldsParameter = {
	fieldValues: AttributeFieldItem[];
};


export class AiScraper implements INodeType {

	/**
	 * Parses attributes defined using the 'Structured Fields' (fixedCollection) mode.
	 * @param context - The execution context.
	 * @param attributesFieldsParam - The parameter object containing fieldValues.
	 * @returns A map of transformed attributes.
	 * @throws NodeOperationError if validation fails.
	 */
	private static _parseAttributesFromFields(
		context: IExecuteSingleFunctions,
		attributesFieldsParam: AttributesFieldsParameter | undefined,
	): TransformedAttributesMap {
		const node = context.getNode();
		const currentItemIndex = context.getItemIndex();
		const transformedAttributes: TransformedAttributesMap = {};
		const fieldValues = attributesFieldsParam?.fieldValues ?? [];

		if (fieldValues.length === 0 && !attributesFieldsParam) {
			return {};
		}


		for (const [index, item] of fieldValues.entries()) {
			if (
				!item ||
				typeof item.fieldName !== 'string' ||
				typeof item.fieldType !== 'string' ||
				(item.fieldDescription !== undefined && typeof item.fieldDescription !== 'string')
			) {
				throw new NodeOperationError(
					node,
					`Attribute at index ${index} is malformed or missing required properties (fieldName, fieldType). fieldDescription is optional.`,
					{ itemIndex: currentItemIndex },
				);
			}

			const fieldName = item.fieldName.trim();
			const fieldDescription = (item.fieldDescription || '').trim();

			if (!fieldName) {
				throw new NodeOperationError(
					node,
					`Empty Field Name at index ${index}.`,
					{ itemIndex: currentItemIndex },
				);
			}
			if (!item.fieldType) {
				throw new NodeOperationError(
					node,
					`Attribute Type for "${fieldName}" (at index ${index}) cannot be empty.`,
					{ itemIndex: currentItemIndex },
				);
			}

			transformedAttributes[fieldName] = { description: fieldDescription, type: item.fieldType };
		}
		return transformedAttributes;
	}

	/**
	 * Parses attributes defined using the 'JSON Object' mode.
	 * @param context - The execution context.
	 * @param attributesJsonInput - The JSON string or pre-parsed object for attributes.
	 * @returns A map of transformed attributes.
	 * @throws NodeOperationError if validation fails.
	 */
	private static _parseAttributesFromJson(
		context: IExecuteSingleFunctions,
		attributesJsonInput: unknown,
	): TransformedAttributesMap {
		const node = context.getNode();
		const currentItemIndex = context.getItemIndex();
		const transformedAttributes: TransformedAttributesMap = {};

		let parsedObject: IDataObject;

		if (typeof attributesJsonInput === 'string') {
			const trimmedJsonInput = attributesJsonInput.trim();
			if (trimmedJsonInput === '') {
				return {};
			}
			try {
				parsedObject = JSON.parse(trimmedJsonInput);
			} catch (error: any) {
				throw new NodeOperationError(
					node,
					`Attributes field contains invalid JSON: ${error.message}`,
					{ itemIndex: currentItemIndex },
				);
			}
		} else if (typeof attributesJsonInput === 'object' && attributesJsonInput !== null) {
			if (Array.isArray(attributesJsonInput)) {
				throw new NodeOperationError(
					node,
					`Attributes field must be a JSON object, not an array.`,
					{ itemIndex: currentItemIndex },
				);
			}
			parsedObject = attributesJsonInput as IDataObject; // Already an object
		} else if (attributesJsonInput === null || attributesJsonInput === undefined) {
			return {};
		}
		else {
			throw new NodeOperationError(
				node,
				`Attributes field is an unexpected type: ${typeof attributesJsonInput}.`,
				{ itemIndex: currentItemIndex },
			);
		}

		if (typeof parsedObject !== 'object' || parsedObject === null || Array.isArray(parsedObject)) {
			throw new NodeOperationError(
				node,
				`Attributes must resolve to a JSON object. Received: ${Array.isArray(parsedObject) ? 'an array' : typeof parsedObject}.`,
				{ itemIndex: currentItemIndex },
			);
		}

		for (const [key, value] of Object.entries(parsedObject)) {
			const fieldName = key.trim();
			if (!fieldName) {
				throw new NodeOperationError(
					node,
					'Attribute name (JSON key) cannot be empty.',
					{ itemIndex: currentItemIndex },
				);
			}

			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				throw new NodeOperationError(
					node,
					`Value for attribute "${fieldName}" in JSON must be an object.`,
					{ itemIndex: currentItemIndex },
				);
			}

			const attributeDetails = value as Partial<AttributeDefinition>;

			const descriptionFromPayload = attributeDetails.description;
			let description: string | undefined;

			if (descriptionFromPayload !== undefined) {
				if (typeof descriptionFromPayload !== 'string') {
					throw new NodeOperationError(
						node,
						`Attribute "${fieldName}" in JSON has an invalid "description" type. It must be a string. Found: ${typeof descriptionFromPayload}`,
						{ itemIndex: currentItemIndex },
					);
				}
				description = descriptionFromPayload.trim();
			}

			const type = attributeDetails.type?.trim();
			if (typeof type !== 'string' || !type) {
				throw new NodeOperationError(
					node,
					`Attribute "${fieldName}" in JSON is missing a valid "type".`,
					{ itemIndex: currentItemIndex },
				);
			}

			transformedAttributes[fieldName] = { description: description ?? '', type };
		}
		return transformedAttributes;
	}


	private static _addAttributesToBody(
		context: IExecuteSingleFunctions,
		body: Record<string, any>
	): void {
		const currentItemIndex = context.getItemIndex();
		const node = context.getNode();
		const attributesInputMode = context.getNodeParameter('attributesInputMode', currentItemIndex) as 'fields' | 'json';
		let transformedAttributes: TransformedAttributesMap;

		switch (attributesInputMode) {
			case 'fields':
				const attributesFieldsParam = context.getNodeParameter('attributesFields', currentItemIndex) as AttributesFieldsParameter | undefined;
				transformedAttributes = AiScraper._parseAttributesFromFields(context, attributesFieldsParam);
				break;
			case 'json':
				const attributesJsonParam = context.getNodeParameter('attributesJson', currentItemIndex);
				transformedAttributes = AiScraper._parseAttributesFromJson(context, attributesJsonParam);
				break;
			default:
				const exhaustiveCheck: never = attributesInputMode;
				throw new NodeOperationError(
					node,
					`Internal error: Unhandled attributes input mode '${exhaustiveCheck}'.`,
					{ itemIndex: currentItemIndex }
				);
		}

		if (Object.keys(transformedAttributes).length === 0) {
			throw new NodeOperationError(
				node,
				'At least one attribute is required.',
				{ itemIndex: currentItemIndex }
			);
		}

		body.attributes = transformedAttributes;
	}

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

		const prompt = this.getNodeParameter('prompt', currentItemIndex) as string;
		if (prompt && prompt.trim() !== '') {
			body.prompt = prompt.trim();
		}

		const urlFromBody = body.url;
		if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
			throw new NodeOperationError(node, 'URL is required.', { itemIndex: currentItemIndex });
		}
		body.url = urlFromBody.trim();

		AiScraper._addAttributesToBody(this, body);
		AiScraper._addCookiesToBody(this, body);

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

		const prompt = this.getNodeParameter('prompt', currentItemIndex) as string;
		if (prompt && prompt.trim() !== '') {
			body.prompt = prompt.trim();
		}

		const contentFromBody = body.content;
		if (typeof contentFromBody !== 'string' || !contentFromBody.trim()) {
			throw new NodeOperationError(node, 'Content is required for Parse HTML.', { itemIndex: currentItemIndex });
		}
		body.content = contentFromBody.trim();

		AiScraper._addAttributesToBody(this, body);

		return requestOptions;
	}

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

		const agentNameFromBody = body.name;
		if (typeof agentNameFromBody !== 'string' || !agentNameFromBody.trim()) {
			throw new NodeOperationError(node, 'Agent Name is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
		}
		body.name = agentNameFromBody.trim();

		const urlFromBody = body.url;
		if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
			throw new NodeOperationError(node, 'URL is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
		}
		body.url = urlFromBody.trim();

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
									AiScraper.prepareScrapeRequestBody,
								],
							},
							output: {
								postReceive: [AiScraper.unpackResponseData],
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
								description: 'Natural language instruction on what data to extract for this field.',
								placeholder: 'Enter field description',
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
