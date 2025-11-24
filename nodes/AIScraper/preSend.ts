import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	NodeOperationError,
} from 'n8n-workflow';
import {
	AttributesFieldsParameter,
	TransformedAttributesMap,
} from './types';
import {
	parseAttributesFromFields,
	parseAttributesFromJson,
} from './parseAttributes';


function addAttributesToBody(
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

	if (Object.keys(transformedAttributes).length === 0) {
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

	const urlFromBody = body.url;
	if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
		throw new NodeOperationError(node, 'URL is required.', { itemIndex: currentItemIndex });
	}
	body.url = urlFromBody.trim();

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

	const agentNameFromBody = body.name;
	if (typeof agentNameFromBody !== 'string' || !agentNameFromBody.trim()) {
		throw new NodeOperationError(node, 'Agent Name is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
	}
	const agentName = agentNameFromBody.trim();

	const urlFromBody = body.url;
	if (typeof urlFromBody !== 'string' || !urlFromBody.trim()) {
		throw new NodeOperationError(node, 'URL is required for Agent Scrape operation.', { itemIndex: currentItemIndex });
	}
	const url = urlFromBody.trim();

	// Check if this is a template scraper (starts with "template:") or agent scraper (starts with "scraper:")
	if (agentName.startsWith('template:')) {
		// Template scraper - use v1/scrapers/run endpoint
		const templateId = agentName.substring('template:'.length);
		if (!templateId) {
			throw new NodeOperationError(node, 'Invalid template ID.', { itemIndex: currentItemIndex });
		}

		// Update request to use template endpoint
		requestOptions.baseURL = 'https://api.parsera.org/v1';
		requestOptions.url = '/scrapers/run';
		
		// Replace body with template format
		body.template_id = templateId;
		body.url = url;
		delete body.name; // Remove name field for template endpoint
	} else if (agentName.startsWith('scraper:')) {
		// Agent scraper - use agents.parsera.org/v1/scrape endpoint
		const agentId = agentName.substring('scraper:'.length);
		if (!agentId) {
			throw new NodeOperationError(node, 'Invalid agent ID.', { itemIndex: currentItemIndex });
		}

		// Update request to use agent endpoint
		requestOptions.baseURL = 'https://agents.parsera.org/v1';
		requestOptions.url = '/scrape';
		
		// Use agent ID as the name (as per API requirement)
		body.name = agentId;
		body.url = url;
	} else {
		// Legacy format - assume it's an agent name without prefix
		// Keep existing behavior for backward compatibility
		requestOptions.baseURL = 'https://agents.parsera.org/v1';
		requestOptions.url = '/scrape';
		body.name = agentName;
		body.url = url;
	}

	addCookiesToBody(this, body);

	return requestOptions;
}