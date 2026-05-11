import { fromWebHandler } from 'h3';
import app from '../../app';

export default fromWebHandler(async (request, context) => {
	return await app.fetch(request as Request, context);
});
