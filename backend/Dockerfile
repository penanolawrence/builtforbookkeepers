FROM php:8.4-cli-alpine

# System dependencies
RUN apk add --no-cache \
    git curl unzip libpng-dev libjpeg-turbo-dev freetype-dev \
    libpq-dev icu-dev oniguruma-dev libzip-dev \
    autoconf g++ make

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install \
      pdo pdo_pgsql pgsql \
      gd exif bcmath intl zip opcache mbstring pcntl

# Redis extension (via PECL)
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies first (layer cache)
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs

# Copy app source
COPY . .

# Finish composer setup
RUN composer dump-autoload --optimize --ignore-platform-reqs

# Permissions for Laravel storage + bootstrap (777 works on all platforms)
RUN chmod -R 777 storage bootstrap/cache

# Laravel uses port 8000 via artisan serve
EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
