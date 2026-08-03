import app from "./app";
import { env } from "./config/env";
import { pool } from "./database";

async function startServer(): Promise<void> {

    try {

        // Verify database connection before accepting requests.
        await pool.query("SELECT 1");

        console.log("Database connected");

        const server = app.listen(env.port, () => {

            console.log(
                `Server running on port ${env.port}`
            );

        });

        server.on("error", (error) => {

            console.error(
                "HTTP server error",
                error
            );

            process.exit(1);

        });

    } catch (error) {

        console.error(
            "Failed to start server",
            error
        );

        process.exit(1);

    }

}

void startServer();