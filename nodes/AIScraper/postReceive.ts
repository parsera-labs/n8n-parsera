import {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';

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