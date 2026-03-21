import dotenv from "dotenv"
dotenv.config()
import express, { Express, Request, Response } from "express"


import adminRoutes from "./routes/admin/index.route"
const app: Express = express()

const port: number | string = process.env.PORT || 3000

app.set("view engine", "pug")
app.set("views", `${__dirname}/views`);


adminRoutes(app)

app.use(express.static(`${__dirname}/public`));

app.listen(port, () => {
  console.log(`App listening on port: ${port}`)
})
