import { env } from '$env/dynamic/public';

/** Uses the local login route during development and the app subdomain in production. */
export const applicationUrl = (env.PUBLIC_APP_URL || '').replace(/\/$/, '');

export function applicationHref(path = '/login') {
	return applicationUrl ? `${applicationUrl}${path}` : path;
}

export const contactEmail = 'jeffmuruh@gmail.com';
export const contactPhone = '+263786303048';
export const whatsappHref =
	'https://wa.me/263786303048?text=Hello%20Jeffrey%2C%20I%20would%20like%20to%20join%20the%20Musha%20beta.';
