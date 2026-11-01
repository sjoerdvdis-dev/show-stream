import { MongoBinary } from 'mongodb-memory-server';
import { mongoVersion } from './api';

/** Downloads mongod once, so that no suite's setup time includes the download. */
export default async () => {
	await MongoBinary.getPath({ version: mongoVersion });
};
