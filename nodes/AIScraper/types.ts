export type AttributeDefinition = {
	description?: string;
	type: string;
};

export type TransformedAttributesMap = Record<string, AttributeDefinition>;

export type AttributeFieldItem = {
	fieldName: string;
	fieldType: string;
	fieldDescription?: string;
};

export type AttributesFieldsParameter = {
	fieldValues: AttributeFieldItem[];
};