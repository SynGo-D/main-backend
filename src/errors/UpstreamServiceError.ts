/*
Represents a failure reported by a downstream microservice
(integration-service, analysis-engine) while main-backend was proxying a
request to it. Carries the upstream status code so the gateway can reflect
it back to the client instead of always answering 500 for someone else's 404.
*/
export class UpstreamServiceError extends Error {

    constructor(
        message: string,
        public readonly statusCode: number
    ) {

        super(message);

        this.name = "UpstreamServiceError";

    }

}
