<?php

declare(strict_types=1);

/**
 * Build a transparent, dark-header-friendly Netmax wordmark from the supplied
 * white-backed source artwork. White background pixels connected to an image
 * edge become transparent; enclosed white camera details stay white. Dark navy
 * brand strokes become white while the vivid blue artwork remains unchanged.
 */

$input = $argv[1] ?? '';
$output = $argv[2] ?? '';

if ($input === '' || $output === '' || !is_file($input)) {
    fwrite(STDERR, "Usage: php prepare-netmax-dark-logo.php INPUT.webp OUTPUT.png\n");
    exit(2);
}

if (!function_exists('imagecreatefromwebp') || !function_exists('imagepng')) {
    fwrite(STDERR, "GD with WebP and PNG support is required to prepare the Netmax logo.\n");
    exit(2);
}

$source = @imagecreatefromwebp($input);
if (!$source instanceof GdImage) {
    fwrite(STDERR, "The source Netmax logo is not a readable WebP image.\n");
    exit(1);
}

$width = imagesx($source);
$height = imagesy($source);
$total = $width * $height;
$background = array_fill(0, $total, false);
$queue = new SplQueue();

$nearWhite = static function (int $color) use ($source): bool {
    $rgb = imagecolorsforindex($source, $color);
    return $rgb['red'] >= 218
        && $rgb['green'] >= 218
        && $rgb['blue'] >= 218;
};

$seed = static function (int $x, int $y) use ($width, $source, $nearWhite, &$background, $queue): void {
    $index = $y * $width + $x;
    if ($background[$index]) {
        return;
    }

    if ($nearWhite(imagecolorat($source, $x, $y))) {
        $background[$index] = true;
        $queue->enqueue([$x, $y]);
    }
};

for ($x = 0; $x < $width; $x++) {
    $seed($x, 0);
    $seed($x, $height - 1);
}

for ($y = 0; $y < $height; $y++) {
    $seed(0, $y);
    $seed($width - 1, $y);
}

while (!$queue->isEmpty()) {
    [$x, $y] = $queue->dequeue();
    foreach ([[$x - 1, $y], [$x + 1, $y], [$x, $y - 1], [$x, $y + 1]] as [$nx, $ny]) {
        if ($nx < 0 || $ny < 0 || $nx >= $width || $ny >= $height) {
            continue;
        }

        $index = $ny * $width + $nx;
        if (!$background[$index] && $nearWhite(imagecolorat($source, $nx, $ny))) {
            $background[$index] = true;
            $queue->enqueue([$nx, $ny]);
        }
    }
}

$destination = imagecreatetruecolor($width, $height);
if (!$destination instanceof GdImage) {
    fwrite(STDERR, "Could not allocate the output Netmax logo image.\n");
    exit(1);
}

imagealphablending($destination, false);
imagesavealpha($destination, true);
$transparent = imagecolorallocatealpha($destination, 0, 0, 0, 127);
imagefill($destination, 0, 0, $transparent);

$transparentCount = 0;
$opaqueCount = 0;

for ($y = 0; $y < $height; $y++) {
    for ($x = 0; $x < $width; $x++) {
        $index = $y * $width + $x;

        if ($background[$index]) {
            $transparentCount++;
            continue;
        }

        $rgb = imagecolorsforindex($source, imagecolorat($source, $x, $y));
        $alpha = $rgb['alpha'];

        // Convert the emblem's dark navy details to blue and the wordmark
        // (to the right of the emblem) to white. Existing vivid-blue accents
        // and the enclosed white camera body are preserved.
        if (
            $rgb['red'] <= 90
            && $rgb['green'] <= 125
            && $rgb['blue'] <= 185
        ) {
            if ($x < (int) floor($width * 0.32)) {
                $red = 15;
                $green = 139;
                $blue = 239;
            } else {
                $red = 255;
                $green = 255;
                $blue = 255;
            }
        } else {
            $red = $rgb['red'];
            $green = $rgb['green'];
            $blue = $rgb['blue'];
        }

        $color = imagecolorallocatealpha($destination, $red, $green, $blue, $alpha);
        imagesetpixel($destination, $x, $y, $color);
        if ($alpha < 127) {
            $opaqueCount++;
        }
    }
}

if ($transparentCount === 0 || $opaqueCount === 0) {
    fwrite(STDERR, "Logo processing did not produce both transparent and visible pixels.\n");
    exit(1);
}

if (!imagepng($destination, $output, 9)) {
    fwrite(STDERR, "Could not write the transparent Netmax logo PNG.\n");
    exit(1);
}

$verified = @imagecreatefrompng($output);
if (!$verified instanceof GdImage || imagesx($verified) !== $width || imagesy($verified) !== $height) {
    fwrite(STDERR, "The generated transparent Netmax logo failed PNG verification.\n");
    exit(1);
}

echo "PASS: transparent Netmax logo generated ({$width}x{$height}; {$transparentCount} transparent background pixels).\n";
