import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	NodeOperationError,
} from 'n8n-workflow';
import {
	AttributesFieldsParameter,
	TransformedAttributes,
} from './types';
import {
	parseAttributesFromFields,
	parseAttributesFromJson,
} from './parseAttributes';


function sanitizeUrl(
	node: ReturnType<IExecuteSingleFunctions['getNode']>,
	raw: unknown,
	itemIndex: number,
): string {
	if (typeof raw !== 'string' || !raw.trim()) {
		throw new NodeOperationError(node, 'URL is required.', { itemIndex });
	}

	let url = raw.trim();

	// Auto-prepend https:// if scheme is missing
	if (!/^https?:\/\//i.test(url)) {
		url = 'https://' + url;
	}

	// Basic format check: must have a dot, no spaces
	if (/\s/.test(url) || !/^https?:\/\/[^\s/]+\.[^\s/]+/.test(url)) {
		throw new NodeOperationError(
			node,
			`Invalid URL: "${raw.trim()}". Please provide a valid URL (e.g. https://example.com).`,
			{ itemIndex },
		);
	}

	return url;
}

function addAttributesToBody(
	context: IExecuteSingleFunctions,
	body: Record<string, any>
): void {
	const currentItemIndex = context.getItemIndex();
	const node = context.getNode();
	const attributesInputMode = context.getNodeParameter('attributesInputMode', currentItemIndex) as 'fields' | 'json';
	let transformedAttributes: TransformedAttributes;

	switch (attributesInputMode) {
		case 'fields':
			const attributesFieldsParam = context.getNodeParameter('attributesFields', currentItemIndex) as AttributesFieldsParameter | undefined;
			transformedAttributes = parseAttributesFromFields(context, attributesFieldsParam);
			break;
		case 'json':
			const attributesJsonParam = context.getNodeParameter('attributesJson', currentItemIndex);
			transformedAttributes = parseAttributesFromJson(context, attributesJsonParam);
			break;
		default:
			const exhaustiveCheck: never = attributesInputMode;
			throw new NodeOperationError(
				node,
				`Internal error: Unhandled attributes input mode '${exhaustiveCheck}'.`,
				{ itemIndex: currentItemIndex }
			);
	}

	if (transformedAttributes.length === 0) {
		throw new NodeOperationError(
			node,
			'At least one attribute is required.',
			{ itemIndex: currentItemIndex }
		);
	}

	body.attributes = transformedAttributes;
}

function addCookiesToBody(
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


export async function prepareExtractRequestBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
	const node = this.getNode();
	const currentItemIndex = this.getItemIndex();

	if (!requestOptions.body || typeof requestOptions.body !== 'object') {
		requestOptions.body = {};
	}
	const body = requestOptions.body as Record<string, any>;
	body.source = "n8n";

	const prompt = this.getNodeParameter('prompt', currentItemIndex) as string;
	if (prompt && prompt.trim() !== '') {
		body.prompt = prompt.trim();
	}

	body.url = sanitizeUrl(node, body.url, currentItemIndex);

	addAttributesToBody(this, body);
	addCookiesToBody(this, body);

	return requestOptions;
}

export async function prepareParseRequestBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
	const node = this.getNode();
	const currentItemIndex = this.getItemIndex();

	if (!requestOptions.body || typeof requestOptions.body !== 'object') {
		requestOptions.body = {};
	}
	const body = requestOptions.body as Record<string, any>;
	body.source = "n8n";

	const prompt = this.getNodeParameter('prompt', currentItemIndex) as string;
	if (prompt && prompt.trim() !== '') {
		body.prompt = prompt.trim();
	}

	const contentFromBody = body.content;
	if (typeof contentFromBody !== 'string' || !contentFromBody.trim()) {
		throw new NodeOperationError(node, 'Content is required for Parse HTML.', { itemIndex: currentItemIndex });
	}
	body.content = contentFromBody.trim();

	addAttributesToBody(this, body);

	return requestOptions;
}

export async function prepareAgentExtractRequestBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
	const node = this.getNode();
	const currentItemIndex = this.getItemIndex();

	if (!requestOptions.body || typeof requestOptions.body !== 'object') {
		requestOptions.body = {};
	}
	const body = requestOptions.body as Record<string, any>;
	body.source = "n8n";

	body.url = sanitizeUrl(node, body.url, currentItemIndex);

	// Prompt (required for agent extract)
	const prompt = this.getNodeParameter('agentPrompt', currentItemIndex) as string;
	if (!prompt || !prompt.trim()) {
		throw new NodeOperationError(node, 'Prompt is required for Agent Extract.', { itemIndex: currentItemIndex });
	}
	body.prompt = prompt.trim();

	// Attributes (optional for agent extract)
	try {
		const attributesInputMode = this.getNodeParameter('attributesInputMode', currentItemIndex) as 'fields' | 'json';
		let transformedAttributes: TransformedAttributes = [];

		if (attributesInputMode === 'fields') {
			const attributesFieldsParam = this.getNodeParameter('attributesFields', currentItemIndex) as AttributesFieldsParameter | undefined;
			transformedAttributes = parseAttributesFromFields(this, attributesFieldsParam);
		} else if (attributesInputMode === 'json') {
			const attributesJsonParam = this.getNodeParameter('attributesJson', currentItemIndex);
			transformedAttributes = parseAttributesFromJson(this, attributesJsonParam);
		}

		if (transformedAttributes.length > 0) {
			body.attributes = transformedAttributes;
		}
	} catch (e) {
		// Attributes are optional for agent extract, ignore parse errors if empty
	}

	return requestOptions;
}

export async function prepareExtractMarkdownRequestBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
	const node = this.getNode();
	const currentItemIndex = this.getItemIndex();

	if (!requestOptions.body || typeof requestOptions.body !== 'object') {
		requestOptions.body = {};
	}
	const body = requestOptions.body as Record<string, any>;
	body.source = "n8n";

	body.url = sanitizeUrl(node, body.url, currentItemIndex);

	return requestOptions;
}

export async function prepareScrapeRequestBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
	const node = this.getNode();
	const currentItemIndex = this.getItemIndex();

	if (!requestOptions.body || typeof requestOptions.body !== 'object') {
		requestOptions.body = {};
	}
	const body = requestOptions.body as Record<string, any>;
	body.source = "n8n";

	const existingScraperNameFromBody = body.name;
	if (typeof existingScraperNameFromBody !== 'string' || !existingScraperNameFromBody.trim()) {
		throw new NodeOperationError(node, 'Existing Scraper Name is required for Existing Scraper Scrape operation.', { itemIndex: currentItemIndex });
	}
	const templateId = existingScraperNameFromBody.trim();

	// Remove name field and use template_id instead (unified interface)
	delete body.name;
	body.template_id = templateId;

	// URL is already in body from routing config, just ensure it's trimmed if present
	if (body.url && typeof body.url === 'string') {
		body.url = body.url.trim();
	}

	addCookiesToBody(this, body);

	return requestOptions;
}