import {
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IExecuteSingleFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { ProxyCountryList, ProxyCountryOption } from './proxy-countries.data';

export class AiScraper implements INodeType {

	static async prepareExtractRequestBody(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		const node = this.getNode();
		const currentItemIndex = this.getItemIndex();

		// Ensure body exists
		if (!requestOptions.body || typeof requestOptions.body !== 'object') {
			requestOptions.body = {};
		}
		const body = requestOptions.body as Record<string, any>;

		// --- Attributes Logic ---
		const attributesParam = this.getNodeParameter('attributes', currentItemIndex) as {
			fieldValues: Array<{
				fieldName?: string;
				fieldType?: string;
				fieldDescription?: string;
			}>
		};

		const fieldValues = (attributesParam && attributesParam.fieldValues) ? attributesParam.fieldValues : [];
		const transformedAttributes: { [key: string]: { description: string; type: string } } = {};
		for (const item of fieldValues) {
			if (item.fieldName && item.fieldType && item.fieldDescription) {
				transformedAttributes[item.fieldName] = {
					description: item.fieldDescription,
					type: item.fieldType
				};
			}
		}
		body.attributes = transformedAttributes;

		// --- Cookies Logic ---
		const cookiesString = this.getNodeParameter('cookies', currentItemIndex) as string;
		let parsedCookies;
		try {
			parsedCookies = JSON.parse(cookiesString);
		} catch (error: any) {
			throw new NodeOperationError(node, `Invalid JSON in Cookies field: ${error.message}`, { itemIndex: currentItemIndex });
		}

		if (!Array.isArray(parsedCookies)) {
			throw new NodeOperationError(node, 'Cookies field, if provided, must be a JSON array.', { itemIndex: currentItemIndex });
		}

		if (parsedCookies.length === 0) {
			body.cookies = null;
		} else {
			body.cookies = parsedCookies;
		}

		return requestOptions;
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
			baseURL: 'http://0.0.0.0:8080/v1',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract',
						value: 'extract',
						description: 'Extract data from a webpage',
					},
					{
						name: 'Parse',
						value: 'parse',
						description: 'Parse data from HTML or text content',
					},
				],
				default: 'extract',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['extract'],
					},
				},
				options: [
					{
						name: 'Extract Data',
						value: 'extractData',
						description: 'Extract data from a webpage using URL',
						action: 'Extract data',
						routing: {
							request: {
								method: 'POST',
								url: '=/extract',
								body: {
									url: '={{$parameter["url"]}}',
									mode: '={{$parameter["mode"]}}',
									proxy_country: '={{$parameter["proxyCountry"]}}',
									// 'attributes' and 'cookies' will be added by the preSend function
								}
							},
							send: {
								preSend: [
									AiScraper.prepareExtractRequestBody,
								],
							},
						},
					},
				],
				default: 'extractData',
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
						resource: ['extract'],
						operation: ['extractData'],
					},
				},
			},
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'fixedCollection',
				default: { fieldValues: [] },
				description: 'Define the data fields to extract. Each attribute must have a Field Name and Field Description. At least one attribute is required.',
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
						resource: ['extract'],
						operation: ['extractData'],
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
						resource: ['extract'],
						operation: ['extractData'],
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
						resource: ['extract'],
						operation: ['extractData'],
					},
				},
			},
			{
				displayName: 'Cookies',
				name: 'cookies',
				type: 'json',
				default: '[]',
				description: 'Optional. Provide cookies as a JSON array string.',
				displayOptions: {
					show: {
						resource: ['extract'],
						operation: ['extractData'],
					},
				},
			},
		]
	};
}
