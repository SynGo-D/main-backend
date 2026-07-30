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

    //reads environmental variables (PORT, DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD) and assigns them to the corresponding properties in the env object. If any required variable is missing, it will throw an error due to the requiredEnv function.
    port: Number(process.env.PORT) || 5000,

    database: {
        host: requiredEnv("DATABASE_HOST"),         //validates required values using requiredEnv()
        port: Number(requiredEnv("DATABASE_PORT")),  //converts some values from strings to numbers using Number()
        name: requiredEnv("DATABASE_NAME"),
        user: requiredEnv("DATABASE_USER"),
        password: requiredEnv("DATABASE_PASSWORD")
    }

};