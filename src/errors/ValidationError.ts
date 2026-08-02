/*
Represents an error caused by invalid user input.
Controllers can use this type to return HTTP 400 responses.
 */
export class ValidationError extends Error {

    constructor(message: string) {

        super(message);

        this.name = "ValidationError";

    }

}