import express from "express";
import serverless from "serverless-http";
import { setupApp } from "../server";

const app = express();
setupApp(app);

export const handler = serverless(app);
