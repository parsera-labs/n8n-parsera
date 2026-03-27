import {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

declare function setTimeout(callback: () => void, ms: number): unknown;

export async function unpackResponseData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body;

	if (typeof responseBody === 'object' && responseBody !== null && 'data' in responseBody) {
		const extractedContent = (responseBody as IDataObject).data;

		if (Array.isArray(extractedContent)) {
			return extractedContent.map(item => ({ json: item as IDataObject }));
		} else if (typeof extractedContent === 'string') {
			return [{ json: { data: extractedContent } as IDataObject }];
		} else if (typeof extractedContent === 'object' && extractedContent !== null) {
			return [{ json: extractedContent as IDataObject }];
		}
	}
	// If 'data' field is not present or not in expected format, return original items or handle error
	// For now, returning original items if 'data' is not what we expect.
	// You might want to throw an error or return a specific structure based on API contract.
	// console.warn("Response body did not contain a 'data' field or it was not an array/object:", responseBody);
	return items;
}

export async function pollAsyncRunResult(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	const runId = body.run_id as string;

	if (!runId) {
		throw new NodeOperationError(
			this.getNode(),
			'Async run did not return a run_id',
		);
	}

	const credentials = await this.getCredentials('aiScraperApi');
	const apiKey = credentials.apiKey as string;

	const baseURL = 'https://api.parsera.org/v1';
	const pollUrl = `${baseURL}/scrapers/run_async/${runId}`;

	const pollIntervalMs = 2000;
	const maxWaitMs = 1_800_000; // 30 minutes
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitMs) {
		await new Promise<void>((resolve) => { setTimeout(resolve, pollIntervalMs); });

		const pollResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: pollUrl,
			headers: {
				'X-API-KEY': apiKey,
			},
			json: true,
		});

		const status = pollResponse.status as string;

		if (status === 'completed' || status === 'completed_partial') {
			const data = pollResponse.data;

			let rows: IDataObject[];

			if (Array.isArray(data)) {
				rows = data as IDataObject[];
			} else if (typeof data === 'object' && data !== null) {
				// Agentic response: data is keyed by URL, each value is an array
				rows = [];
				for (const key of Object.keys(data)) {
					const val = data[key];
					if (Array.isArray(val)) {
						rows.push(...(val as IDataObject[]));
					}
				}
			} else {
				rows = [];
			}

			if (rows.length === 0) {
				return [{ json: {} }];
			}

			return rows.map((row) => ({ json: row }));
		}

		if (status === 'failed') {
			const errorMsg = pollResponse.error || pollResponse.message || 'Scraper run failed';
			throw new NodeOperationError(
				this.getNode(),
				`Scraper run failed: ${errorMsg}`,
			);
		}

		// Otherwise status is "queued" / "running" — keep polling
	}

	throw new NodeOperationError(
		this.getNode(),
		`Scraper run timed out after ${maxWaitMs / 1000} seconds (run_id: ${runId})`,
	);
}

export async function pollAgentExtractResult(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	const taskId = body.task_id as string;

	if (!taskId) {
		throw new NodeOperationError(
			this.getNode(),
			'Agent extract did not return a task_id',
		);
	}

	const credentials = await this.getCredentials('aiScraperApi');
	const apiKey = credentials.apiKey as string;

	const baseURL = 'https://api.parsera.org/v1';
	const pollUrl = `${baseURL}/agent/extract/${taskId}`;

	const pollIntervalMs = 2000;
	const maxWaitMs = 1_800_000; // 30 minutes
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitMs) {
		await new Promise<void>((resolve) => { setTimeout(resolve, pollIntervalMs); });

		const pollResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: pollUrl,
			headers: {
				'X-API-KEY': apiKey,
			},
			json: true,
		});

		const status = pollResponse.status as string;

		if (status === 'completed') {
			const data = pollResponse.data;

			let rows: IDataObject[];

			if (Array.isArray(data)) {
				rows = data as IDataObject[];
			} else if (typeof data === 'object' && data !== null) {
				rows = [data as IDataObject];
			} else {
				rows = [];
			}

			if (rows.length === 0) {
				return [{ json: {} }];
			}

			return rows.map((row) => ({ json: row }));
		}

		if (status === 'failed') {
			const errorMsg = pollResponse.error || pollResponse.message || 'Agent extract failed';
			throw new NodeOperationError(
				this.getNode(),
				`Agent extract failed: ${errorMsg}`,
			);
		}

		// Otherwise status is "pending" / "running" — keep polling
	}

	throw new NodeOperationError(
		this.getNode(),
		`Agent extract timed out after ${maxWaitMs / 1000} seconds (task_id: ${taskId})`,
	);
}