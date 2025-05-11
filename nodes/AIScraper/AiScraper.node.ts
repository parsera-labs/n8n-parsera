import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { ProxyCountryList, ProxyCountryOption } from './proxy-countries.data';

export class AiScraper implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
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
                name: 'AiScraperApi',
                required: true,
            },
        ],
        requestDefaults: {
            baseURL: 'https://api.parsera.org/v1',
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
					// {
					// 	name: 'Extract Markdown',
					// 	value: 'extractMarkdown',
					// 	description: 'Extract markdown from a webpage',
					// },
				],
                default: 'extract',
            },
			// ----------------------------------
			//         Operation: Extract
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'extract',
						],
					},
				},
				options: [
					{
						name: 'Extract Data',
						value: 'extractData',
						description: 'Extract data from a webpage using URL',
						action: 'Extract data',
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
						resource: [
							'extract',
						],
					},
				},
			},
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'json',
				default: '{}',
				description: 'A map of name - description pairs of data fields to extract from the webpage. Also, you can specify Output Types.',
				displayOptions: {
					show: {
						resource: [
							'extract',
						],
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
					{
						name: 'Standard',
						value: 'standard',
						description: 'Standard Mode',
					},
					{
						name: 'Precision',
						value: 'precision',
						description: 'Precision Mode',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'extract',
						],
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
				default: '',
				displayOptions: {
					show: {
						resource: [
							'extract',
						],
					},
				},
			},
			{
				displayName: 'Cookies',
				name: 'cookies',
				type: 'string',
				default: '[]',
				description: 'Cookies to use during extraction. Should be valid JSON array.',
				displayOptions: {
					show: {
						resource: [
							'extract',
						],
					},
				},
			},
        
        ]
        
	};
}