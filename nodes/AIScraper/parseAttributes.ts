import {
	IDataObject,
	IExecuteSingleFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import {
	AttributeItem,
	AttributesFieldsParameter,
	TransformedAttributes,
} from './types';

/**
 * Parses attributes defined using the 'Structured Fields' (fixedCollection) mode.
 * Returns a list of {name, type, description} objects matching the API's Attribute schema.
 */
export function parseAttributesFromFields(
	context: IExecuteSingleFunctions,
	attributesFieldsParam: AttributesFieldsParameter | undefined,
): TransformedAttributes {
	const node = context.getNode();
	const currentItemIndex = context.getItemIndex();
	const attributes: TransformedAttributes = [];
	const fieldValues = attributesFieldsParam?.fieldValues ?? [];

	if (fieldValues.length === 0 && !attributesFieldsParam) {
		return [];
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

		attributes.push({ name: fieldName, description: fieldDescription, type: item.fieldType });
	}
	return attributes;
}

/**
 * Parses attributes defined using the 'JSON Object' mode.
 * Accepts JSON like: {"field_name": {"type": "string", "description": "..."}}
 * Returns a list of {name, type, description} objects matching the API's Attribute schema.
 */
export function parseAttributesFromJson(
	context: IExecuteSingleFunctions,
	attributesJsonInput: unknown,
): TransformedAttributes {
	const node = context.getNode();
	const currentItemIndex = context.getItemIndex();
	const attributes: TransformedAttributes = [];

	let parsedObject: IDataObject;

	if (typeof attributesJsonInput === 'string') {
		const trimmedJsonInput = attributesJsonInput.trim();
		if (trimmedJsonInput === '') {
			return [];
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
		parsedObject = attributesJsonInput as IDataObject;
	} else if (attributesJsonInput === null || attributesJsonInput === undefined) {
		return [];
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

		const attributeDetails = value as Partial<AttributeItem>;

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

		attributes.push({ name: fieldName, description: description ?? '', type });
	}
	return attributes;
}
