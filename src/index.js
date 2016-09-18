import mongoose from 'mongoose';
import PromiseBluebird from 'bluebird';
import {runServer} from './server.js';
import config from '../config.js';

mongoose.connect(config.dbUrl);
mongoose.Promise = PromiseBluebird;

runServer();
