import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AIScraperApi implements ICredentialType {
    name = 'aiScraperApi';
    displayName = 'AI Scraper API';
    documentationUrl = 'https://docs.parsera.org/'; // Replace if a more specific docs URL for API keys exists
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'Your Parsera API Key',
        },
    ];
}