import mongoose from 'mongoose';
import {runServer} from './server.js';
import config from '../config.js';

mongoose.connect(config.dbUrl);

runServer();
