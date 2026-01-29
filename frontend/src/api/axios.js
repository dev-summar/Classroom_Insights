import axios from 'axios';
import config from '../config/api';

const instance = axios.create({
    baseURL: config.apiUrl,
});

export default instance;
