import { r as HTTPResponse } from "../_libs/h3+rou3+srvx+unenv.mjs";
//#region #nitro/virtual/renderer-template
var rendererTemplate = () => new HTTPResponse("<!doctype html>\r\n<html lang=\"ar\" dir=\"rtl\">\r\n  <head>\r\n    <meta charset=\"UTF-8\" />\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\r\n    <title>Oman ProSync Jobs Network </title>\r\n    <script type=\"module\" crossorigin src=\"/assets/index-B7TklI1d.js\"><\/script>\n    <link rel=\"stylesheet\" crossorigin href=\"/assets/index-BNwHPjv1.css\">\n  </head>\r\n  <body>\r\n    <div id=\"root\"></div>\r\r\n  </body>\r\n</html>\r\n\r\n", { headers: { "content-type": "text/html; charset=utf-8" } });
//#endregion
//#region node_modules/nitro/dist/runtime/internal/routes/renderer-template.mjs
function renderIndexHTML(event) {
	return rendererTemplate(event.req);
}
//#endregion
export { renderIndexHTML as default };
