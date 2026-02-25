import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('699c510d00378e48ffbd');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = '699db754000ef283ad3c';
export const USERS_COLLECTION_ID = 'users';
export const ORDERS_COLLECTION_ID = 'orders';
export const BUCKET_ID = 'files';

console.log('✅ Appwrite initialized');
