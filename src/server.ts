import app from "./app";
import { env } from "./config/env";
import { pool } from "./database";


async function startServer(){

    try {

        await pool.query("SELECT 1");

        console.log("Database connected");


        app.listen(env.port, ()=>{

            console.log(
                `Server running on port ${env.port}`
            );

        });


    } catch(error){

        console.error(
            "Failed to start server",
            error
        );

        process.exit(1);

    }

}


startServer();