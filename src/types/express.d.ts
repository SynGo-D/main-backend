// Augments Express's Request with the fields requireAuth attaches after
// verifying a session token, so controllers can read req.userId/req.email
// without an `any` cast.
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}

export {};
