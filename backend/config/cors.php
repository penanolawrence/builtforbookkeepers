<?php

return [

    /*
     * Paths that CORS headers apply to.
     * api/* covers all API routes.
     * broadcasting/auth is the Laravel Reverb channel authentication endpoint.
     */
    'paths' => ['api/*', 'broadcasting/auth'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:3000')))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * Broadcasting auth uses a Bearer token in the Authorization header,
     * not cookies, so credentials mode is not required.
     */
    'supports_credentials' => false,

];
