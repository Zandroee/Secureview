<?php

declare(strict_types=1);

/**
 * Serve Vite's public/build output from the PHP function.
 *
 * The Vercel PHP runtime runs Composer's "vercel" build hook inside a function
 * bundle. Those generated assets are available to PHP in that bundle but are
 * not automatically published as Vercel static files, so /build/* is routed
 * here explicitly.
 */

$requested = $_GET['file'] ?? '';

if (
    !is_string($requested)
    || $requested === ''
    || str_contains($requested, "\0")
    || str_contains($requested, '\\')
    || preg_match('#(^|/)\.\.?(/|$)#', $requested)
    || !preg_match('#^[A-Za-z0-9._/-]+$#', $requested)
) {
    http_response_code(400);
    exit('Invalid asset path.');
}

$buildRoot = realpath(__DIR__ . '/../public/build');
$assetPath = realpath(__DIR__ . '/../public/build/' . $requested);

if (
    $buildRoot === false
    || $assetPath === false
    || !str_starts_with($assetPath, $buildRoot . DIRECTORY_SEPARATOR)
    || !is_file($assetPath)
    || !is_readable($assetPath)
) {
    http_response_code(404);
    exit('Asset not found.');
}

$extension = strtolower(pathinfo($assetPath, PATHINFO_EXTENSION));
$contentTypes = [
    'css' => 'text/css; charset=UTF-8',
    'js' => 'application/javascript; charset=UTF-8',
    'mjs' => 'application/javascript; charset=UTF-8',
    'json' => 'application/json; charset=UTF-8',
    'map' => 'application/json; charset=UTF-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'ttf' => 'font/ttf',
    'eot' => 'application/vnd.ms-fontobject',
];

header('Content-Type: ' . ($contentTypes[$extension] ?? 'application/octet-stream'));
header('Content-Length: ' . (string) filesize($assetPath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400');

readfile($assetPath);
