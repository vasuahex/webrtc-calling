
import axios from 'axios';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';



// Initialize the Axios client
const apiClient = axios.create({
    baseURL: API_BASE_URL, // Replace with your API base URL
    headers: { 'Content-Type': 'application/json' },
    // timeout: 10000, 
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// Add request interceptor (optional)
apiClient.interceptors.request.use(
    (config) => {
        console.log(`Sending request to ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request error:', error.message);
        return Promise.reject(error);
    }
);

// Add response interceptor
apiClient.interceptors.response.use(
    (response) => {
        console.log(`Response received from ${response.config.url}:`, response.data);
        return response;
    },
    (error) => {
        if (error.response) {
            console.error('API Error:', {
                url: error.config.url,
                status: error.response.status,
                data: error.response.data,
            });
            throw new Error(error.response.data.message || 'An error occurred');
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        return Promise.reject(error); // Ensure error propagates
    }
);

export default apiClient;
