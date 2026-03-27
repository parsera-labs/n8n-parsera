export type AttributeItem = {
	name: string;
	description?: string;
	type: string;
};

export type TransformedAttributes = AttributeItem[];

export type AttributeFieldItem = {
	fieldName: string;
	fieldType: string;
	fieldDescription?: string;
};

export type AttributesFieldsParameter = {
	fieldValues: AttributeFieldItem[];
};
