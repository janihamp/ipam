import { app } from '@azure/functions';
export async function health(request, context) {
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        }),
    };
}
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: health,
});
//# sourceMappingURL=health.js.map