import {
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IExecuteSingleFunctions,
	NodeOperationError,
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
				fieldName: string; // Marked as required in definition
				fieldType: string; // Marked as required in definition
				fieldDescription: string; // Marked as required in definition
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
					`Attribute at index ${index} has an empty or whitespace-only Field Name. Field Name cannot be empty.`,
					{ itemIndex: currentItemIndex }
				);
			}
			// Optional: check if fieldDescription is empty, if the API requires it.
			// if (fieldDescription === '') {
			//     throw new NodeOperationError(
			//         node,
			//         `Attribute "${fieldName}" (at index ${index}) has an empty or whitespace-only Field Description.`,
			//         { itemIndex: currentItemIndex }
			//     );
			// }

			transformedAttributes[fieldName] = {
				description: fieldDescription,
				type: item.fieldType
			};
		}

		// This check would be redundant if the loop's fieldName check throws,
		// but good as a safeguard if logic changes (e.g., empty fieldNames were skipped instead of throwing).
		// Given the current logic, Object.keys(transformedAttributes).length will be > 0 if fieldValues.length > 0
		// and all fieldNames are valid.
		if (Object.keys(transformedAttributes).length === 0) {
			throw new NodeOperationError(
				node,
				'No valid attributes were processed. Ensure all attributes have a non-empty Field Name.',
				{ itemIndex: currentItemIndex }
			);
		}

		body.attributes = transformedAttributes;
	}


	static async prepareExtractRequestBody(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		const node = this.getNode();
		const currentItemIndex = this.getItemIndex();

		// Ensure body exists
		if (!requestOptions.body || typeof requestOptions.body !== 'object') {
			requestOptions.body = {}; // Should not happen if routing.request.body is defined
		}
		const body = requestOptions.body as Record<string, any>;

		// --- Validate URL ---
		const urlFromBody = body.url; // Comes from '={{$parameter["url"]}}'
		if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
			throw new NodeOperationError(node, 'URL is required for Extract Data operation and cannot be empty.', { itemIndex: currentItemIndex });
		}
		body.url = urlFromBody.trim(); // Use trimmed URL

		// --- Attributes Logic ---
		AiScraper._addAttributesToBody(this, body);

		// --- Cookies Logic ---
		const cookiesStringParam = this.getNodeParameter('cookies', currentItemIndex) as string;
		let parsedCookies;
		try {
			parsedCookies = JSON.parse(cookiesStringParam);
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

	// Method to prepare request body with attributes only (no cookies)
	static async prepareAttributesForRequestBody(
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

		// --- Validate Content ---
		const contentFromBody = body.content;
		if (typeof contentFromBody !== 'string' || !contentFromBody.trim()) {
			throw new NodeOperationError(node, 'Content (HTML or Text) is required for Parse HTML operation and cannot be empty.', { itemIndex: currentItemIndex });
		}
		body.content = contentFromBody.trim(); // Use trimmed content

		// --- Attributes Logic ---
		AiScraper._addAttributesToBody(this, body);

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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
								}
							},
							send: {
								preSend: [
									AiScraper.prepareExtractRequestBody,
								],
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
								url: '=/parse',
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
						operation: ['extractData'],
					},
				},
			},
			{
				displayName: 'Content (HTML or Text)',
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
						operation: ['extractData', 'parseHtml'],
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
						operation: ['extractData', 'parseHtml'],
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
						operation: ['extractData'],
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
						operation: ['extractData'],
					},
				},
			},
		]
	};
}
