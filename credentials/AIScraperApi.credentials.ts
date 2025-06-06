import {
    IAuthenticateGeneric,
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest
} from 'n8n-workflow';

export class AIScraperApi implements ICredentialType {
    name = 'aiScraperApi';
    displayName = 'AI Scraper API';
    documentationUrl = 'https://docs.parsera.org/api/getting-started/';
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
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-KEY': '={{$credentials.apiKey}}',
            },
        },
    };
    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://agents.parsera.org/v1',
            url: '/list',
        },
    };
}