export function GET() { return Response.json({ service: "BookStore API", version: "v1", health: "/api/v1/health", ready: "/api/v1/ready" }); }
