import { t as Hono } from "../../_libs/hono.mjs";
//#region server/api/router.ts
var apiRouter = new Hono();
apiRouter.get("/", (c) => {
	return c.json({ status: "ok" });
});
apiRouter.get("/health", (c) => {
	return c.json({ status: "ok" });
});
//#endregion
export { apiRouter };
