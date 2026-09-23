import dotenv from "dotenv";    // Load environment variables from .env file

dotenv.config();    //what does this do? It loads the environment variables from a .env file into process.env, making them accessible throughout the application. This is useful for managing configuration settings in a centralized way, especially for sensitive information like database credentials or API keys.


//checks whether a required environment variable exists and returns its value. If the variable is not found, it throws an error to prevent the application from running with missing configuration.
function requiredEnv(key: string): string { 

    const value = process.env[key];     //reads the environmental variable value

    if (!value) {   //checks if the value is undefined or empty
        throw new Error(`Missing environment variable: ${key}`);
    }

    return value;   //return the vaild environment variable value
}


// exported object that stores your application's configuration values from environment
export const env = { //creates an object called .env

    // Reads each variable once, here, and fails fast if a required one
    // is missing rather than discovering it on the first request.
    port: Number(process.env.PORT) || 5000,


    // -----------------------------------------------------------------------
    // Downstream microservices — main-backend is the only thing web-interface
    // talks to; everything else (integration-service, analysis-engine) is
    // reached only from here, server-to-server.
    // -----------------------------------------------------------------------
    integrationServiceUrl: process.env.INTEGRATION_SERVICE_URL ?? "http://localhost:5001",
    analysisEngineUrl: process.env.ANALYSIS_ENGINE_URL ?? "http://localhost:8000",

    // Origin allowed to call this API — the browser-facing frontend.
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",

    // Signs/verifies session tokens issued at login. Required, not
    // defaulted — an app booting with a made-up secret would silently
    // accept tokens signed by any other instance using the same default.
    jwtSecret: requiredEnv("JWT_SECRET")

};